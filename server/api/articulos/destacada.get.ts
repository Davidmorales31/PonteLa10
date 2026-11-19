import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerUltimaNoticiaPublicaConPortada } from '~/server/utils/repositorioContenidoEditorial'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'
import { sitioDeSolicitud } from '~/server/utils/sitioDeSolicitud'

export default defineEventHandler(async (
  evento
): Promise<ResumenArticuloPublico | null> => {
  const noticia = await obtenerUltimaNoticiaPublicaConPortada(obtenerClienteSupabaseEditorial(evento), sitioDeSolicitud(evento))
  aplicarCachePublica(evento, 'articulo')
  return noticia
})
