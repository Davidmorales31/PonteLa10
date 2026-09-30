import { z } from 'zod'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteCodexPrivado } from '~/server/utils/codexEditorialPrivado'
import { esquemaDecisionOportunidadCodex } from '~/server/utils/esquemasCodexEditorial'

export default defineEventHandler(async (evento) => {
  const contexto = await exigirPermisoEditorial(evento, 'contenido.revisar')
  const idResultado = z.string().uuid().safeParse(getRouterParam(evento, 'id'))
  if (!idResultado.success) {
    throw createError({ statusCode: 404, statusMessage: 'La oportunidad no existe.' })
  }

  const resultado = esquemaDecisionOportunidadCodex.safeParse(await readBody(evento))
  if (!resultado.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La decisión editorial requiere una acción, razón y target compatibles.',
      data: { campos: resultado.error.flatten().fieldErrors }
    })
  }

  const cliente = obtenerClienteCodexPrivado(evento)
  // La identidad se obtiene del contexto servidor autorizado, no del cuerpo recibido.
  const { data: idEvento, error } = await cliente.rpc('record_editorial_opportunity_decision', {
    p_candidate_id: idResultado.data,
    p_action: resultado.data.action,
    p_target_resource_id: resultado.data.targetResourceId,
    p_target_resource_type: resultado.data.targetResourceType,
    p_reason: resultado.data.reason,
    p_actor_id: contexto.usuario.id
  })

  if (error) {
    const invalida = error.code === '22023' || error.code === '22P02'
    throw createError({
      statusCode: invalida ? 422 : 502,
      statusMessage: invalida
        ? 'La oportunidad o el target ya no están disponibles para esta decisión.'
        : 'No se pudo registrar la decisión editorial.',
      data: { codigo: invalida ? 'DECISION_EDITORIAL_INVALIDA' : 'DECISION_EDITORIAL_NO_DISPONIBLE' }
    })
  }

  setResponseStatus(evento, 201)
  return {
    id: String(idEvento),
    accion: resultado.data.action,
    targetResourceId: resultado.data.targetResourceId,
    targetResourceType: resultado.data.targetResourceType,
    registradaEn: new Date().toISOString()
  }
})
