import { setResponseHeader } from 'h3'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { analizarConsultaArticulosPublicos } from '~/server/utils/filtrosArticulosPublicos'
import { construirUrlsetSitemapPublico, prepararRespuestaSitemap, registrarFalloSitemap, rutasSitemapPublico } from '~/server/utils/sitemapsPublicos'
import { construirSitemapMexico } from '~/server/utils/sitemapsMexico'
import { sitioDeSolicitud } from '~/server/utils/sitioDeSolicitud'
import { configuracionDelSitio } from '~/utils/sitio'

const rutasSitemap = new Set<string>([...rutasSitemapPublico, '/sitemap.xml', '/sitemap-index.xml'])

/**
 * Sitios distintos de Colombia:
 * - Sin lanzar (`indexable: false`): todas las respuestas llevan noindex, los mapas salen
 *   vacíos y el feed no existe, para no indexar contenido a medias ni mezclar URLs de otro sitio.
 * - Lanzado: los mapas del sitio se generan con su propio contenido y su propio dominio.
 */
export default defineEventHandler(async (evento) => {
  const sitio = configuracionDelSitio(sitioDeSolicitud(evento))
  if (sitio.id === 'co') return
  const ruta = getRequestURL(evento).pathname

  if (!sitio.indexable) {
    setResponseHeader(evento, 'X-Robots-Tag', 'noindex, nofollow')
    if (rutasSitemap.has(ruta)) {
      setResponseHeader(evento, 'Content-Type', 'application/xml; charset=utf-8')
      setResponseHeader(evento, 'Cache-Control', 'no-store')
      return construirUrlsetSitemapPublico([], sitio.origen)
    }
    if (ruta === '/feed.xml') {
      throw createError({ statusCode: 404, statusMessage: 'Este sitio aún no tiene feed.' })
    }
    return
  }

  if (!rutasSitemap.has(ruta)) return
  try {
    const cliente = obtenerClienteSupabaseAnonimo(evento)
    const xml = await construirSitemapMexico(ruta, sitio.origen, {
      articulos: (limite, desplazamiento) => listarArticulosPublicosEditoriales(cliente, limite, desplazamiento, undefined, sitio.id),
      noticiasHub: (filtro) => {
        const consulta = analizarConsultaArticulosPublicos({ ...filtro, limite: '3' })
        return consulta ? listarArticulosPublicosEditoriales(cliente, 3, 0, consulta, sitio.id) : Promise.resolve([])
      }
    })
    if (xml === null) return
    prepararRespuestaSitemap(evento)
    return xml
  } catch {
    registrarFalloSitemap(evento, 'mexico')
    return construirUrlsetSitemapPublico([], sitio.origen)
  }
})
