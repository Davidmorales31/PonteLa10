import type { FixtureApiFootball, RespuestaApiFootball, RespuestaMarcadorPartido } from '~/types/resultados'
import { consultarEventoTheSportsDb } from '~/server/utils/clienteTheSportsDb'
import { mapearFixtureApiFootball } from '~/utils/resultadosDeportivos'
import { mapearEventoTheSportsDb } from '~/utils/resultadosTheSportsDb'

export default defineCachedEventHandler(async (evento): Promise<RespuestaMarcadorPartido> => {
  const idPartido = getRouterParam(evento, 'id') || ''
  const configuracion = useRuntimeConfig()
  const apiSportsKey = String(configuracion.apiSportsKey || '')

  if (/^tsdb-\d+$/.test(idPartido)) {
    const respuesta = await consultarEventoTheSportsDb({
      baseUrl: configuracion.theSportsDbBaseUrl,
      apiKey: configuracion.theSportsDbApiKey
    }, idPartido.replace('tsdb-', ''))
    const eventoGratuito = respuesta.events?.[0]

    if (!eventoGratuito) {
      throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
    }

    return {
      partido: mapearEventoTheSportsDb(eventoGratuito),
      actualizadoEn: new Date().toISOString(),
      origen: 'the-sports-db'
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
