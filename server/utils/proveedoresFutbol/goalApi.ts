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
import type { ProveedorFutbol } from './contrato'
import { ErrorProveedorFutbol } from './errores'

const BASE_URL_GOAL_API = 'https://api.goal-api.com/v1'
const TIEMPO_LIMITE_MS = 8_000
const LIMITE_LOTE = 20

type ObjetoJson = Record<string, unknown>
type TransporteGoalApi = (url: string, init: RequestInit) => Promise<Response>

export interface ConfiguracionGoalApi {
  apiKey: string
  baseUrl?: string
  transporte?: TransporteGoalApi
}

/**
 * Adaptador privado de GOAL API. No importa configuración global ni publica
 * URLs de insignias; el worker debe inyectar la clave desde su entorno privado.
 */
export function crearProveedorGoalApi(configuracion: ConfiguracionGoalApi): ProveedorFutbol {
  const apiKey = configuracion.apiKey.trim()
  if (!apiKey) throw new Error('La clave privada del proveedor GOAL API no está configurada.')

  const baseUrl = (configuracion.baseUrl || BASE_URL_GOAL_API).replace(/\/+$/, '')
  const transporte = configuracion.transporte || ((url, init) => fetch(url, init))

  async function solicitar(ruta: string, parametros: Record<string, string | number> = {}) {
    const url = new URL(`${baseUrl}${ruta}`)
    for (const [clave, valor] of Object.entries(parametros)) url.searchParams.set(clave, String(valor))

    let respuesta: Response
    try {
      respuesta = await transporte(url.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS)
      })
    } catch {
      throw new ErrorProveedorFutbol('RED')
    }

    const cuota = obtenerCuota(respuesta.headers)
    if (respuesta.status === 204) return { datos: null, cuota, paginacion: undefined, solicitudes: 1 }

    if (!respuesta.ok) {
      const despues = Number(respuesta.headers.get('retry-after'))
      throw new ErrorProveedorFutbol(
        respuesta.status === 429 ? 'LIMITE_CUOTA' : 'HTTP',
        respuesta.status,
        Number.isFinite(despues) && despues > 0 ? despues : undefined
      )
    }

    let cuerpo: unknown
    try {
      cuerpo = await respuesta.json()
    } catch {
      throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA', respuesta.status)
    }

    const envoltorio = comoObjeto(cuerpo)
    if (!envoltorio || envoltorio.success !== true || !('data' in envoltorio)) {
      throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA', respuesta.status)
    }

    return {
      datos: envoltorio.data,
      cuota,
      paginacion: comoObjeto(envoltorio.pagination),
      solicitudes: 1
    }
  }

  async function obtenerLista<T>(
    ruta: string,
    parametros: Record<string, string | number>,
    claves: string[],
    mapear: (valor: unknown, indice: number) => T
  ): Promise<RespuestaProveedorFutbol<T>> {
    const respuesta = await solicitar(ruta, parametros)
    if (respuesta.datos === null) return {
      elementos: [], consultadoEn: new Date().toISOString(), cuota: respuesta.cuota,
      solicitudes: respuesta.solicitudes
    }

    const lista = leerLista(respuesta.datos, claves)
    if (!lista) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')

    const elementos = lista.map(mapear)
    const siguienteCursor = obtenerSiguienteCursor(respuesta.paginacion)
    return {
      elementos,
      consultadoEn: new Date().toISOString(),
      cuota: respuesta.cuota,
      solicitudes: respuesta.solicitudes,
      ...(siguienteCursor ? { siguienteCursor } : {})
    }
  }

  const proveedor: ProveedorFutbol = {
    id: 'goal-api',
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
      const parametros: Record<string, string | number> = {
        limit: limitar(consulta.limite ?? 100, 1, 100)
      }
      const cursor = leerEntero(consulta.cursor)
      if (cursor !== undefined) parametros.offset = Math.max(0, cursor)

      // GOAL API entrega kickoffUtc en UTC; la zona de consulta no modifica el instante.
      return obtenerLista(
        `/fixtures/date/${encodeURIComponent(consulta.fecha)}`,
        parametros,
        ['fixtures', 'matches'],
        valor => mapearPartido(valor)
      )
    },

    async obtenerPartidosEnVivo() {
      return obtenerLista('/fixtures/live', { limit: 100 }, ['fixtures', 'matches'], valor => mapearPartido(valor))
    },

    async obtenerDetalleFixture(idFixture: string) {
      if (!idFixture.trim()) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
      const respuesta = await solicitar(`/fixtures/${encodeURIComponent(idFixture)}`)
      if (respuesta.datos === null) return null
      const valor = obtenerPrimerElemento(respuesta.datos, ['fixture', 'match'])
      return mapearPartido(valor)
    },

    async obtenerEventos(idFixture: string) {
      validarId(idFixture)
      return obtenerLista(
        `/fixtures/${encodeURIComponent(idFixture)}/events`, {}, ['events', 'items'],
        (valor, indice) => mapearEvento(valor, indice)
      )
    },

    async obtenerAlineaciones(idFixture: string) {
      validarId(idFixture)
      return obtenerLista(
        `/fixtures/${encodeURIComponent(idFixture)}/lineups`, {}, ['lineups', 'teams', 'items'],
        valor => mapearAlineacion(valor)
      )
    },

    async obtenerEstadisticas(idFixture: string) {
      validarId(idFixture)
      return obtenerLista(
        `/fixtures/${encodeURIComponent(idFixture)}/statistics`, {}, ['statistics', 'stats', 'teams', 'items'],
        valor => valor as EstadisticaFutbolProveedor
      ).then(respuesta => ({ ...respuesta, elementos: normalizarEstadisticas(respuesta.elementos as unknown[]) }))
    },

    async obtenerActualizacionesPorLote(idsFixture: string[]) {
      const ids = [...new Set(idsFixture.map(id => id.trim()))]
      if (!ids.length || ids.length > LIMITE_LOTE || ids.some(id => !id || id.length > 128)) {
        throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
      }

      const elementos: PaqueteActualizacionFutbolProveedor[] = []
      let solicitudes = 0
      let limite: number | undefined
      let restante: number | undefined
      const consultadoEn = new Date().toISOString()

      // Cuatro endpoints por partido; dos partidos a la vez acotan la latencia
      // sin abrir una ráfaga ilimitada contra la cuota de GOAL API.
      for (const grupo of agrupar(ids, 2)) {
        const resultados = await Promise.allSettled(grupo.map(async (idFixture) => {
          let solicitudesDelFixture = 0
          const solicitarDetalle = async (consulta: () => Promise<unknown>) => {
            solicitudesDelFixture += 1
            return consulta()
          }
          try {
            const partido = await solicitarDetalle(() => proveedor.obtenerDetalleFixture(idFixture)) as PartidoFutbolProveedor | null
            if (!partido) return { paquete: null, solicitudes: solicitudesDelFixture, cuotas: [] }
            const [eventos, alineaciones, estadisticas] = await Promise.all([
              solicitarDetalle(() => proveedor.obtenerEventos(idFixture)),
              solicitarDetalle(() => proveedor.obtenerAlineaciones(idFixture)),
              solicitarDetalle(() => proveedor.obtenerEstadisticas(idFixture))
            ]) as [
              RespuestaProveedorFutbol<EventoFutbolProveedor>,
              RespuestaProveedorFutbol<AlineacionFutbolProveedor>,
              RespuestaProveedorFutbol<EstadisticaFutbolProveedor>
            ]
            return {
              paquete: {
                partido,
                eventos: eventos.elementos,
                alineaciones: alineaciones.elementos,
                estadisticas: estadisticas.elementos
              },
              solicitudes: solicitudesDelFixture,
              cuotas: [eventos.cuota, alineaciones.cuota, estadisticas.cuota]
            }
          } catch (error) {
            if (error && typeof error === 'object') {
              Object.assign(error, { solicitudesConsumidas: solicitudesDelFixture })
            }
            throw error
          }
        }))

        const fallos: unknown[] = []
        for (const resultado of resultados) {
          if (resultado.status === 'rejected') {
            solicitudes += leerSolicitudesError(resultado.reason)
            fallos.push(resultado.reason)
            continue
          }
          solicitudes += resultado.value.solicitudes
          if (resultado.value.paquete) elementos.push(resultado.value.paquete)
          for (const cuota of resultado.value.cuotas) {
            if (cuota?.limite !== undefined) limite = limite === undefined ? cuota.limite : Math.min(limite, cuota.limite)
            if (cuota?.restante !== undefined) restante = restante === undefined ? cuota.restante : Math.min(restante, cuota.restante)
          }
        }
        if (fallos.length) {
          const error = new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
          Object.assign(error, { solicitudesConsumidas: solicitudes })
          throw error
        }
      }

      return {
        elementos,
        consultadoEn,
        solicitudes,
        ...(limite !== undefined || restante !== undefined
          ? { cuota: { ...(limite !== undefined ? { limite } : {}), ...(restante !== undefined ? { restante } : {}) } }
          : {})
      }
    },

    async obtenerClasificacion(idCompetencia: string, temporada?: number | string) {
      validarId(idCompetencia)
      const respuesta = await obtenerLista(
        `/standings/${encodeURIComponent(idCompetencia)}`,
        temporada === undefined ? {} : { season: temporada },
        ['standings', 'table', 'rows'],
        valor => valor
      )
      if (!respuesta.elementos.length) return null

      const competencia = mapearCompetencia(respuesta.elementos[0], idCompetencia, temporada)
      const grupos = agruparClasificacion(respuesta.elementos, competencia)
      return { competencia, grupos, consultadoEn: respuesta.consultadoEn } satisfies ClasificacionFutbolProveedor
    }
  }

  return proveedor
}

