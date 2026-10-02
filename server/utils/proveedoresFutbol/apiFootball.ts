import type {
  AlineacionFutbolProveedor,
  ClasificacionFutbolProveedor,
  CompetenciaFutbolProveedor,
  ConsultaPartidosPorFecha,
  EstadisticaFutbolProveedor,
  EventoFutbolProveedor,
  FilaClasificacionFutbolProveedor,
  GrupoClasificacionFutbolProveedor,
  PartidoFutbolProveedor,
  PaqueteActualizacionFutbolProveedor,
  RespuestaProveedorFutbol
} from '~/types/futbolProveedor'
import type { FixtureApiFootball } from '~/types/resultados'
import { ErrorProveedorFutbol } from './errores'
import type { ProveedorFutbol } from './contrato'

const BASE_URL_API_FOOTBALL = 'https://v3.football.api-sports.io'
const LIMITE_LOTE = 20
const TIEMPO_LIMITE_MS = 8_000

type TransporteApiFootball = (url: string, init: RequestInit) => Promise<Response>

export interface ConfiguracionApiFootball {
  apiKey: string
  baseUrl?: string
  transporte?: TransporteApiFootball
}

interface FixtureApiFootballExtendido extends FixtureApiFootball {
  events?: EventoCrudo[]
  lineups?: AlineacionCruda[]
  statistics?: EstadisticaEquipoCruda[]
}

interface EventoCrudo {
  time?: { elapsed?: number | null; extra?: number | null }
  team?: { id?: number | null }
  player?: { id?: number | null; name?: string | null }
  assist?: { id?: number | null; name?: string | null }
  type?: string
  detail?: string
}

interface EstadisticaEquipoCruda {
  team?: { id?: number | null }
  statistics?: Array<{ type?: string; value?: number | string | null }>
}

interface AlineacionCruda {
  team?: { id?: number | null }
  formation?: string | null
  coach?: { name?: string | null }
  startXI?: Array<{ player?: JugadorCrudo }>
  substitutes?: Array<{ player?: JugadorCrudo }>
}

interface JugadorCrudo {
  id?: number | null
  name?: string | null
  number?: number | null
  pos?: string | null
}

interface FilaClasificacionCruda {
  rank?: number
  team?: { id?: number; name?: string; logo?: string }
  points?: number
  goalsDiff?: number
  group?: string
  form?: string | null
  all?: { played?: number; win?: number; draw?: number; lose?: number; goals?: { for?: number; against?: number } }
}

interface LigaClasificacionApiFootball {
  id?: number
  name?: string
  country?: string
  season?: number
  round?: string
  standings?: FilaClasificacionCruda[][]
}

interface RespuestaApiFootballInterna<T> {
  response?: T[]
  errors?: unknown
}

