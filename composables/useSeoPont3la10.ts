import {
  construirUrlAbsoluta,
  imagenSeoPredeterminada,
  robotsIndexables,
  serializarJsonLd
} from '~/utils/seo'

interface OpcionesSeoPont3la10 {
  titulo: string
  descripcion: string
  rutaCanonica?: string
  imagen?: string
  tipoOpenGraph?: 'website' | 'article'
  robots?: string
  datosEstructurados?: Record<string, unknown> | Array<Record<string, unknown>>
}

type EntradaSeoPont3la10 = OpcionesSeoPont3la10 | (() => OpcionesSeoPont3la10)

export function useSeoPont3la10(entrada: EntradaSeoPont3la10) {
  const configuracion = useRuntimeConfig()
  const opciones = computed(() => typeof entrada === 'function' ? entrada() : entrada)
  const urlSitio = computed(() => String(configuracion.public.siteUrl))
  const canonical = computed(() => construirUrlAbsoluta(urlSitio.value, opciones.value.rutaCanonica || '/'))
  const imagen = computed(() => construirUrlAbsoluta(
    urlSitio.value,
    opciones.value.imagen || imagenSeoPredeterminada
  ))

  useHead(() => ({
    title: opciones.value.titulo,
    meta: [
      { name: 'description', content: opciones.value.descripcion },
      { name: 'robots', content: opciones.value.robots || robotsIndexables },
      { property: 'og:title', content: opciones.value.titulo },
      { property: 'og:description', content: opciones.value.descripcion },
      { property: 'og:type', content: opciones.value.tipoOpenGraph || 'website' },
      { property: 'og:url', content: canonical.value },
      { property: 'og:image', content: imagen.value },
      { property: 'og:image:alt', content: opciones.value.titulo },
      { property: 'og:locale', content: 'es_CO' },
      { property: 'og:site_name', content: 'Pont3la10' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: opciones.value.titulo },
      { name: 'twitter:description', content: opciones.value.descripcion },
      { name: 'twitter:image', content: imagen.value }
    ],
    link: opciones.value.robots?.startsWith('noindex')
      ? []
      : [{ rel: 'canonical', href: canonical.value }],
    script: opciones.value.datosEstructurados
      ? [{
          key: 'datos-estructurados-pagina',
          type: 'application/ld+json',
          innerHTML: serializarJsonLd(opciones.value.datosEstructurados)
        }]
      : []
  }))
}
