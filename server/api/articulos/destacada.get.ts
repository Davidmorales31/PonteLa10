import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerUltimaNoticiaPublicaConPortada } from '~/server/utils/repositorioContenidoEditorial'

export default defineEventHandler(async (
  evento
): Promise<ResumenArticuloPublico | null> => {
  setResponseHeader(
    evento,
    'Cache-Control',
    'public, max-age=15, s-maxage=30, stale-while-revalidate=30'
  )
  return obtenerUltimaNoticiaPublicaConPortada(obtenerClienteSupabaseEditorial(evento))
})