/** Adaptador server-side de API-Football; nunca se expone en módulos Vue. */
export function crearProveedorApiFootball(configuracion: ConfiguracionApiFootball): ProveedorFutbol {
  const apiKey = configuracion.apiKey.trim()
  if (!apiKey) throw new Error('La clave privada de API-Football no está configurada.')
  const baseUrl = (configuracion.baseUrl || BASE_URL_API_FOOTBALL).replace(/\/+$/, '')
  const transporte = configuracion.transporte || ((url, init) => fetch(url, init))

  async function solicitar<T>(
    ruta: string,
    parametros: Record<string, string | number>
  ): Promise<{ elementos: T[]; cuota: RespuestaProveedorFutbol<T>['cuota'] }> {
    const url = new URL(`${baseUrl}${ruta}`)
    for (const [clave, valor] of Object.entries(parametros)) url.searchParams.set(clave, String(valor))

    let respuesta: Response
    try {
      respuesta = await transporte(url.toString(), {
        method: 'GET',
        headers: { 'x-apisports-key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS)
      })
    } catch (error) {
      if (error instanceof ErrorProveedorFutbol) throw error
      throw new ErrorProveedorFutbol('RED')
    }

    const cuota = obtenerCuota(respuesta.headers)
    if (!respuesta.ok) {
      const despues = Number(respuesta.headers.get('retry-after'))
      throw new ErrorProveedorFutbol(
        respuesta.status === 429 ? 'LIMITE_CUOTA' : 'HTTP',
        respuesta.status,
        Number.isFinite(despues) && despues > 0 ? despues : undefined
      )
    }

    let cuerpo: RespuestaApiFootballInterna<T>
    try {
      cuerpo = await respuesta.json() as RespuestaApiFootballInterna<T>
    } catch {
      throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA', respuesta.status)
    }

    const errores = cuerpo.errors
    const tieneErrores = Array.isArray(errores)
      ? errores.length > 0
      : typeof errores === 'object' && errores !== null
        ? Object.keys(errores).length > 0
        : Boolean(errores)
    if (tieneErrores || !Array.isArray(cuerpo.response)) {
      throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA', respuesta.status)
    }

    return { elementos: cuerpo.response, cuota }
  }

  function respuesta<T>(elementos: T[], cuota: RespuestaProveedorFutbol<T>['cuota']): RespuestaProveedorFutbol<T> {
    return { elementos, consultadoEn: new Date().toISOString(), cuota }
  }

  async function consultarPartidos(parametros: Record<string, string | number>) {
    const resultado = await solicitar<FixtureApiFootballExtendido>('/fixtures', parametros)
    return respuesta(resultado.elementos.map(mapearFixture), resultado.cuota)
  }

  const proveedor: ProveedorFutbol = {
    id: 'api-football',
    capacidades: {
      fixturesPorFecha: true,
      fixturesEnVivo: true,
      detalleFixture: true,
      eventos: true,
      alineaciones: true,
      estadisticas: true,
      clasificaciones: true,
      actualizacionPorLote: true
    },

    async obtenerPartidosPorFecha(consulta: ConsultaPartidosPorFecha) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(consulta.fecha)) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
      return consultarPartidos({ date: consulta.fecha, timezone: consulta.zonaHoraria })
    },

    async obtenerPartidosEnVivo() {
      return consultarPartidos({ live: 'all' })
    },

    async obtenerDetalleFixture(idFixture: string) {
      validarIdNumerico(idFixture)
      const resultado = await solicitar<FixtureApiFootballExtendido>('/fixtures', { id: idFixture })
      return resultado.elementos[0] ? mapearFixture(resultado.elementos[0]) : null
    },

    async obtenerEventos(idFixture: string) {
      validarIdNumerico(idFixture)
      const resultado = await solicitar<EventoCrudo>('/fixtures/events', { fixture: idFixture })
      return respuesta(resultado.elementos.map(mapearEvento), resultado.cuota)
    },

    async obtenerAlineaciones(idFixture: string) {
      validarIdNumerico(idFixture)
      const resultado = await solicitar<AlineacionCruda>('/fixtures/lineups', { fixture: idFixture })
      return respuesta(resultado.elementos.map(mapearAlineacion), resultado.cuota)
    },

    async obtenerEstadisticas(idFixture: string) {
      validarIdNumerico(idFixture)
      const resultado = await solicitar<EstadisticaEquipoCruda>('/fixtures/statistics', { fixture: idFixture })
      return respuesta(mapearEstadisticas(resultado.elementos), resultado.cuota)
    },

    async obtenerClasificacion(idCompetencia: string, temporada?: number | string) {
      validarIdNumerico(idCompetencia)
      if (temporada === undefined) return null
      const resultado = await solicitar<{ league?: LigaClasificacionApiFootball }>('/standings', {
        league: idCompetencia,
        season: temporada
      })
      const liga = resultado.elementos[0]?.league
      const filasPorGrupo = liga?.standings || []
      if (!liga || !filasPorGrupo.length) return null
      const competencia = mapearCompetencia(liga, idCompetencia, temporada)
      const grupos = filasPorGrupo.map((filas, indice) => mapearGrupoClasificacion(filas, indice))
      const clasificacion: ClasificacionFutbolProveedor = {
        competencia,
        grupos,
        consultadoEn: new Date().toISOString()
      }
      return clasificacion
    },

    async obtenerActualizacionesPorLote(idsFixture: string[]) {
      const ids = [...new Set(idsFixture.map(id => id.trim()))]
      if (!ids.length || ids.length > LIMITE_LOTE || ids.some(id => !/^\d+$/.test(id))) {
        throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
      }
      const resultado = await solicitar<FixtureApiFootballExtendido>('/fixtures', { ids: ids.join('-') })
      const elementos = resultado.elementos.map(fixture => ({
        partido: mapearFixture(fixture),
        ...(fixture.events ? { eventos: fixture.events.map(mapearEvento) } : {}),
        ...(fixture.lineups ? { alineaciones: fixture.lineups.map(mapearAlineacion) } : {}),
        ...(fixture.statistics ? { estadisticas: mapearEstadisticas(fixture.statistics) } : {})
      } satisfies PaqueteActualizacionFutbolProveedor))
      return respuesta(elementos, resultado.cuota)
    }
  }

  return proveedor
}

