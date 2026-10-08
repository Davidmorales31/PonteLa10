import {
  combinarVary,
  obtenerCabecerasCachePublica,
  solicitudPuedeUsarCachePublica,
  type TipoCachePublica
} from '~/utils/cachePublica'

export function useCachePublica(tipo: TipoCachePublica): boolean {
  if (!import.meta.server) return false

  const solicitud = useRequestHeaders(['cookie', 'authorization'])
  const cacheControl = useResponseHeader('Cache-Control')
  const cdnCacheControl = useResponseHeader('CDN-Cache-Control')
  const vary = useResponseHeader('Vary')
  const setCookie = useResponseHeader('Set-Cookie')

  vary.value = combinarVary(vary.value, ['Cookie', 'Authorization'])
  const puedeCachear = solicitudPuedeUsarCachePublica({
    cookie: solicitud.cookie,
    authorization: solicitud.authorization,
    setCookie: Boolean(setCookie.value)
  })

  if (!puedeCachear) {
    cacheControl.value = 'private, no-store'
    cdnCacheControl.value = 'no-store'
    return false
  }

  const cabeceras = obtenerCabecerasCachePublica(tipo)
  cacheControl.value = cabeceras.cacheControl
  cdnCacheControl.value = cabeceras.cdnCacheControl
  return true
}
