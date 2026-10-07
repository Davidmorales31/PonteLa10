import type { BriefSeoArticuloEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'
import { esquemaBriefSeoArticulo } from '~/utils/editorial/briefSeo'
import { obtenerPlantillaEditorial } from '~/utils/editorial/plantillas'

interface FilaBriefSeo {
  target_query: string | null
  search_intent: BriefSeoArticuloEditorial['intencionBusqueda']
  template_id: BriefSeoArticuloEditorial['plantillaId']
  template_fields_complete: string[]
  parent_cluster: string | null
  freshness_window_days: number | null
  opportunity_source: string | null
  editorial_differentiator: string | null
  status: 'proposed' | 'confirmed'
  confirmed_at: string | null
  updated_at: string
}

export default defineEventHandler(async (evento): Promise<BriefSeoArticuloEditorial> => {
  const contexto = await exigirPermisoEditorial(evento, 'contenido.verBorradores')
  const articuloId = validarEntradaEditorial(esquemaIdEditorial, getRouterParam(evento, 'id'))
  const entrada = validarEntradaEditorial(esquemaBriefSeoArticulo, await readBody(evento))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const articulo = await obtenerArticuloEditorial(cliente, articuloId, contexto.usuario.id, {
    editarTodos: contexto.permisos.includes('contenido.editarTodos'),
    editarPropio: contexto.permisos.includes('contenido.editarPropio')
  })

  const puedeConfirmarBrief = articulo.estado === 'review'
    && contexto.permisos.includes('contenido.aprobar')
  const puedeEditarBrief = articulo.puedeEditar || puedeConfirmarBrief
  if (!puedeEditarBrief) {
    throw createError({
      statusCode: 403,
      statusMessage: 'El brief se puede cambiar en borradores editables o en revisión con permiso de aprobación.'
    })
  }
  if (entrada.estadoBrief === 'confirmado' && !puedeConfirmarBrief) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Solo una persona con permiso de aprobación puede confirmar el brief mientras el artículo está en revisión.'
    })
  }

  const { data: briefExistente, error: errorLecturaBrief } = await cliente
    .from('editorial_article_search_briefs')
    .select('template_id')
    .eq('article_id', articuloId)
    .maybeSingle()

  if (errorLecturaBrief) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo verificar la plantilla editorial guardada.' })
  }
  const plantillaIdGuardada = briefExistente?.template_id ?? null
  if (entrada.plantillaId !== plantillaIdGuardada) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Guarda primero la plantilla en el panel «Plantilla editorial»; este formulario no cambia esa selección.'
    })
  }

  const plantillaGuardada = obtenerPlantillaEditorial(plantillaIdGuardada)
  const valores = {
    target_query: entrada.consultaObjetivo,
    search_intent: plantillaGuardada?.intencion ?? entrada.intencionBusqueda,
    parent_cluster: entrada.clusterPrincipal,
    freshness_window_days: plantillaGuardada?.frescuraDias ?? entrada.ventanaFrescuraDias,
    opportunity_source: entrada.origenOportunidad,
    editorial_differentiator: entrada.diferenciadorEditorial,
    status: entrada.estadoBrief === 'confirmado' ? 'confirmed' as const : 'proposed' as const
  }
  const columnasBrief = 'target_query,search_intent,template_id,template_fields_complete,parent_cluster,freshness_window_days,opportunity_source,editorial_differentiator,status,confirmed_at,updated_at'
  const resultado = briefExistente
    ? plantillaIdGuardada === null
      ? await cliente
        .from('editorial_article_search_briefs')
        .update(valores)
        .eq('article_id', articuloId)
        .is('template_id', null)
        .select(columnasBrief)
        .maybeSingle()
      : await cliente
        .from('editorial_article_search_briefs')
        .update(valores)
        .eq('article_id', articuloId)
        .eq('template_id', plantillaIdGuardada)
        .select(columnasBrief)
        .maybeSingle()
    : await cliente
      .from('editorial_article_search_briefs')
      .insert({ article_id: articuloId, ...valores })
      .select(columnasBrief)
      .maybeSingle()
  const { data, error } = resultado

  if (error) {
    if (error.code === '42501') {
      throw createError({ statusCode: 403, statusMessage: 'No tienes permiso para guardar este brief SEO.' })
    }
    if (error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'El brief cambió en otra sesión; vuelve a cargarlo.' })
    }
    throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar el brief SEO editorial.' })
  }
  if (!data) {
    throw createError({ statusCode: 409, statusMessage: 'La plantilla cambió en otra sesión; vuelve a cargar el artículo.' })
  }

  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  const fila = data as unknown as FilaBriefSeo
  return {
    consultaObjetivo: fila.target_query,
    intencionBusqueda: fila.search_intent,
    plantillaId: fila.template_id,
    camposCompletos: fila.template_fields_complete,
    clusterPrincipal: fila.parent_cluster,
    ventanaFrescuraDias: fila.freshness_window_days,
    origenOportunidad: fila.opportunity_source,
    diferenciadorEditorial: fila.editorial_differentiator,
    estadoBrief: fila.status === 'confirmed' ? 'confirmado' : 'propuesto',
    confirmadoEn: fila.confirmed_at,
    actualizadoEn: fila.updated_at
  }
})
