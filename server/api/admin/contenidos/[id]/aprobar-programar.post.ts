import type { ResultadoAprobacionProgramacionEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { aprobarYProgramarArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial, esquemaAprobarProgramarEditorial } from '~/utils/editorial/contenido'

export default defineEventHandler(async (
  evento
): Promise<ResultadoAprobacionProgramacionEditorial> => {
  const contexto = await exigirPermisoEditorial(
    evento,
    'contenido.aprobar',
    { exigirMfa: true }
  )
  if (!contexto.permisos.includes('contenido.programar')) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Aprobar y programar requiere también permiso para programar.',
      data: { codigo: 'PERMISO_PROGRAMAR_REQUERIDO' }
    })
  }

  const articuloId = validarEntradaEditorial(
    esquemaIdEditorial,
    getRouterParam(evento, 'id')
  )
  const entrada = validarEntradaEditorial(
    esquemaAprobarProgramarEditorial,
    await readBody(evento)
  )

  return aprobarYProgramarArticuloEditorial(
    obtenerClienteSupabaseEditorial(evento),
    articuloId,
    entrada.versionBloqueo
  )
})
