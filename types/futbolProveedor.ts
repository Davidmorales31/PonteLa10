/** Identificadores de proveedores solo para uso interno del servidor. */
export type IdentificadorProveedorFutbol = 'goal-api' | 'api-football'

export type EstadoFixtureFutbol =
  | 'scheduled'
  | 'pre-match'
  | 'live'
  | 'halftime'
  | 'finished'
  | 'postponed'
  | 'suspended'
  | 'abandoned'
  | 'cancelled'
  | 'unknown'

export interface CuotaProveedorFutbol {
  limite?: number
  restante?: number
  reiniciaEn?: string
}

export interface RespuestaProveedorFutbol<T> {
  elementos: T[]
  consultadoEn: string
  /** Peticiones HTTP reales consumidas en esta respuesta. */
  solicitudes?: number
  cuota?: CuotaProveedorFutbol
  siguienteCursor?: string
}

export interface CompetenciaFutbolProveedor {
  idProveedor: string
  nombre: string
  pais?: string
  temporada?: number | string
  etapa?: string
  grupo?: string
  jornada?: string
}

export interface EquipoFutbolProveedor {
  idProveedor: string
  nombre: string
  nombreCorto?: string
  pais?: string
  /** Referencia interna; publicar insignias requiere derechos independientes. */
  insigniaUrl?: string
}

export interface PartidoFutbolProveedor {
  idProveedor: string
  competencia: CompetenciaFutbolProveedor
  inicioUtc: string
  estado: EstadoFixtureFutbol
  estadoProveedor?: string
  minutoTranscurrido?: number
  minutoTexto?: string
  periodo?: string
  local: EquipoFutbolProveedor
  visitante: EquipoFutbolProveedor
  golesLocal: number | null
  golesVisitante: number | null
  sede?: string
  ciudad?: string
}

export type TipoEventoFutbol =
  | 'goal'
  | 'penalty'
  | 'own-goal'
  | 'yellow-card'
  | 'red-card'
  | 'substitution'
  | 'var'
  | 'other'

export interface EventoFutbolProveedor {
  idProveedor: string
  minuto?: number
  minutoTexto?: string
  tipo: TipoEventoFutbol
  equipoIdProveedor?: string
  jugador?: string
  jugadorRelacionado?: string
  descripcion?: string
}

export interface JugadorAlineacionFutbolProveedor {
  idProveedor?: string
  nombre: string
  numero?: number
  posicion?: string
  titular: boolean
}

export interface AlineacionFutbolProveedor {
  equipoIdProveedor: string
  formacion?: string
  entrenador?: string
  jugadores: JugadorAlineacionFutbolProveedor[]
}

export interface EstadisticaFutbolProveedor {
  clave: string
  etiqueta: string
  valoresPorEquipo: Array<{
    equipoIdProveedor: string
    valor: number | string | null
  }>
  unidad?: string
}

export interface FilaClasificacionFutbolProveedor {
  posicion: number
  equipo: EquipoFutbolProveedor
  jugados: number
  ganados: number
  empatados: number
  perdidos: number
  golesFavor: number
  golesContra: number
  diferenciaGoles: number
  puntos: number
  forma?: string[]
  puntosDeduccion?: number
}

export interface GrupoClasificacionFutbolProveedor {
  id?: string
  nombre: string
  etapa?: string
  filas: FilaClasificacionFutbolProveedor[]
}

export interface ClasificacionFutbolProveedor {
  competencia: CompetenciaFutbolProveedor
  grupos: GrupoClasificacionFutbolProveedor[]
  consultadoEn: string
}

export interface PaqueteActualizacionFutbolProveedor {
  partido: PartidoFutbolProveedor
  eventos?: EventoFutbolProveedor[]
  alineaciones?: AlineacionFutbolProveedor[]
  estadisticas?: EstadisticaFutbolProveedor[]
}

export interface ConsultaPartidosPorFecha {
  fecha: string
  zonaHoraria: string
  cursor?: string
  limite?: number
}

export interface CapacidadesProveedorFutbol {
  fixturesPorFecha: boolean
  fixturesEnVivo: boolean
  detalleFixture: boolean
  eventos: boolean
  alineaciones: boolean
  estadisticas: boolean
  clasificaciones: boolean
  actualizacionPorLote: boolean
}
