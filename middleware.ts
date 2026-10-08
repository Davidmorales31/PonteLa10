import { next } from '@vercel/functions'
import {
  CABECERA_VARIANTE_CACHE_PUBLICA,
  obtenerVarianteCachePublica
} from './utils/cachePublica.js'

export const config = {
  matcher: [
    '/articulos/:path*',
    '/equipos/:path*',
    '/competiciones/:path*',
    '/partidos/:path*',
    '/liga-colombiana',
    '/api/articulos/:path*',
    '/api/equipos/:path*',
    '/api/competiciones/:path*',
    '/api/jornadas/:path*',
    '/api/partidos-seo/:path*',
    '/api/liga-colombiana',
    '/sitemap.xml',
    '/sitemap-index.xml',
    '/sitemap-articles.xml',
    '/sitemap-competitions.xml',
    '/sitemap-hubs.xml',
    '/sitemap-matches.xml',
    '/sitemap-pages.xml',
    '/sitemap-players.xml',
    '/sitemap-rounds.xml',
    '/sitemap-teams.xml',
    '/news-sitemap.xml'
  ]
}

export default function middleware(request: Request): Response {
  const requestHeaders = new Headers(request.headers)
  const variante = obtenerVarianteCachePublica({
    cookie: request.headers.get('cookie') || undefined,
    authorization: request.headers.get('authorization') || undefined
  })

  requestHeaders.set(CABECERA_VARIANTE_CACHE_PUBLICA, variante)
  return next({ request: { headers: requestHeaders } })
}
