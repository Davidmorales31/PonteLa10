import type { BriefSeoArticuloEditorial } from '~/types/contenidoEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { obtenerArticuloEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { validarEntradaEditorial } from '~/server/utils/validacionEditorial'
import { esquemaIdEditorial } from '~/utils/editorial/contenido'
import { esIdPlantillaEditorial, obtenerPlantillaEditorial } from '~/utils/editorial/plantillas'
import { z } from 'zod'

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

const esquemaPlantilla = z.object({
  plantillaId: z.custom<BriefSeoArticuloEditorial['plantillaId']>(
    valor => valor === null || esIdPlantillaEditorial(valor)
  ),
  camposCompletos: z.array(z.string().trim().min(1).max(160)).max(12)
}).strict().superRefine((entrada, contexto) => {
  const plantilla = obtenerPlantillaEditorial(entrada.plantillaId)
  if (new Set(entrada.camposCompletos).size !== entrada.camposCompletos.length) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['camposCompletos'],
      message: 'No repitas campos en la lista de verificación.'
    })
  }
  if (entrada.camposCompletos.some(campo => !plantilla?.camposMinimos.includes(campo))) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['camposCompletos'],
      message: 'La lista solo puede incluir campos mínimos de la plantilla seleccionada.'
    })
  }
})

const columnasBrief = 'target_query,search_intent,template_id,template_fields_complete,parent_cluster,freshness_window_days,opportunity_source,editorial_differentiator,status,confirmed_at,updated_at'

export default defineEventHandler(async (evento): Promise<BriefSeoArticuloEditorial> => {
  const contexto = await exigirPermisoEditorial(evento, 'contenido.verBorradores')
  const articuloId = validarEntradaEditorial(esquemaIdEditorial, getRouterParam(evento, 'id'))
  const entrada = validarEntradaEditorial(esquemaPlantilla, await readBody(evento))
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const articulo = await obtenerArticuloEditorial(cliente, articuloId, contexto.usuario.id, {
    editarTodos: contexto.permisos.includes('contenido.editarTodos'),
    editarPropio: contexto.permisos.includes('contenido.editarPropio')
  })

  const puedeEditarBrief = articulo.puedeEditar
    || (articulo.estado === 'review' && contexto.permisos.includes('contenido.aprobar'))
  if (!puedeEditarBrief) {
    throw createError({
      statusCode: 403,
      statusMessage: 'La plantilla se puede cambiar en borradores editables o en revisión con permiso de aprobación.'
    })
  }

  const plantilla = obtenerPlantillaEditorial(entrada.plantillaId)

  const valores = {
    template_id: entrada.plantillaId,
    search_intent: plantilla?.intencion ?? null,
    freshness_window_days: plantilla?.frescuraDias ?? null,
    status: 'proposed' as const
  }

  const { data: existente, error: errorLectura } = await cliente
    .from('editorial_article_search_briefs')
    .select('article_id,template_id,updated_at')
    .eq('article_id', articuloId)
    .maybeSingle()

  if (errorLectura) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo consultar el brief editorial.' })
  }

  if (existente?.template_id && articulo.estado === 'review' && entrada.plantillaId === null) {
    throw createError({
      statusCode: 409,
      statusMessage: 'No puedes retirar una plantilla mientras el artículo está en revisión.'
    })
  }

  const cambioPlantilla = Boolean(existente && existente.template_id !== entrada.plantillaId)
  const camposIniciales = cambioPlantilla ? [] : entrada.camposCompletos

  const resultadoInicial = existente
    ? await cliente
      .from('editorial_article_search_briefs')
      .update({ ...valores, template_fields_complete: camposIniciales })
      .eq('article_id', articuloId)
      .eq('updated_at', existente.updated_at)
      .select(columnasBrief)
      .maybeSingle()
    : await cliente
      .from('editorial_article_search_briefs')
      .insert({ article_id: articuloId, ...valores, template_fields_complete: entrada.camposCompletos })
      .select(columnasBrief)
      .maybeSingle()

  if (resultadoInicial.error) {
    if (resultadoInicial.error.code === '42501') {
      throw createError({ statusCode: 403, statusMessage: 'No tienes permiso para cambiar la plantilla editorial.' })
    }
    if (resultadoInicial.error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'El brief cambió en otra sesión; vuelve a cargarlo.' })
    }
    throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar la plantilla editorial.' })
  }
  if (!resultadoInicial.data) {
    throw createError({ statusCode: 409, statusMessage: 'El brief cambió en otra sesión; vuelve a cargarlo antes de guardar la plantilla.' })
  }

  let filaActual = resultadoInicial.data as unknown as FilaBriefSeo
  if (cambioPlantilla && entrada.plantillaId && entrada.camposCompletos.length > 0) {
    const resultadoCampos = await cliente
      .from('editorial_article_search_briefs')
      .update({ template_fields_complete: entrada.camposCompletos })
      .eq('article_id', articuloId)
      .eq('template_id', entrada.plantillaId)
      .eq('updated_at', filaActual.updated_at)
      .select(columnasBrief)
      .maybeSingle()

    if (resultadoCampos.error) {
      throw createError({ statusCode: 503, statusMessage: 'La plantilla se guardó, pero no se pudieron guardar sus verificaciones. Vuelve a guardar los campos.' })
    }
    if (!resultadoCampos.data) {
      throw createError({ statusCode: 409, statusMessage: 'La plantilla cambió en otra sesión. Los campos no se sobrescribieron; vuelve a cargar y revisa la selección.' })
    }
    filaActual = resultadoCampos.data as unknown as FilaBriefSeo
  }

  setResponseHeader(evento, 'Cache-Control', 'private, no-store')
  return {
    consultaObjetivo: filaActual.target_query,
    intencionBusqueda: filaActual.search_intent,
    plantillaId: filaActual.template_id,
    camposCompletos: filaActual.template_fields_complete,
    clusterPrincipal: filaActual.parent_cluster,
    ventanaFrescuraDias: filaActual.freshness_window_days,
    origenOportunidad: filaActual.opportunity_source,
    diferenciadorEditorial: filaActual.editorial_differentiator,
    estadoBrief: filaActual.status === 'confirmed' ? 'confirmado' : 'propuesto',
    confirmadoEn: filaActual.confirmed_at,
    actualizadoEn: filaActual.updated_at
  }
})
