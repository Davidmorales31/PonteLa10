import {
  CABECERA_VARIANTE_CACHE_PUBLICA,
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

  const puedeCachear = solicitudPuedeUsarCachePublica({
    cookie: solicitud.cookie,
    authorization: solicitud.authorization,
    setCookie: Boolean(setCookie.value)
  })

  // El middleware de Vercel asigna la dimensión binaria antes de la caché.
  // No se usa Cookie en Vary porque es una dimensión de alta cardinalidad.
  vary.value = combinarVary(
    vary.value,
    [CABECERA_VARIANTE_CACHE_PUBLICA],
    ['Cookie', 'Authorization']
  )

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
