import { getRequestHeader, getResponseHeader, setResponseHeader, type H3Event } from 'h3'
import {
  combinarVary,
  obtenerCabecerasCachePublica,
  solicitudPuedeUsarCachePublica,
  type TipoCachePublica
} from '~/utils/cachePublica'

export function aplicarCachePublica(evento: H3Event, tipo: TipoCachePublica): boolean {
  setResponseHeader(
    evento,
    'Vary',
    combinarVary(getResponseHeader(evento, 'Vary')?.toString(), ['Cookie', 'Authorization'])
  )

  const setCookie = getResponseHeader(evento, 'Set-Cookie')
  const puedeCachear = solicitudPuedeUsarCachePublica({
    cookie: getRequestHeader(evento, 'cookie'),
    authorization: getRequestHeader(evento, 'authorization'),
    setCookie: Boolean(setCookie)
  })

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
