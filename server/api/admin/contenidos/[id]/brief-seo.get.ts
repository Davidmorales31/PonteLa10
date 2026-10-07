import type { BriefSeoArticuloEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'

interface FilaBriefSeo {
  target_query: string | null
  search_intent: BriefSeoArticuloEditorial['intencionBusqueda']
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
  const cliente = obtenerClienteSupabaseEditorial(evento)

  await obtenerArticuloEditorial(cliente, articuloId, contexto.usuario.id, {
    editarTodos: contexto.permisos.includes('contenido.editarTodos'),
    editarPropio: contexto.permisos.includes('contenido.editarPropio')
  })

  const { data, error } = await cliente
    .from('editorial_article_search_briefs')
    .select('target_query,search_intent,parent_cluster,freshness_window_days,opportunity_source,editorial_differentiator,status,confirmed_at,updated_at')
    .eq('article_id', articuloId)
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo cargar el brief SEO editorial.' })
  }

  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  const fila = data as unknown as FilaBriefSeo | null
  if (!fila) {
    return {
      consultaObjetivo: null,
      intencionBusqueda: null,
      clusterPrincipal: null,
      ventanaFrescuraDias: null,
      origenOportunidad: null,
      diferenciadorEditorial: null,
      estadoBrief: 'sin_guardar',
      confirmadoEn: null,
      actualizadoEn: null
    }
  }

  return {
    consultaObjetivo: fila.target_query,
    intencionBusqueda: fila.search_intent,
    clusterPrincipal: fila.parent_cluster,
    ventanaFrescuraDias: fila.freshness_window_days,
    origenOportunidad: fila.opportunity_source,
    diferenciadorEditorial: fila.editorial_differentiator,
    estadoBrief: fila.status === 'confirmed' ? 'confirmado' : 'propuesto',
    confirmadoEn: fila.confirmed_at,
    actualizadoEn: fila.updated_at
  }
})
