import { construirHeadSeoPont3la10, type OpcionesSeoPont3la10 } from '~/utils/headSeoPont3la10'

type EntradaSeoPont3la10 = OpcionesSeoPont3la10 | (() => OpcionesSeoPont3la10)

export function useSeoPont3la10(entrada: EntradaSeoPont3la10) {
  const configuracion = useRuntimeConfig()
  const opciones = computed(() => typeof entrada === 'function' ? entrada() : entrada)
  const urlSitio = computed(() => String(configuracion.public.siteUrl))

  useHead(() => construirHeadSeoPont3la10(urlSitio.value, opciones.value))
}
