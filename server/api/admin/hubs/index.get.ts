import type { HubEditorialResumen } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarHubsEditoriales } from '~/server/utils/repositorioHubsPublicos'

export default defineEventHandler(async (evento): Promise<HubEditorialResumen[]> => {
  await exigirPermisoEditorial(evento, 'hub.ver')
  return listarHubsEditoriales(obtenerClienteSupabaseEditorial(evento))
})
