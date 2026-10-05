import { setResponseHeader, setResponseStatus } from 'h3'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarPartidosSeoPublicos } from '~/server/utils/partidosSeoPublicos'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { construirUrlAbsoluta, escaparXml } from '~/utils/seo'

interface EntradaSitemap {
  ruta: string
  frecuencia: 'daily' | 'weekly' | 'monthly' | 'yearly'
  prioridad: string
  modificadoEn?: string
}

const MAX_ARTICULOS_SITEMAP = 40_000
const TAMANO_PAGINA_ARTICULOS = 50

export default defineEventHandler(async (evento) => {
  const configuracion = useRuntimeConfig()
  const urlSitio = String(configuracion.public.siteUrl)
  const entradas: EntradaSitemap[] = [
    { ruta: '/', frecuencia: 'daily', prioridad: '1.0' },
    { ruta: '/articulos', frecuencia: 'daily', prioridad: '0.9' },
    { ruta: '/partidos-hoy', frecuencia: 'daily', prioridad: '0.9' },
    { ruta: '/liga-colombiana', frecuencia: 'daily', prioridad: '0.9' },
    { ruta: '/colombianos-en-europa', frecuencia: 'daily', prioridad: '0.8' },
    { ruta: '/resultados', frecuencia: 'daily', prioridad: '0.9' },
    { ruta: '/resultados/en-vivo', frecuencia: 'daily', prioridad: '0.8' },
    { ruta: '/resultados/futbol', frecuencia: 'daily', prioridad: '0.8' },
    { ruta: '/resultados/baloncesto', frecuencia: 'daily', prioridad: '0.8' },
    { ruta: '/resultados/tenis', frecuencia: 'daily', prioridad: '0.7' },
    { ruta: '/resultados/beisbol', frecuencia: 'daily', prioridad: '0.7' },
    { ruta: '/especiales', frecuencia: 'weekly', prioridad: '0.8' },
    { ruta: '/privacidad', frecuencia: 'yearly', prioridad: '0.3' },
    { ruta: '/terminos', frecuencia: 'yearly', prioridad: '0.3' }
  ]

  setResponseHeader(evento, 'Content-Type', 'application/xml; charset=utf-8')

  try {
    const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
    const partidos = await listarPartidosSeoPublicos(clienteSupabase)
    for (const partido of partidos) {
      entradas.push(
        { ruta: `/donde-ver/${partido.slug}`, frecuencia: 'daily', prioridad: '0.8', modificadoEn: partido.verificadoEn },
        { ruta: `/como-quedo/${partido.slug}`, frecuencia: 'daily', prioridad: '0.8', modificadoEn: partido.verificadoEn }
      )
    }

    let desplazamiento = 0
    while (true) {
      const publicaciones = await listarArticulosPublicosEditoriales(
        clienteSupabase,
        TAMANO_PAGINA_ARTICULOS,
        desplazamiento
      )
      entradas.push(...publicaciones.map(publicacion => ({
        ruta: `/articulos/${publicacion.slug}`,
        frecuencia: 'weekly' as const,
        prioridad: '0.8'
      })))
      desplazamiento += publicaciones.length

      if (publicaciones.length < TAMANO_PAGINA_ARTICULOS) break
      if (desplazamiento >= MAX_ARTICULOS_SITEMAP) {
        const hayMasPublicaciones = await listarArticulosPublicosEditoriales(clienteSupabase, 1, desplazamiento)
        if (hayMasPublicaciones.length) throw new Error('El sitemap de artículos supera el máximo seguro.')
        break
      }
    }
  } catch {
    // Una degradación no debe publicar ni cachear silenciosamente un sitemap incompleto.
    setResponseStatus(evento, 503, 'Sitemap temporalmente no disponible')
    setResponseHeader(evento, 'Cache-Control', 'no-store')
    return construirXmlSitemap(entradas, urlSitio)
  }

  setResponseHeader(evento, 'Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=300')
  return construirXmlSitemap(entradas, urlSitio)
})

function construirXmlSitemap(entradas: EntradaSitemap[], urlSitio: string): string {
  const urls = entradas.map(entrada => [
    '  <url>',
    `    <loc>${escaparXml(construirUrlAbsoluta(urlSitio, entrada.ruta))}</loc>`,
    ...(entrada.modificadoEn && Number.isFinite(Date.parse(entrada.modificadoEn))
      ? [`    <lastmod>${new Date(entrada.modificadoEn).toISOString()}</lastmod>`]
      : []),
    `    <changefreq>${entrada.frecuencia}</changefreq>`,
    `    <priority>${entrada.prioridad}</priority>`,
    '  </url>'
  ].join('\n')).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}
