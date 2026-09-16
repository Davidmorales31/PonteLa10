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
}

export interface ProveedorRedaccionIa {
  redactarBorrador(entrada: EntradaRedaccionIa): Promise<ResultadoRedaccionIa>
}
