import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { construirUrlAbsoluta, escaparXml } from '~/utils/seo'
import {
  filtrarPublicacionesVentanaNews,
  prepararRespuestaSitemap,
  registrarFalloSitemap
} from '~/server/utils/sitemapsPublicos'

const horasNoticiasGoogle = 48
const MAX_NOTICIAS_GOOGLE = 1000
const MAX_FILAS_EXAMINADAS_GOOGLE = 5000

export default defineEventHandler(async (evento) => {
  const urlSitio = String(useRuntimeConfig().public.siteUrl)
  const ahora = Date.now()
  const limite = new Date(ahora - horasNoticiasGoogle * 60 * 60 * 1000)
  const publicaciones: Awaited<ReturnType<typeof listarArticulosPublicosEditoriales>> = []
  let disponible = true

  try {
    const clienteSupabase = obtenerClienteSupabaseAnonimo(evento)
    const tamanoPagina = 50
    let desplazamiento = 0
    let ventanaCompletada = false

    while (
      publicaciones.length < MAX_NOTICIAS_GOOGLE
      && desplazamiento < MAX_FILAS_EXAMINADAS_GOOGLE
    ) {
      const limitePagina = Math.min(
        tamanoPagina,
        MAX_NOTICIAS_GOOGLE - publicaciones.length,
        MAX_FILAS_EXAMINADAS_GOOGLE - desplazamiento
      )
      const pagina = await listarArticulosPublicosEditoriales(
        clienteSupabase,
        limitePagina,
        desplazamiento
      )
      if (!pagina.length) {
        ventanaCompletada = true
        break
      }

      const recientes = filtrarPublicacionesVentanaNews(pagina, limite.getTime(), ahora)
      publicaciones.push(...recientes)
      desplazamiento += pagina.length

      // La RPC entrega primero lo más reciente; una vez superadas las 48 h,
      // no hay artículos posteriores que debamos incluir.
      const hayArticulosFueraDeVentana = pagina.some((articulo) => {
        const fecha = Date.parse(articulo.publicadoEn)
        return Number.isFinite(fecha) && fecha < limite.getTime()
      })
      if (hayArticulosFueraDeVentana || pagina.length < limitePagina) {
        ventanaCompletada = true
        break
      }
    }

    // Si el presupuesto se agotó sin una fecha antigua que cierre la ventana,
    // comprueba una sola fila adicional antes de declarar completa la salida.
    if (
      !ventanaCompletada
      && publicaciones.length < MAX_NOTICIAS_GOOGLE
      && desplazamiento >= MAX_FILAS_EXAMINADAS_GOOGLE
    ) {
      const siguiente = await listarArticulosPublicosEditoriales(clienteSupabase, 1, desplazamiento)
      const fechaSiguiente = siguiente[0] ? Date.parse(siguiente[0].publicadoEn) : Number.NaN
      const existeFinDeVentana = !siguiente.length
        || (Number.isFinite(fechaSiguiente) && fechaSiguiente < limite.getTime())

      if (!existeFinDeVentana) {
        throw new Error('El sitemap de noticias excede el presupuesto de filas examinadas.')
      }
    }
  } catch {
    disponible = false
    publicaciones.length = 0
  }

  const urls = publicaciones.map(articulo => [
    '  <url>',
    `    <loc>${escaparXml(construirUrlAbsoluta(urlSitio, `/articulos/${articulo.slug}`))}</loc>`,
    '    <news:news>',
    '      <news:publication><news:name>Pont3la10</news:name><news:language>es</news:language></news:publication>',
    `      <news:publication_date>${escaparXml(articulo.publicadoEn)}</news:publication_date>`,
    `      <news:title>${escaparXml(articulo.titulo)}</news:title>`,
    '    </news:news>',
    '  </url>'
  ].join('\n')).join('\n')

  if (disponible) {
    prepararRespuestaSitemap(evento)
  } else {
    registrarFalloSitemap(evento, 'news')
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${urls}\n</urlset>`
})
