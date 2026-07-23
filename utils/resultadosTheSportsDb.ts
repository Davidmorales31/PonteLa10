import type {
  AlineacionPartido,
  DeporteResultado,
  EstadoPartido,
  EstadisticaPartido,
  EventoPartido,
  PartidoResultado
} from '~/types/resultados'
import type {
  EstadisticaTheSportsDb,
  EventoLineaTiempoTheSportsDb,
  EventoTheSportsDb,
  JugadorAlineacionTheSportsDb
} from '~/types/theSportsDb'
import { crearNombreCorto } from '~/utils/resultadosDeportivos'

const estadosEnVivo = new Set([
  '1H', '2H', 'HT', 'ET', 'LIVE', 'IN PLAY', 'IN_PROGRESS',
  'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'BT'
])
const estadosFinalizados = new Set([
  'FT', 'AET', 'PEN', 'AP', 'FINAL', 'MATCH FINISHED', 'AOT', 'AWD'
])

export function mapearEventoTheSportsDb(
  evento: EventoTheSportsDb,
  deportePredeterminado: DeporteResultado = 'futbol'
): PartidoResultado {
  const estado = obtenerEstadoTheSportsDb(evento.strStatus, evento.strProgress)
  const fechaIso = obtenerFechaIsoTheSportsDb(evento)
  const deporte = obtenerDeporteTheSportsDb(evento.strSport) || deportePredeterminado
  const prefijo = deporte === 'futbol' ? 'tsdb' : `tsdb-${deporte}`

  return {
    id: `${prefijo}-${evento.idEvent}`,
    deporte,
    competencia: evento.strLeague || `Competencia de ${obtenerEtiquetaDeporte(deporte)}`,
    paisCompetencia: evento.strCountry || undefined,
    jornada: obtenerJornada(evento.intRound),
    temporada: convertirNumero(evento.strSeason),
    fechaIso,
    estado,
    minuto: estado === 'en-vivo' ? extraerMinuto(evento.strProgress) : undefined,
    periodo: estado === 'en-vivo' && !extraerMinuto(evento.strProgress) ? evento.strProgress || 'En vivo' : undefined,
    equipoLocal: {
      id: evento.idHomeTeam || `tsdb-local-${evento.idEvent}`,
      nombre: evento.strHomeTeam || 'Equipo local',
      nombreCorto: crearNombreCorto(evento.strHomeTeam || 'Local'),
      logo: evento.strHomeTeamBadge || undefined
    },
    equipoVisitante: {
      id: evento.idAwayTeam || `tsdb-visitante-${evento.idEvent}`,
      nombre: evento.strAwayTeam || 'Equipo visitante',
      nombreCorto: crearNombreCorto(evento.strAwayTeam || 'Visitante'),
      logo: evento.strAwayTeamBadge || undefined
    },
    marcadorLocal: convertirNumero(evento.intHomeScore),
    marcadorVisitante: convertirNumero(evento.intAwayScore),
    estadio: evento.strVenue || undefined,
    ciudad: evento.strCity || undefined,
    destacado: esEventoDestacado(evento)
  }
}

export function mapearLineaTiempoTheSportsDb(lineaTiempo: EventoLineaTiempoTheSportsDb[]): EventoPartido[] {
  return lineaTiempo.map((evento) => {
    const tipo = obtenerTipoEvento(evento)
    const esCambio = tipo === 'cambio'

    return {
      id: `tsdb-evento-${evento.idTimeline}`,
      minuto: `${convertirNumero(evento.intTime) ?? 0}′`,
      tipo,
      equipoId: evento.idTeam || '',
      jugador: esCambio
        ? evento.strAssist || evento.strPlayer || 'Jugador'
        : evento.strPlayer || 'Jugador',
      detalle: obtenerDetalleEvento(evento, tipo)
    }
  })
}

export function mapearEstadisticasTheSportsDb(estadisticas: EstadisticaTheSportsDb[]): EstadisticaPartido[] {
  return estadisticas
    .filter(estadistica => estadistica.strStat)
    .map(estadistica => ({
      clave: normalizarClave(estadistica.strStat!),
      etiqueta: traducirEstadistica(estadistica.strStat!),
      local: convertirNumero(estadistica.intHome) ?? 0,
      visitante: convertirNumero(estadistica.intAway) ?? 0
    }))
}

export function mapearAlineacionesTheSportsDb(jugadores: JugadorAlineacionTheSportsDb[]): AlineacionPartido[] {
  const titulares = jugadores.filter(jugador => jugador.strSubstitute?.toLocaleLowerCase('es') !== 'yes')
  const titularesPorEquipo = Map.groupBy(titulares, jugador => jugador.idTeam || '')

  if ([...titularesPorEquipo.values()].some(jugadoresEquipo => jugadoresEquipo.length < 11)) {
    return []
  }

  return [...titularesPorEquipo.entries()].map(([equipoId, jugadoresEquipo]) => ({
    equipoId,
    formacion: 'No disponible',
    entrenador: 'No disponible',
    titulares: jugadoresEquipo.map(jugador => (
      jugador.intSquadNumber
        ? `${jugador.intSquadNumber}. ${jugador.strPlayer || 'Jugador'}`
        : jugador.strPlayer || 'Jugador'
    ))
  }))
}