function mapearPartido(valor: unknown): PartidoFutbolProveedor {
  const objeto = comoObjeto(valor)
  if (!objeto) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  const idProveedor = leerCadena(objeto, 'id', 'fixtureId', 'matchId', 'match_id')
  const competencia = mapearCompetencia(objeto)
  const local = mapearEquipo(leerValor(objeto, 'homeTeam', 'home_team', 'local') ?? comoObjeto(objeto.teams)?.home)
  const visitante = mapearEquipo(leerValor(objeto, 'awayTeam', 'away_team', 'visitante') ?? comoObjeto(objeto.teams)?.away)
  const inicioUtc = normalizarInstanteUtc(leerCadena(objeto, 'kickoffUtc', 'kickoff_utc', 'date', 'matchDateTime'))

  if (!idProveedor || !inicioUtc) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')

  const marcador = comoObjeto(leerValor(objeto, 'score', 'goals'))
  const golesLocal = leerNumero(objeto, 'homeScore', 'home_score', 'match_hometeam_score')
    ?? leerNumero(marcador, 'home', 'local')
  const golesVisitante = leerNumero(objeto, 'awayScore', 'away_score', 'match_awayteam_score')
    ?? leerNumero(marcador, 'away', 'visitante')
  const estadoProveedor = leerCadena(objeto, 'matchStatus', 'match_status', 'status', 'state')
  const reloj = comoObjeto(objeto.clock)

  return {
    idProveedor,
    competencia,
    inicioUtc,
    estado: normalizarEstado(estadoProveedor, leerCadena(reloj, 'period')),
    ...(estadoProveedor ? { estadoProveedor } : {}),
    ...(leerEntero(leerValor(objeto, 'matchElapsed', 'elapsed', 'minute', 'minuteElapsed')) !== undefined
      ? { minutoTranscurrido: leerEntero(leerValor(objeto, 'matchElapsed', 'elapsed', 'minute', 'minuteElapsed')) }
      : {}),
    ...(leerCadena(objeto, 'matchMinute', 'minuteText') ? { minutoTexto: leerCadena(objeto, 'matchMinute', 'minuteText') } : {}),
    ...(leerCadena(reloj, 'period') ? { periodo: leerCadena(reloj, 'period') } : {}),
    local,
    visitante,
    golesLocal,
    golesVisitante,
    ...(leerCadena(objeto, 'venue', 'venueName') ? { sede: leerCadena(objeto, 'venue', 'venueName') } : {}),
    ...(leerCadena(objeto, 'city', 'venueCity') ? { ciudad: leerCadena(objeto, 'city', 'venueCity') } : {})
  }
}

