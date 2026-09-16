import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { esquemaIdIngestaEditorial } from '~/utils/editorial/ingestas'

export default defineEventHandler(async evento => {
  await exigirPermisoEditorial(evento, 'ingestas.gestionar')
  esquemaIdIngestaEditorial.parse(getRouterParam(evento, 'id'))

  throw createError({
    statusCode: 409,
    statusMessage: 'El procesamiento manual fue reemplazado por el worker durable de evidencias.',
    data: { codigo: 'LEGACY_PROCESSING_DISABLED' }
  })
})
