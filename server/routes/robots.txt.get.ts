import { normalizarUrlSitio } from '~/utils/seo'
import { configuracionDelSitio, origenDelSitio } from '~/utils/sitio'
import { sitioDeSolicitud } from '~/server/utils/sitioDeSolicitud'

export default defineEventHandler((evento) => {
  const configuracion = useRuntimeConfig()
  const sitio = configuracionDelSitio(sitioDeSolicitud(evento))
  const urlSitio = normalizarUrlSitio(origenDelSitio(sitio.id, String(configuracion.public.siteUrl)))

  evento.node?.res?.setHeader('Content-Type', 'text/plain; charset=utf-8')
  evento.node?.res?.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')

  // Sitio sin lanzar: se bloquea todo hasta tener contenido propio.
  if (!sitio.indexable) return ['User-agent: *', 'Disallow: /'].join('\n')

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${urlSitio}/sitemap-index.xml`,
    `Sitemap: ${urlSitio}/news-sitemap.xml`
  ].join('\n')
})
