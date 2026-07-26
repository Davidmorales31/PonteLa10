import type { ArticuloDetalleEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento): Promise<ArticuloDetalleEditorial> => {
  const contexto = await exigirPermisoEditorial(
    evento,
    'contenido.verBorradores'
  )
  const articuloId = validarEntradaEditorial(
    esquemaIdEditorial,
    getRouterParam(evento, 'id')
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return obtenerArticuloEditorial(
    clienteSupabase,
    articuloId,
    contexto.usuario.id,
    {
      editarTodos: contexto.permisos.includes('contenido.editarTodos'),
      editarPropio: contexto.permisos.includes('contenido.editarPropio')
    }
  )
})
