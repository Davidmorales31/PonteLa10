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
  | 'evidence_ready'
  | 'draft_created'
  | 'failed'
  | 'cancelled'

export type EtapaIngestaEditorial =
  | 'validating_source'
  | 'reading_metadata'
  | 'downloading_audio'
  | 'transcribing'
  | 'translating'
  | 'persisting_evidence'
  | 'completed'

export type EstadoRedaccionIngestaEditorial =
  | 'running'
  | 'completed'
  | 'failed'
  | null

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
  preparadaParaRevisionEn: string | null
  codigoPreparacion: string
  estadoRedaccion: EstadoRedaccionIngestaEditorial
  etapaProcesamiento: EtapaIngestaEditorial | null
  progresoPorcentaje: number
  intentoActualId: string | null
  leaseHasta: string | null
  ultimaActividadEn: string | null
  idiomaFuente: string | null
  recuperable: boolean
  versionResultado: number
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

export interface ResultadoReencolarIngestaEditorial {
  id: string
  estado: EstadoIngestaEditorial
  encoladoEn: string
}

export interface ResultadoEliminacionIngestaEditorial {
  id: string
  eliminadoEn: string
}

export interface ResultadoBorradorDesdeIngesta {
  id: string
  slug: string
  yaExistia: boolean
}
