import { prepararRespuestaSitemap, construirUrlsetSitemapPublico } from '~/server/utils/sitemapsPublicos'

// La página de Liga Colombiana es la única ficha pública de competición vigente.
export default defineEventHandler((evento) => {
  prepararRespuestaSitemap(evento)
  const urlSitio = String(useRuntimeConfig().public.siteUrl)
  return construirUrlsetSitemapPublico([
    { ruta: '/liga-colombiana', frecuencia: 'daily', prioridad: '0.9' }
  ], urlSitio)
})
