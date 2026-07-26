import type { ResultadoGuardadoEditorial } from '~/types/contenidoEditorial'
import { exigirEdicionEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { guardarArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import {
  esquemaGuardarArticulo,
  esquemaIdEditorial
} from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento): Promise<ResultadoGuardadoEditorial> => {
  await exigirEdicionEditorial(evento)
  const articuloId = validarEntradaEditorial(
    esquemaIdEditorial,
    getRouterParam(evento, 'id')
  )
  const entrada = validarEntradaEditorial(
    esquemaGuardarArticulo,
    await readBody(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return guardarArticuloEditorial(clienteSupabase, articuloId, entrada)
})
