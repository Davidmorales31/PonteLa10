export interface EnlaceContextualSeo {
  nombre: string
  ruta: string
  fechaIso?: string
  detalle?: string
}

export interface NavegacionContextualPartidoSeo {
  equipoLocal: EnlaceContextualSeo | null
  equipoVisitante: EnlaceContextualSeo | null
  competencia: EnlaceContextualSeo | null
  siguientePartido: EnlaceContextualSeo | null
  resultadoAnterior: EnlaceContextualSeo | null
}
