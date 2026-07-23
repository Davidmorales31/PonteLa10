import type { FixtureApiFootball, RespuestaApiFootball, RespuestaResultados } from '~/types/resultados'
import { consultarEventosDiaTheSportsDb } from '~/server/utils/clienteTheSportsDb'
import { mapearFixtureApiFootball, ordenarPartidosRelevantes } from '~/utils/resultadosDeportivos'
import { mapearEventoTheSportsDb } from '~/utils/resultadosTheSportsDb'

export default defineCachedEventHandler(async (): Promise<RespuestaResultados> => {
  const configuracion = useRuntimeConfig()
  const apiSportsKey = String(configuracion.apiSportsKey || '')

  const fechaColombia = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Bogota'
  }).format(new Date())

  if (apiSportsKey) {
    try {
      const partidos = await consultarApiSports(configuracion.apiSportsBaseUrl, apiSportsKey, fechaColombia)

      if (partidos.length) {
        return crearRespuesta(partidos, 'api-sports')
      }
    } catch {
      // El proveedor gratuito toma el relevo sin filtrar detalles del fallo al cliente.
    }
  }

  try {
    const respuestaGratuita = await consultarEventosDiaTheSportsDb({
      baseUrl: configuracion.theSportsDbBaseUrl,
      apiKey: configuracion.theSportsDbApiKey
    }, fechaColombia)
    const partidos = ordenarPartidosRelevantes((respuestaGratuita.events || []).map(mapearEventoTheSportsDb)).slice(0, 24)

    return crearRespuesta(partidos, 'the-sports-db')
  } catch {
    return {
      partidos: [],
      clasificacion: [],
      actualizadoEn: new Date().toISOString(),
      origen: 'the-sports-db',
      aviso: 'Los proveedores de resultados no están disponibles en este momento.'
    }
  }
}, {
  maxAge: 60,
  getKey: () => 'resultados-dia-colombia'
})

async function consultarApiSports(baseUrl: string, apiKey: string, fecha: string) {
  const respuesta = await $fetch<RespuestaApiFootball<FixtureApiFootball>>(`${baseUrl}/fixtures`, {
    query: { date: fecha, timezone: 'America/Bogota' },
    headers: { 'x-apisports-key': apiKey },
    timeout: 8_000,
    retry: 1
  })

  if (respuesta.errors && Object.keys(respuesta.errors).length) {
    throw new Error('API-Sports rechazó la solicitud.')
  }

  return ordenarPartidosRelevantes(respuesta.response.map(mapearFixtureApiFootball)).slice(0, 24)
}

function crearRespuesta(
  partidos: RespuestaResultados['partidos'],
  origen: RespuestaResultados['origen']
): RespuestaResultados {
  return {
    partidos,
    clasificacion: [],
    actualizadoEn: new Date().toISOString(),
    origen,
    aviso: partidos.length ? undefined : 'No hay datos disponibles para la fecha actual.'
  }
}
