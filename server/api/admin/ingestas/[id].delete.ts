import type { ResultadoEliminacionIngestaEditorial } from '~/types/ingestaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { eliminarIngestaEditorial } from '~/server/utils/repositorioIngestasEditoriales'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaConfirmacionEliminacionIngesta, esquemaIdIngestaEditorial } from '~/utils/editorial/ingestas'

export default defineEventHandler(async (evento): Promise<ResultadoEliminacionIngestaEditorial> => {
  await exigirPermisoEditorial(evento, 'ingestas.eliminar')
  const ingestaId = validarEntradaEditorial(esquemaIdIngestaEditorial, getRouterParam(evento, 'id'))
  const entrada = validarEntradaEditorial(esquemaConfirmacionEliminacionIngesta, await readBody(evento))
  return eliminarIngestaEditorial(obtenerClienteSupabaseEditorial(evento), ingestaId, entrada.confirmacion)
})
