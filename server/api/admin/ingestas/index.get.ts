import type { RespuestaBandejaIngestasEditoriales } from '~/types/ingestaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarIngestasEditoriales } from '~/server/utils/repositorioIngestasEditoriales'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaFiltrosIngestasEditoriales } from '~/utils/editorial/ingestas'

export default defineEventHandler(async (
  evento
): Promise<RespuestaBandejaIngestasEditoriales> => {
  await exigirPermisoEditorial(evento, 'ingestas.ver')
  const filtros = validarEntradaEditorial(
    esquemaFiltrosIngestasEditoriales,
    getQuery(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return listarIngestasEditoriales(clienteSupabase, filtros)
})
