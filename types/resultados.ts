export type DeporteResultado = 'futbol' | 'baloncesto' | 'tenis' | 'beisbol'
export type EstadoPartido = 'en-vivo' | 'finalizado' | 'programado'
export type OrigenResultados = 'api-sports'

export interface EquipoResultado {
  id: string
  nombre: string
  nombreCorto: string
  logo?: string
  pais?: string
}

export interface PartidoResultado {
  id: string
  deporte: DeporteResultado
  competencia: string
  paisCompetencia?: string
  jornada?: string
  temporada?: number
  fechaIso: string
  estado: EstadoPartido
  minuto?: number
  periodo?: string
  equipoLocal: EquipoResultado
  equipoVisitante: EquipoResultado
  marcadorLocal?: number
  marcadorVisitante?: number
  estadio?: string
  ciudad?: string
  destacado?: boolean
}

export interface PosicionClasificacion {
  posicion: number
  equipo: EquipoResultado
  jugados: number
  ganados: number
  empatados: number
  perdidos: number
  diferencia: number
  puntos: number
  destacado?: boolean
}

export interface EventoPartido {
  id: string
  minuto: string
  tipo: 'gol' | 'cambio' | 'tarjeta-amarilla' | 'tarjeta-roja'
  equipoId: string
  jugador: string
  detalle?: string
  marcador?: string
}

export interface EstadisticaPartido {
  clave: string
  etiqueta: string
  local: number
  visitante: number
  sufijo?: string
}

export interface AlineacionPartido {
  equipoId: string
  formacion: string
  titulares: string[]
  entrenador: string
}

export interface RespuestaResultados {
  partidos: PartidoResultado[]
  clasificacion: PosicionClasificacion[]
  actualizadoEn: string
  origen: OrigenResultados
  aviso?: string
}

export interface DetallePartidoResultado {
  partido: PartidoResultado
  estadisticas: EstadisticaPartido[]
  eventos: EventoPartido[]
  alineaciones: AlineacionPartido[]
  clasificacion: PosicionClasificacion[]
  actualizadoEn: string
  origen: OrigenResultados
  aviso?: string
}

export interface RespuestaMarcadorPartido {
  partido: PartidoResultado
  actualizadoEn: string
  origen: OrigenResultados
}

export interface EquipoApiFootball {
  id: number
  name: string
  logo?: string
}

export interface FixtureApiFootball {
  fixture: {
    id: number
    date: string
    status: {
      short: string
      long?: string
      elapsed?: number | null
    }
    venue?: {
      name?: string | null
      city?: string | null
    }
  }
  league: {
    id: number
    name: string
    country?: string
    round?: string
    season?: number
  }
  teams: {
    home: EquipoApiFootball
    away: EquipoApiFootball
  }
  goals: {
    home?: number | null
    away?: number | null
  }
}

export interface RespuestaApiFootball<T> {
  response: T[]
  errors?: Record<string, string>
  results?: number
}
