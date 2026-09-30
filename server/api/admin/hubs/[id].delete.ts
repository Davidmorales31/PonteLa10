import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { eliminarHubEditorial } from '~/server/utils/repositorioHubsPublicos'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'hub.gestionar')
  const id = String(getRouterParam(evento, 'id') || '')
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Hub no encontrado.' })
  }

  await eliminarHubEditorial(obtenerClienteSupabaseEditorial(evento), id)
  return { eliminado: true }
})
