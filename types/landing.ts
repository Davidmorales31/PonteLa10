export type NombreIconoLanding =
  | 'balon'
  | 'banderaColombia'
  | 'campana'
  | 'chip'
  | 'comunidad'
  | 'control'
  | 'estrella'
  | 'mensajes'
  | 'noticias'
  | 'nube'
  | 'rayo'
  | 'tendencia'
  | 'trofeo'

export interface AccionLanding {
  etiqueta: string
  ruta: string
}

export interface ItemNavegacionLanding extends AccionLanding {
  exacta?: boolean
}

export interface EstadisticaHeroLanding {
  valor: string
  etiqueta: string
  icono: NombreIconoLanding
}

export interface TarjetaFlotanteLanding {
  categoria: string
  titulo: string
  detalle: string
  ruta: string
  icono: NombreIconoLanding
  tono: 'amarillo' | 'azul'
}

export interface SegmentoTituloLanding {
  texto: string
  destacado?: boolean
}

export interface HeroLanding {
  titulo: SegmentoTituloLanding[]
  descripcion: string
  accionPrincipal: AccionLanding
  accionSecundaria: AccionLanding
  imagen: string
  descripcionImagen: string
  estadisticas: EstadisticaHeroLanding[]
  tarjetasFlotantes: TarjetaFlotanteLanding[]
}

export interface ArticuloLanding {
  slug: string
  categoria: string
  titulo: string
  resumen?: string
  imagen: string
  descripcionImagen: string
  publicadoHace: string
  tiempoLectura: string
  ruta: string
  tonoCategoria?: 'amarillo' | 'azul' | 'verde' | 'violeta'
  posicionImagen?: string
  fuenteNombre?: string
  fuenteUrl?: string
}

export interface CategoriaLanding {
  etiqueta: string
  ruta: string
  icono: NombreIconoLanding
  variante?: 'colombia' | 'normal'
}

export interface EspecialLanding {
  titulo: string
  descripcion: string
  accion: AccionLanding
  icono: NombreIconoLanding
  posicionSprite: 'primero' | 'segundo' | 'tercero'
  badge?: string
}

export interface ArticuloTechLanding {
  titulo: string
  publicadoHace: string
  tiempoLectura: string
  ruta: string
  posicionSprite: 'primero' | 'segundo' | 'tercero' | 'cuarto'
  fuenteNombre?: string
  fuenteUrl?: string
}

export interface BeneficioCuentaLanding {
  texto: string
  icono: NombreIconoLanding
}

export interface CuentaCtaLanding {
  titulo: SegmentoTituloLanding[]
  beneficios: BeneficioCuentaLanding[]
  accionPrincipal: AccionLanding
  accionSecundaria: AccionLanding
}

export interface ColumnaFooterLanding {
  titulo: string
  enlaces: AccionLanding[]
}

export interface FooterLanding {
  descripcion: string
  columnas: ColumnaFooterLanding[]
  textoNewsletter: string
}
