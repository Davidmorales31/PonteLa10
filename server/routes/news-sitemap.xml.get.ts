import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { construirUrlAbsoluta, escaparXml } from '~/utils/seo'

const horasNoticiasGoogle = 48

export default defineEventHandler(async (evento) => {
  const urlSitio = String(useRuntimeConfig().public.siteUrl)
  const limite = new Date(Date.now() - horasNoticiasGoogle * 60 * 60 * 1000)
  const publicaciones: Awaited<ReturnType<typeof listarArticulosPublicosEditoriales>> = []

  try {
    const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
    const tamanoPagina = 50
    let desplazamiento = 0

    while (true) {
      const pagina = await listarArticulosPublicosEditoriales(
        clienteSupabase,
        tamanoPagina,
        desplazamiento
      )
      if (!pagina.length) break

      const recientes = pagina.filter(articulo => new Date(articulo.publicadoEn) >= limite)
      publicaciones.push(...recientes)
      desplazamiento += pagina.length

      // La RPC entrega primero lo más reciente; una vez superadas las 48 h,
      // no hay artículos posteriores que debamos incluir.
      if (recientes.length !== pagina.length || pagina.length < tamanoPagina) break
    }
  } catch {
    // Un sitemap vacío es válido durante una degradación del catálogo público.
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

  evento.node?.res?.setHeader('Content-Type', 'application/xml; charset=utf-8')
  evento.node?.res?.setHeader('Cache-Control', 'public, max-age=900, s-maxage=3600')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${urls}\n</urlset>`
})
