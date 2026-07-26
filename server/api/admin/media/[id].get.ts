import type { MedioEditorial } from '~/types/mediaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerMedioEditorial } from '~/server/utils/repositorioMediaEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdMedioEditorial } from '~/utils/media/editorial'

export default defineEventHandler(async (evento): Promise<MedioEditorial> => {
  await exigirPermisoEditorial(evento, 'media.ver')
  const medioId = validarEntradaEditorial(
    esquemaIdMedioEditorial,
    getRouterParam(evento, 'id')
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return obtenerMedioEditorial(clienteSupabase, medioId)
})
