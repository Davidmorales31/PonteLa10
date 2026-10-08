import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaDecisionPodaContenido } from '~/utils/editorial/podaContenido'

export default defineEventHandler(async (evento) => {
  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  await exigirPermisoEditorial(evento, 'contenido.revisar', { exigirMfa: true })
  const entrada = validarEntradaEditorial(esquemaDecisionPodaContenido, await readBody(evento))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const { data, error } = await cliente.rpc('save_editorial_content_pruning_review', {
    p_article_id: entrada.articleId,
    p_decision: entrada.decision,
    p_note: entrada.nota || null,
    p_redirect_target: entrada.decision === 'redirect' ? entrada.destinoInterno : null
  })

  if (error) {
    if (error.code === '42501') {
      throw createError({ statusCode: 403, statusMessage: 'Guardar la propuesta requiere permiso editorial y MFA.' })
    }
    if (['22023', '22P02', '23514'].includes(error.code || '')) {
      throw createError({ statusCode: 422, statusMessage: 'La propuesta no cumple las reglas de revisión editorial.' })
    }
    throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar la propuesta de revisión editorial.' })
  }

  return data
})
