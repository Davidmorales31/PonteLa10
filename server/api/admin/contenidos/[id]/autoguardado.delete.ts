import { exigirEdicionEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { eliminarAutoguardadoEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento) => {
  const contexto = await exigirEdicionEditorial(evento)
  const articuloId = validarEntradaEditorial(
    esquemaIdEditorial,
    getRouterParam(evento, 'id')
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  await eliminarAutoguardadoEditorial(
    clienteSupabase,
    articuloId,
    contexto.usuario.id
  )

  setResponseStatus(evento, 204)
  return null
})