function mapearFixture(fixture: FixtureApiFootballExtendido): PartidoFutbolProveedor {
  const id = fixture.fixture?.id
  const fecha = fixture.fixture?.date
  const instante = fecha ? new Date(fecha) : undefined
  const liga = fixture.league
  const local = fixture.teams?.home
  const visitante = fixture.teams?.away
  if (!id || !fecha || !instante || Number.isNaN(instante.getTime()) || !liga?.id || !liga.name || !local?.id || !local.name || !visitante?.id || !visitante.name) {
    throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  }

  const competencia: CompetenciaFutbolProveedor = {
    idProveedor: String(liga.id),
    nombre: liga.name,
    ...(liga.country ? { pais: liga.country } : {}),
    ...(liga.season !== undefined ? { temporada: liga.season } : {}),
    ...(extraerEtapa(liga.round) ? { etapa: extraerEtapa(liga.round) } : {}),
    ...(liga.round ? { jornada: liga.round } : {})
  }

  return {
    idProveedor: String(id),
    competencia,
    inicioUtc: instante.toISOString(),
    estado: normalizarEstado(fixture.fixture.status.short),
    ...(fixture.fixture.status.short ? { estadoProveedor: fixture.fixture.status.short } : {}),
    ...(fixture.fixture.status.elapsed !== undefined && fixture.fixture.status.elapsed !== null
      ? { minutoTranscurrido: fixture.fixture.status.elapsed }
      : {}),
    local: {
      idProveedor: String(local.id), nombre: local.name,
      ...(local.logo ? { insigniaUrl: local.logo } : {})
    },
    visitante: {
      idProveedor: String(visitante.id), nombre: visitante.name,
      ...(visitante.logo ? { insigniaUrl: visitante.logo } : {})
    },
    golesLocal: fixture.goals.home ?? null,
    golesVisitante: fixture.goals.away ?? null,
    ...(fixture.fixture.venue?.name ? { sede: fixture.fixture.venue.name } : {}),
    ...(fixture.fixture.venue?.city ? { ciudad: fixture.fixture.venue.city } : {})
  }
}

function mapearEvento(evento: EventoCrudo, indice: number): EventoFutbolProveedor {
  const texto = `${evento.type || ''} ${evento.detail || ''}`.toLowerCase()
  const tipo: EventoFutbolProveedor['tipo'] = texto.includes('penalty') ? 'penalty'
    : texto.includes('own goal') ? 'own-goal'
      : (evento.type || '').toLowerCase() === 'goal' ? 'goal'
        : texto.includes('yellow') ? 'yellow-card'
          : texto.includes('red') ? 'red-card'
            : (evento.type || '').toLowerCase().includes('subst') ? 'substitution'
              : (evento.type || '').toLowerCase().includes('var') ? 'var' : 'other'
  const minute = evento.time?.elapsed
  const extra = evento.time?.extra
  const jugador = evento.player?.name || undefined
  const jugadorRelacionado = evento.assist?.name || undefined
  return {
    idProveedor: `${evento.team?.id || 'equipo'}-${minute ?? indice}-${tipo}-${indice}`,
    ...(minute !== undefined && minute !== null ? { minuto: minute } : {}),
    ...(minute !== undefined && minute !== null
      ? { minutoTexto: `${minute}${extra ? `+${extra}` : ''}′` }
      : {}),
    tipo,
    ...(evento.team?.id ? { equipoIdProveedor: String(evento.team.id) } : {}),
    ...(jugador ? { jugador } : {}),
    ...(jugadorRelacionado ? { jugadorRelacionado } : {}),
    ...(evento.detail ? { descripcion: evento.detail } : {})
  }
}

function mapearAlineacion(alineacion: AlineacionCruda): AlineacionFutbolProveedor {
  const equipoId = alineacion.team?.id
  if (!equipoId) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  const titulares = alineacion.startXI || []
  const suplentes = alineacion.substitutes || []
  return {
    equipoIdProveedor: String(equipoId),
    ...(alineacion.formation ? { formacion: alineacion.formation } : {}),
    ...(alineacion.coach?.name ? { entrenador: alineacion.coach.name } : {}),
    jugadores: [
      ...titulares.map(({ player }) => ({ player, titular: true })),
      ...suplentes.map(({ player }) => ({ player, titular: false }))
    ].map(({ player, titular }) => {
      if (!player?.name) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
      return {
        ...(player.id ? { idProveedor: String(player.id) } : {}),
        nombre: player.name,
        ...(player.number !== undefined && player.number !== null ? { numero: player.number } : {}),
        ...(player.pos ? { posicion: player.pos } : {}),
        titular
      }
    })
  }
}

