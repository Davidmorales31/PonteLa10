import { origenDelSitio } from '~/utils/sitio'

/** Origen público del sitio activo (Colombia: el configurado; México: su subdominio). Para URLs absolutas y datos estructurados. */
export function useOrigenSitio() {
  const { sitio } = useSitio()
  const configuracion = useRuntimeConfig()
  return computed(() => origenDelSitio(sitio.value.id, String(configuracion.public.siteUrl)))
}
