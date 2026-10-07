import {
  exigirMfaSegunPoliticaEditorial,
  exigirPermisoEditorial
} from '~/server/utils/autorizacionEditorial'
import { obtenerClienteCodexPrivado } from '~/server/utils/codexEditorialPrivado'
import { esquemaOportunidadCodex } from '~/server/utils/esquemasCodexEditorial'
import type {
  ArticuloEditorialOportunidad as ArticuloPublicadoOportunidad,
  ArticuloPropuestoOportunidad
} from '~/types/oportunidadesEditoriales'
import {
  proyectarOportunidadesEditorialesCodex,
  type FilaAgendaEditorialCodex
} from '~/server/utils/proyectarOportunidadesEditorialesCodex'

const limiteOportunidades = 49

export default defineEventHandler(async (evento) => {
  const contexto = await exigirPermisoEditorial(evento, 'contenido.revisar')
  exigirMfaSegunPoliticaEditorial(contexto)
  setHeader(evento, 'cache-control', 'private, no-store')

  const cliente = obtenerClienteCodexPrivado(evento)
  const { data: corrida, error: errorCorrida } = await cliente
    .from('editorial_codex_runs')
    .select('run_id,run_date,status,updated_at')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (errorCorrida) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No se pudo cargar la evaluación editorial reciente.',
      data: { codigo: 'OPORTUNIDADES_EDITORIALES_NO_DISPONIBLES' }
    })
  }

  if (!corrida) return { corrida: null, oportunidades: [], candidatasInvalidas: 0 }

  const { data: filasAgenda, error: errorAgenda } = await cliente
    .from('editorial_codex_agenda_candidates')
    .select('category_id,story_fingerprint,candidate,updated_at')
    .eq('run_id', corrida.run_id)
    .order('updated_at', { ascending: false })
    .limit(limiteOportunidades)

  if (errorAgenda || !filasAgenda) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No se pudieron cargar las oportunidades de la corrida.',
      data: { codigo: 'OPORTUNIDADES_EDITORIALES_NO_DISPONIBLES' }
    })
  }

  const filas = filasAgenda as unknown as FilaAgendaEditorialCodex[]
  const idsCategoria = [...new Set(filas.map(fila => fila.category_id))]
  const { data: categorias, error: errorCategorias } = idsCategoria.length
    ? await cliente.from('categories').select('id,name').in('id', idsCategoria)
    : { data: [], error: null }

  const { data: filasPropuestas, error: errorPropuestas } = await cliente
    .from('editorial_codex_proposals')
    .select('category_id,story_fingerprint,article_id')
    .eq('run_id', corrida.run_id)
    .limit(limiteOportunidades)

  if (errorCategorias || errorPropuestas) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No se pudieron completar las referencias editoriales.',
      data: { codigo: 'OPORTUNIDADES_EDITORIALES_NO_DISPONIBLES' }
    })
  }

  const nombresCategorias = new Map<string, string>(
    (categorias ?? []).map((categoria: { id: string, name: string }) => [categoria.id, categoria.name])
  )
  const oportunidadesV2 = filas.flatMap((fila) => {
    const validacion = esquemaOportunidadCodex.safeParse(fila.candidate)
    return validacion.success && 'assessment' in validacion.data
      ? [validacion.data]
      : []
  })
  const idsArticulo = new Set<string>()
  const slugsArticulo = new Set<string>()

  for (const candidata of oportunidadesV2) {
    for (const id of candidata.assessment.similarArticleIds) idsArticulo.add(id.toLowerCase())
    const coincidencia = candidata.assessment.targetUrl?.match(/^\/articulos\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)
    if (coincidencia?.[1]) slugsArticulo.add(coincidencia[1])
  }

  const filasPropuesta = (filasPropuestas ?? []) as unknown as Array<{
    category_id: string
    story_fingerprint: string
    article_id: string
  }>
  for (const propuesta of filasPropuesta) idsArticulo.add(propuesta.article_id.toLowerCase())

  const [respuestaIds, respuestaSlugs] = await Promise.all([
    idsArticulo.size
      ? cliente.from('articles').select('id,slug,title,status,published_version_id').in('id', [...idsArticulo])
      : Promise.resolve({ data: [], error: null }),
    slugsArticulo.size
      ? cliente.from('articles').select('id,slug,title,status,published_version_id').in('slug', [...slugsArticulo])
      : Promise.resolve({ data: [], error: null })
  ])

  if (respuestaIds.error || respuestaSlugs.error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No se pudieron verificar los artículos relacionados.',
      data: { codigo: 'OPORTUNIDADES_EDITORIALES_NO_DISPONIBLES' }
    })
  }

  const articulos = [
    ...((respuestaIds.data ?? []) as Array<ArticuloPublicadoOportunidad & { status: string, published_version_id: string | null }>),
    ...((respuestaSlugs.data ?? []) as Array<ArticuloPublicadoOportunidad & { status: string, published_version_id: string | null }>)
  ]
  const articulosPorIdTodos = new Map(
    articulos.map(({ id, slug, title, status }) => [id.toLowerCase(), { id, slug, title, status }])
  )
  const articulosPublicados = articulos.filter(articulo =>
    articulo.status === 'published' && articulo.published_version_id !== null
  )
  const articulosPorId = new Map(
    articulosPublicados.map(({ id, slug, title }) => [id.toLowerCase(), { id, slug, title }])
  )
  const articulosPorSlug = new Map(
    articulosPublicados.map(({ id, slug, title }) => [slug, { id, slug, title }])
  )
  const propuestasPorHuella = new Map<string, ArticuloPropuestoOportunidad>()

  for (const propuesta of filasPropuesta) {
    const articulo = articulosPorIdTodos.get(propuesta.article_id.toLowerCase())
    if (articulo) {
      propuestasPorHuella.set(
        `${propuesta.category_id.toLowerCase()}:${propuesta.story_fingerprint.toLowerCase()}`,
        { id: articulo.id, slug: articulo.slug, title: articulo.title, status: articulo.status }
      )
    }
  }

  const proyeccion = proyectarOportunidadesEditorialesCodex(
    filas,
    nombresCategorias,
    articulosPorId,
    articulosPorSlug,
    propuestasPorHuella
  )

  return {
    corrida: {
      runDate: corrida.run_date,
      status: corrida.status,
      updatedAt: corrida.updated_at
    },
    ...proyeccion
  }
})
