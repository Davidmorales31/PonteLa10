import { construirUrlAbsoluta, escaparXml } from '~/utils/seo'

interface EntradaSitemap {
  ruta: string
  frecuencia: 'daily' | 'weekly' | 'monthly'
  prioridad: string
}

export default defineEventHandler((evento) => {
  const configuracion = useRuntimeConfig()
  const urlSitio = String(configuracion.public.siteUrl)

  const entradas: EntradaSitemap[] = [
    { ruta: '/', frecuencia: 'daily', prioridad: '1.0' },
    { ruta: '/articulos', frecuencia: 'daily', prioridad: '0.9' },
    { ruta: '/resultados', frecuencia: 'daily', prioridad: '0.9' },
    { ruta: '/resultados/futbol', frecuencia: 'daily', prioridad: '0.8' },
    { ruta: '/resultados/baloncesto', frecuencia: 'daily', prioridad: '0.8' },
    { ruta: '/resultados/tenis', frecuencia: 'daily', prioridad: '0.7' },
    { ruta: '/resultados/beisbol', frecuencia: 'daily', prioridad: '0.7' },
    { ruta: '/especiales', frecuencia: 'weekly', prioridad: '0.8' }
  ]

  const urls = entradas.map(entrada => [
    '  <url>',
    `    <loc>${escaparXml(construirUrlAbsoluta(urlSitio, entrada.ruta))}</loc>`,
    `    <changefreq>${entrada.frecuencia}</changefreq>`,
    `    <priority>${entrada.prioridad}</priority>`,
    '  </url>'
  ].join('\n')).join('\n')

  evento.node?.res?.setHeader('Content-Type', 'application/xml; charset=utf-8')
  evento.node?.res?.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
})
