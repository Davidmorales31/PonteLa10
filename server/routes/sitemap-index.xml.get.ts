import { prepararRespuestaSitemap, construirIndiceSitemapPublico, rutasSitemapPublico } from '~/server/utils/sitemapsPublicos'

export default defineEventHandler((evento) => {
  prepararRespuestaSitemap(evento)
  const urlSitio = String(useRuntimeConfig().public.siteUrl)
  return construirIndiceSitemapPublico(
    rutasSitemapPublico.map(ruta => ({ ruta })),
    urlSitio
  )
})
