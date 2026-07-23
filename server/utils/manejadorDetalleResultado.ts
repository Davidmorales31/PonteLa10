import type {
  AlineacionPartido,
  DetallePartidoResultado,
  EventoPartido,
  FixtureApiFootball,
  PosicionClasificacion,
  RespuestaApiFootball
} from '~/types/resultados'
import {
  consultarClasificacionApiBasketball,
  consultarEstadisticasApiBasketball,
  consultarPartidoApiBasketball
} from '~/server/utils/clienteApiBasketball'
import { consultarDetalleAdicionalTheSportsDb, consultarEventoTheSportsDb } from '~/server/utils/clienteTheSportsDb'
import {
  mapearClasificacionApiBasketball,
  mapearEstadisticasApiBasketball,
  mapearPartidoApiBasketball
} from '~/utils/resultadosBasketball'
import { crearNombreCorto, mapearFixtureApiFootball } from '~/utils/resultadosDeportivos'
import {
  mapearAlineacionesTheSportsDb,
  mapearEstadisticasTheSportsDb,
  mapearEventoTheSportsDb,
  mapearLineaTiempoTheSportsDb
} from '~/utils/resultadosTheSportsDb'

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
  const coincidenciaTheSportsDb = idPartido.match(/^tsdb-(?:(futbol|baloncesto|tenis|beisbol)-)?(\d+)$/)

  if (coincidenciaTheSportsDb) {
    return consultarDetalleGratuito(coincidenciaTheSportsDb[2]!, {
      baseUrl: configuracion.theSportsDbBaseUrl,
      apiKey: configuracion.theSportsDbApiKey
    }, (coincidenciaTheSportsDb[1] || 'futbol') as DetallePartidoResultado['partido']['deporte'])
  }

  if (/^basket-\d+$/.test(idPartido)) {
    return consultarDetalleBasketball(idPartido.replace('basket-', ''), {
      baseUrl: String(configuracion.apiBasketballBaseUrl),
      apiKey: String(configuracion.apiBasketballKey)
    })
  }

  if (!apiSportsKey) {
    throw createError({ statusCode: 503, statusMessage: 'El servicio de resultados no está configurado.' })
  }

  if (!/^\d+$/.test(idPartido)) {
    throw createError({ statusCode: 400, statusMessage: 'El identificador del partido no es válido.' })
  }

  const headers = { 'x-apisports-key': apiSportsKey }
  const respuestaFixture = await $fetch<RespuestaApiFootball<FixtureApiFootball>>(
    `${configuracion.apiSportsBaseUrl}/fixtures`,
    {
      query: { id: idPartido },
      headers,
      timeout: 8_000,
      retry: 1
    }
  )
  const fixture = respuestaFixture.response[0]

  if (respuestaFixture.errors && Object.keys(respuestaFixture.errors).length) {
    throw createError({ statusCode: 502, statusMessage: 'El proveedor principal no respondió correctamente.' })
  }

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

async function consultarDetalleGratuito(
  idPartido: string,
  configuracion: { baseUrl: string; apiKey: string },
  deporte: DetallePartidoResultado['partido']['deporte']
): Promise<DetallePartidoResultado> {
  const respuestaEvento = await consultarEventoTheSportsDb(configuracion, idPartido)
  const evento = respuestaEvento.events?.[0]

  if (!evento) {
    throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
  }

  const detalleAdicional = await consultarDetalleAdicionalTheSportsDb(configuracion, idPartido)

  return {
    partido: mapearEventoTheSportsDb(evento, deporte),
    eventos: mapearLineaTiempoTheSportsDb(detalleAdicional.lineaTiempo.timeline || []),
    estadisticas: mapearEstadisticasTheSportsDb(detalleAdicional.estadisticas.eventstats || []),
    alineaciones: mapearAlineacionesTheSportsDb(detalleAdicional.alineaciones.lineup || []),
    clasificacion: [],
    actualizadoEn: new Date().toISOString(),
    origen: 'the-sports-db'
  }
}

async function consultarDetalleBasketball(
  idPartido: string,
  configuracion: { baseUrl: string; apiKey: string }
): Promise<DetallePartidoResultado> {
  if (!configuracion.apiKey) {
    throw createError({ statusCode: 503, statusMessage: 'API-Basketball no está configurada.' })
  }

  const partido = await consultarPartidoApiBasketball(configuracion, idPartido)
  if (!partido) {
    throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
  }

  const [estadisticas, clasificacion] = await Promise.all([
    consultarEstadisticasApiBasketball(configuracion, idPartido),
    consultarClasificacionApiBasketball(configuracion, partido.league.id, partido.league.season)
  ])

  return {
    partido: mapearPartidoApiBasketball(partido),
    eventos: [],
    estadisticas: mapearEstadisticasApiBasketball(partido, estadisticas),
    alineaciones: [],
    clasificacion: mapearClasificacionApiBasketball(clasificacion),
    actualizadoEn: new Date().toISOString(),
    origen: 'api-basketball'
  }
}

async function consultarProveedor<T>(url: string, query: Record<string, string | number>, headers: Record<string, string>): Promise<T[]> {
  try {
    const respuesta = await $fetch<RespuestaApiFootball<T>>(url, { query, headers })
    return respuesta.response || []
  } catch {
    return []
  }
}

function mapearEventos(eventos: EventoApiFootball[]): EventoPartido[] {
  return eventos.map((evento, indice) => {
    const tipo = obtenerTipoEvento(evento.type, evento.detail)
    const esCambio = tipo === 'cambio'

    return {
      id: `api-evento-${indice}`,
      minuto: `${evento.time.elapsed}${evento.time.extra ? `+${evento.time.extra}` : ''}′`,
      tipo,
      equipoId: String(evento.team.id),
      jugador: esCambio
        ? evento.assist?.name || evento.player.name || 'Jugador'
        : evento.player.name || 'Jugador',
      detalle: obtenerDetalleEvento(evento, tipo)
    }
  })
}

function obtenerDetalleEvento(evento: EventoApiFootball, tipo: EventoPartido['tipo']): string {
  if (tipo === 'gol') {
    return evento.assist?.name ? `Asistencia: ${evento.assist.name}` : traducirDetalleEvento(evento.detail)
  }

  if (tipo === 'cambio') {
    return evento.player.name ? `Entra · Sale: ${evento.player.name}` : 'Cambio'
  }

  return traducirDetalleEvento(evento.detail)
}

function traducirDetalleEvento(detalle: string): string {
  const detalleNormalizado = detalle.toLocaleLowerCase('es')

  if (detalleNormalizado.includes('yellow')) return 'Tarjeta amarilla'
  if (detalleNormalizado.includes('red')) return 'Tarjeta roja'
  if (detalleNormalizado.includes('penalty')) return 'Gol de penal'
  if (detalleNormalizado.includes('own goal')) return 'Autogol'
  if (detalleNormalizado.includes('normal goal')) return 'Gol'

  return detalle || 'Evento del partido'
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
