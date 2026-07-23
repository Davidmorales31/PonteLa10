import type {
  RespuestaAlineacionesTheSportsDb,
  RespuestaEstadisticasTheSportsDb,
  RespuestaEventosTheSportsDb,
  RespuestaLineaTiempoTheSportsDb
} from '~/types/theSportsDb'

interface ConfiguracionTheSportsDb {
  baseUrl: string
  apiKey: string
}

export async function consultarEventosDiaTheSportsDb(
  configuracion: ConfiguracionTheSportsDb,
  fecha: string,
  deporte = 'Soccer'
): Promise<RespuestaEventosTheSportsDb> {
  return consultarTheSportsDb(configuracion, 'eventsday.php', { d: fecha, s: deporte })
}

export async function consultarEventoTheSportsDb(
  configuracion: ConfiguracionTheSportsDb,
  idEvento: string
): Promise<RespuestaEventosTheSportsDb> {
  return consultarTheSportsDb(configuracion, 'lookupevent.php', { id: idEvento })
}

export async function consultarDetalleAdicionalTheSportsDb(
  configuracion: ConfiguracionTheSportsDb,
  idEvento: string
): Promise<{
  lineaTiempo: RespuestaLineaTiempoTheSportsDb
  estadisticas: RespuestaEstadisticasTheSportsDb
  alineaciones: RespuestaAlineacionesTheSportsDb
}> {
  const [lineaTiempo, estadisticas, alineaciones] = await Promise.all([
    consultarOpcional<RespuestaLineaTiempoTheSportsDb>(configuracion, 'lookuptimeline.php', idEvento),
    consultarOpcional<RespuestaEstadisticasTheSportsDb>(configuracion, 'lookupeventstats.php', idEvento),
    consultarOpcional<RespuestaAlineacionesTheSportsDb>(configuracion, 'lookuplineup.php', idEvento)
  ])

  return { lineaTiempo, estadisticas, alineaciones }
}

async function consultarTheSportsDb<T>(
  configuracion: ConfiguracionTheSportsDb,
  endpoint: string,
  query: Record<string, string>
): Promise<T> {
  const baseUrl = configuracion.baseUrl.replace(/\/$/, '')
  const respuesta = await $fetch<T>(`${baseUrl}/${configuracion.apiKey}/${endpoint}`, {
    query,
    timeout: 8_000,
    retry: 1
  })
  return respuesta as T
}

async function consultarOpcional<T>(
  configuracion: ConfiguracionTheSportsDb,
  endpoint: string,
  idEvento: string
): Promise<T> {
  try {
    return await consultarTheSportsDb<T>(configuracion, endpoint, { id: idEvento })
  } catch {
    return {} as T
  }
}
