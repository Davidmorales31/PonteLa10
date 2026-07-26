import { exigirEdicionEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { guardarAutoguardadoEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import {
  esquemaAutoguardadoArticulo,
  esquemaIdEditorial
} from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento): Promise<{ actualizadoEn: string }> => {
  const contexto = await exigirEdicionEditorial(evento)
  const articuloId = validarEntradaEditorial(
    esquemaIdEditorial,
    getRouterParam(evento, 'id')
  )
  const entrada = validarEntradaEditorial(
    esquemaAutoguardadoArticulo,
    await readBody(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return guardarAutoguardadoEditorial(
    clienteSupabase,
    articuloId,
    contexto.usuario.id,
    entrada
  )
})
