import {
  construirUrlAbsoluta,
  inferirTipoMimeImagen,
  imagenSeoPredeterminada,
  limiteDescripcionMeta,
  normalizarTextoMeta,
  robotsIndexables,
  serializarJsonLd
} from './seo'

export interface OpcionesSeoPont3la10 {
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

export function construirHeadSeoPont3la10(urlSitio: string, opciones: OpcionesSeoPont3la10) {
  const canonical = construirUrlAbsoluta(urlSitio, opciones.rutaCanonica || '/')
  const imagen = construirUrlAbsoluta(urlSitio, opciones.imagen || imagenSeoPredeterminada)
  const descripcion = normalizarTextoMeta(opciones.descripcion, limiteDescripcionMeta)
  const imagenAlt = opciones.imagenAlt || opciones.titulo
  const imagenTipo = opciones.imagenTipo || inferirTipoMimeImagen(imagen)
  const meta = [
    { name: 'description', content: descripcion },
    { name: 'robots', content: opciones.robots || robotsIndexables },
    { property: 'og:title', content: opciones.titulo },
    { property: 'og:description', content: descripcion },
    { property: 'og:type', content: opciones.tipoOpenGraph || 'website' },
    { property: 'og:url', content: canonical },
    { property: 'og:image', content: imagen },
    ...(imagen.startsWith('https://')
      ? [{ property: 'og:image:secure_url', content: imagen }]
      : []),
    ...(imagenTipo
      ? [{ property: 'og:image:type', content: imagenTipo }]
      : []),
    ...(opciones.imagenAncho
      ? [{ property: 'og:image:width', content: String(opciones.imagenAncho) }]
      : []),
    ...(opciones.imagenAlto
      ? [{ property: 'og:image:height', content: String(opciones.imagenAlto) }]
      : []),
    { property: 'og:image:alt', content: imagenAlt },
    { property: 'og:locale', content: 'es_CO' },
    { property: 'og:site_name', content: 'Pont3la10' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: opciones.titulo },
    { name: 'twitter:description', content: descripcion },
    { name: 'twitter:image', content: imagen },
    { name: 'twitter:image:alt', content: imagenAlt },
    ...(opciones.fechaPublicacion
      ? [{ property: 'article:published_time', content: opciones.fechaPublicacion }]
      : []),
    ...(opciones.fechaModificacion
      ? [{ property: 'article:modified_time', content: opciones.fechaModificacion }]
      : []),
    ...(opciones.seccion
      ? [{ property: 'article:section', content: opciones.seccion }]
      : [])
  ]

  return {
    title: opciones.titulo,
    meta,
    link: opciones.robots?.startsWith('noindex')
      ? []
      : [
          { rel: 'canonical', href: canonical },
          { rel: 'image_src', href: imagen }
        ],
    script: opciones.datosEstructurados
      ? [{
          key: 'datos-estructurados-pagina',
          type: 'application/ld+json',
          innerHTML: serializarJsonLd(opciones.datosEstructurados)
        }]
      : []
  }
}
