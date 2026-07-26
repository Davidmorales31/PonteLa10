import type { RespuestaBibliotecaMedios } from '~/types/mediaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarMediosEditoriales } from '~/server/utils/repositorioMediaEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaConsultaMediosEditoriales } from '~/utils/media/editorial'

export default defineEventHandler(async (
  evento
): Promise<RespuestaBibliotecaMedios> => {
  await exigirPermisoEditorial(evento, 'media.ver')
  const filtros = validarEntradaEditorial(
    esquemaConsultaMediosEditoriales,
    getQuery(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return listarMediosEditoriales(clienteSupabase, filtros)
})
