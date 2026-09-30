import type {
  DeporteResultado,
  FixtureApiFootball,
  OrigenResultados,
  PartidoResultado,
  RespuestaApiFootball,
  RespuestaResultados
} from '~/types/resultados'
import { consultarPartidosFechaApiBasketball } from '~/server/utils/clienteApiBasketball'
import { consultarEventosDiaTheSportsDb } from '~/server/utils/clienteTheSportsDb'
import { obtenerResolverIdentidadDeportiva } from '~/server/utils/repositorioEntidadesDeportivasPublicas'
import { mapearPartidoApiBasketball } from '~/utils/resultadosBasketball'
import { mapearFixtureApiFootball, ordenarPartidosRelevantes } from '~/utils/resultadosDeportivos'
import { mapearEventoTheSportsDb } from '~/utils/resultadosTheSportsDb'
import { obtenerFechaEnZonaHoraria, normalizarZonaHoraria, zonaHorariaColombia } from '~/utils/zonasHorarias'

const deportesDisponibles: DeporteResultado[] = ['futbol', 'baloncesto', 'tenis', 'beisbol']
const nombresTheSportsDb: Record<DeporteResultado, string> = {
  futbol: 'Soccer',
  baloncesto: 'Basketball',
  tenis: 'Tennis',
  beisbol: 'Baseball'
}

interface ResultadoProveedor {
  partidos: PartidoResultado[]
  origen: OrigenResultados
}

export default defineCachedEventHandler(async (evento): Promise<RespuestaResultados> => {
  const configuracion = useRuntimeConfig()
  const deporteRecibido = obtenerDeporteDesdeUrl(evento.node?.req?.url)
  const deporteSolicitado = normalizarDeporte(deporteRecibido)
  if (deporteRecibido !== undefined && !deporteSolicitado) {
    throw createError({ statusCode: 400, statusMessage: 'El deporte solicitado no es válido.' })
  }
  const deportesAConsultar = deporteSolicitado ? [deporteSolicitado] : deportesDisponibles
  const zonaHoraria = obtenerZonaHorariaDesdeUrl(evento.node?.req?.url)
  const fechaLocal = obtenerFechaEnZonaHoraria(new Date(), zonaHoraria)
  const resultados = await Promise.all(
    deportesAConsultar.map(deporte => consultarDeporte(deporte, fechaLocal, zonaHoraria, configuracion))
  )
  const partidos = ordenarPartidosRelevantes(
    resultados.flatMap(resultado => resultado.partidos)
  ).slice(0, 32)

  return {
    partidos,
    clasificacion: [],
    actualizadoEn: new Date().toISOString(),
    origen: obtenerOrigenConsolidado(resultados),
    aviso: partidos.length ? undefined : 'No hay datos disponibles para la fecha actual.'
  }
}, {
  maxAge: 60,
  getKey: evento => {
    const zonaHoraria = obtenerZonaHorariaDesdeUrl(evento.node?.req?.url)
    return `resultados-${obtenerClaveCache(evento.node?.req?.url)}-${zonaHoraria}-${obtenerFechaEnZonaHoraria(new Date(), zonaHoraria)}`
  }
})

