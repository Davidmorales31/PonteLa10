import type { ComentarioRevisionEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { crearComentarioRevisionEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import {
  esquemaComentarioRevision,
  esquemaIdEditorial
} from '~/utils/editorial/contenido'

export default defineEventHandler(async (
  evento
): Promise<ComentarioRevisionEditorial> => {
  const contexto = await exigirPermisoEditorial(
    evento,
    'contenido.verBorradores'
  )
  const articuloId = validarEntradaEditorial(
    esquemaIdEditorial,
    getRouterParam(evento, 'id')
  )
  const entrada = validarEntradaEditorial(
    esquemaComentarioRevision,
    await readBody(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return crearComentarioRevisionEditorial(
    clienteSupabase,
    articuloId,
    contexto.usuario.id,
    entrada.mensaje
  )
})