function mapearCompetencia(
  valor: unknown,
  idAlterno?: string,
  temporadaAlterna?: number | string
): CompetenciaFutbolProveedor {
  const objeto = comoObjeto(valor)
  const liga = comoObjeto(leerValor(objeto, 'league', 'competition', 'tournament'))
  const idProveedor = leerCadena(liga, 'id', 'leagueId', 'competitionId')
    || leerCadena(objeto, 'leagueId', 'competitionId')
    || idAlterno
  const nombre = leerCadena(liga, 'name', 'title')
    || leerCadena(objeto, 'leagueName', 'competitionName')
    || (idAlterno ? idAlterno : undefined)
  if (!idProveedor || !nombre) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')

  const pais = leerCadena(comoObjeto(liga?.country), 'name') || leerCadena(liga, 'country', 'countryName')
  const temporada = leerEscalar(liga, 'season', 'seasonYear')
    ?? leerEscalar(objeto, 'season', 'seasonYear')
    ?? temporadaAlterna
  const etapa = leerCadena(objeto, 'stage', 'stageName', 'phase', 'phaseName')
    || leerCadena(liga, 'stage', 'stageName', 'phase', 'phaseName')
  const grupo = obtenerNombreGrupo(leerValor(objeto, 'group', 'groupName', 'group_name'))

  return {
    idProveedor,
    nombre,
    ...(pais ? { pais } : {}),
    ...(temporada !== undefined ? { temporada } : {}),
    ...(etapa ? { etapa } : {}),
    ...(grupo ? { grupo } : {})
  }
}