async function consultarDeporte(
  deporte: DeporteResultado,
  fecha: string,
  zonaHoraria: string,
  configuracion: ReturnType<typeof useRuntimeConfig>
): Promise<ResultadoProveedor> {
  if (deporte === 'futbol' && configuracion.apiSportsKey) {
    try {
      const partidos = await consultarApiFootball(
        String(configuracion.apiSportsBaseUrl),
        String(configuracion.apiSportsKey),
        fecha,
        zonaHoraria,
        configuracion.public
      )
      if (partidos.length) return { partidos, origen: 'api-sports' }
    } catch {
      // El proveedor gratuito toma el relevo sin exponer detalles internos.
    }
  }

  if (deporte === 'baloncesto' && configuracion.apiBasketballKey) {
    try {
      const respuesta = await consultarPartidosFechaApiBasketball({
        baseUrl: String(configuracion.apiBasketballBaseUrl),
        apiKey: String(configuracion.apiBasketballKey)
      }, fecha, zonaHoraria)
      const partidos = ordenarPartidosRelevantes(respuesta.map(mapearPartidoApiBasketball)).slice(0, 24)
      if (partidos.length) return { partidos, origen: 'api-basketball' }
    } catch {
      // TheSportsDB toma el relevo cuando la cuota o el proveedor principal fallan.
    }
  }

  try {
    const respuestaGratuita = await consultarEventosDiaTheSportsDb({
      baseUrl: String(configuracion.theSportsDbBaseUrl),
      apiKey: String(configuracion.theSportsDbApiKey)
    }, fecha, nombresTheSportsDb[deporte])
    const eventos = respuestaGratuita.events || []
    const resolverIdentidad = deporte === 'futbol'
      ? await obtenerResolverIdentidadDeportiva(
          configuracion.public,
          'the-sports-db',
          eventos.flatMap(evento => [evento.idEvent, evento.idLeague, evento.idHomeTeam, evento.idAwayTeam])
        )
      : undefined
    const partidos = ordenarPartidosRelevantes(
      eventos.map(evento => mapearEventoTheSportsDb(evento, deporte, resolverIdentidad))
    ).slice(0, 12)
    return { partidos, origen: 'the-sports-db' }
  } catch {
    return { partidos: [], origen: 'the-sports-db' }
  }
}

async function consultarApiFootball(
  baseUrl: string,
  apiKey: string,
  fecha: string,
  zonaHoraria: string,
  configuracionPublica: ReturnType<typeof useRuntimeConfig>['public']
) {
  const respuesta = await $fetch<RespuestaApiFootball<FixtureApiFootball>>(`${baseUrl}/fixtures`, {
    query: { date: fecha, timezone: zonaHoraria },
    headers: { 'x-apisports-key': apiKey },
    timeout: 8_000,
    retry: 1
  })

  if (respuesta.errors && Object.keys(respuesta.errors).length) {
    throw new Error('API-Sports rechazó la solicitud.')
  }

  const resolverIdentidad = await obtenerResolverIdentidadDeportiva(
    configuracionPublica,
    'api-sports',
    respuesta.response.flatMap(fixture => [
      fixture.fixture.id,
      fixture.league.id,
      fixture.teams.home.id,
      fixture.teams.away.id
    ])
  )

  return ordenarPartidosRelevantes(
    respuesta.response.map(fixture => mapearFixtureApiFootball(fixture, resolverIdentidad))
  ).slice(0, 24)
}

function normalizarDeporte(valor: unknown): DeporteResultado | undefined {
  if (typeof valor !== 'string') return undefined
  return deportesDisponibles.find(deporte => deporte === valor)
}

function obtenerDeporteDesdeUrl(url?: string): string | undefined {
  const queryString = url?.split('?')[1]
  if (!queryString) return undefined
  return new URLSearchParams(queryString).get('deporte') || undefined
}

function obtenerZonaHorariaDesdeUrl(url?: string): string {
  const queryString = url?.split('?')[1]
  if (!queryString) return zonaHorariaColombia
  return normalizarZonaHoraria(new URLSearchParams(queryString).get('timeZone'))
}

function obtenerClaveCache(url?: string): string {
  const deporteRecibido = obtenerDeporteDesdeUrl(url)
  if (!deporteRecibido) return 'todos'
  return normalizarDeporte(deporteRecibido) || 'invalido'
}

function obtenerOrigenConsolidado(resultados: ResultadoProveedor[]): OrigenResultados {
  const origenesConDatos = new Set(
    resultados.filter(resultado => resultado.partidos.length).map(resultado => resultado.origen)
  )
  if (origenesConDatos.size === 1) return [...origenesConDatos][0]!
  if (origenesConDatos.size > 1) return 'mixto'
  return 'the-sports-db'
}
