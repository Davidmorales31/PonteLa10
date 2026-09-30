import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteCodexPrivado } from '~/server/utils/codexEditorialPrivado'
import { accionesEditorialesCodex } from '~/server/utils/esquemasCodexEditorial'

const limite = 100
const maximoEventos = 500

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'configuracion.ver')
  const cliente = obtenerClienteCodexPrivado(evento)
  const { data, error } = await cliente
    .from('editorial_codex_agenda_candidates')
    .select('id, category_id, candidate, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limite)

  if (error) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudieron cargar las oportunidades estratégicas.' })
  }

  const filas = data || []
  const ids = filas.map(fila => String(fila.id))
  const { data: eventosDecision, error: errorEventos } = ids.length
    ? await cliente
        .from('editorial_opportunity_action_events')
        .select('candidate_id,event_name,action,target_resource_id,target_resource_type,reason,occurred_at')
        .in('candidate_id', ids)
        .neq('event_name', 'editorial_action_recommended')
        .order('occurred_at', { ascending: false })
        .limit(maximoEventos)
    : { data: [], error: null }

  if (errorEventos) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudieron cargar las decisiones editoriales.' })
  }

  const ultimaDecision = new Map<string, NonNullable<typeof eventosDecision>[number]>()
  for (const registro of eventosDecision || []) {
    const id = String(registro.candidate_id)
    if (!ultimaDecision.has(id)) ultimaDecision.set(id, registro)
  }

  const { data: articulosRecientes, error: errorArticulos } = await cliente
    .from('articles')
    .select('id,title,slug')
    .eq('status', 'published')
    .not('published_version_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limite)

  if (errorArticulos) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo cargar el catálogo editorial de destinos.' })
  }

  const idsObjetivoArticulo = [...new Set(filas.flatMap((fila) => {
    const candidato = fila.candidate as Record<string, unknown>
    return candidato.targetResourceType === 'article' && typeof candidato.targetResourceId === 'string'
      ? [candidato.targetResourceId]
      : []
  }))]
  const { data: articulosObjetivoExistentes, error: errorArticulosObjetivo } = idsObjetivoArticulo.length
    ? await cliente
        .from('articles')
        .select('id,title,slug')
        .eq('status', 'published')
        .not('published_version_id', 'is', null)
        .in('id', idsObjetivoArticulo)
    : { data: [], error: null }

  if (errorArticulosObjetivo) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudieron verificar los destinos recomendados.' })
  }

  const { data: hubs, error: errorHubs } = await cliente
    .rpc('get_codex_editorial_hub_targets')
  if (errorHubs) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo cargar el catálogo editorial de hubs.' })
  }

  const hubsObjetivo = Array.isArray(hubs)
    ? hubs.flatMap((recurso): { id: string, titulo: string, slug?: string }[] => {
        if (!recurso || typeof recurso !== 'object' || Array.isArray(recurso)) return []
        const hub = recurso as Record<string, unknown>
        if (typeof hub.id !== 'string' || typeof hub.titulo !== 'string') return []
        return [{
          id: hub.id,
          titulo: hub.titulo,
          ...(typeof hub.slug === 'string' ? { slug: hub.slug } : {})
        }]
      })
    : []

  const articulosPorId = new Map<string, NonNullable<typeof articulosRecientes>[number]>()
  for (const articulo of [...(articulosRecientes || []), ...(articulosObjetivoExistentes || [])]) {
    articulosPorId.set(String(articulo.id), articulo)
  }

  const oportunidades = filas.flatMap((fila) => {
    const candidato = fila.candidate as Record<string, unknown>
    const score = candidato.strategicScore
    const scores = candidato.scores
    const recommendedAction = accionesEditorialesCodex.find(action => action === candidato.recommendedAction)
    if (typeof score !== 'number' || !scores || typeof scores !== 'object' || !recommendedAction) return []
    const decision = ultimaDecision.get(String(fila.id))
    return [{
      id: String(fila.id),
      categoriaId: String(fila.category_id),
      titulo: String(candidato.titleHint || ''),
      intencion: String(candidato.contentIntent || ''),
      recommendedAction,
      targetResourceId: typeof candidato.targetResourceId === 'string' ? candidato.targetResourceId : null,
      targetResourceType: candidato.targetResourceType === 'article' || candidato.targetResourceType === 'hub'
        ? candidato.targetResourceType
        : null,
      actionReason: String(candidato.actionReason || ''),
      strategicScore: score,
      scores,
      actualizadoEn: String(fila.updated_at),
      decision: decision ? {
        eventName: decision.event_name,
        action: decision.action,
        targetResourceId: decision.target_resource_id,
        targetResourceType: decision.target_resource_type,
        reason: decision.reason,
        occurredAt: decision.occurred_at
      } : null
    }]
  }).sort((a, b) => b.strategicScore - a.strategicScore)

  return {
    oportunidades,
    articulosObjetivo: [...articulosPorId.values()].map(articulo => ({
      id: String(articulo.id),
      titulo: String(articulo.title),
      slug: String(articulo.slug)
    })),
    hubsObjetivo
  }
})
