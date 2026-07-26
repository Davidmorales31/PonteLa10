export interface MedioEditorial {
  id: string
  bucket: string
  ruta: string
  urlPublica: string
  nombreOriginal: string
  titulo: string
  textoAlternativo: string
  esDecorativa: boolean
  pieDeFoto: string
  credito: string
  urlFuente: string
  tipoMime: string
  tamanoBytes: number
  ancho: number
  alto: number
  creadoPor: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface PaginacionMediosEditoriales {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

export interface RespuestaBibliotecaMedios {
  medios: MedioEditorial[]
  paginacion: PaginacionMediosEditoriales
}

export interface MetadatosMedioEditorial {
  titulo: string
  textoAlternativo: string
  esDecorativa: boolean
  pieDeFoto: string
  credito: string
  urlFuente: string
}
