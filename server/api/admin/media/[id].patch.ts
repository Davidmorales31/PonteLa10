import type { MedioEditorial } from '~/types/mediaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { actualizarMedioEditorial } from '~/server/utils/repositorioMediaEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import {
  esquemaIdMedioEditorial,
  esquemaMetadatosMedioEditorial
} from '~/utils/media/editorial'

export default defineEventHandler(async (evento): Promise<MedioEditorial> => {
  await exigirPermisoEditorial(evento, 'media.editar')
  const medioId = validarEntradaEditorial(
    esquemaIdMedioEditorial,
    getRouterParam(evento, 'id')
  )
  const metadatos = validarEntradaEditorial(
    esquemaMetadatosMedioEditorial,
    await readBody(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return actualizarMedioEditorial(clienteSupabase, medioId, metadatos)
})
