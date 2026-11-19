import { construirHeadSeoPont3la10, type OpcionesSeoPont3la10 } from '~/utils/headSeoPont3la10'
import { origenDelSitio } from '~/utils/sitio'

type EntradaSeoPont3la10 = OpcionesSeoPont3la10 | (() => OpcionesSeoPont3la10)

export function useSeoPont3la10(entrada: EntradaSeoPont3la10) {
  const configuracion = useRuntimeConfig()
  const { id, sitio } = useSitio()
  const opciones = computed(() => {
    const base = typeof entrada === 'function' ? entrada() : entrada
    // Un sitio aún sin lanzar nunca se indexa, aunque la página pida lo contrario.
    return sitio.value.indexable ? base : { ...base, robots: 'noindex, nofollow' }
  })
  const urlSitio = computed(() => origenDelSitio(id.value, String(configuracion.public.siteUrl)))

  useHead(() => construirHeadSeoPont3la10(urlSitio.value, opciones.value, {
    nombre: sitio.value.nombre,
    ogLocale: sitio.value.ogLocale
  }))
}
