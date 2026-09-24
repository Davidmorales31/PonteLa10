import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerNoticiaDestacadaPublica } from '~/server/utils/repositorioContenidoEditorial'

export default defineEventHandler(async (
  evento
): Promise<ResumenArticuloPublico | null> => {
  setResponseHeader(
    evento,
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
  )
  return obtenerNoticiaDestacadaPublica(obtenerClienteSupabaseEditorial(evento))
})
