import { errores, normalizarError } from './errores'
import { guiaAgentes } from './guia'
import type { ContextoAgente } from './llaves'
import { RespuestaBinaria, operaciones } from './operaciones'
import { esquemaEntrada } from './openapi'
import { buscarHerramienta, ejecutarOperacion } from './router'

const versionesProtocolo = ['2025-06-18', '2025-03-26', '2024-11-05']
type Solicitud = { jsonrpc?: string, id?: string | number | null, method?: string, params?: Record<string, unknown> }
const error = (id: unknown, codigo: number, mensaje: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code: codigo, message: mensaje } })

export function herramientasVisibles(contexto: ContextoAgente) {
  return operaciones.filter(operacion => !operacion.alcance || contexto.llave.alcances.has(operacion.alcance)).map(operacion => ({
    name: operacion.herramienta, description: `${operacion.resumen}. ${operacion.descripcion}`, inputSchema: esquemaEntrada(operacion),
    annotations: { title: operacion.resumen, readOnlyHint: operacion.metodo === 'GET', destructiveHint: operacion.metodo === 'DELETE', idempotentHint: operacion.metodo === 'GET' || operacion.metodo === 'DELETE', openWorldHint: operacion.id === 'importarImagenDesdeUrl' }
  }))
}

async function llamarHerramienta(contexto: ContextoAgente, parametros: Record<string, unknown>) {
  const operacion = buscarHerramienta(String(parametros.name || ''))
  if (!operacion) return { isError: true, content: [{ type: 'text', text: JSON.stringify(normalizarError(errores.noEncontrado('La herramienta')).cuerpo) }] }
  try {
    const resultado = await ejecutarOperacion(operacion, contexto, parametros.arguments)
    if (resultado instanceof RespuestaBinaria) return { content: [{ type: 'image', data: resultado.datos.toString('base64'), mimeType: resultado.tipo }] }
    if (resultado && typeof resultado === 'object' && 'base64' in resultado && 'mime' in resultado) {
      const { base64, mime, ...meta } = resultado as { base64: string, mime: string }
      return { content: [{ type: 'image', data: base64, mimeType: mime }, { type: 'text', text: JSON.stringify(meta) }] }
    }
    return { content: [{ type: 'text', text: JSON.stringify(resultado) }] }
  } catch (problema) {
    return { isError: true, content: [{ type: 'text', text: JSON.stringify(normalizarError(problema).cuerpo) }] }
  }
}

async function procesar(solicitud: Solicitud, contexto: ContextoAgente) {
  if (solicitud?.jsonrpc !== '2.0' || typeof solicitud.method !== 'string') return error(solicitud?.id, -32600, 'Solicitud JSON-RPC inválida.')
  const respuesta = (resultado: unknown) => ({ jsonrpc: '2.0', id: solicitud.id ?? null, result: resultado })
  switch (solicitud.method) {
    case 'initialize': {
      const pedida = String(solicitud.params?.protocolVersion || '')
      return respuesta({ protocolVersion: versionesProtocolo.includes(pedida) ? pedida : versionesProtocolo[0],
        capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'pont3la10-redes', title: 'Contenido para redes · Pont3la10', version: '1.0.0' }, instructions: guiaAgentes })
    }
    case 'ping': return respuesta({})
    case 'tools/list': return respuesta({ tools: herramientasVisibles(contexto) })
    case 'tools/call': return respuesta(await llamarHerramienta(contexto, solicitud.params || {}))
    default: return error(solicitud.id, -32601, `Método no soportado: ${solicitud.method}`)
  }
}

/** Transporte HTTP sin estado: un POST con una solicitud (o un lote) y una respuesta JSON. Las notificaciones no responden. */
export async function manejarMcp(cuerpo: unknown, contexto: ContextoAgente): Promise<{ estado: number, cuerpo?: unknown }> {
  if (Array.isArray(cuerpo)) {
    if (!cuerpo.length || cuerpo.length > 20) return { estado: 400, cuerpo: error(null, -32600, 'Lote inválido (1 a 20 solicitudes).') }
    const respuestas = (await Promise.all(cuerpo.map(item => (item && typeof item === 'object' && 'id' in item ? procesar(item as Solicitud, contexto) : (void 0))))).filter(Boolean)
    return respuestas.length ? { estado: 200, cuerpo: respuestas } : { estado: 202 }
  }
  if (!cuerpo || typeof cuerpo !== 'object') return { estado: 400, cuerpo: error(null, -32700, 'JSON inválido.') }
  if (!('id' in cuerpo)) return { estado: 202 }
  return { estado: 200, cuerpo: await procesar(cuerpo as Solicitud, contexto) }
}