function mapearEquipo(valor: unknown) {
  const objeto = comoObjeto(valor)
  const idProveedor = leerCadena(objeto, 'id', 'teamId', 'team_id')
  const nombre = leerCadena(objeto, 'name', 'teamName', 'team_name')
  if (!objeto || !idProveedor || !nombre) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  const pais = leerCadena(objeto, 'country', 'countryName') || leerCadena(comoObjeto(objeto.country), 'name')
  const nombreCorto = leerCadena(objeto, 'shortName', 'short_name', 'code')
  const insigniaUrl = leerCadena(objeto, 'logo', 'badge', 'crest')
  return {
    idProveedor,
    nombre,
    ...(nombreCorto ? { nombreCorto } : {}),
    ...(pais ? { pais } : {}),
    ...(insigniaUrl ? { insigniaUrl } : {})
  }
}

function mapearEvento(valor: unknown, indice: number): EventoFutbolProveedor {
  const objeto = comoObjeto(valor)
  if (!objeto) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  const equipo = comoObjeto(leerValor(objeto, 'team', 'club'))
  const minuto = leerEntero(leerValor(objeto, 'minute', 'elapsed', 'time'))
  const tipoTexto = (leerCadena(objeto, 'type', 'eventType', 'event', 'detail') || '').toLowerCase()
  const tipo: EventoFutbolProveedor['tipo'] = tipoTexto.includes('penalty') ? 'penalty'
    : tipoTexto.includes('own') ? 'own-goal'
      : tipoTexto.includes('goal') ? 'goal'
        : tipoTexto.includes('yellow') ? 'yellow-card'
          : tipoTexto.includes('red') ? 'red-card'
            : tipoTexto.includes('sub') ? 'substitution'
              : tipoTexto.includes('var') ? 'var' : 'other'
  const idProveedor = leerCadena(objeto, 'id', 'eventId', 'event_id')
  const jugador = leerCadena(comoObjeto(leerValor(objeto, 'player', 'scorer')), 'name')
    || leerCadena(objeto, 'playerName', 'player_name')
  const jugadorRelacionado = leerCadena(comoObjeto(leerValor(objeto, 'assist', 'relatedPlayer')), 'name')
    || leerCadena(objeto, 'assistName', 'relatedPlayerName')
  const descripcion = leerCadena(objeto, 'description', 'detail', 'comments')
  const minutoTexto = leerCadena(objeto, 'minuteText', 'matchMinute')

  return {
    idProveedor: idProveedor || `evento-${indice}`,
    ...(minuto !== undefined ? { minuto } : {}),
    ...(minutoTexto ? { minutoTexto } : {}),
    tipo,
    ...(leerCadena(equipo, 'id', 'teamId') || leerCadena(objeto, 'teamId', 'team_id')
      ? { equipoIdProveedor: leerCadena(equipo, 'id', 'teamId') || leerCadena(objeto, 'teamId', 'team_id') }
      : {}),
    ...(jugador ? { jugador } : {}),
    ...(jugadorRelacionado ? { jugadorRelacionado } : {}),
    ...(descripcion ? { descripcion } : {})
  }
}

