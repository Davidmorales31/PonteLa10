import { ErrorAgente, normalizarError } from '~/server/utils/agentesRedes/errores'
import { autenticarAgente } from '~/server/utils/agentesRedes/llaves'
import { RespuestaBinaria } from '~/server/utils/agentesRedes/operaciones'
import { buscarOperacion, ejecutarOperacion } from '~/server/utils/agentesRedes/router'

const maximoCuerpoBytes = 256 * 1024

/** API REST para agentes de IA: autenticación por llave Bearer (nunca cookies), una sola ruta que despacha el registro de operaciones. */
export default defineEventHandler(async (evento) => {
  setHeader(evento, 'Cache-Control', 'no-store')
  setHeader(evento, 'X-Content-Type-Options', 'nosniff')
  try {
    const ruta = `/${getRouterParam(evento, 'ruta') || ''}`.replace(/\/+$/, '') || '/'
    const encontrada = buscarOperacion(evento.method, ruta)
    if (!encontrada) throw new ErrorAgente(404, 'ruta_desconocida', 'La ruta no existe. Consulta /api/agentes/redes/v1/openapi.json.')
    if (encontrada === 'metodo') throw new ErrorAgente(405, 'metodo_no_permitido', 'El método no está permitido en esta ruta.')
    const contexto = await autenticarAgente(evento)
    const { operacion, parametros } = encontrada
    let bruto: Record<string, unknown>
    if (operacion.metodo === 'GET' || operacion.metodo === 'DELETE') {
      bruto = { ...getQuery(evento), ...parametros }
    } else {
      if (Number(getHeader(evento, 'content-length') || 0) > maximoCuerpoBytes) throw new ErrorAgente(413, 'demasiado_grande', 'El cuerpo supera 256 KB. Sube los archivos con iniciarSubida.')
      const tieneCuerpo = Number(getHeader(evento, 'content-length') || 0) > 0 || getHeader(evento, 'transfer-encoding')
      if (tieneCuerpo && !getHeader(evento, 'content-type')?.toLowerCase().startsWith('application/json')) throw new ErrorAgente(415, 'tipo_no_soportado', 'Envía el cuerpo como application/json.')
      const cuerpo = tieneCuerpo ? await readBody(evento).catch(() => { throw new ErrorAgente(400, 'json_invalido', 'El cuerpo no es JSON válido.') }) : {}
      if (cuerpo !== null && cuerpo !== undefined && (typeof cuerpo !== 'object' || Array.isArray(cuerpo))) throw new ErrorAgente(400, 'solicitud_invalida', 'El cuerpo debe ser un objeto JSON.')
      bruto = { ...(cuerpo as Record<string, unknown> | undefined), ...parametros }
    }
    const resultado = await ejecutarOperacion(operacion, contexto, bruto)
    if (resultado instanceof RespuestaBinaria) { setHeader(evento, 'Content-Type', resultado.tipo); return resultado.datos }
    setResponseStatus(evento, operacion.estadoHttp ?? 200)
    return resultado
  } catch (problema) {
    const { estado, cuerpo } = normalizarError(problema)
    setResponseStatus(evento, estado)
    if (estado === 401) setHeader(evento, 'WWW-Authenticate', 'Bearer realm="redes-pont3la10"')
    if (estado === 429) setHeader(evento, 'Retry-After', 30)
    if (estado === 405) setHeader(evento, 'Allow', 'GET, POST, PUT, DELETE')
    if (estado >= 500) console.error('[agentes-redes] error interno de la API')
    return cuerpo
  }
})
