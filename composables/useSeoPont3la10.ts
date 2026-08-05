import {
  construirUrlAbsoluta,
  inferirTipoMimeImagen,
  imagenSeoPredeterminada,
  limiteDescripcionMeta,
  normalizarTextoMeta,
  robotsIndexables,
  serializarJsonLd
} from '~/utils/seo'

interface OpcionesSeoPont3la10 {
  titulo: string
  descripcion: string
  rutaCanonica?: string
  imagen?: string
  imagenAlt?: string
  imagenAncho?: number | null
  imagenAlto?: number | null
  imagenTipo?: string
  tipoOpenGraph?: 'website' | 'article'
  fechaPublicacion?: string
  fechaModificacion?: string
  seccion?: string
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
  const descripcion = computed(() => normalizarTextoMeta(
    opciones.value.descripcion,
    limiteDescripcionMeta
  ))

  useHead(() => {
    const imagenAlt = opciones.value.imagenAlt || opciones.value.titulo
    const imagenTipo = opciones.value.imagenTipo || inferirTipoMimeImagen(imagen.value)
    const meta = [
      { name: 'description', content: descripcion.value },
      { name: 'robots', content: opciones.value.robots || robotsIndexables },
      { property: 'og:title', content: opciones.value.titulo },
      { property: 'og:description', content: descripcion.value },
      { property: 'og:type', content: opciones.value.tipoOpenGraph || 'website' },
      { property: 'og:url', content: canonical.value },
      { property: 'og:image', content: imagen.value },
      ...(imagen.value.startsWith('https://')
        ? [{ property: 'og:image:secure_url', content: imagen.value }]
        : []),
      ...(imagenTipo
        ? [{ property: 'og:image:type', content: imagenTipo }]
        : []),
      ...(opciones.value.imagenAncho
        ? [{ property: 'og:image:width', content: String(opciones.value.imagenAncho) }]
        : []),
      ...(opciones.value.imagenAlto
        ? [{ property: 'og:image:height', content: String(opciones.value.imagenAlto) }]
        : []),
      { property: 'og:image:alt', content: imagenAlt },
      { property: 'og:locale', content: 'es_CO' },
      { property: 'og:site_name', content: 'Pont3la10' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: opciones.value.titulo },
      { name: 'twitter:description', content: descripcion.value },
      { name: 'twitter:image', content: imagen.value },
      { name: 'twitter:image:alt', content: imagenAlt },
      ...(opciones.value.fechaPublicacion
        ? [{ property: 'article:published_time', content: opciones.value.fechaPublicacion }]
        : []),
      ...(opciones.value.fechaModificacion
        ? [{ property: 'article:modified_time', content: opciones.value.fechaModificacion }]
        : []),
      ...(opciones.value.seccion
        ? [{ property: 'article:section', content: opciones.value.seccion }]
        : [])
    ]

    return {
      title: opciones.value.titulo,
      meta,
      link: opciones.value.robots?.startsWith('noindex')
        ? []
        : [
            { rel: 'canonical', href: canonical.value },
            { rel: 'image_src', href: imagen.value }
          ],
      script: opciones.value.datosEstructurados
        ? [{
            key: 'datos-estructurados-pagina',
            type: 'application/ld+json',
            innerHTML: serializarJsonLd(opciones.value.datosEstructurados)
          }]
        : []
    }
  })
}