function mapearAlineacion(valor: unknown): AlineacionFutbolProveedor {
  const objeto = comoObjeto(valor)
  const equipo = comoObjeto(leerValor(objeto, 'team', 'club'))
  const equipoIdProveedor = leerCadena(equipo, 'id', 'teamId') || leerCadena(objeto, 'teamId', 'team_id')
  if (!objeto || !equipoIdProveedor) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  const titulares = leerLista(objeto.startXI, []) || []
  const suplentes = leerLista(objeto.substitutes, []) || []
  const jugadores = leerLista(objeto.players, []) || [...titulares, ...suplentes]

  return {
    equipoIdProveedor,
    ...(leerCadena(objeto, 'formation', 'formacion') ? { formacion: leerCadena(objeto, 'formation', 'formacion') } : {}),
    ...(leerCadena(comoObjeto(objeto.coach), 'name') || leerCadena(objeto, 'coachName', 'coach')
      ? { entrenador: leerCadena(comoObjeto(objeto.coach), 'name') || leerCadena(objeto, 'coachName', 'coach') }
      : {}),
    jugadores: jugadores.map((jugador, indice) => mapearJugadorAlineacion(jugador, indice, titulares.includes(jugador)))
  }
}

function mapearJugadorAlineacion(valor: unknown, indice: number, titularPorLista: boolean) {
  const objeto = comoObjeto(valor)
  const jugador = comoObjeto(leerValor(objeto, 'player', 'athlete')) || objeto
  const nombre = leerCadena(jugador, 'name', 'playerName')
  if (!nombre) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  const idProveedor = leerCadena(jugador, 'id', 'playerId')
  const numero = leerEntero(leerValor(jugador, 'number', 'shirtNumber'))
  const posicion = leerCadena(jugador, 'position', 'pos')
  const valorTitular = leerValor(objeto, 'isStarter', 'starter', 'titular')
  const titular = typeof valorTitular === 'boolean' ? valorTitular : titularPorLista
  return {
    ...(idProveedor ? { idProveedor } : {}),
    nombre,
    ...(numero !== undefined ? { numero } : {}),
    ...(posicion ? { posicion } : {}),
    titular,
    indice
  }
}

function normalizarEstadisticas(valores: unknown[]): EstadisticaFutbolProveedor[] {
  const mapa = new Map<string, EstadisticaFutbolProveedor>()
  for (const valor of valores) {
    const objeto = comoObjeto(valor)
    if (!objeto) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
    const equipoIdProveedor = leerCadena(comoObjeto(leerValor(objeto, 'team', 'club')), 'id', 'teamId')
      || leerCadena(objeto, 'teamId', 'team_id')
    const estadisticas = leerLista(objeto.statistics, [])
    if (estadisticas && equipoIdProveedor) {
      for (const dato of estadisticas) agregarEstadistica(mapa, dato, equipoIdProveedor)
    } else {
      const idLocal = leerCadena(objeto.homeTeam, 'id', 'teamId') || leerCadena(objeto, 'homeTeamId', 'home_team_id')
      const idVisitante = leerCadena(objeto.awayTeam, 'id', 'teamId') || leerCadena(objeto, 'awayTeamId', 'away_team_id')
      const clave = leerCadena(objeto, 'key', 'type', 'name', 'label')
      if (!clave || !idLocal || !idVisitante) continue
      const etiqueta = leerCadena(objeto, 'label', 'name', 'type') || clave
      const local = leerValor(objeto, 'home', 'homeValue', 'local')
      const visitante = leerValor(objeto, 'away', 'awayValue', 'visitor')
      const entrada: EstadisticaFutbolProveedor = {
        clave,
        etiqueta,
        valoresPorEquipo: [
          { equipoIdProveedor: idLocal, valor: normalizarValorEstadistica(local) },
          { equipoIdProveedor: idVisitante, valor: normalizarValorEstadistica(visitante) }
        ],
        ...(leerCadena(objeto, 'unit', 'suffix') ? { unidad: leerCadena(objeto, 'unit', 'suffix') } : {})
      }
      mapa.set(clave, entrada)
    }
  }
  return [...mapa.values()]
}

function agregarEstadistica(
  mapa: Map<string, EstadisticaFutbolProveedor>,
  valor: unknown,
  equipoIdProveedor: string
) {
  const objeto = comoObjeto(valor)
  const clave = leerCadena(objeto, 'type', 'key', 'name')
  if (!objeto || !clave) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  const existente = mapa.get(clave) || {
    clave,
    etiqueta: leerCadena(objeto, 'label', 'name', 'type') || clave,
    valoresPorEquipo: [],
    ...(leerCadena(objeto, 'unit', 'suffix') ? { unidad: leerCadena(objeto, 'unit', 'suffix') } : {})
  }
  existente.valoresPorEquipo.push({
    equipoIdProveedor,
    valor: normalizarValorEstadistica(leerValor(objeto, 'value', 'total', 'amount'))
  })
  mapa.set(clave, existente)
}

