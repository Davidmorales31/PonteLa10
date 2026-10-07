import { setResponseHeader, setResponseStatus, type H3Event } from 'h3'
import { construirUrlAbsoluta, escaparXml } from '~/utils/seo'

export interface EntradaSitemapPublico {
  ruta: string
  modificadoEn?: string | null
  frecuencia?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  prioridad?: string
}

export interface EntradaIndiceSitemapPublico {
  ruta: string
  modificadoEn?: string | null
}

export interface PublicacionSitemapNews {
  publicadoEn?: string | null
}

export const rutasSitemapPublico = [
  '/sitemap-pages.xml',
  '/sitemap-articles.xml',
  '/sitemap-matches.xml',
  '/sitemap-teams.xml',
  '/sitemap-competitions.xml',
  '/sitemap-rounds.xml',
  '/sitemap-players.xml',
  '/sitemap-hubs.xml',
  '/news-sitemap.xml'
] as const

export function construirUrlsetSitemapPublico(entradas: EntradaSitemapPublico[], urlSitio: string): string {
  const urls = entradas.map(entrada => [
    '  <url>',
    `    <loc>${escaparXml(construirUrlAbsoluta(urlSitio, entrada.ruta))}</loc>`,
    ...(normalizarFechaSitemap(entrada.modificadoEn)
      ? [`    <lastmod>${normalizarFechaSitemap(entrada.modificadoEn)}</lastmod>`]
      : []),
    ...(entrada.frecuencia ? [`    <changefreq>${entrada.frecuencia}</changefreq>`] : []),
    ...(entrada.prioridad ? [`    <priority>${entrada.prioridad}</priority>`] : []),
    '  </url>'
  ].join('\n')).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

export function construirIndiceSitemapPublico(entradas: EntradaIndiceSitemapPublico[], urlSitio: string): string {
  const mapas = entradas.map(entrada => [
    '  <sitemap>',
    `    <loc>${escaparXml(construirUrlAbsoluta(urlSitio, entrada.ruta))}</loc>`,
    ...(normalizarFechaSitemap(entrada.modificadoEn)
      ? [`    <lastmod>${normalizarFechaSitemap(entrada.modificadoEn)}</lastmod>`]
      : []),
    '  </sitemap>'
  ].join('\n')).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mapas}\n</sitemapindex>`
}

export function prepararRespuestaSitemap(evento: H3Event, cacheable = true): void {
  setResponseHeader(evento, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(
    evento,
    'Cache-Control',
    cacheable ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=300' : 'no-store'
  )
}

export function filtrarPublicacionesVentanaNews<T extends PublicacionSitemapNews>(
  publicaciones: T[],
  limiteMs: number,
  ahoraMs: number
): T[] {
  const fechas = publicaciones.map(publicacion => Date.parse(publicacion.publicadoEn ?? ''))
  if (fechas.some(fecha => !Number.isFinite(fecha) || fecha > ahoraMs)) {
    throw new Error('El sitemap de noticias contiene fechas inválidas o futuras.')
  }

  return publicaciones.filter((_, indice) => fechas[indice] >= limiteMs)
}

export function registrarFalloSitemap(evento: H3Event, tipo: string): void {
  setResponseStatus(evento, 503)
  prepararRespuestaSitemap(evento, false)
  setResponseHeader(evento, 'X-Sitemap-Status', 'degraded')
  // El estado HTTP y el log permiten observar la degradación sin exponer datos
  // de la respuesta del proveedor o información interna del CMS.
  console.error(`[sitemap:${tipo}] generación temporalmente no disponible`)
}

function normalizarFechaSitemap(valor?: string | null): string | null {
  if (!valor) return null
  const fecha = new Date(valor)
  return Number.isFinite(fecha.getTime()) ? fecha.toISOString() : null
}
