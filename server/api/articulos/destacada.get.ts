import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerUltimaNoticiaPublicaConPortada } from '~/server/utils/repositorioContenidoEditorial'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'

export default defineEventHandler(async (
  evento
): Promise<ResumenArticuloPublico | null> => {
  const noticia = await obtenerUltimaNoticiaPublicaConPortada(obtenerClienteSupabaseEditorial(evento))
  aplicarCachePublica(evento, 'articulo')
  return noticia
})