function obtenerDeporteTheSportsDb(deporte?: string | null): DeporteResultado | undefined {
  const deporteNormalizado = deporte?.trim().toLocaleLowerCase('es') || ''
  const equivalencias: Record<string, DeporteResultado> = {
    soccer: 'futbol',
    basketball: 'baloncesto',
    tennis: 'tenis',
    baseball: 'beisbol'
  }
  return equivalencias[deporteNormalizado]
}

function obtenerEtiquetaDeporte(deporte: DeporteResultado): string {
  const etiquetas: Record<DeporteResultado, string> = {
    futbol: 'fútbol',
    baloncesto: 'baloncesto',
    tenis: 'tenis',
    beisbol: 'béisbol'
  }
  return etiquetas[deporte]
}

function obtenerEstadoTheSportsDb(estado?: string | null, progreso?: string | null): EstadoPartido {
  const estadoNormalizado = estado?.trim().toLocaleUpperCase('es') || ''
  const progresoNormalizado = progreso?.trim().toLocaleUpperCase('es') || ''

  if (estadosEnVivo.has(estadoNormalizado) || progresoNormalizado.includes('LIVE')) return 'en-vivo'
  if (estadosFinalizados.has(estadoNormalizado) || progresoNormalizado === 'FINAL') return 'finalizado'
  return 'programado'
}

function obtenerFechaIsoTheSportsDb(evento: EventoTheSportsDb): string {
  const fecha = evento.strTimestamp || `${evento.dateEvent || '1970-01-01'}T${evento.strTime || '00:00:00'}`
  const fechaConZona = /(?:Z|[+-]\d{2}:\d{2})$/i.test(fecha) ? fecha : `${fecha}Z`
  return Number.isNaN(Date.parse(fechaConZona)) ? new Date(0).toISOString() : new Date(fechaConZona).toISOString()
}

function obtenerJornada(valor?: string | number | null): string | undefined {
  const jornada = convertirNumero(valor)
  return jornada && jornada > 0 ? `Jornada ${jornada}` : undefined
}

function obtenerTipoEvento(evento: EventoLineaTiempoTheSportsDb): EventoPartido['tipo'] {
  const tipo = evento.strTimeline?.toLocaleLowerCase('es') || ''
  const detalle = evento.strTimelineDetail?.toLocaleLowerCase('es') || ''

  if (tipo.includes('goal')) return 'gol'
  if (tipo.includes('subst')) return 'cambio'
  if (detalle.includes('red')) return 'tarjeta-roja'
  return 'tarjeta-amarilla'
}

function obtenerDetalleEvento(
  evento: EventoLineaTiempoTheSportsDb,
  tipo: EventoPartido['tipo']
): string {
  if (tipo === 'gol') return evento.strAssist ? `Asistencia: ${evento.strAssist}` : 'Gol'
  if (tipo === 'cambio') return evento.strPlayer ? `Entra · Sale: ${evento.strPlayer}` : 'Cambio'
  if (tipo === 'tarjeta-roja') return 'Tarjeta roja'
  return 'Tarjeta amarilla'
}

function traducirEstadistica(etiqueta: string): string {
  const traducciones: Record<string, string> = {
    'Ball Possession': 'Posesión',
    'Total Shots': 'Tiros',
    'Shots on Goal': 'Tiros al arco',
    'Shots off Goal': 'Tiros desviados',
    'Corner Kicks': 'Corners',
    Fouls: 'Faltas',
    'Total passes': 'Pases',
    'Passes accurate': 'Pases precisos',
    'Blocked Shots': 'Tiros bloqueados',
    'Shots insidebox': 'Tiros dentro del área'
  }
  return traducciones[etiqueta] || etiqueta
}

function normalizarClave(valor: string): string {
  return valor.trim().toLocaleLowerCase('es').replace(/\s+/g, '-')
}

function extraerMinuto(progreso?: string | null): number | undefined {
  const coincidencia = progreso?.match(/\d+/)
  return coincidencia ? Number(coincidencia[0]) : undefined
}

function convertirNumero(valor?: string | number | null): number | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : undefined
}

function esEventoDestacado(evento: EventoTheSportsDb): boolean {
  const pais = evento.strCountry?.toLocaleLowerCase('es') || ''
  const competencia = evento.strLeague?.toLocaleLowerCase('es') || ''
  return pais === 'colombia' || competencia.includes('world cup') || competencia.includes('champions')
}