function mapearEstadisticas(equipos: EstadisticaEquipoCruda[]): EstadisticaFutbolProveedor[] {
  const resultado = new Map<string, EstadisticaFutbolProveedor>()
  for (const equipo of equipos) {
    if (!equipo.team?.id) continue
    for (const estadistica of equipo.statistics || []) {
      const clave = estadistica.type?.trim()
      if (!clave) continue
      const actual = resultado.get(clave) || {
        clave,
        etiqueta: clave,
        valoresPorEquipo: []
      }
      actual.valoresPorEquipo.push({
        equipoIdProveedor: String(equipo.team.id),
        valor: estadistica.value ?? null
      })
      resultado.set(clave, actual)
    }
  }
  return [...resultado.values()]
}

function mapearGrupoClasificacion(filas: FilaClasificacionCruda[], indice: number): GrupoClasificacionFutbolProveedor {
  const nombre = filas.find(fila => fila.group)?.group || (filas.length > 1 ? `Grupo ${indice + 1}` : 'General')
  return {
    nombre,
    filas: filas.map(mapearFilaClasificacion).sort((a, b) => a.posicion - b.posicion)
  }
}

function mapearFilaClasificacion(fila: FilaClasificacionCruda): FilaClasificacionFutbolProveedor {
  const team = fila.team
  const all = fila.all
  if (!team?.id || !team.name || fila.rank === undefined || fila.points === undefined || !all
    || all.played === undefined || all.win === undefined || all.draw === undefined || all.lose === undefined
    || all.goals?.for === undefined || all.goals.against === undefined) {
    throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  }
  return {
    posicion: fila.rank,
    equipo: { idProveedor: String(team.id), nombre: team.name, ...(team.logo ? { insigniaUrl: team.logo } : {}) },
    jugados: all.played,
    ganados: all.win,
    empatados: all.draw,
    perdidos: all.lose,
    golesFavor: all.goals.for,
    golesContra: all.goals.against,
    diferenciaGoles: fila.goalsDiff ?? all.goals.for - all.goals.against,
    puntos: fila.points,
    ...(fila.form ? { forma: fila.form.split('') } : {})
  }
}

function mapearCompetencia(
  liga: LigaClasificacionApiFootball,
  idAlterno: string,
  temporada: number | string
): CompetenciaFutbolProveedor {
  if (!liga.name) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  return {
    idProveedor: String(liga.id ?? idAlterno),
    nombre: liga.name,
    ...(liga.country ? { pais: liga.country } : {}),
    ...(liga.season !== undefined ? { temporada: liga.season } : { temporada }),
    ...(extraerEtapa(liga.round) ? { etapa: extraerEtapa(liga.round) } : {}),
    ...(liga.round ? { jornada: liga.round } : {})
  }
}

function extraerEtapa(round?: string): string | undefined {
  if (!round) return undefined
  return round.match(/Apertura|Finalización|Finalizacion|Clausura|Cuadrangulares|Cuadrangular|Play[- ]?off|Group Stage|Fase de grupos/i)?.[0]
}

function obtenerCuota(headers: Headers) {
  const limite = numeroHeader(headers, 'x-ratelimit-requests-limit')
    ?? numeroHeader(headers, 'x-ratelimit-limit')
  const restante = numeroHeader(headers, 'x-ratelimit-requests-remaining')
    ?? numeroHeader(headers, 'x-ratelimit-remaining')
  return {
    ...(limite !== undefined ? { limite } : {}),
    ...(restante !== undefined ? { restante } : {})
  }
}

function numeroHeader(headers: Headers, clave: string): number | undefined {
  const valor = headers.get(clave)
  if (!valor || !/^\d+$/.test(valor)) return undefined
  return Number(valor)
}

function normalizarEstado(estado?: string): PartidoFutbolProveedor['estado'] {
  switch ((estado || '').toUpperCase()) {
    case '1H': case '2H': case 'ET': case 'BT': case 'P': case 'LIVE': case 'IN_PLAY': return 'live'
    case 'HT': return 'halftime'
    case 'FT': case 'AET': case 'PEN': case 'AWD': case 'WO': return 'finished'
    case 'PST': return 'postponed'
    case 'SUSP': case 'INT': return 'suspended'
    case 'ABD': return 'abandoned'
    case 'CANC': return 'cancelled'
    case 'NS': case 'TBD': return 'scheduled'
    default: return 'unknown'
  }
}

function validarIdNumerico(id: string): void {
  if (!/^\d+$/.test(id.trim())) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
}
