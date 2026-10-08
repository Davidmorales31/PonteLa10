import {
  getRequestHeader,
  getResponseHeader,
  removeResponseHeader,
  setResponseHeader,
  type H3Event
} from 'h3'
import {
  combinarVary,
  obtenerCabecerasCachePublica,
  solicitudPuedeUsarCachePublica,
  type TipoCachePublica
} from '~/utils/cachePublica'

export function aplicarCachePublica(evento: H3Event, tipo: TipoCachePublica): boolean {
  const setCookie = getResponseHeader(evento, 'Set-Cookie')
  const puedeCachear = solicitudPuedeUsarCachePublica({
    cookie: getRequestHeader(evento, 'cookie'),
    authorization: getRequestHeader(evento, 'authorization'),
    setCookie: Boolean(setCookie)
  })

  // Las solicitudes con sesión se marcan no-store. Las públicas no dependen de
  // cookies, y Vercel no almacena respuestas cuyo Vary incluya Cookie.
  const vary = combinarVary(
    getResponseHeader(evento, 'Vary')?.toString(),
    puedeCachear ? [] : ['Cookie', 'Authorization'],
    puedeCachear ? ['Cookie', 'Authorization'] : []
  )
  if (vary) setResponseHeader(evento, 'Vary', vary)
  else removeResponseHeader(evento, 'Vary')

  if (!puedeCachear) {
    setResponseHeader(evento, 'Cache-Control', 'private, no-store')
    setResponseHeader(evento, 'CDN-Cache-Control', 'no-store')
    return false
  }

  const cabeceras = obtenerCabecerasCachePublica(tipo)
  setResponseHeader(evento, 'Cache-Control', cabeceras.cacheControl)
  setResponseHeader(evento, 'CDN-Cache-Control', cabeceras.cdnCacheControl)
  return true
}
