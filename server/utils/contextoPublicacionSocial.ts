import type { H3Event } from 'h3'
import { z } from 'zod'
import { exigirPermisoEditorial, exigirMfaSegunPoliticaEditorial } from './autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from './clienteSupabaseEditorial'
import { obtenerArticuloEditorial } from './repositorioContenidoEditorial'
import { validarEntradaEditorial } from './validacionEditorial'

export async function contextoPublicacionSocial(evento: H3Event, escritura = false) {
  const contexto = await exigirPermisoEditorial(evento, escritura ? 'contenido.editarTodos' : 'contenido.verBorradores')
  if (escritura) {
    exigirMfaSegunPoliticaEditorial(contexto)
    if (!getHeader(evento, 'content-type')?.toLowerCase().startsWith('application/json')) throw createError({ statusCode: 415, statusMessage: 'Envía el contenido como JSON.' })
    const origen = getHeader(evento, 'origin')
    // Aceptar solo el origen del sitio; el cliente nunca suministra URLs para descargar medios.
    if (origen && origen !== getRequestURL(evento).origin) throw createError({ statusCode: 403, statusMessage: 'Origen de solicitud no permitido.' })
  }
  const id = validarEntradaEditorial(z.string().uuid(), getRouterParam(evento, 'id'))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const articulo = await obtenerArticuloEditorial(cliente, id, contexto.usuario.id, {
    editarTodos: contexto.permisos.includes('contenido.editarTodos'), editarPropio: false
  })
  const configuracion = useRuntimeConfig(evento)
  const sitio = new URL(String(configuracion.public.socialSiteUrl || configuracion.public.siteUrl))
  const urlCanonica = new URL(`/articulos/${articulo.slug}`, sitio).toString()
  setHeader(evento, 'Cache-Control', 'private, no-store')
  return { cliente, articulo, urlCanonica, dominio: sitio.host, contexto }
}
