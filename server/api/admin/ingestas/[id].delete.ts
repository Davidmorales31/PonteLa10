import type { ResultadoEliminacionIngestaEditorial } from '~/types/ingestaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { eliminarIngestaFallidaEditorial } from '~/server/utils/repositorioIngestasEditoriales'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaConfirmacionEliminacionIngesta, esquemaIdIngestaEditorial } from '~/utils/editorial/ingestas'

export default defineEventHandler(async (evento): Promise<ResultadoEliminacionIngestaEditorial> => {
  await exigirPermisoEditorial(evento, 'ingestas.eliminar')
  const ingestaId = validarEntradaEditorial(esquemaIdIngestaEditorial, getRouterParam(evento, 'id'))
  const entrada = validarEntradaEditorial(esquemaConfirmacionEliminacionIngesta, await readBody(evento))
  return eliminarIngestaFallidaEditorial(obtenerClienteSupabaseEditorial(evento), ingestaId, entrada.confirmacion)
})
