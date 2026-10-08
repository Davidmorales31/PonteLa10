import { setResponseHeader, setResponseStatus } from 'h3'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'
import { construirFeedRssEditorial } from '~/utils/rssEditorial'

const limiteArticulosFeed = 50

export default defineEventHandler(async (evento) => {
  setResponseHeader(evento, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  setResponseHeader(evento, 'CDN-Cache-Control', 'no-store')

  try {
    const urlSitio = String(useRuntimeConfig(evento).public.siteUrl)
    const clienteSupabase = obtenerClienteSupabaseAnonimo(evento)
    const articulos = await listarArticulosPublicosEditoriales(
      clienteSupabase,
      limiteArticulosFeed,
      0
    )
    const feed = construirFeedRssEditorial(articulos, urlSitio)

    aplicarCachePublica(evento, 'sitemap')
    return feed
  } catch {
    setResponseStatus(evento, 503)
    throw createError({ statusCode: 503, statusMessage: 'El feed público no está disponible temporalmente.' })
  }
})
