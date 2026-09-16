import { randomUUID } from 'node:crypto'
import type {
  ResultadoCancelacionIngestaEditorial,
  ResultadoReencolarIngestaEditorial
} from '~/types/ingestaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import {
  cancelarIngestaEditorial,
  reencolarIngestaEditorial
} from '~/server/utils/repositorioIngestasEditoriales'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import {
  esquemaAccionIngestaEditorial,
  esquemaIdIngestaEditorial
} from '~/utils/editorial/ingestas'

export default defineEventHandler(async (
  evento
): Promise<ResultadoCancelacionIngestaEditorial | ResultadoReencolarIngestaEditorial> => {
  await exigirPermisoEditorial(evento, 'ingestas.gestionar')
  const ingestaId = validarEntradaEditorial(
    esquemaIdIngestaEditorial,
    getRouterParam(evento, 'id')
  )
  const entrada = validarEntradaEditorial(esquemaAccionIngestaEditorial, await readBody(evento))
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  if (entrada.accion === 'reencolar') {
    return reencolarIngestaEditorial(
      clienteSupabase,
      ingestaId,
      randomUUID()
    )
  }

  return cancelarIngestaEditorial(clienteSupabase, ingestaId)
})
