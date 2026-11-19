import { setResponseHeader } from 'h3'
import { construirUrlsetSitemapPublico, rutasSitemapPublico } from '~/server/utils/sitemapsPublicos'
import { sitioDeSolicitud } from '~/server/utils/sitioDeSolicitud'
import { configuracionDelSitio } from '~/utils/sitio'

const rutasSitemap = new Set<string>([...rutasSitemapPublico, '/sitemap.xml', '/sitemap-index.xml'])

/**
 * Un sitio sin lanzar (México, hasta tener contenido propio) no debe indexarse ni
 * publicar mapas con URLs de otro sitio: todas sus respuestas llevan noindex, sus
 * mapas salen vacíos y su feed no existe.
 */
export default defineEventHandler((evento) => {
  const sitio = configuracionDelSitio(sitioDeSolicitud(evento))
  if (sitio.indexable) return

  setResponseHeader(evento, 'X-Robots-Tag', 'noindex, nofollow')
  const ruta = getRequestURL(evento).pathname

  if (rutasSitemap.has(ruta)) {
    setResponseHeader(evento, 'Content-Type', 'application/xml; charset=utf-8')
    setResponseHeader(evento, 'Cache-Control', 'no-store')
    return construirUrlsetSitemapPublico([], sitio.origen)
  }
  if (ruta === '/feed.xml') {
    throw createError({ statusCode: 404, statusMessage: 'Este sitio aún no tiene feed.' })
  }
})
