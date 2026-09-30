import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { listarHubsIndexablesSitemap } from '~/server/utils/repositorioHubsPublicos'
import { construirUrlAbsoluta, escaparXml, normalizarFechaSeo } from '~/utils/seo'

interface EntradaSitemap {
  ruta: string
  ultimaModificacion?: string | null
}

export default defineEventHandler(async (evento) => {
  const configuracion = useRuntimeConfig()
  const urlSitio = String(configuracion.public.siteUrl)

  const entradas: EntradaSitemap[] = [
    '/',
    '/articulos',
    '/partidos-hoy',
    '/resultados',
    '/resultados/en-vivo',
    '/resultados/futbol',
    '/resultados/baloncesto',
    '/resultados/tenis',
    '/resultados/beisbol',
    '/especiales',
    '/privacidad',
    '/terminos'
  ].map(ruta => ({ ruta }))

  try {
    const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
    const tamanoPagina = 50
    let desplazamiento = 0
    let publicaciones: Awaited<ReturnType<typeof listarArticulosPublicosEditoriales>>

    do {
      publicaciones = await listarArticulosPublicosEditoriales(
        clienteSupabase,
        tamanoPagina,
        desplazamiento
      )
      entradas.push(...publicaciones.map(publicacion => ({
        ruta: `/articulos/${publicacion.slug}`,
        ultimaModificacion: publicacion.modificadoEn
      })))
      desplazamiento += publicaciones.length
    } while (publicaciones.length === tamanoPagina)
  } catch {
    // El sitemap base sigue disponible durante una degradación de Supabase.
  }

  try {
    const hubs = await listarHubsIndexablesSitemap(obtenerClienteSupabaseEditorial(evento))
    entradas.push(...hubs.map(hub => ({
      ruta: `/${hub.slug}`,
      ultimaModificacion: hub.actualizadoEn
    })))
  } catch {
    // Los hubs se omiten durante una degradación de Supabase.
  }

  const urls = entradas.map((entrada) => {
    const ultimaModificacion = normalizarFechaSeo(entrada.ultimaModificacion)
    return [
      '  <url>',
      `    <loc>${escaparXml(construirUrlAbsoluta(urlSitio, entrada.ruta))}</loc>`,
      ...(ultimaModificacion
        ? [`    <lastmod>${escaparXml(ultimaModificacion)}</lastmod>`]
        : []),
      '  </url>'
    ].join('\n')
  }).join('\n')

  evento.node?.res?.setHeader('Content-Type', 'application/xml; charset=utf-8')
  evento.node?.res?.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
})
