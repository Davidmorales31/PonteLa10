import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteCodexPrivado } from '~/server/utils/codexEditorialPrivado'

const limite = 100

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'configuracion.ver')
  const { data, error } = await obtenerClienteCodexPrivado(evento)
    .from('editorial_codex_agenda_candidates')
    .select('id, category_id, candidate, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limite)

  if (error) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudieron cargar las oportunidades estratégicas.' })
  }

  return (data || []).flatMap((fila) => {
    const candidato = fila.candidate as Record<string, unknown>
    const score = candidato.strategicScore
    const scores = candidato.scores
    if (typeof score !== 'number' || !scores || typeof scores !== 'object') return []
    return [{
      id: String(fila.id),
      categoriaId: String(fila.category_id),
      titulo: String(candidato.titleHint || ''),
      intencion: String(candidato.contentIntent || ''),
      strategicScore: score,
      scores,
      actualizadoEn: String(fila.updated_at)
    }]
  }).sort((a, b) => b.strategicScore - a.strategicScore)
})
