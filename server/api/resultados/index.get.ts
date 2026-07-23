import type { FixtureApiFootball, RespuestaApiFootball, RespuestaResultados } from '~/types/resultados'
import { mapearFixtureApiFootball, ordenarPartidosRelevantes } from '~/utils/resultadosDeportivos'

export default defineCachedEventHandler(async (): Promise<RespuestaResultados> => {
  const configuracion = useRuntimeConfig()
  const apiSportsKey = String(configuracion.apiSportsKey || '')

  if (!apiSportsKey) {
    throw createError({ statusCode: 503, statusMessage: 'El servicio de resultados no está configurado.' })
  }

  try {
    const fechaColombia = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota'
    }).format(new Date())
    const respuesta = await $fetch<RespuestaApiFootball<FixtureApiFootball>>(
      `${configuracion.apiSportsBaseUrl}/fixtures`,
      {
        query: { date: fechaColombia, timezone: 'America/Bogota' },
        headers: { 'x-apisports-key': apiSportsKey }
      }
    )
    const partidos = ordenarPartidosRelevantes(respuesta.response.map(mapearFixtureApiFootball)).slice(0, 24)

    return {
      partidos,
      clasificacion: [],
      actualizadoEn: new Date().toISOString(),
      origen: 'api-sports',
      aviso: partidos.length ? undefined : 'No hay datos disponibles para la fecha actual.'
    }
  } catch {
    return {
      partidos: [],
      clasificacion: [],
      actualizadoEn: new Date().toISOString(),
      origen: 'api-sports',
      aviso: 'No hay datos disponibles en este momento.'
    }
  }
}, {
  maxAge: 60,
  getKey: () => 'resultados-dia-colombia'
})
