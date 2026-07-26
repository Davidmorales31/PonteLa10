import type { MedioEditorial } from '~/types/mediaEditorial'

export type EstadoContenidoEditorial =
  | 'draft'
  | 'review'
  | 'changes_requested'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived'

export type TipoContenidoEditorial =
  | 'breve'
  | 'noticia'
  | 'analisis'
  | 'blog'
  | 'informe'
  | 'opinion'
  | 'especial'

export type OrigenContenidoEditorial =
  | 'manual'
  | 'ingesta'
  | 'importacion'
  | 'asistenteIa'

export type TipoTaxonomiaEditorial = 'categoria' | 'tema' | 'etiqueta'

export interface CategoriaEditorial {
  id: string
  slug: string
  nombre: string
  descripcion: string
  activa: boolean
  orden: number
}

export interface TemaEditorial {
  id: string
  slug: string
  nombre: string
  descripcion: string
  activo: boolean
}

export interface EtiquetaInternaEditorial {
  id: string
  slug: string
  nombre: string
  color: string
  activa: boolean
}

export interface TaxonomiasEditoriales {
  categorias: CategoriaEditorial[]
  temas: TemaEditorial[]
  etiquetas: EtiquetaInternaEditorial[]
}

export interface ArticuloBandejaEditorial {
  id: string
  slug: string
  titulo: string
  resumen: string
  estado: EstadoContenidoEditorial
  tipo: TipoContenidoEditorial
  origen: OrigenContenidoEditorial
  categoria: CategoriaEditorial | null
  autorId: string | null
  autorNombre: string
  actualizadoEn: string
  creadoEn: string
  versionBloqueo: number
}

