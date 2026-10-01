import type { EstadoFixtureFutbol, TipoEventoFutbol } from '~/types/futbolProveedor'

export type LadoPartidoFutbol = 'local' | 'visitante' | 'desconocido'

export interface EventoPartidoPublico {
  minuto: number | null
  minutoTexto: string | null
  tipo: TipoEventoFutbol
  lado: LadoPartidoFutbol
  jugador: string | null
  jugadorRelacionado: string | null
  descripcion: string | null
}

export interface JugadorAlineacionPublico {
  nombre: string
  numero: number | null
  posicion: string | null
  titular: boolean
}

export interface AlineacionPartidoPublica {
  lado: Exclude<LadoPartidoFutbol, 'desconocido'>
  formacion: string | null
  entrenador: string | null
  jugadores: JugadorAlineacionPublico[]
}

export interface EstadisticaPartidoPublica {
  clave: string
  etiqueta: string
  unidad: string | null
  local: number | string | null
  visitante: number | string | null
}

export interface FixtureFutbolPublico {
  id: string
  businessDate: string
  kickoffAt: string
  competition: { name: string; country: string | null; season: string; round: string | null; phase: string | null; group: string | null }
  homeTeam: { name: string }
  awayTeam: { name: string }
  status: EstadoFixtureFutbol
  externalStatus: string | null
  elapsed: number | null
  goalsHome: number | null
  goalsAway: number | null
  venue: { name: string | null; city: string | null }
  providerFetchedAt: string
  events: EventoPartidoPublico[]
  lineups: AlineacionPartidoPublica[]
  statistics: EstadisticaPartidoPublica[]
}

export interface FilaClasificacionPublica {
  posicion: number
  equipo: { nombre: string }
  jugados: number
  ganados: number
  empatados: number
  perdidos: number
  golesFavor: number
  golesContra: number
  diferenciaGoles: number
  puntos: number
  forma: string[]
  puntosDeduccion: number | null
}

export interface GrupoClasificacionPublico {
  nombre: string
  etapa: string | null
  filas: FilaClasificacionPublica[]
}

export interface ClasificacionFutbolPublica {
  businessDate: string
  competition: { name: string; season: string }
  providerFetchedAt: string
  groups: GrupoClasificacionPublico[]
}
