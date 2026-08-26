import type {
  CategoriaEditorial,
  PaginacionEditorial,
  TipoContenidoEditorial
} from './contenidoEditorial'

export type PlataformaIngestaEditorial =
  | 'web'
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'x'
  | 'facebook'

export type EstadoIngestaEditorial =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'draft_created'
  | 'failed'
  | 'cancelled'

export interface ReglasIngestaEditorial {
  tipoContenido: TipoContenidoEditorial | 'auto'
  conservarVideo: boolean
  exigirCreditos: boolean
  generarSeo: boolean
  idioma: 'es-CO'
}

export interface EntradaCrearIngestaEditorial {
  urlFuente: string
  tituloSugerido: string
  instrucciones: string
  categoriaId: string | null
  reglas: ReglasIngestaEditorial
}

export interface IngestaEditorial {
  id: string
  urlFuente: string
  urlNormalizada: string
  hostFuente: string
  plataforma: PlataformaIngestaEditorial
  estado: EstadoIngestaEditorial
  tituloSugerido: string
  instrucciones: string
  reglas: ReglasIngestaEditorial
  categoria: CategoriaEditorial | null
  solicitanteId: string
  solicitanteNombre: string
  articuloId: string | null
  intentos: number
  codigoError: string
  mensajeError: string
  creadoEn: string
  actualizadoEn: string
  iniciadoEn: string | null
  finalizadoEn: string | null
}

export interface RespuestaBandejaIngestasEditoriales {
  ingestas: IngestaEditorial[]
  paginacion: PaginacionEditorial
}

export interface IngestaEditorialCreada {
  id: string
  plataforma: PlataformaIngestaEditorial
  estado: EstadoIngestaEditorial
  urlNormalizada: string
  creadoEn: string
}

export interface ResultadoCancelacionIngestaEditorial {
  id: string
  estado: EstadoIngestaEditorial
  actualizadoEn: string
}
