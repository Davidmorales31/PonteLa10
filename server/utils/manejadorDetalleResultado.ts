import type {
  AlineacionPartido,
  DetallePartidoResultado,
  EventoPartido,
  FixtureApiFootball,
  PosicionClasificacion,
  RespuestaApiFootball
} from '~/types/resultados'
import { crearNombreCorto, mapearFixtureApiFootball } from '~/utils/resultadosDeportivos'

interface EventoApiFootball {
  time: { elapsed: number; extra?: number | null }
  team: { id: number }
  player: { name?: string | null }
  assist?: { name?: string | null }
  type: string
  detail: string
}

interface EstadisticaEquipoApi {
  team: { id: number }
  statistics: Array<{ type: string; value: number | string | null }>
}

interface AlineacionApiFootball {
  team: { id: number; name: string; logo?: string }
  formation?: string
  coach?: { name?: string | null }
  startXI?: Array<{ player: { id: number; name: string; number?: number | null; pos?: string | null } }>
}

interface FilaClasificacionApi {
  rank: number
  team: { id: number; name: string; logo?: string }
  points: number
  goalsDiff: number
  all: { played: number; win: number; draw: number; lose: number }
}

interface ClasificacionApiFootball {
  league: { standings: FilaClasificacionApi[][] }
}

export default defineCachedEventHandler(async (evento): Promise<DetallePartidoResultado> => {
  const idPartido = getRouterParam(evento, 'id') || ''
  const configuracion = useRuntimeConfig()
  const apiSportsKey = String(configuracion.apiSportsKey || '')

  if (!apiSportsKey) {
    throw createError({ statusCode: 503, statusMessage: 'El servicio de resultados no está configurado.' })
  }

  if (!/^\d+$/.test(idPartido)) {
    throw createError({ statusCode: 400, statusMessage: 'El identificador del partido no es válido.' })
  }

  const headers = { 'x-apisports-key': apiSportsKey }
  const fixtures = await consultarProveedor<FixtureApiFootball>(
    `${configuracion.apiSportsBaseUrl}/fixtures`,
    { id: idPartido },
    headers
  )
  const fixture = fixtures[0]

  if (!fixture) {
    throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
  }

  const [eventos, estadisticas, alineaciones, clasificacion] = await Promise.all([
    consultarProveedor<EventoApiFootball>(`${configuracion.apiSportsBaseUrl}/fixtures/events`, { fixture: idPartido }, headers),
    consultarProveedor<EstadisticaEquipoApi>(`${configuracion.apiSportsBaseUrl}/fixtures/statistics`, { fixture: idPartido }, headers),
    consultarProveedor<AlineacionApiFootball>(`${configuracion.apiSportsBaseUrl}/fixtures/lineups`, { fixture: idPartido }, headers),
    consultarProveedor<ClasificacionApiFootball>(`${configuracion.apiSportsBaseUrl}/standings`, {
      league: fixture.league.id,
      season: fixture.league.season ?? new Date(fixture.fixture.date).getFullYear()
    }, headers)
  ])

  return {
    partido: mapearFixtureApiFootball(fixture),
    eventos: mapearEventos(eventos),
    estadisticas: mapearEstadisticas(estadisticas),
    alineaciones: mapearAlineaciones(alineaciones),
    clasificacion: mapearClasificacion(clasificacion),
    actualizadoEn: new Date().toISOString(),
    origen: 'api-sports'
  }
}, {
  maxAge: 300,
  getKey: evento => `detalle-partido-real-${getRouterParam(evento, 'id') || 'invalido'}`
})

async function consultarProveedor<T>(url: string, query: Record<string, string | number>, headers: Record<string, string>): Promise<T[]> {
  try {
    const respuesta = await $fetch<RespuestaApiFootball<T>>(url, { query, headers })
    return respuesta.response || []
  } catch {
    return []
  }
}

function mapearEventos(eventos: EventoApiFootball[]): EventoPartido[] {
  return eventos.map((evento, indice) => ({
    id: `api-evento-${indice}`,
    minuto: `${evento.time.elapsed}${evento.time.extra ? `+${evento.time.extra}` : ''}′`,
    tipo: obtenerTipoEvento(evento.type, evento.detail),
    equipoId: String(evento.team.id),
    jugador: evento.player.name || 'Jugador',
    detalle: evento.assist?.name ? `Asistencia: ${evento.assist.name}` : evento.detail
  }))
}

function mapearEstadisticas(equipos: EstadisticaEquipoApi[]) {
  if (equipos.length < 2) return []
  const etiquetas = ['Ball Possession', 'Total Shots', 'Shots on Goal', 'Corner Kicks', 'Fouls', 'Total passes', 'Passes accurate']
  return etiquetas.map((tipo) => {
    const local = obtenerValorEstadistica(equipos[0]!, tipo)
    const visitante = obtenerValorEstadistica(equipos[1]!, tipo)
    return {
      clave: tipo.toLocaleLowerCase('es').replace(/\s+/g, '-'), etiqueta: traducirEstadistica(tipo),
      local: local.valor, visitante: visitante.valor,
      sufijo: local.porcentaje || visitante.porcentaje ? '%' : undefined
    }
  })
}

function mapearAlineaciones(alineaciones: AlineacionApiFootball[]): AlineacionPartido[] {
  return alineaciones.map(alineacion => ({
    equipoId: String(alineacion.team.id),
    formacion: alineacion.formation || 'Sin formación confirmada',
    entrenador: alineacion.coach?.name || 'No disponible',
    titulares: (alineacion.startXI || []).map(({ player }) => player.number ? `${player.number}. ${player.name}` : player.name)
  }))
}

function mapearClasificacion(respuestas: ClasificacionApiFootball[]): PosicionClasificacion[] {
  const filas = respuestas[0]?.league.standings[0] || []
  return filas.slice(0, 8).map(fila => ({
    posicion: fila.rank,
    equipo: { id: String(fila.team.id), nombre: fila.team.name, nombreCorto: crearNombreCorto(fila.team.name), logo: fila.team.logo },
    jugados: fila.all.played, ganados: fila.all.win, empatados: fila.all.draw, perdidos: fila.all.lose,
    diferencia: fila.goalsDiff, puntos: fila.points
  }))
}

function obtenerValorEstadistica(equipo: EstadisticaEquipoApi, tipo: string) {
  const valor = equipo.statistics.find(estadistica => estadistica.type === tipo)?.value
  const porcentaje = typeof valor === 'string' && valor.endsWith('%')
  return { valor: Number(String(valor ?? 0).replace('%', '')) || 0, porcentaje }
}

function traducirEstadistica(tipo: string): string {
  const traducciones: Record<string, string> = {
    'Ball Possession': 'Posesión', 'Total Shots': 'Tiros', 'Shots on Goal': 'Tiros al arco',
    'Corner Kicks': 'Corners', Fouls: 'Faltas', 'Total passes': 'Pases', 'Passes accurate': 'Pases precisos'
  }
  return traducciones[tipo] || tipo
}

function obtenerTipoEvento(tipo: string, detalle: string): EventoPartido['tipo'] {
  if (tipo === 'Goal') return 'gol'
  if (tipo === 'subst') return 'cambio'
  if (detalle.toLocaleLowerCase('es').includes('red')) return 'tarjeta-roja'
  return 'tarjeta-amarilla'
}
