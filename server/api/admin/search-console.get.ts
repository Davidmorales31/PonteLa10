import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import {
  calcularTendenciaSearchConsole,
  claveFilaSearchConsole,
  type AccionSearchConsole,
  type FilaSearchConsole
} from '~/utils/editorial/searchConsole'

interface InformeSearchConsole {
  id: string
  period_start: string
  period_end: string
  imported_at: string
  row_count: number
}

interface MetricaSearchConsole {
  query: string
  page_url: string
  clicks: number
  impressions: number
  ctr: number
  average_position: number
}

interface AccionGuardadaSearchConsole {
  query: string
  page_url: string
  action: AccionSearchConsole
  note: string | null
  updated_at: string
}

function diasPeriodo(informe: InformeSearchConsole): number {
  return Math.round((Date.parse(`${informe.period_end}T00:00:00Z`)
    - Date.parse(`${informe.period_start}T00:00:00Z`)) / 86_400_000)
}

function esPeriodoAnteriorComparable(
  candidato: InformeSearchConsole,
  actual: InformeSearchConsole
): boolean {
  if (diasPeriodo(candidato) !== diasPeriodo(actual)) return false
  const diaSiguiente = new Date(Date.parse(`${candidato.period_end}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10)
  return diaSiguiente === actual.period_start
}

async function listarMetricas(
  cliente: ReturnType<typeof obtenerClienteSupabaseEditorial>,
  informeId: string
): Promise<MetricaSearchConsole[]> {
  const { data, error } = await cliente
    .from('editorial_search_console_metrics')
    .select('query,page_url,clicks,impressions,ctr,average_position')
    .eq('report_id', informeId)
    .order('impressions', { ascending: false })
    .limit(5000)

  if (error) throw createError({ statusCode: 503, statusMessage: 'No se pudieron cargar las métricas importadas.' })
  return (data || []) as unknown as MetricaSearchConsole[]
}

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'contenido.verBorradores')
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const { data: informesRaw, error: errorInformes } = await cliente
    .from('editorial_search_console_reports')
    .select('id,period_start,period_end,imported_at,row_count')
    .order('period_end', { ascending: false })
    .order('imported_at', { ascending: false })
    .limit(50)

  if (errorInformes) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudieron cargar los informes de Search Console.' })
  }

  const informes = (informesRaw || []) as unknown as InformeSearchConsole[]
  const actual = informes[0] || null
  if (!actual) {
    setResponseHeader(evento, 'Cache-Control', 'private, no-store')
    return {
      informes: [],
      periodoActual: null,
      periodoComparacion: null,
      tendenciaDisponible: false,
      filas: []
    }
  }

  const anterior = informes.slice(1).find(informe => esPeriodoAnteriorComparable(informe, actual)) || null
  const [metricasActuales, metricasAnteriores, accionesRaw] = await Promise.all([
    listarMetricas(cliente, actual.id),
    anterior ? listarMetricas(cliente, anterior.id) : Promise.resolve([]),
    cliente
      .from('editorial_search_console_triage')
      .select('query,page_url,action,note,updated_at')
      .order('updated_at', { ascending: false })
      .limit(5000)
  ])

  if (accionesRaw.error) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudieron cargar las acciones editoriales.' })
  }

  const metricasPorClave = new Map(metricasAnteriores.map((metrica) => {
    const fila = {
      consulta: metrica.query,
      paginaUrl: metrica.page_url,
      clics: metrica.clicks,
      impresiones: metrica.impressions,
      ctr: Number(metrica.ctr),
      posicion: Number(metrica.average_position)
    }
    return [claveFilaSearchConsole(fila), fila] as const
  }))
  const accionesPorClave = new Map<string, AccionGuardadaSearchConsole>()
  for (const accion of (accionesRaw.data || []) as unknown as AccionGuardadaSearchConsole[]) {
    const clave = claveFilaSearchConsole({ consulta: accion.query, paginaUrl: accion.page_url })
    if (!accionesPorClave.has(clave)) accionesPorClave.set(clave, accion)
  }

  const filas = metricasActuales.map((metrica) => {
    const fila: FilaSearchConsole = {
      consulta: metrica.query,
      paginaUrl: metrica.page_url,
      clics: metrica.clicks,
      impresiones: metrica.impressions,
      ctr: Number(metrica.ctr),
      posicion: Number(metrica.average_position)
    }
    const clave = claveFilaSearchConsole(fila)
    const accion = accionesPorClave.get(clave)
    return {
      ...fila,
      tendencia: calcularTendenciaSearchConsole(fila, metricasPorClave.get(clave) || null),
      accion: accion?.action || null,
      notaAccion: accion?.note || null,
      accionActualizadaEn: accion?.updated_at || null
    }
  })

  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  return {
    informes: informes.map(informe => ({
      id: informe.id,
      fechaDesde: informe.period_start,
      fechaHasta: informe.period_end,
      importadoEn: informe.imported_at,
      cantidadFilas: informe.row_count
    })),
    periodoActual: {
      fechaDesde: actual.period_start,
      fechaHasta: actual.period_end,
      cantidadFilas: actual.row_count
    },
    periodoComparacion: anterior
      ? { fechaDesde: anterior.period_start, fechaHasta: anterior.period_end }
      : null,
    tendenciaDisponible: Boolean(anterior),
    filas
  }
})
