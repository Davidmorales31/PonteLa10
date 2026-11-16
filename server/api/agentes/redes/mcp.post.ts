import { ErrorAgente, normalizarError } from '~/server/utils/agentesRedes/errores'
import { autenticarAgente } from '~/server/utils/agentesRedes/llaves'
import { manejarMcp } from '~/server/utils/agentesRedes/mcp'

/** Servidor MCP (Model Context Protocol) sobre HTTP: las mismas operaciones de la API REST, como herramientas. */
export default defineEventHandler(async (evento) => {
  setHeader(evento, 'Cache-Control', 'no-store')
  try {
    const contexto = await autenticarAgente(evento)
    if (Number(getHeader(evento, 'content-length') || 0) > 256 * 1024) throw new ErrorAgente(413, 'demasiado_grande', 'El cuerpo supera 256 KB.')
    const cuerpo = await readBody(evento).catch(() => undefined)
    const resultado = await manejarMcp(cuerpo, contexto)
    setResponseStatus(evento, resultado.estado)
    return resultado.cuerpo ?? ''
  } catch (problema) {
    const { estado, cuerpo } = normalizarError(problema)
    setResponseStatus(evento, estado)
    if (estado === 401) setHeader(evento, 'WWW-Authenticate', 'Bearer realm="redes-pont3la10"')
    return { jsonrpc: '2.0', id: null, error: { code: estado === 401 ? -32001 : -32603, message: cuerpo.error.mensaje, data: { codigo: cuerpo.error.codigo } } }
  }
})
