import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { eliminarMedioEditorial } from '~/server/utils/repositorioMediaEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdMedioEditorial } from '~/utils/media/editorial'

export default defineEventHandler(async (
  evento
): Promise<{ eliminado: true }> => {
  await exigirPermisoEditorial(
    evento,
    'media.eliminar',
    { exigirMfa: true }
  )
  const medioId = validarEntradaEditorial(
    esquemaIdMedioEditorial,
    getRouterParam(evento, 'id')
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  await eliminarMedioEditorial(clienteSupabase, medioId)

  return { eliminado: true }
})
