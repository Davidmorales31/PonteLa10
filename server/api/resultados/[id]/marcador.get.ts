import type { FixtureApiFootball, RespuestaApiFootball, RespuestaMarcadorPartido } from '~/types/resultados'
import { mapearFixtureApiFootball } from '~/utils/resultadosDeportivos'

export default defineCachedEventHandler(async (evento): Promise<RespuestaMarcadorPartido> => {
  const idPartido = getRouterParam(evento, 'id') || ''
  const configuracion = useRuntimeConfig()
  const apiSportsKey = String(configuracion.apiSportsKey || '')

  if (!apiSportsKey || !/^\d+$/.test(idPartido)) {
    throw createError({ statusCode: 400, statusMessage: 'No fue posible actualizar el marcador.' })
  }

  const respuesta = await $fetch<RespuestaApiFootball<FixtureApiFootball>>(`${configuracion.apiSportsBaseUrl}/fixtures`, {
    query: { id: idPartido }, headers: { 'x-apisports-key': apiSportsKey }
  })
  const fixture = respuesta.response[0]
  if (!fixture) {
    throw createError({ statusCode: 404, statusMessage: 'No hay datos disponibles para este partido.' })
  }

  return { partido: mapearFixtureApiFootball(fixture), actualizadoEn: new Date().toISOString(), origen: 'api-sports' }
}, {
  maxAge: 55,
  getKey: evento => `marcador-partido-${getRouterParam(evento, 'id') || 'invalido'}`
})
