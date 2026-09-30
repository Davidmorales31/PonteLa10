import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MetricaSearchConsoleCsv,
  OportunidadSearchConsole,
  ResultadoImportacionSearchConsole
} from '~/types/searchConsole'

interface ErrorSupabase {
  code?: string
}

function lanzarErrorSearchConsole(error: ErrorSupabase | null, accion: 'importar' | 'consultar'): never {
  const codigo = error?.code || ''
  const statusCode = codigo === '42501' ? 403 : codigo === '22023' ? 422 : 503
  throw createError({
    statusCode,
    statusMessage: accion === 'importar'
      ? statusCode === 403
        ? 'La sesión ya no tiene permiso o requiere MFA para importar.'
        : 'No se pudo guardar el lote. Revisa que la migración esté aplicada y vuelve a intentar.'
      : statusCode === 403
        ? 'La sesión ya no tiene permiso o requiere MFA para consultar Search Console.'
        : 'No se pudieron consultar las oportunidades de Search Console.',
    data: { codigo: `SEARCH_CONSOLE_${accion.toUpperCase()}_NO_DISPONIBLE` }
  })
}

export async function importarMetricasSearchConsole(
  cliente: SupabaseClient,
  filas: MetricaSearchConsoleCsv[]
): Promise<ResultadoImportacionSearchConsole> {
  const { data, error } = await cliente.rpc('import_search_console_metrics', {
    p_rows: filas.map(fila => ({
      metric_date: fila.fecha,
      query: fila.consulta,
      page_url: fila.pagina,
      clicks: fila.clics,
      impressions: fila.impresiones,
      ctr: fila.ctr,
      position: fila.posicion
    }))
  })

  if (error) lanzarErrorSearchConsole(error, 'importar')

  const respuesta = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {}
  const loteId = typeof respuesta.loteId === 'string' ? respuesta.loteId : ''
  const filasProcesadas = Number(respuesta.filasProcesadas)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(loteId)
    || !Number.isInteger(filasProcesadas)
    || filasProcesadas !== filas.length) {
    throw createError({
      statusCode: 503,
      statusMessage: 'La respuesta de importación no es válida.',
      data: { codigo: 'SEARCH_CONSOLE_IMPORTACION_RESPUESTA_INVALIDA' }
    })
  }

  return { loteId, filasProcesadas }
}

function validarFechaIso(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00Z`)
  return !Number.isNaN(fecha.getTime())
    && fecha.toISOString().slice(0, 10) === valor
}

function fechaPorDefecto(diasAntes: number): string {
  const fecha = new Date()
  fecha.setUTCDate(fecha.getUTCDate() - diasAntes)
  return fecha.toISOString().slice(0, 10)
}

function limpiarOportunidades(datos: unknown): OportunidadSearchConsole[] {
  if (!Array.isArray(datos)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'La respuesta de oportunidades no es válida.',
      data: { codigo: 'SEARCH_CONSOLE_CONSULTA_RESPUESTA_INVALIDA' }
    })
  }

  const normalizadas: OportunidadSearchConsole[] = []
  for (const valor of datos) {
    if (!valor || typeof valor !== 'object') continue
    const fila = valor as Record<string, unknown>
    const consulta = typeof fila.query === 'string' ? fila.query : ''
    const pagina = typeof fila.page_url === 'string' ? fila.page_url : ''
    const metricas = [fila.clicks, fila.impressions, fila.ctr, fila.position].map(Number)
    let url: URL
    try {
      url = new URL(pagina)
    } catch {
      continue
    }

    if (!consulta || consulta.length > 256
      || url.protocol !== 'https:'
      || !['pont3la10.com', 'www.pont3la10.com'].includes(url.hostname.toLowerCase())
      || metricas.some(numero => !Number.isFinite(numero))) continue

    normalizadas.push({
      consulta,
      pagina: url.href,
      clics: metricas[0]!,
      impresiones: metricas[1]!,
      ctr: metricas[2]!,
      posicion: metricas[3]!,
      estimada: fila.is_estimated === true
    })
  }
  return normalizadas
}

export async function obtenerOportunidadesSearchConsole(
  cliente: SupabaseClient,
  desdeSolicitado?: unknown,
  hastaSolicitado?: unknown
): Promise<{ desde: string, hasta: string, oportunidades: OportunidadSearchConsole[] }> {
  const hoy = new Date().toISOString().slice(0, 10)
  const hasta = typeof hastaSolicitado === 'string' ? hastaSolicitado : hoy
  const desde = typeof desdeSolicitado === 'string' ? desdeSolicitado : fechaPorDefecto(27)
  if (!validarFechaIso(desde) || !validarFechaIso(hasta)
    || desde > hasta || hasta > hoy
    || Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`) > 548 * 86400000) {
    throw createError({
      statusCode: 400,
      statusMessage: 'El rango debe ser válido, no futuro y no superar 549 días.',
      data: { codigo: 'SEARCH_CONSOLE_RANGO_NO_VALIDO' }
    })
  }

  const { data, error } = await cliente.rpc('get_search_console_opportunities', {
    p_date_from: desde,
    p_date_to: hasta
  })
  if (error) lanzarErrorSearchConsole(error, 'consultar')

  return { desde, hasta, oportunidades: limpiarOportunidades(data) }
}
