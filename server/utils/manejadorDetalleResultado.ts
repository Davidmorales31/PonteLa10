import type { DetallePartidoResultado } from '~/types/resultados'
import type { H3Event } from 'h3'
import { consultarClasificacionApiBasketball, consultarEstadisticasApiBasketball, consultarPartidoApiBasketball } from '~/server/utils/clienteApiBasketball'
import { consultarDetalleAdicionalTheSportsDb, consultarEventoTheSportsDb } from '~/server/utils/clienteTheSportsDb'
import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { leerSnapshotsFutbolPublicos } from '~/server/utils/lecturaSnapshotsFutbol'
import { mapearClasificacionApiBasketball, mapearEstadisticasApiBasketball, mapearPartidoApiBasketball } from '~/utils/resultadosBasketball'
import { mapearDetalleFutbolPublico } from '~/utils/resultadosFutbolPublicos'
import {
  mapearAlineacionesTheSportsDb,
  mapearEstadisticasTheSportsDb,
  mapearEventoTheSportsDb,
  mapearLineaTiempoTheSportsDb
} from '~/utils/resultadosTheSportsDb'

export default defineCachedEventHandler(async (evento): Promise<DetallePartidoResultado> => {
  const idPartido = getRouterParam(evento, 'id') || ''
  return consultarDetalleResultadoPorId(idPartido, useRuntimeConfig(evento), evento)
}, {
  maxAge: 15,
  swr: true,
  staleMaxAge: 120,
  getKey: evento => `detalle-partido-real-${getRouterParam(evento, 'id') || 'invalido'}`
})

/**
 * Todo fútbol público se resuelve por el UUID canónico del snapshot aprobado.
 * Los IDs antiguos de proveedores no vuelven a disparar llamadas externas.
 */
export async function consultarDetalleResultadoPorId(
  idPartido: string,
  configuracion: ReturnType<typeof useRuntimeConfig>,
  evento?: H3Event
): Promise<DetallePartidoResultado> {
  if (/^[0-9a-f-]{36}$/i.test(idPartido)) {
    if (!evento) {
      throw createError({ statusCode: 503, statusMessage: 'El servicio de resultados no está configurado.' })
    }
    const cliente = obtenerClienteSupabasePrivado(evento)
    if (!cliente) {
      throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
    }
    const fixtures = await leerSnapshotsFutbolPublicos(cliente, {
      fixtureId: idPartido,
      derechosPublicacionConfirmados: configuracion.futbolDerechosPublicacionConfirmados === true,
      limite: 1
    })
    if (!fixtures.length) {
      throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
    }
    return mapearDetalleFutbolPublico(fixtures[0]!)
  }

  const coincidenciaTheSportsDb = idPartido.match(/^tsdb-(?:(futbol|baloncesto|tenis|beisbol)-)?(\d+)$/)
  if (coincidenciaTheSportsDb) {
    const deporte = (coincidenciaTheSportsDb[1] || 'futbol') as DetallePartidoResultado['partido']['deporte']
    if (deporte === 'futbol') {
      throw createError({ statusCode: 404, statusMessage: 'No hay datos verificados para este partido.' })
    }
    return consultarDetalleGratuito(coincidenciaTheSportsDb[2]!, {
      baseUrl: configuracion.theSportsDbBaseUrl,
      apiKey: configuracion.theSportsDbApiKey
    }, deporte)
  }

  if (/^basket-\d+$/.test(idPartido)) {
    return consultarDetalleBasketball(idPartido.replace('basket-', ''), {
      baseUrl: String(configuracion.apiBasketballBaseUrl),
      apiKey: String(configuracion.apiBasketballKey)
    })
  }

  if (/^\d+$/.test(idPartido)) {
    throw createError({ statusCode: 404, statusMessage: 'No hay datos verificados para este partido.' })
  }

  throw createError({ statusCode: 400, statusMessage: 'El identificador del partido no es válido.' })
}

async function consultarDetalleGratuito(
  idPartido: string,
  configuracion: { baseUrl: string; apiKey: string },
  deporte: Exclude<DetallePartidoResultado['partido']['deporte'], 'futbol'>
): Promise<DetallePartidoResultado> {
  const respuestaEvento = await consultarEventoTheSportsDb(configuracion, idPartido)
  const evento = respuestaEvento.events?.[0]
  if (!evento) throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })

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
  if (!partido) throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })

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
