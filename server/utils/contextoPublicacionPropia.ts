import { createError, getHeader, getRequestURL, setHeader, type H3Event } from 'h3'
import { exigirPermisoEditorial, exigirMfaSegunPoliticaEditorial } from './autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from './clienteSupabaseEditorial'
import { clienteOAuthSocial } from './contextoOAuthSocial'

/** Lectura: ver borradores. Escritura: editar todo, MFA según política, JSON y mismo origen. */
export async function contextoPublicacionPropia(evento: H3Event, escritura = false) {
  const contexto = await exigirPermisoEditorial(evento, escritura ? 'contenido.editarTodos' : 'contenido.verBorradores')
  if (escritura) {
    exigirMfaSegunPoliticaEditorial(contexto)
    if (!getHeader(evento, 'content-type')?.toLowerCase().startsWith('application/json')) throw createError({ statusCode: 415, statusMessage: 'Envía el contenido como JSON.' })
    const origen = getHeader(evento, 'origin')
    if (origen !== getRequestURL(evento).origin) throw createError({ statusCode: 403, statusMessage: 'Origen de solicitud no permitido.' })
  }
  setHeader(evento, 'Cache-Control', 'private, no-store')
  return { contexto, cliente: obtenerClienteSupabaseEditorial(evento), privado: clienteOAuthSocial(evento) }
}
