import { construirUrlAbsoluta, escaparXml } from './seo'

export interface ArticuloFeedRss {
  slug: string
  titulo: string
  resumen: string | null
  publicadoEn: string
  autorNombre: string | null
}

export function construirFeedRssEditorial(
  articulos: ArticuloFeedRss[],
  urlSitio: string,
  generadoEn = new Date()
): string {
  const fechaGeneracion = generadoEn.getTime()
  if (!Number.isFinite(fechaGeneracion)) throw new Error('La fecha de generación del feed no es válida.')

  const entradas = articulos.map((articulo) => {
    const publicadoEn = Date.parse(articulo.publicadoEn)
    if (!Number.isFinite(publicadoEn) || publicadoEn > fechaGeneracion) {
      throw new Error('El feed contiene fechas de publicación inválidas o futuras.')
    }

    return {
      ...articulo,
      fechaPublicacion: new Date(publicadoEn),
      url: construirUrlAbsoluta(urlSitio, `/articulos/${encodeURIComponent(articulo.slug)}`)
    }
  }).sort((a, b) => b.fechaPublicacion.getTime() - a.fechaPublicacion.getTime()
    || a.slug.localeCompare(b.slug))

  const items = entradas.map(articulo => [
    '    <item>',
    `      <title>${escaparXml(articulo.titulo)}</title>`,
    `      <link>${escaparXml(articulo.url)}</link>`,
    `      <guid isPermaLink="true">${escaparXml(articulo.url)}</guid>`,
    `      <pubDate>${escaparXml(articulo.fechaPublicacion.toUTCString())}</pubDate>`,
    `      <dc:creator>${escaparXml(articulo.autorNombre?.trim() || 'Equipo Pont3la10')}</dc:creator>`,
    `      <description>${escaparXml(articulo.resumen?.trim() || '')}</description>`,
    '    </item>'
  ].join('\n')).join('\n')

  const enlaceFeed = construirUrlAbsoluta(urlSitio, '/feed.xml')
  const enlaceInicio = construirUrlAbsoluta(urlSitio, '/')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    '    <title>Pont3la10: últimas publicaciones</title>',
    `    <link>${escaparXml(enlaceInicio)}</link>`,
    '    <description>Noticias, análisis y publicaciones deportivas de Pont3la10.</description>',
    '    <language>es-CO</language>',
    `    <atom:link href="${escaparXml(enlaceFeed)}" rel="self" type="application/rss+xml" />`,
    `    <lastBuildDate>${escaparXml(generadoEn.toUTCString())}</lastBuildDate>`,
    items,
    '  </channel>',
    '</rss>'
  ].join('\n')
}