function agruparClasificacion(
  valores: unknown[],
  competenciaBase: CompetenciaFutbolProveedor
): GrupoClasificacionFutbolProveedor[] {
  const grupos = new Map<string, GrupoClasificacionFutbolProveedor>()
  for (const valor of valores) {
    const fila = mapearFilaClasificacion(valor)
    const etapa = leerCadena(valor, 'stage', 'stageName', 'phase', 'phaseName') || competenciaBase.etapa
    const grupo = obtenerNombreGrupo(leerValor(valor, 'group', 'groupName', 'group_name')) || 'General'
    const nombreGrupo = etapa ? `${etapa} · ${grupo}` : grupo
    const clave = `${etapa || ''}\u0000${grupo}`
    const lista = grupos.get(clave) || {
      nombre: nombreGrupo,
      ...(etapa ? { etapa } : {}),
      filas: []
    }
    lista.filas.push(fila)
    grupos.set(clave, lista)
  }

  return [...grupos.values()]
    .map(grupo => ({ ...grupo, filas: grupo.filas.sort((a, b) => a.posicion - b.posicion) }))
}

function mapearFilaClasificacion(valor: unknown): FilaClasificacionFutbolProveedor {
  const objeto = comoObjeto(valor)
  const equipo = mapearEquipo(leerValor(objeto, 'team', 'club'))
  const posicion = leerEntero(leerValor(objeto, 'overallLeaguePosition', 'position', 'rank'))
  const jugados = leerEntero(leerValor(objeto, 'overallLeaguePlayed', 'played', 'matchesPlayed'))
  const ganados = leerEntero(leerValor(objeto, 'overallLeagueW', 'won', 'wins'))
  const empatados = leerEntero(leerValor(objeto, 'overallLeagueD', 'draw', 'draws'))
  const perdidos = leerEntero(leerValor(objeto, 'overallLeagueL', 'lost', 'losses'))
  const golesFavor = leerEntero(leerValor(objeto, 'overallLeagueGF', 'goalsFor'))
  const golesContra = leerEntero(leerValor(objeto, 'overallLeagueGA', 'goalsAgainst'))
  const puntos = leerEntero(leerValor(objeto, 'overallLeaguePTS', 'points', 'pts'))
  if ([posicion, jugados, ganados, empatados, perdidos, golesFavor, golesContra, puntos].some(valorNumero => valorNumero === undefined)) {
    throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
  }

  const forma = leerLista(leerValor(objeto, 'form', 'recentForm'), [])
    ?.map(valorForma => typeof valorForma === 'string' ? valorForma : '')
    .filter(Boolean)
  const puntosDeduccion = leerEntero(leerValor(objeto, 'pointsDeduction', 'deductedPoints'))

  return {
    posicion: posicion!,
    equipo,
    jugados: jugados!,
    ganados: ganados!,
    empatados: empatados!,
    perdidos: perdidos!,
    golesFavor: golesFavor!,
    golesContra: golesContra!,
    diferenciaGoles: leerEntero(leerValor(objeto, 'overallLeagueGD', 'goalDifference', 'goalsDiff')) ?? golesFavor! - golesContra!,
    puntos: puntos!,
    ...(forma?.length ? { forma } : {}),
    ...(puntosDeduccion !== undefined ? { puntosDeduccion } : {})
  }
}

function obtenerCuota(headers: Headers) {
  const limite = leerEntero(headers.get('x-ratelimit-limit'))
  const restante = leerEntero(headers.get('x-ratelimit-remaining'))
  const reinicio = leerEntero(headers.get('x-ratelimit-reset'))
  return {
    ...(limite !== undefined ? { limite } : {}),
    ...(restante !== undefined ? { restante } : {}),
    ...(reinicio !== undefined ? { reiniciaEn: new Date(reinicio * 1000).toISOString() } : {})
  }
}

function obtenerSiguienteCursor(paginacion?: ObjetoJson): string | undefined {
  if (!paginacion || paginacion.hasMore !== true) return undefined
  const offset = leerEntero(paginacion.offset)
  const limite = leerEntero(paginacion.limit)
  if (offset === undefined || limite === undefined || limite < 1) return undefined
  return String(offset + limite)
}

