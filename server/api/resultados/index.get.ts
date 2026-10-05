import type {
  DeporteResultado,
  OrigenResultados,
  PartidoResultado,
  RespuestaResultados
} from '~/types/resultados'
import { consultarPartidosFechaApiBasketball } from '~/server/utils/clienteApiBasketball'
import { consultarEventosDiaTheSportsDb } from '~/server/utils/clienteTheSportsDb'
import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { leerSnapshotsFutbolPublicos } from '~/server/utils/lecturaSnapshotsFutbol'
import { mapearPartidoApiBasketball } from '~/utils/resultadosBasketball'
import { ordenarPartidosRelevantes } from '~/utils/resultadosDeportivos'
import { mapearEventoTheSportsDb } from '~/utils/resultadosTheSportsDb'
import { mapearFixtureFutbolAResultado } from '~/utils/resultadosFutbolPublicos'
import { obtenerFechaEnZonaHoraria, normalizarZonaHoraria, zonaHorariaColombia } from '~/utils/zonasHorarias'
import type { H3Event } from 'h3'

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
  const configuracion = useRuntimeConfig(evento)
  const deporteRecibido = obtenerDeporteDesdeUrl(evento.node?.req?.url)
  const deporteSolicitado = normalizarDeporte(deporteRecibido)
  if (deporteRecibido !== undefined && !deporteSolicitado) {
    throw createError({ statusCode: 400, statusMessage: 'El deporte solicitado no es válido.' })
  }
  const deportesAConsultar = deporteSolicitado ? [deporteSolicitado] : deportesDisponibles
  const zonaHoraria = obtenerZonaHorariaDesdeUrl(evento.node?.req?.url)
  const fechaLocal = obtenerFechaEnZonaHoraria(new Date(), deporteSolicitado === 'futbol'
    ? zonaHorariaColombia
    : zonaHoraria)
  const resultados = await Promise.all(
    deportesAConsultar.map(deporte => consultarDeporte(deporte, fechaLocal, zonaHoraria, configuracion, evento))
  )
  const partidosSinLimite = resultados.flatMap(resultado => resultado.partidos)
  const partidos = deporteSolicitado === 'futbol'
    ? partidosSinLimite.sort((primero, segundo) => Date.parse(primero.fechaIso) - Date.parse(segundo.fechaIso))
    : ordenarPartidosRelevantes(partidosSinLimite).slice(0, 32)

  return {
    partidos,
    clasificacion: [],
    actualizadoEn: new Date().toISOString(),
    origen: obtenerOrigenConsolidado(resultados),
    aviso: partidos.length ? undefined : 'No hay datos disponibles para la fecha actual.'
  }
}, {
  maxAge: 60,
  // Para resultados deportivos no se sirve una respuesta obsoleta mientras la
  // revalidación corre en segundo plano: el worker modifica estos snapshots.
  swr: false,
  staleMaxAge: 0,
  getKey: evento => {
    const zonaHoraria = obtenerZonaHorariaDesdeUrl(evento.node?.req?.url)
    return `resultados-${obtenerClaveCache(evento.node?.req?.url)}-${zonaHoraria}-${obtenerFechaEnZonaHoraria(new Date(), zonaHoraria)}`
  }
})

async function consultarDeporte(
  deporte: DeporteResultado,
  fecha: string,
  zonaHoraria: string,
  configuracion: ReturnType<typeof useRuntimeConfig>,
  evento: H3Event
): Promise<ResultadoProveedor> {
  if (deporte === 'futbol') {
    const cliente = obtenerClienteSupabasePrivado(evento)
    if (!cliente) return { partidos: [], origen: 'base-datos' }
    const fixtures = await leerSnapshotsFutbolPublicos(cliente, {
      fechaNegocio: fecha,
      derechosPublicacionConfirmados: configuracion.futbolDerechosPublicacionConfirmados === true,
      limite: 1000
    })
    return {
      partidos: fixtures.map(mapearFixtureFutbolAResultado),
      origen: 'base-datos'
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
    const partidos = ordenarPartidosRelevantes(
      (respuestaGratuita.events || []).map(evento => mapearEventoTheSportsDb(evento, deporte))
    ).slice(0, 12)
    return { partidos, origen: 'the-sports-db' }
  } catch {
    return { partidos: [], origen: 'the-sports-db' }
  }
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
  if (resultados.length === 1) return resultados[0]!.origen
  return 'the-sports-db'
}
