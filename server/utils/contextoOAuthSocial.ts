import { createError, getHeader, getRequestURL, setHeader, type H3Event } from 'h3'
import { exigirPermisoEditorial } from './autorizacionEditorial'
import { obtenerClienteSupabasePrivado } from './clienteSupabasePrivado'

export async function contextoOAuthSocial(evento: H3Event, escritura = false) {
  setHeader(evento, 'Cache-Control', 'private, no-store')
  setHeader(evento, 'Referrer-Policy', 'no-referrer')
  const contexto = await exigirPermisoEditorial(evento, escritura ? 'configuracion.gestionar' : 'contenido.verBorradores', { exigirMfa: escritura })
  return { contexto }
}
export function validarOrigenOAuthSocial(evento: H3Event) {
  if (getHeader(evento, 'origin') !== getRequestURL(evento).origin) throw createError({ statusCode: 403, statusMessage: 'Origen no permitido.' })
  if (getHeader(evento, 'content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') throw createError({ statusCode: 415, statusMessage: 'Envía la solicitud como JSON.' })
}
export function clienteOAuthSocial(evento: H3Event) {
  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) throw createError({ statusCode: 503, statusMessage: 'El almacenamiento privado de conexiones no está configurado.' })
  return cliente
}