function leerLista(valor: unknown, claves: string[]): unknown[] | undefined {
  if (Array.isArray(valor)) return valor
  const objeto = comoObjeto(valor)
  if (!objeto) return undefined
  for (const clave of claves) {
    if (Array.isArray(objeto[clave])) return objeto[clave] as unknown[]
  }
  return undefined
}

function obtenerPrimerElemento(valor: unknown, claves: string[]): unknown {
  if (Array.isArray(valor)) return valor[0]
  const objeto = comoObjeto(valor)
  if (!objeto) return valor
  for (const clave of claves) {
    const anidado = objeto[clave]
    if (Array.isArray(anidado)) return anidado[0]
    if (anidado !== undefined) return anidado
  }
  return valor
}

function leerValor(objeto: unknown, ...claves: string[]): unknown {
  const registro = comoObjeto(objeto)
  if (!registro) return undefined
  for (const clave of claves) {
    if (registro[clave] !== undefined && registro[clave] !== null) return registro[clave]
  }
  return undefined
}

function leerCadena(objeto: unknown, ...claves: string[]): string | undefined {
  const valor = leerValor(objeto, ...claves)
  if (typeof valor === 'string' && valor.trim()) return valor.trim()
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor)
  return undefined
}

function leerEscalar(objeto: unknown, ...claves: string[]): string | number | undefined {
  const valor = leerValor(objeto, ...claves)
  return typeof valor === 'string' || typeof valor === 'number' ? valor : undefined
}

function leerNumero(objeto: unknown, ...claves: string[]): number | null {
  const valor = leerValor(objeto, ...claves)
  if (valor === undefined) return null
  if (valor === null || valor === '') return null
  const numero = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(numero) ? numero : null
}

function leerEntero(valor: unknown): number | undefined {
  if (typeof valor === 'number' && Number.isInteger(valor)) return valor
  if (typeof valor === 'string' && /^-?\d+$/.test(valor.trim())) return Number(valor)
  return undefined
}

function normalizarValorEstadistica(valor: unknown): number | string | null {
  if (typeof valor === 'number' || typeof valor === 'string') return valor
  return null
}

function normalizarInstanteUtc(valor?: string): string | undefined {
  if (!valor || !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(valor)) return undefined
  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString()
}

function normalizarEstado(estado?: string, periodo?: string): PartidoFutbolProveedor['estado'] {
  const texto = `${estado || ''} ${periodo || ''}`.toLowerCase().replace(/[_-]+/g, ' ')
  if (/postpon|apraz|suspend|interrupted/.test(texto)) return texto.includes('suspend') || texto.includes('interrupt') ? 'suspended' : 'postponed'
  if (/abandon/.test(texto)) return 'abandoned'
  if (/cancel|void/.test(texto)) return 'cancelled'
  if (/half time|halftime|ht|break/.test(texto)) return 'halftime'
  if (/finished|full time|ft|aet|penalties|ended|complete/.test(texto)) return 'finished'
  if (/live|in play|1h|2h|extra time|first half|second half|\d{1,3}(?:\+\d+)?\s*['’′]?/.test(texto)) return 'live'
  if (/scheduled|not started|fixture|ns|upcoming/.test(texto)) return 'scheduled'
  return 'unknown'
}

function obtenerNombreGrupo(valor: unknown): string | undefined {
  if (typeof valor === 'string' && valor.trim()) return valor.trim()
  return leerCadena(valor, 'name', 'title', 'label', 'id')
}

function comoObjeto(valor: unknown): ObjetoJson | undefined {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? valor as ObjetoJson
    : undefined
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, Math.trunc(valor)))
}

function validarId(id: string): void {
  if (!id.trim()) throw new ErrorProveedorFutbol('RESPUESTA_INVALIDA')
}

function agrupar<T>(elementos: T[], tamano: number): T[][] {
  const grupos: T[][] = []
  for (let indice = 0; indice < elementos.length; indice += tamano) {
    grupos.push(elementos.slice(indice, indice + tamano))
  }
  return grupos
}

function leerSolicitudesError(error: unknown): number {
  if (error && typeof error === 'object') {
    const valor = (error as { solicitudesConsumidas?: unknown }).solicitudesConsumidas
    if (typeof valor === 'number' && Number.isInteger(valor) && valor >= 0) return valor
  }
  return 1
}
