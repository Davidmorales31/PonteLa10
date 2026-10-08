import { prepararRespuestaSitemap, construirUrlsetSitemapPublico } from '~/server/utils/sitemapsPublicos'

const paginasPublicas = [
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
  '/quienes-somos',
  '/politica-editorial',
  '/correcciones',
  '/privacidad',
  '/terminos'
]

export default defineEventHandler((evento) => {
  prepararRespuestaSitemap(evento)
  const urlSitio = String(useRuntimeConfig().public.siteUrl)
  return construirUrlsetSitemapPublico(paginasPublicas.map(ruta => ({ ruta })), urlSitio)
})
