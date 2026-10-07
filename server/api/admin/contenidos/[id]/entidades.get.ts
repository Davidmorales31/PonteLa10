import type { CargaRelacionesEntidadesSeo } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import {
  listarEntidadesPublicasSeo,
  listarRelacionesEditorialesSeo,
  sugerirRelacionesSeo
} from '~/server/utils/grafoEntidadesSeo'
import { obtenerArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'

export default defineEventHandler(async (evento): Promise<CargaRelacionesEntidadesSeo> => {
  const contexto = await exigirPermisoEditorial(evento, 'contenido.verBorradores')
  const articuloId = validarEntradaEditorial(esquemaIdEditorial, getRouterParam(evento, 'id'))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const articulo = await obtenerArticuloEditorial(cliente, articuloId, contexto.usuario.id, {
    editarTodos: contexto.permisos.includes('contenido.editarTodos'),
    editarPropio: contexto.permisos.includes('contenido.editarPropio')
  })
  const [entidades, relaciones] = await Promise.all([
    listarEntidadesPublicasSeo(cliente),
    listarRelacionesEditorialesSeo(cliente, articuloId)
  ])
  const sugerencias = await sugerirRelacionesSeo(cliente, articulo, relaciones)

  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  return {
    entidades: entidades.map(({ tipo, slug, nombre, ruta }) => ({ tipo, slug, nombre, ruta })),
    relaciones,
    sugerencias
  }
})
