import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import {
  calcularTendenciaSearchConsole,
  claveFilaSearchConsole,
  type AccionSearchConsole,
  type FilaSearchConsole
} from '~/utils/editorial/searchConsole'
import {
  detectarCanibalizacionEditorial,
  type ArticuloCanibalizacion
} from '~/utils/editorial/canibalizacion'

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
  triage_key: string
  query: string
  page_url: string
  action: AccionSearchConsole
  note: string | null
  updated_at: string
}

interface DecisionSearchConsole {
  triage_key: string
  action: AccionSearchConsole
  note: string | null
  changed_at: string
}

interface ArticuloCanibalizacionDb {
  id: string
  slug: string
  title: string
  published_version_id: string
}

interface VersionCanibalizacionDb {
  id: string
  snapshot: Record<string, unknown>
}

interface BriefCanibalizacionDb {
  article_id: string
  target_query: string | null
  search_intent: string | null
}

interface EntidadCanibalizacionDb {
  article_id: string
  entity_type: string
  entity_slug: string
  entity_name: string
}

const maximoUrlsArticuloCanibalizacion = 300
const tamanoLoteArticulosCanibalizacion = 100

function extraerSlugArticulo(paginaUrl: string): string | null {
  try {
    const url = new URL(paginaUrl)
    const host = url.hostname.toLocaleLowerCase('en-US').replace(/^www\./, '')
    if (url.protocol !== 'https:' || host !== 'pont3la10.com' || url.search || url.hash) return null
    return url.pathname.match(/^\/articulos\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/)?.[1] || null
  } catch {
    return null
  }
}

function dividirEnLotes<T>(valores: T[], tamano: number): T[][] {
  const lotes: T[][] = []
  for (let indice = 0; indice < valores.length; indice += tamano) {
    lotes.push(valores.slice(indice, indice + tamano))
  }
  return lotes
}

async function cargarArticulosCanibalizacion(
  cliente: ReturnType<typeof obtenerClienteSupabaseEditorial>,
  metricas: MetricaSearchConsole[]
): Promise<{
  articulos: ArticuloCanibalizacion[]
  cantidadArticulos: number
  briefsConfirmados: number
  entidadesPrincipales: number
  alcanceLimitado: boolean
  metadatosDisponibles: boolean
}> {
  const impresionesPorSlug = new Map<string, number>()
  for (const metrica of metricas) {
    const slug = extraerSlugArticulo(metrica.page_url)
    if (slug) impresionesPorSlug.set(slug, (impresionesPorSlug.get(slug) || 0) + metrica.impressions)
  }

  const slugsOrdenados = [...impresionesPorSlug.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))
    .map(([slug]) => slug)
  const alcanceLimitado = slugsOrdenados.length > maximoUrlsArticuloCanibalizacion
  const slugs = slugsOrdenados.slice(0, maximoUrlsArticuloCanibalizacion)
  if (!slugs.length) {
    return {
      articulos: [],
      cantidadArticulos: 0,
      briefsConfirmados: 0,
      entidadesPrincipales: 0,
      alcanceLimitado: false,
      metadatosDisponibles: true
    }
  }

  const respuestasArticulos = await Promise.all(dividirEnLotes(slugs, tamanoLoteArticulosCanibalizacion)
    .map(lote => cliente.from('articles')
      .select('id,slug,title,published_version_id')
      .eq('status', 'published')
      .not('published_version_id', 'is', null)
      .in('slug', lote)))
  if (respuestasArticulos.some(respuesta => respuesta.error)) {
    return {
      articulos: [],
      cantidadArticulos: 0,
      briefsConfirmados: 0,
      entidadesPrincipales: 0,
      alcanceLimitado,
      metadatosDisponibles: false
    }
  }

  const articulosDb = respuestasArticulos.flatMap(respuesta =>
    (respuesta.data || []) as unknown as ArticuloCanibalizacionDb[])
  const articulosPorLote = await Promise.all(dividirEnLotes(articulosDb, tamanoLoteArticulosCanibalizacion)
    .map(async (lote) => {
      const idsArticulo = lote.map(articulo => articulo.id)
      const idsVersion = lote.map(articulo => articulo.published_version_id)
      const [respuestaVersiones, respuestaBriefs, respuestaEntidades] = await Promise.all([
        cliente.from('article_versions').select('id,snapshot').in('id', idsVersion),
        cliente.from('editorial_article_search_briefs')
          .select('article_id,target_query,search_intent')
          .eq('status', 'confirmed')
          .in('article_id', idsArticulo),
        cliente.from('editorial_article_entity_relations')
          .select('article_id,entity_type,entity_slug,entity_name')
          .eq('status', 'confirmed')
          .eq('relation_type', 'about')
          .in('article_id', idsArticulo)
          .limit(5000)
      ])
      return {
        error: respuestaVersiones.error || respuestaBriefs.error || respuestaEntidades.error,
        versiones: (respuestaVersiones.data || []) as unknown as VersionCanibalizacionDb[],
        briefs: (respuestaBriefs.data || []) as unknown as BriefCanibalizacionDb[],
        entidades: (respuestaEntidades.data || []) as unknown as EntidadCanibalizacionDb[]
      }
    }))

  if (articulosPorLote.some(respuesta => respuesta.error)) {
    return {
      articulos: [],
      cantidadArticulos: 0,
      briefsConfirmados: 0,
      entidadesPrincipales: 0,
      alcanceLimitado,
      metadatosDisponibles: false
    }
  }

  const versiones = new Map(articulosPorLote.flatMap(respuesta => respuesta.versiones.map(version => [version.id, version] as const)))
  const briefs = new Map(articulosPorLote.flatMap(respuesta => respuesta.briefs.map(brief => [brief.article_id, brief] as const)))
  const entidades = new Map<string, EntidadCanibalizacionDb[]>()
  for (const entidad of articulosPorLote.flatMap(respuesta => respuesta.entidades)) {
    const lista = entidades.get(entidad.article_id) || []
    lista.push(entidad)
    entidades.set(entidad.article_id, lista)
  }

  const articulos: ArticuloCanibalizacion[] = articulosDb.flatMap((articulo) => {
    const snapshot = versiones.get(articulo.published_version_id)?.snapshot
    if (!snapshot) return []
    const brief = briefs.get(articulo.id)
    const entidadesPrincipales = entidades.get(articulo.id) || []
    return [{
      id: articulo.id,
      url: `https://www.pont3la10.com/articulos/${articulo.slug}`,
      titulo: String(snapshot.title || articulo.title),
      tituloSeo: String(snapshot.seo_title || snapshot.title || articulo.title),
      consultaObjetivo: brief?.target_query || null,
      intencion: brief?.search_intent || null,
      entidades: entidadesPrincipales.map(entidad => ({
        clave: `${entidad.entity_type}:${entidad.entity_slug}`,
        nombre: entidad.entity_name
      }))
    }]
  })

  return {
    articulos,
    cantidadArticulos: articulos.length,
    briefsConfirmados: articulosDb.filter(articulo => briefs.has(articulo.id)).length,
    entidadesPrincipales: articulos.reduce((total, articulo) => total + articulo.entidades.length, 0),
    alcanceLimitado,
    metadatosDisponibles: true
  }
}

