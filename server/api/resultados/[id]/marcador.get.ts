import type { FixtureApiFootball, RespuestaApiFootball, RespuestaMarcadorPartido } from '~/types/resultados'
import { consultarPartidoApiBasketball } from '~/server/utils/clienteApiBasketball'
import { consultarEventoTheSportsDb } from '~/server/utils/clienteTheSportsDb'
import { mapearPartidoApiBasketball } from '~/utils/resultadosBasketball'
import { mapearFixtureApiFootball } from '~/utils/resultadosDeportivos'
import { mapearEventoTheSportsDb } from '~/utils/resultadosTheSportsDb'

export default defineCachedEventHandler(async (evento): Promise<RespuestaMarcadorPartido> => {
  const idPartido = getRouterParam(evento, 'id') || ''
  const configuracion = useRuntimeConfig()
  const apiSportsKey = String(configuracion.apiSportsKey || '')
  const coincidenciaTheSportsDb = idPartido.match(/^tsdb-(?:(futbol|baloncesto|tenis|beisbol)-)?(\d+)$/)

  if (coincidenciaTheSportsDb) {
    const respuesta = await consultarEventoTheSportsDb({
      baseUrl: configuracion.theSportsDbBaseUrl,
      apiKey: configuracion.theSportsDbApiKey
    }, coincidenciaTheSportsDb[2]!)
    const eventoGratuito = respuesta.events?.[0]

    if (!eventoGratuito) {
      throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
    }

    return {
      partido: mapearEventoTheSportsDb(
        eventoGratuito,
        (coincidenciaTheSportsDb[1] || 'futbol') as RespuestaMarcadorPartido['partido']['deporte']
      ),
      actualizadoEn: new Date().toISOString(),
      origen: 'the-sports-db'
    }
  }

  if (/^basket-\d+$/.test(idPartido)) {
    const apiBasketballKey = String(configuracion.apiBasketballKey || '')
    if (!apiBasketballKey) {
      throw createError({ statusCode: 503, statusMessage: 'API-Basketball no está configurada.' })
    }

    const partido = await consultarPartidoApiBasketball({
      baseUrl: String(configuracion.apiBasketballBaseUrl),
      apiKey: apiBasketballKey
    }, idPartido.replace('basket-', ''))
    if (!partido) {
      throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
    }

    return {
      partido: mapearPartidoApiBasketball(partido),
      actualizadoEn: new Date().toISOString(),
      origen: 'api-basketball'
    }
  }

  if (!apiSportsKey || !/^\d+$/.test(idPartido)) {
    throw createError({ statusCode: 400, statusMessage: 'No fue posible actualizar el marcador.' })
  }

  const respuesta = await $fetch<RespuestaApiFootball<FixtureApiFootball>>(`${configuracion.apiSportsBaseUrl}/fixtures`, {
    query: { id: idPartido },
    headers: { 'x-apisports-key': apiSportsKey },
    timeout: 8_000,
    retry: 1
  })
  if (respuesta.errors && Object.keys(respuesta.errors).length) {
    throw createError({ statusCode: 502, statusMessage: 'El proveedor principal no respondió correctamente.' })
  }

  const fixture = respuesta.response[0]
  if (!fixture) {
    throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
  }

  return { partido: mapearFixtureApiFootball(fixture), actualizadoEn: new Date().toISOString(), origen: 'api-sports' }
}, {
  maxAge: 55,
  getKey: evento => `marcador-partido-${getRouterParam(evento, 'id') || 'invalido'}`
})
