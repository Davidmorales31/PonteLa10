import { prepararRespuestaSitemap, construirUrlsetSitemapPublico } from '~/server/utils/sitemapsPublicos'

// No se publican URLs de equipo hasta que existan fichas públicas indexables.
export default defineEventHandler((evento) => {
  prepararRespuestaSitemap(evento)
  return construirUrlsetSitemapPublico([], String(useRuntimeConfig().public.siteUrl))
})
