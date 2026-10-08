import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import {
  detectarCandidatosPodaContenido,
  detectarImpresionesCeroProlongadas,
  type ArticuloPodaContenido,
  type RevisionPodaContenido,
  type ResultadoPodaContenido
} from '~/utils/editorial/podaContenido'

const limiteArticulos = 1000
const limiteCandidatos = 200
const limiteFilasCero = 10_000
const limiteRelacionesArticulo = 20_000

interface FilaArticulo {
  id: string
  slug: string
  title: string
  seo_title: string | null
  seo_description: string | null
  published_at: string | null
  published_version_id: string
}

interface FilaVersionPublicada {
  id: string
  created_at: string
}

interface FilaEnlaceArticulo {
  source_article_id: string
  target_article_id: string
}

interface FilaRelacionArticulo {
  article_id: string
  entity_slug: string
}

interface FilaInformeSearchConsole {
  id: string
  period_start: string
  period_end: string
  imported_at: string
}

interface FilaImpresionesCero {
  page_url: string
  report_id: string
}

interface FilaDecisionPoda {
  article_id: string
  decision: RevisionPodaContenido['decision']
  note: string | null
  redirect_target: string | null
  updated_at: string
}

function crearErrorDatos(statusMessage: string): never {
  throw createError({
    statusCode: 503,
    statusMessage,
    data: { codigo: 'PODA_EDITORIAL_NO_DISPONIBLE' }
  })
}

function extraerSlugArticulo(pageUrl: string): string | null {
  try {
    const url = new URL(pageUrl)
    const host = url.hostname.toLocaleLowerCase('en-US').replace(/^www\./, '')
    if (url.protocol !== 'https:' || host !== 'pont3la10.com' || url.search || url.hash) return null
    return url.pathname.replace(/\/$/, '').match(/^\/articulos\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1] || null
  } catch {
    return null
  }
}

