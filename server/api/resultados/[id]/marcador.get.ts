import type { RespuestaMarcadorPartido } from '~/types/resultados'
import { consultarPartidoApiBasketball } from '~/server/utils/clienteApiBasketball'
import { consultarEventoTheSportsDb } from '~/server/utils/clienteTheSportsDb'
import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { leerSnapshotsFutbolPublicos } from '~/server/utils/lecturaSnapshotsFutbol'
import { mapearPartidoApiBasketball } from '~/utils/resultadosBasketball'
import { mapearFixtureFutbolAResultado } from '~/utils/resultadosFutbolPublicos'
import { mapearEventoTheSportsDb } from '~/utils/resultadosTheSportsDb'

export default defineCachedEventHandler(async (evento): Promise<RespuestaMarcadorPartido> => {
  const idPartido = getRouterParam(evento, 'id') || ''
  const configuracion = useRuntimeConfig(evento)

  if (/^[0-9a-f-]{36}$/i.test(idPartido)) {
    const cliente = obtenerClienteSupabasePrivado(evento)
    const fixtures = cliente
      ? await leerSnapshotsFutbolPublicos(cliente, { fixtureId: idPartido, limite: 1 })
      : []
    const fixture = fixtures[0]
    if (!fixture) throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
    return {
      partido: mapearFixtureFutbolAResultado(fixture),
      actualizadoEn: fixture.providerFetchedAt,
      origen: 'base-datos'
    }
  }

  const coincidenciaTheSportsDb = idPartido.match(/^tsdb-(?:(futbol|baloncesto|tenis|beisbol)-)?(\d+)$/)
  if (coincidenciaTheSportsDb) {
    const deporte = coincidenciaTheSportsDb[1] || 'futbol'
    if (deporte === 'futbol') {
      throw createError({ statusCode: 404, statusMessage: 'No hay datos verificados para este partido.' })
    }
    const respuesta = await consultarEventoTheSportsDb({
      baseUrl: configuracion.theSportsDbBaseUrl,
      apiKey: configuracion.theSportsDbApiKey
    }, coincidenciaTheSportsDb[2]!)
    const eventoGratuito = respuesta.events?.[0]
    if (!eventoGratuito) throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
    return {
      partido: mapearEventoTheSportsDb(eventoGratuito, deporte as RespuestaMarcadorPartido['partido']['deporte']),
      actualizadoEn: new Date().toISOString(),
      origen: 'the-sports-db'
    }
  }

  if (/^basket-\d+$/.test(idPartido)) {
    const apiBasketballKey = String(configuracion.apiBasketballKey || '')
    if (!apiBasketballKey) throw createError({ statusCode: 503, statusMessage: 'API-Basketball no está configurada.' })
    const partido = await consultarPartidoApiBasketball({
      baseUrl: String(configuracion.apiBasketballBaseUrl),
      apiKey: apiBasketballKey
    }, idPartido.replace('basket-', ''))
    if (!partido) throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
    return {
      partido: mapearPartidoApiBasketball(partido),
      actualizadoEn: new Date().toISOString(),
      origen: 'api-basketball'
    }
  }

  if (/^\d+$/.test(idPartido)) {
    throw createError({ statusCode: 404, statusMessage: 'No hay datos verificados para este partido.' })
  }
  throw createError({ statusCode: 400, statusMessage: 'No fue posible actualizar el marcador.' })
}, {
  maxAge: 10,
  swr: true,
  staleMaxAge: 60,
  getKey: evento => `marcador-partido-${getRouterParam(evento, 'id') || 'invalido'}`
})
