import type { ColaRevisionEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerColaRevisionEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { sitioDelPanel } from '~/server/utils/sitioDelPanel'

export default defineEventHandler(async (
  evento
): Promise<ColaRevisionEditorial> => {
  await exigirPermisoEditorial(evento, 'contenido.revisar')
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return obtenerColaRevisionEditorial(clienteSupabase, sitioDelPanel(evento))
})
