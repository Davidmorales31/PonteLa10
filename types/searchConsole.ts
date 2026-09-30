export interface MetricaSearchConsoleCsv {
  fecha: string
  consulta: string
  pagina: string
  clics: number
  impresiones: number
  ctr: number
  posicion: number
  estimada: false
}

export interface IncidenciaSearchConsoleCsv {
  fila: number
  campo: string
  mensaje: string
}

export interface ResultadoSearchConsoleCsv {
  filas: MetricaSearchConsoleCsv[]
  filasLeidas: number
  duplicados: number
  incidencias: IncidenciaSearchConsoleCsv[]
}

export interface OportunidadSearchConsole {
  consulta: string
  pagina: string
  clics: number
  impresiones: number
  ctr: number
  posicion: number
  estimada: boolean
}

export interface ResultadoImportacionSearchConsole {
  loteId: string
  filasProcesadas: number
}
