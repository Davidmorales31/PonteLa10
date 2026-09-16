import type { ResultadoBorradorDesdeIngesta } from '~/types/ingestaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { crearProveedorDeepSeekRedaccion, hashPromptRedaccion } from '~/server/utils/ai/deepseekRedaccion'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { crearBorradorDesdeIngesta, obtenerEvidenciaRedactable, obtenerIngestaParaRedaccion, registrarFalloBorradorDesdeIngesta, reservarBorradorDesdeIngesta } from '~/server/utils/repositorioIngestasEditoriales'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdIngestaEditorial } from '~/utils/editorial/ingestas'
import { esquemaGenerarBorradorIa } from '~/utils/editorial/redaccionIa'

export default defineEventHandler(async (evento): Promise<ResultadoBorradorDesdeIngesta> => {
  await exigirPermisoEditorial(evento, 'ingestas.redactar')
  await exigirPermisoEditorial(evento, 'contenido.crear')
  const ingestaId = validarEntradaEditorial(esquemaIdIngestaEditorial, getRouterParam(evento, 'id'))
  validarEntradaEditorial(esquemaGenerarBorradorIa, await readBody(evento))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const ingesta = await obtenerIngestaParaRedaccion(cliente, ingestaId)
  if (ingesta.article_id) return { id: ingesta.article_id, slug: '', yaExistia: true }
  const evidencia = obtenerEvidenciaRedactable(ingesta)
  const entrada = { ingestaId, tituloSugerido: ingesta.title_hint || '', instrucciones: ingesta.editorial_instructions || '', urlFuente: ingesta.source_url, creditos: evidencia.creditos, categoriaId: ingesta.category_id, tipoSugerido: ingesta.rules_snapshot?.tipoContenido || 'noticia', segmentos: evidencia.segmentos }
  const requestId = crypto.randomUUID()
  const reserva = await reservarBorradorDesdeIngesta(cliente, ingestaId, requestId, hashPromptRedaccion(entrada))
  if (reserva.estado === 'completed' && reserva.articleId) return { id: reserva.articleId, slug: '', yaExistia: true }
  if (reserva.estado === 'running') throw createError({ statusCode: 409, statusMessage: 'Ya hay una generación de borrador en curso para esta ingesta.' })
  const inicio = Date.now()
  try {
    const redaccion = await crearProveedorDeepSeekRedaccion().redactarBorrador(entrada)
    return await crearBorradorDesdeIngesta(cliente, ingestaId, requestId, redaccion.propuesta, redaccion, hashPromptRedaccion(entrada))
  } catch (error) {
    const codigo = (error as { data?: { codigo?: string } })?.data?.codigo || 'IA_REDACCION_FALLIDA'
    await registrarFalloBorradorDesdeIngesta(cliente, ingestaId, requestId, codigo, Date.now() - inicio)
    throw error
  }
})
