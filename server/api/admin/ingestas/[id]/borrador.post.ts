import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'ingestas.redactar')
  throw createError({
    statusCode: 409,
    statusMessage: 'La redacción se genera automáticamente una sola vez al completar la evidencia. No se ejecutó ninguna llamada adicional al proveedor.'
  })
})
