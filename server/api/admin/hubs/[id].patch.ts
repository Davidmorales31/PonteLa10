import type { HubEditorialResumen } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { actualizarHubEditorial } from '~/server/utils/repositorioHubsPublicos'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaActualizarHubPublico } from '~/utils/editorial/hubs'

export default defineEventHandler(async (evento): Promise<HubEditorialResumen> => {
  await exigirPermisoEditorial(evento, 'hub.gestionar')
  const id = String(getRouterParam(evento, 'id') || '')
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Hub no encontrado.' })
  }

  const datos = validarEntradaEditorial(esquemaActualizarHubPublico, await readBody(evento))
  return actualizarHubEditorial(
    obtenerClienteSupabaseEditorial(evento),
    id,
    datos
  )
})
