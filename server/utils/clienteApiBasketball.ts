import type {
  EstadisticaEquipoApiBasketball,
  PartidoApiBasketball,
  PosicionApiBasketball,
  RespuestaApiBasketball
} from '~/types/apiBasketball'

export interface ConfiguracionApiBasketball {
  baseUrl: string
  apiKey: string
}

export function consultarPartidosFechaApiBasketball(
  configuracion: ConfiguracionApiBasketball,
  fecha: string
): Promise<PartidoApiBasketball[]> {
  return consultarApiBasketball(configuracion, 'games', {
    date: fecha,
    timezone: 'America/Bogota'
  })
}

export async function consultarPartidoApiBasketball(
  configuracion: ConfiguracionApiBasketball,
  idPartido: string
): Promise<PartidoApiBasketball | undefined> {
  const partidos = await consultarApiBasketball<PartidoApiBasketball>(
    configuracion,
    'games',
    { id: idPartido, timezone: 'America/Bogota' }
  )
  return partidos[0]
}

export function consultarEstadisticasApiBasketball(
  configuracion: ConfiguracionApiBasketball,
  idPartido: string
): Promise<EstadisticaEquipoApiBasketball[]> {
  return consultarApiBasketball(configuracion, 'games/statistics/teams', { id: idPartido }, true)
}

export async function consultarClasificacionApiBasketball(
  configuracion: ConfiguracionApiBasketball,
  liga: number,
  temporada: string | number
): Promise<PosicionApiBasketball[]> {
  const grupos = await consultarApiBasketball<PosicionApiBasketball[]>(
    configuracion,
    'standings',
    { league: liga, season: temporada },
    true
  )
  return grupos.flat()
}

async function consultarApiBasketball<T>(
  configuracion: ConfiguracionApiBasketball,
  endpoint: string,
  query: Record<string, string | number>,
  opcional = false
): Promise<T[]> {
  try {
    const baseUrl = configuracion.baseUrl.replace(/\/$/, '')
    const respuesta = await $fetch<RespuestaApiBasketball<T>>(`${baseUrl}/${endpoint}`, {
      query,
      headers: { 'x-apisports-key': configuracion.apiKey },
      timeout: 8_000,
      retry: 1
    })

    if (respuesta.errors && Object.keys(respuesta.errors).length) {
      throw new Error('API-Basketball rechazó la solicitud.')
    }

    return respuesta.response || []
  } catch (error) {
    if (opcional) return []
    throw error
  }
}
