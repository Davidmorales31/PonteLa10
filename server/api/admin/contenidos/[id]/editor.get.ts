import type { CargaEditorArticuloEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import {
  listarVersionesArticuloEditorial,
  obtenerFlujoArticuloEditorial,
  obtenerArticuloEditorial,
  obtenerTaxonomiasEditoriales
} from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento): Promise<CargaEditorArticuloEditorial> => {
  const contexto = await exigirPermisoEditorial(
    evento,
    'contenido.verBorradores'
  )
  const articuloId = validarEntradaEditorial(
    esquemaIdEditorial,
    getRouterParam(evento, 'id')
  )
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  const [articulo, taxonomias, versiones] = await Promise.all([
    obtenerArticuloEditorial(
      clienteSupabase,
      articuloId,
      contexto.usuario.id,
      {
        editarTodos: contexto.permisos.includes('contenido.editarTodos'),
        editarPropio: contexto.permisos.includes('contenido.editarPropio')
      }
    ),
    obtenerTaxonomiasEditoriales(clienteSupabase),
    listarVersionesArticuloEditorial(clienteSupabase, articuloId)
  ])
  const flujo = await obtenerFlujoArticuloEditorial(
    clienteSupabase,
    articulo,
    contexto.permisos
  )

  return {
    articulo,
    taxonomias,
    versiones,
    flujo
  }
})
