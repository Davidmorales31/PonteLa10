import { normalizarUrlSitio } from '~/utils/seo'

export default defineEventHandler((evento) => {
  const configuracion = useRuntimeConfig()
  const urlSitio = normalizarUrlSitio(String(configuracion.public.siteUrl))

  evento.node?.res?.setHeader('Content-Type', 'text/plain; charset=utf-8')
  evento.node?.res?.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${urlSitio}/sitemap.xml`
  ].join('\n')
})
