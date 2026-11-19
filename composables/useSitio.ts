import { configuracionDelSitio, normalizarIdSitio, sitioDesdeHost, type ConfiguracionSitio, type IdSitio } from '~/utils/sitio'

/**
 * Sitio activo según el dominio de la petición (en servidor y en navegador).
 * Solo en desarrollo, `?sitio=mx` permite probar México desde localhost.
 */
export function useSitio() {
  const ruta = useRoute()
  const url = useRequestURL()
  const id = computed<IdSitio>(() => {
    if (import.meta.dev && ruta.query.sitio) return normalizarIdSitio(ruta.query.sitio, sitioDesdeHost(url.host))
    return sitioDesdeHost(url.host)
  })
  const sitio = computed<ConfiguracionSitio>(() => configuracionDelSitio(id.value))
  return { id, sitio, esMexico: computed(() => id.value === 'mx') }
}
