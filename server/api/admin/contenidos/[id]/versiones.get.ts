import type { VersionArticuloEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarVersionesArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento): Promise<VersionArticuloEditorial[]> => {
  await exigirPermisoEditorial(evento, 'contenido.verBorradores')
  const articuloId = validarEntradaEditorial(
    esquemaIdEditorial,
    getRouterParam(evento, 'id')
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)

  return listarVersionesArticuloEditorial(clienteSupabase, articuloId)
})
