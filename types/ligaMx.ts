export interface PartidoLigaMx {
  id: string
  competencia: string
  competenciaNombre: string
  temporada: string
  torneo: string
  jornada: string
  fechaIso: string
  fechaMexico: string
  local: string
  visitante: string
  estado: string
  golesLocal: number | null
  golesVisitante: number | null
  estadio: string | null
  ciudad: string | null
  verificadoEn: string
}

export interface PosicionLigaMx {
  competencia: string
  competenciaNombre: string
  temporada: string
  fase: string
  equipoClave: string
  equipo: string
  posicion: number
  jugados: number
  ganados: number
  empatados: number
  perdidos: number
  golesFavor: number
  golesContra: number
  diferencia: number
  puntos: number
  verificadoEn: string
}

export interface RespuestaLigaMx {
  estado: 'disponible' | 'sin_datos'
  hoyMexico: string
  partidos: PartidoLigaMx[]
  tabla: PosicionLigaMx[]
  actualizadoEn: string | null
  consultadoEn: string
}

export const respuestaLigaMxVacia: RespuestaLigaMx = {
  estado: 'sin_datos', hoyMexico: '', partidos: [], tabla: [], actualizadoEn: null, consultadoEn: ''
}
