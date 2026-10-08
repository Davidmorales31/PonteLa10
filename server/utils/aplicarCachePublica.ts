import {
  getRequestHeader,
  getResponseHeader,
  removeResponseHeader,
  setResponseHeader,
  type H3Event
} from 'h3'
import {
  CABECERA_VARIANTE_CACHE_PUBLICA,
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

  // El middleware de Vercel establece una variante de dos valores antes de la
  // caché; Cookie queda fuera de Vary porque Vercel no almacena esa dimensión.
  const vary = combinarVary(
    getResponseHeader(evento, 'Vary')?.toString(),
    [CABECERA_VARIANTE_CACHE_PUBLICA],
    ['Cookie', 'Authorization']
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