export interface PaginacionEditorial {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

export interface RespuestaBandejaEditorial {
  contenidos: ArticuloBandejaEditorial[]
  paginacion: PaginacionEditorial
}

export interface BorradorCreadoEditorial {
  id: string
  slug: string
  titulo: string
  estado: EstadoContenidoEditorial
  creadoEn: string
}

export interface NodoTextoEditorial {
  type: 'text'
  text: string
}

export interface NodoParrafoEditorial {
  type: 'paragraph'
  content: NodoTextoEditorial[]
}

export interface NodoEncabezadoEditorial {
  type: 'heading'
  attrs: {
    level: 2 | 3
  }
  content: NodoTextoEditorial[]
}

export interface NodoCitaEditorial {
  type: 'blockquote'
  content: NodoParrafoEditorial[]
}

export interface NodoElementoListaEditorial {
  type: 'listItem'
  content: NodoParrafoEditorial[]
}

export interface NodoListaEditorial {
  type: 'bulletList' | 'orderedList'
  content: NodoElementoListaEditorial[]
}

export type NodoBloqueEditorial =
  | NodoParrafoEditorial
  | NodoEncabezadoEditorial
  | NodoCitaEditorial
  | NodoListaEditorial

export interface DocumentoEditorial {
  type: 'doc'
  content: NodoBloqueEditorial[]
}

export type TipoBloqueEditorEditorial =
  | 'parrafo'
  | 'encabezado2'
  | 'encabezado3'
  | 'cita'
  | 'lista'
  | 'listaNumerada'

export interface BloqueEditorEditorial {
  id: string
  tipo: TipoBloqueEditorEditorial
  texto: string
}

export interface FuenteArticuloEditorial {
  url: string
  nombre: string
  autor: string
  creditos: string
}

export interface SeoArticuloEditorial {
  titulo: string
  descripcion: string
  textoSocial: string
}

export interface DatosEditorArticulo {
  titulo: string
  slug: string
  resumen: string
  tipo: TipoContenidoEditorial
  categoriaId: string | null
  portadaId: string | null
  temaIds: string[]
  etiquetaIds: string[]
  documento: DocumentoEditorial
  fuente: FuenteArticuloEditorial
  seo: SeoArticuloEditorial
}

export interface AutoguardadoArticuloEditorial {
  datos: DatosEditorArticulo
  versionBase: number
  actualizadoEn: string
}

export interface ArticuloDetalleEditorial extends DatosEditorArticulo {
  id: string
  estado: EstadoContenidoEditorial
  origen: OrigenContenidoEditorial
  versionBloqueo: number
  autorId: string | null
  autorNombre: string
  actualizadoEn: string
  creadoEn: string
  revisadoEn: string | null
  aprobadoEn: string | null
  programadoPara: string | null
  publicadoEn: string | null
  tieneVersionPublica: boolean
  puedeEditar: boolean
  portada: MedioEditorial | null
  autoguardado: AutoguardadoArticuloEditorial | null
}

export interface ResultadoGuardadoEditorial {
  id: string
  slug: string
  versionBloqueo: number
  actualizadoEn: string
}

export interface VersionArticuloEditorial {
  id: string
  numero: number
  estado: EstadoContenidoEditorial
  tipo: 'initial' | 'manual' | 'transition' | 'publication' | 'restore'
  nota: string
  creadoPor: string | null
  creadoEn: string
  titulo: string
}

export interface CargaEditorArticuloEditorial {
  articulo: ArticuloDetalleEditorial
  taxonomias: TaxonomiasEditoriales
  versiones: VersionArticuloEditorial[]
  flujo: FlujoArticuloEditorial
}

export type IdAccionFlujoEditorial =
  | 'enviarRevision'
  | 'solicitarCambios'
  | 'aprobar'
  | 'programar'
  | 'publicar'
  | 'cancelarProgramacion'
  | 'crearRevision'
  | 'archivar'
  | 'reabrir'

export interface AccionFlujoEditorial {
  id: IdAccionFlujoEditorial
  estadoObjetivo: EstadoContenidoEditorial
  etiqueta: string
  descripcion: string
  requiereNota: boolean
  requiereProgramacion: boolean
  requiereMfa: boolean
}

export interface ComentarioRevisionEditorial {
  id: string
  tipo: 'comment' | 'changes_requested' | 'approval' | 'transition'
  mensaje: string
  autorId: string
  autorNombre: string
  creadoEn: string
}

export interface FlujoArticuloEditorial {
  estado: EstadoContenidoEditorial
  acciones: AccionFlujoEditorial[]
  comentarios: ComentarioRevisionEditorial[]
  programadoPara: string | null
  publicadoEn: string | null
  tieneVersionPublica: boolean
}

export interface ResultadoTransicionEditorial {
  id: string
  estado: EstadoContenidoEditorial
  versionBloqueo: number
  programadoPara: string | null
  publicadoEn: string | null
  actualizadoEn: string
}

export interface EntradaTransicionEditorial {
  estadoObjetivo: EstadoContenidoEditorial
  versionBloqueo: number
  nota: string
  programadoPara: string | null
}

export interface ElementoColaRevisionEditorial extends ArticuloBandejaEditorial {
  programadoPara: string | null
}

export interface ColaRevisionEditorial {
  enRevision: ElementoColaRevisionEditorial[]
  aprobados: ElementoColaRevisionEditorial[]
  programados: ElementoColaRevisionEditorial[]
}

export interface PortadaArticuloPublico {
  url: string
  textoAlternativo: string
  pieDeFoto: string
  credito: string
  ancho: number | null
  alto: number | null
}

export interface ArticuloPublicoEditorial {
  id: string
  versionId: string
  slug: string
  titulo: string
  resumen: string
  tipo: TipoContenidoEditorial
  documento: DocumentoEditorial
  seoTitulo: string
  seoDescripcion: string
  textoSocial: string
  publicadoEn: string
  autorNombre: string
  categoria: {
    slug: string
    nombre: string
  } | null
  portada: PortadaArticuloPublico | null
  fuente: FuenteArticuloEditorial
}

export interface ResumenArticuloPublico {
  id: string
  slug: string
  titulo: string
  resumen: string
  tipo: TipoContenidoEditorial
  publicadoEn: string
  autorNombre: string
  categoria: string
  imagen: string
}