function respuestaCanibalizacionVacia() {
  return {
    candidatos: [],
    totalCandidatos: 0,
    candidatosLimitados: false,
    articulosComparados: 0,
    briefsConfirmados: 0,
    entidadesPrincipales: 0,
    alcanceLimitado: false,
    metadatosDisponibles: true
  }
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
      historialCargado: 0,
      historialTotal: 0,
      historialLimitado: false,
      filas: [],
      canibalizacion: respuestaCanibalizacionVacia()
    }
  }

  const anterior = informes.slice(1).find(informe => esPeriodoAnteriorComparable(informe, actual)) || null
  const [metricasActuales, metricasAnteriores, accionesRaw, historialRaw] = await Promise.all([
    listarMetricas(cliente, actual.id),
    anterior ? listarMetricas(cliente, anterior.id) : Promise.resolve([]),
    cliente
      .from('editorial_search_console_triage')
      .select('triage_key,query,page_url,action,note,updated_at')
      .order('updated_at', { ascending: false })
      .limit(5000),
    cliente
      .from('editorial_search_console_triage_history')
      .select('triage_key,action,note,changed_at', { count: 'exact' })
      .order('changed_at', { ascending: false })
      .limit(5000)
  ])

  if (accionesRaw.error) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudieron cargar las acciones editoriales.' })
  }
  if (historialRaw.error) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo cargar el historial de decisiones.' })
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

  const historial = (historialRaw.data || []) as unknown as DecisionSearchConsole[]
  const historialTotal = historialRaw.count ?? historial.length
  const historialPorClave = new Map<string, DecisionSearchConsole[]>()
  for (const decision of historial) {
    const historial = historialPorClave.get(decision.triage_key) || []
    historial.push(decision)
    historialPorClave.set(decision.triage_key, historial)
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
      accionActualizadaEn: accion?.updated_at || null,
      historialAcciones: accion ? historialPorClave.get(accion.triage_key) || [] : []
    }
  })

  const datosArticulosCanibalizacion = await cargarArticulosCanibalizacion(cliente, metricasActuales)

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
    historialCargado: historial.length,
    historialTotal,
    historialLimitado: historial.length < historialTotal,
    filas,
    canibalizacion: {
      ...detectarCanibalizacionEditorial(filas, datosArticulosCanibalizacion.articulos),
      articulosComparados: datosArticulosCanibalizacion.cantidadArticulos,
      briefsConfirmados: datosArticulosCanibalizacion.briefsConfirmados,
      entidadesPrincipales: datosArticulosCanibalizacion.entidadesPrincipales,
      alcanceLimitado: datosArticulosCanibalizacion.alcanceLimitado,
      metadatosDisponibles: datosArticulosCanibalizacion.metadatosDisponibles
    }
  }
})
