import type { ResultadoEliminacionArticuloEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { eliminarArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import {
  esquemaEliminarArticulo,
  esquemaIdEditorial
} from '~/utils/editorial/contenido'

export default defineEventHandler(async (
  evento
): Promise<ResultadoEliminacionArticuloEditorial> => {
  await exigirPermisoEditorial(
    evento,
    'contenido.eliminar',
    { exigirMfa: true }
  )
  const articuloId = validarEntradaEditorial(
    esquemaIdEditorial,
    getRouterParam(evento, 'id')
  )
  const entrada = validarEntradaEditorial(
    esquemaEliminarArticulo,
    await readBody(evento)
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return eliminarArticuloEditorial(
    clienteSupabase,
    articuloId,
    entrada.confirmacion
  )
})
