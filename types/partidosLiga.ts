export interface PartidoLiga {
  slug: string
  competencia: string
  temporada: string
  jornada: string | null
  fechaIso: string
  local: string
  visitante: string
  estado: string
  golesLocal: number | null
  golesVisitante: number | null
  estadio: string | null
  ciudad: string | null
  fuenteOficialUrl: string | null
  escudoLocal: string | null
  escudoVisitante: string | null
  equipoLocalSlug?: string
  equipoVisitanteSlug?: string
  verificadoEn: string
}