export default defineEventHandler(async (evento): Promise<ResultadoPodaContenido> => {
  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  await exigirPermisoEditorial(evento, 'contenido.revisar', { exigirMfa: true })
  const cliente = obtenerClienteSupabaseEditorial(evento)

  const { data: filasRaw, error: errorArticulos, count } = await cliente
    .from('articles')
    .select('id,slug,title,seo_title,seo_description,published_at,published_version_id', { count: 'exact' })
    .eq('status', 'published')
    .not('published_version_id', 'is', null)
    .order('published_at', { ascending: true })
    .limit(limiteArticulos)

  if (errorArticulos || !filasRaw) crearErrorDatos('No se pudieron cargar las publicaciones para la revisión.')
  const filas = filasRaw as unknown as FilaArticulo[]
  const idsVersion = filas.map(fila => fila.published_version_id)
  const { data: versionesRaw, error: errorVersiones } = idsVersion.length
    ? await cliente.from('article_versions').select('id,created_at').in('id', idsVersion).eq('status', 'published')
    : { data: [], error: null }
  if (errorVersiones) crearErrorDatos('No se pudieron verificar las versiones públicas vigentes.')
  const fechaVersionPorId = new Map(((versionesRaw || []) as unknown as FilaVersionPublicada[])
    .map(version => [version.id, version.created_at]))

  const [{ data: enlacesRaw, error: errorEnlaces }, { data: relacionesRaw, error: errorRelaciones }] = await Promise.all([
    cliente.rpc('list_public_editorial_article_links'),
    cliente.from('editorial_article_entity_relations')
      .select('article_id,entity_slug')
      .eq('entity_type', 'article')
      .eq('status', 'confirmed')
      .limit(limiteRelacionesArticulo)
  ])
  if (errorEnlaces || !enlacesRaw || errorRelaciones || !relacionesRaw) {
    crearErrorDatos('No se pudieron comprobar todos los enlaces internos entre artículos.')
  }
  const relacionesLimitadas = relacionesRaw.length === limiteRelacionesArticulo

  const articuloPorId = new Map(filas.map(fila => [fila.id, fila]))
  const articuloPorSlug = new Map(filas.map(fila => [fila.slug, fila]))
  const entradasPorDestino = new Map<string, Set<string>>()
  const registrarEnlace = (origenId: string, destinoId: string) => {
    if (origenId === destinoId || !articuloPorId.has(origenId) || !articuloPorId.has(destinoId)) return
    const entradas = entradasPorDestino.get(destinoId) || new Set<string>()
    entradas.add(origenId)
    entradasPorDestino.set(destinoId, entradas)
  }
  for (const enlace of enlacesRaw as unknown as FilaEnlaceArticulo[]) {
    registrarEnlace(enlace.source_article_id, enlace.target_article_id)
  }
  for (const relacion of relacionesRaw as unknown as FilaRelacionArticulo[]) {
    const destino = articuloPorSlug.get(relacion.entity_slug)
    if (destino) registrarEnlace(relacion.article_id, destino.id)
  }
  const enlacesEntrantes = new Map([...articuloPorId.keys()].map(id => [id, entradasPorDestino.get(id)?.size || 0]))

  let informes: FilaInformeSearchConsole[] = []
  let filasCero: FilaImpresionesCero[] = []
  let estadoSearchConsole: ResultadoPodaContenido['searchConsole']['estado'] = 'no_disponible'
  let filasCeroLimitadas = false
  try {
    const { data, error } = await cliente.from('editorial_search_console_reports')
      .select('id,period_start,period_end,imported_at')
      .order('period_end', { ascending: false })
      .order('imported_at', { ascending: false })
      .limit(50)
    if (!error && data) {
      informes = data as unknown as FilaInformeSearchConsole[]
      if (!informes.length) {
        estadoSearchConsole = 'sin_informes'
      } else {
        const { data: filasCeroRaw, error: errorFilasCero } = await cliente
          .rpc('list_editorial_search_console_zero_impression_pages')
        if (!errorFilasCero && filasCeroRaw) {
          filasCero = filasCeroRaw as unknown as FilaImpresionesCero[]
          filasCeroLimitadas = filasCero.length === limiteFilasCero
          estadoSearchConsole = 'sin_evidencia_cero'
        }
      }
    }
  } catch {
    // Search Console es evidencia complementaria: un fallo no convierte ausencia de datos en impresiones cero.
  }

  const slugPorUrl = new Map<string, string>()
  for (const fila of filasCero) {
    const slug = extraerSlugArticulo(fila.page_url)
    if (slug && articuloPorSlug.has(slug)) slugPorUrl.set(fila.page_url, slug)
  }
  const ceroPorSlug = detectarImpresionesCeroProlongadas(filasCero, informes, slugPorUrl)
  const cerosProlongados = new Map([...ceroPorSlug.entries()].flatMap(([slug, evidencia]) => {
    const articulo = articuloPorSlug.get(slug)
    return articulo ? [[articulo.id, evidencia] as const] : []
  }))
  if (cerosProlongados.size) estadoSearchConsole = 'evidencia_disponible'

  const articulos: ArticuloPodaContenido[] = filas.map(fila => ({
    id: fila.id,
    slug: fila.slug,
    titulo: fila.title,
    tituloSeo: fila.seo_title,
    descripcionSeo: fila.seo_description,
    publicadoEn: fila.published_at,
    ultimaVersionPublicadaEn: fechaVersionPorId.get(fila.published_version_id) || null,
    publishedVersionId: fila.published_version_id
  }))
  const candidatosTotales = detectarCandidatosPodaContenido(
    articulos,
    enlacesEntrantes,
    cerosProlongados,
    new Map(),
    new Date(),
    limiteArticulos
  )
  const idsCandidatos = candidatosTotales.map(candidato => candidato.articleId)
  const { data: decisionesRaw, error: errorDecisiones } = idsCandidatos.length
    ? await cliente.from('editorial_content_pruning_reviews')
      .select('article_id,decision,note,redirect_target,updated_at')
      .in('article_id', idsCandidatos)
    : { data: [], error: null }
  if (errorDecisiones) crearErrorDatos('No se pudieron cargar los planes editoriales guardados.')
  const decisiones = new Map(((decisionesRaw || []) as unknown as FilaDecisionPoda[]).map(fila => [fila.article_id, {
    articleId: fila.article_id,
    decision: fila.decision,
    nota: fila.note || '',
    destinoInterno: fila.redirect_target,
    actualizadoEn: fila.updated_at
  }]))
  const candidatos = detectarCandidatosPodaContenido(
    articulos,
    enlacesEntrantes,
    cerosProlongados,
    decisiones,
    new Date(),
    limiteArticulos
  )

  return {
    candidatos: candidatos.slice(0, limiteCandidatos),
    totalCandidatos: candidatos.length,
    candidatosLimitados: candidatos.length > limiteCandidatos,
    totalArticulosAnalizados: filas.length,
    coberturaCompleta: (count ?? filas.length) <= filas.length && !filasCeroLimitadas && !relacionesLimitadas,
    limiteArticulos,
    generadoEn: new Date().toISOString(),
    searchConsole: {
      estado: estadoSearchConsole,
      informesAnalizados: informes.length,
      filasCeroCubrenPeriodo: estadoSearchConsole === 'evidencia_disponible'
    }
  }
})
