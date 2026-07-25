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
