import type { ResultadoCancelacionIngestaEditorial } from '~/types/ingestaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { cancelarIngestaEditorial } from '~/server/utils/repositorioIngestasEditoriales'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import {
  esquemaAccionIngestaEditorial,
  esquemaIdIngestaEditorial
} from '~/utils/editorial/ingestas'

export default defineEventHandler(async (
  evento
): Promise<ResultadoCancelacionIngestaEditorial> => {
  await exigirPermisoEditorial(evento, 'ingestas.gestionar')
  const ingestaId = validarEntradaEditorial(
    esquemaIdIngestaEditorial,
    getRouterParam(evento, 'id')
  )
  validarEntradaEditorial(esquemaAccionIngestaEditorial, await readBody(evento))
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return cancelarIngestaEditorial(clienteSupabase, ingestaId)
})
