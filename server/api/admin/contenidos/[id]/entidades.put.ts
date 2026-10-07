import type { CargaRelacionesEntidadesSeo } from '~/types/contenidoEditorial'
import { exigirEdicionEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import {
  guardarDecisionesRelacionesSeo,
  listarEntidadesPublicasSeo,
  sugerirRelacionesSeo
} from '~/server/utils/grafoEntidadesSeo'
import { obtenerArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'
import { esquemaDecisionesRelacionesSeo } from '~/utils/editorial/grafoEntidades'

export default defineEventHandler(async (evento): Promise<CargaRelacionesEntidadesSeo> => {
  const contexto = await exigirEdicionEditorial(evento)
  const articuloId = validarEntradaEditorial(esquemaIdEditorial, getRouterParam(evento, 'id'))
  const entrada = validarEntradaEditorial(esquemaDecisionesRelacionesSeo, await readBody(evento))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const articulo = await obtenerArticuloEditorial(cliente, articuloId, contexto.usuario.id, {
    editarTodos: contexto.permisos.includes('contenido.editarTodos'),
    editarPropio: contexto.permisos.includes('contenido.editarPropio')
  })

  if (!articulo.puedeEditar) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Este contenido no está disponible para edición en su estado actual.'
    })
  }

  const relaciones = await guardarDecisionesRelacionesSeo(cliente, articulo, entrada.decisiones)
  const [entidades, sugerencias] = await Promise.all([
    listarEntidadesPublicasSeo(cliente),
    sugerirRelacionesSeo(cliente, articulo, relaciones)
  ])

  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  return {
    entidades: entidades.map(({ tipo, slug, nombre, ruta }) => ({ tipo, slug, nombre, ruta })),
    relaciones,
    sugerencias
  }
})
