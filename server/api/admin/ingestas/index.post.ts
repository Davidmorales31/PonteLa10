import type { IngestaEditorialCreada } from '~/types/ingestaEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { crearIngestaEditorial } from '~/server/utils/repositorioIngestasEditoriales'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaCrearIngestaEditorial } from '~/utils/editorial/ingestas'

export default defineEventHandler(async (evento): Promise<IngestaEditorialCreada> => {
  const contexto = await exigirPermisoEditorial(evento, 'ingestas.gestionar')
  const entrada = validarEntradaEditorial(
    esquemaCrearIngestaEditorial,
    await readBody(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  setResponseStatus(evento, 201)

  return crearIngestaEditorial(clienteSupabase, entrada, contexto.usuario.id)
})
