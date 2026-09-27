import type { PropuestaBorradorIa } from '~/utils/editorial/redaccionIa'

export interface SegmentoEvidenciaRedaccion {
  id: number
  inicioSegundos: number
  finSegundos: number
  texto: string
}

export interface EntradaRedaccionIa {
  ingestaId: string
  tituloSugerido: string
  instrucciones: string
  urlFuente: string
  creditos: string
  categoriaId: string | null
  tipoSugerido: string
  segmentos: SegmentoEvidenciaRedaccion[]
  contextoInvestigacion?: {
    consultaPrincipal: string
    consultasRelacionadas: string[]
    intencion: 'informativa' | 'navegacional' | 'analisis'
    resumen: string
    senalTendencia: { termino: string, titulo: string, url: string, observadaEn: string }
    fuentes: Array<{
      url: string
      titulo: string
      publisher: string
      publishedAt: string | null
      tipo: 'primaria' | 'secundaria'
      claims: string[]
    }>
    temasDisponibles: Array<{ id: string, nombre: string, descripcion: string }>
    articulosPublicados: Array<{ id: string, titulo: string, resumen: string, categoria: string }>
  }
}

export interface SeleccionEditorialIa {
  consultaPrincipal: string
  consultasRelacionadas: string[]
  intencion: 'informativa' | 'navegacional' | 'analisis'
  tagIds: string[]
  temasNuevos: Array<{ name: string, description: string }>
  relatedArticleIds: string[]
}

export interface ConsumoRedaccionIa {
  tokensEntrada: number | null
  tokensSalida: number | null
  tokensRazonamiento: number | null
  costoUsd: number | null
  versionTarifa: string | null
  duracionMs: number
}

export interface ResultadoRedaccionIa {
  propuesta: PropuestaBorradorIa
  proveedor: string
  modelo: string
  consumo: ConsumoRedaccionIa
  seleccionEditorial?: SeleccionEditorialIa
}

export interface ProveedorRedaccionIa {
  redactarBorrador(entrada: EntradaRedaccionIa): Promise<ResultadoRedaccionIa>
}
