import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteCodexPrivado } from '~/server/utils/codexEditorialPrivado'
import { normalizarSaludOperativaEditorial } from '~/server/utils/saludOperativaEditorial'

export default defineEventHandler(async (evento) => {
  await exigirPermisoEditorial(evento, 'configuracion.ver')

  const { data, error } = await obtenerClienteCodexPrivado(evento)
    .rpc('get_codex_editorial_health')

  if (error || !data || typeof data !== 'object'
    || !('worker' in data) || !('ingestas' in data)
    || !('codex' in data) || !('publicacion' in data) || !('cron' in data)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No se pudo cargar el estado operativo. Comprueba la configuración y la migración de salud.',
      data: { codigo: 'SALUD_EDITORIAL_NO_DISPONIBLE' }
    })
  }

  return normalizarSaludOperativaEditorial(data)
})
