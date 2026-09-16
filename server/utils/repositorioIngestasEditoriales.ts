import type { SupabaseClient } from '@supabase/supabase-js'
import type { z } from 'zod'
import type { CategoriaEditorial } from '~/types/contenidoEditorial'
import type {
  IngestaEditorial,
  IngestaEditorialCreada,
  RespuestaBandejaIngestasEditoriales,
  ResultadoCancelacionIngestaEditorial,
  ResultadoEliminacionIngestaEditorial,
  ResultadoReencolarIngestaEditorial,
  ResultadoBorradorDesdeIngesta
} from '~/types/ingestaEditorial'
import { esquemaEvidenciaIngestaEditorial } from '~/utils/editorial/evidenciaIngesta'
import type { ResultadoRedaccionIa } from '~/server/utils/ai/contratosRedaccion'
import type { PropuestaBorradorIa } from '~/utils/editorial/redaccionIa'
import {
  normalizarUrlFuenteEditorial,
  type esquemaCrearIngestaEditorial,
  type esquemaFiltrosIngestasEditoriales
} from '~/utils/editorial/ingestas'

type EntradaCrearIngesta = z.infer<typeof esquemaCrearIngestaEditorial>
type FiltrosIngestas = z.infer<typeof esquemaFiltrosIngestasEditoriales>

interface FilaCategoria {
  id: string
  slug: string
  name: string
  description: string | null
  is_active: boolean
  display_order: number
}

interface FilaPerfil {
  id: string
  display_name: string
}

interface FilaIngesta {
  id: string
  source_url: string
  normalized_url: string
  source_host: string
  source_platform: IngestaEditorial['plataforma']
  status: IngestaEditorial['estado']
  title_hint: string | null
  editorial_instructions: string | null
  rules_snapshot: IngestaEditorial['reglas'] | null
  category_id: string | null
  requested_by: string
  article_id: string | null
  processing_stage: IngestaEditorial['etapaProcesamiento'] | null
  progress_percent: number | null
  current_attempt_id: string | null
  lease_expires_at: string | null
  heartbeat_at: string | null
  source_language: 'es' | 'en' | null
  retryable: boolean | null
  result_version: number | null
  attempts: number
  error_code: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
  categories: FilaCategoria | FilaCategoria[] | null
}

function crearErrorRepositorio(mensaje: string) {
  return createError({
    statusCode: 503,
    statusMessage: mensaje,
    data: { codigo: 'REPOSITORIO_INGESTAS_NO_DISPONIBLE' }
  })
}

function mapearCategoria(
  relacion: FilaCategoria | FilaCategoria[] | null
): CategoriaEditorial | null {
  const fila = Array.isArray(relacion) ? relacion[0] : relacion

  return fila
    ? {
        id: fila.id,
        slug: fila.slug,
        nombre: fila.name,
        descripcion: fila.description || '',
        activa: fila.is_active,
        orden: fila.display_order
      }
    : null
}

async function obtenerNombresSolicitantes(
  clienteSupabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, string>> {
  if (!ids.length) return new Map()

  const { data, error } = await clienteSupabase
    .from('user_profiles')
    .select('id, display_name')
    .in('id', ids)

  if (error) {
    throw crearErrorRepositorio('No se pudieron cargar los responsables de las ingestas.')
  }

  return new Map(
    ((data || []) as FilaPerfil[]).map(fila => [fila.id, fila.display_name])
  )
}

function mapearIngesta(
  fila: FilaIngesta,
  nombres: Map<string, string>
): IngestaEditorial {
  return {
    id: fila.id,
    urlFuente: fila.source_url,
    urlNormalizada: fila.normalized_url,
    hostFuente: fila.source_host,
    plataforma: fila.source_platform,
    estado: fila.status,
    tituloSugerido: fila.title_hint || '',
    instrucciones: fila.editorial_instructions || '',
    reglas: fila.rules_snapshot || {
      tipoContenido: 'auto',
      conservarVideo: true,
      exigirCreditos: true,
      generarSeo: true,
      idioma: 'es-CO'
    },
    categoria: mapearCategoria(fila.categories),
    solicitanteId: fila.requested_by,
    solicitanteNombre: nombres.get(fila.requested_by) || 'Equipo Pont3la10',
    articuloId: fila.article_id,
    etapaProcesamiento: fila.processing_stage,
    progresoPorcentaje: fila.progress_percent || 0,
    intentoActualId: fila.current_attempt_id,
    leaseHasta: fila.lease_expires_at,
    ultimaActividadEn: fila.heartbeat_at,
    idiomaFuente: fila.source_language,
    recuperable: Boolean(fila.retryable),
    versionResultado: fila.result_version || 0,
    intentos: fila.attempts,
    codigoError: fila.error_code || '',
    mensajeError: fila.error_message || '',
    creadoEn: fila.created_at,
    actualizadoEn: fila.updated_at,
    iniciadoEn: fila.started_at,
    finalizadoEn: fila.finished_at
  }
}

export async function listarIngestasEditoriales(
  clienteSupabase: SupabaseClient,
  filtros: FiltrosIngestas
): Promise<RespuestaBandejaIngestasEditoriales> {
  const desde = (filtros.pagina - 1) * filtros.limite
  const hasta = desde + filtros.limite - 1
  let consulta = clienteSupabase
    .from('editorial_ingestions')
    .select(`
      id,
      source_url,
      normalized_url,
      source_host,
      source_platform,
      status,
      title_hint,
      editorial_instructions,
      rules_snapshot,
      category_id,
      requested_by,
      article_id,
      processing_stage,
      progress_percent,
      current_attempt_id,
      lease_expires_at,
      heartbeat_at,
      source_language,
      retryable,
      result_version,
      attempts,
      error_code,
      error_message,
      created_at,
      updated_at,
      started_at,
      finished_at,
      categories (
        id,
        slug,
        name,
        description,
        is_active,
        display_order
      )
    `, { count: 'exact' })

  if (filtros.estado) consulta = consulta.eq('status', filtros.estado)
  if (filtros.plataforma) {
    consulta = consulta.eq('source_platform', filtros.plataforma)
  }
  if (filtros.buscar) {
    const terminoSeguro = filtros.buscar.replace(/[,%()]/g, ' ').trim()
    if (terminoSeguro) {
      consulta = consulta.or(
        `title_hint.ilike.%${terminoSeguro}%,source_host.ilike.%${terminoSeguro}%,normalized_url.ilike.%${terminoSeguro}%`
      )
    }
  }

  const { data, error, count } = await consulta
    .order('created_at', { ascending: false })
    .range(desde, hasta)

  if (error) {
    throw crearErrorRepositorio('No se pudo cargar la bandeja de ingestas.')
  }

  const filas = (data || []) as unknown as FilaIngesta[]
  const idsSolicitantes = [...new Set(filas.map(fila => fila.requested_by))]
  const nombres = await obtenerNombresSolicitantes(clienteSupabase, idsSolicitantes)
  const total = count || 0

  return {
    ingestas: filas.map(fila => mapearIngesta(fila, nombres)),
    paginacion: {
      pagina: filtros.pagina,
      limite: filtros.limite,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / filtros.limite))
    }
  }
}

async function validarCategoria(
  clienteSupabase: SupabaseClient,
  categoriaId: string | null
): Promise<void> {
  if (!categoriaId) return

  const { data, error } = await clienteSupabase
    .from('categories')
    .select('id')
    .eq('id', categoriaId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    throw crearErrorRepositorio('No se pudo validar la sección editorial.')
  }
  if (!data) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La sección seleccionada no está disponible.',
      data: { codigo: 'CATEGORIA_INGESTA_INVALIDA' }
    })
  }
}

export async function crearIngestaEditorial(
  clienteSupabase: SupabaseClient,
  entrada: EntradaCrearIngesta,
  solicitanteId: string
): Promise<IngestaEditorialCreada> {
  await validarCategoria(clienteSupabase, entrada.categoriaId)
  const fuente = normalizarUrlFuenteEditorial(entrada.urlFuente)
  const { data, error } = await clienteSupabase
    .rpc('register_editorial_ingestion', {
      p_payload: {
        sourceUrl: entrada.urlFuente,
        normalizedUrl: fuente.urlNormalizada,
        sourceHost: fuente.hostFuente,
        sourcePlatform: fuente.plataforma,
        titleHint: entrada.tituloSugerido || '',
        editorialInstructions: entrada.instrucciones || '',
        rulesSnapshot: {
          ...entrada.reglas,
          conservarVideo: false
        },
        categoryId: entrada.categoriaId,
        requestedBy: solicitanteId
      }
    })

  if (
    error?.code === '23505'
    || data?.error?.codigo === 'ACTIVE_URL_CONFLICT'
  ) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Esta fuente ya tiene una solicitud activa.',
      data: { codigo: 'INGESTA_DUPLICADA' }
    })
  }
  if (error || !data?.ok) {
    throw crearErrorRepositorio('No se pudo registrar la fuente.')
  }

  const resultado = data.resultado as {
    id: string
    plataforma: IngestaEditorialCreada['plataforma']
    estado: IngestaEditorialCreada['estado']
    urlNormalizada: string
    creadoEn: string
  }

  return {
    id: String(resultado.id),
    plataforma: resultado.plataforma,
    estado: resultado.estado,
    urlNormalizada: String(resultado.urlNormalizada),
    creadoEn: String(resultado.creadoEn)
  }
}

export async function cancelarIngestaEditorial(
  clienteSupabase: SupabaseClient,
  ingestaId: string
): Promise<ResultadoCancelacionIngestaEditorial> {
  const { data, error } = await clienteSupabase.rpc(
    'cancel_editorial_ingestion',
    { target_ingestion_id: ingestaId }
  )

  if (error) {
    const mensaje = error.message || ''

    if (mensaje.includes('no existe')) {
      throw createError({
        statusCode: 404,
        statusMessage: 'La ingesta no existe.',
        data: { codigo: 'INGESTA_NO_ENCONTRADA' }
      })
    }
    if (mensaje.includes('ya empezó') || mensaje.includes('no puede cancelarse')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'La ingesta ya empezó o dejó de estar disponible para cancelar.',
        data: { codigo: 'INGESTA_NO_CANCELABLE' }
      })
    }
    if (mensaje.includes('permiso') || mensaje.includes('sesión')) {
      throw createError({
        statusCode: 403,
        statusMessage: mensaje,
        data: { codigo: 'CANCELACION_INGESTA_NO_AUTORIZADA' }
      })
    }

    throw crearErrorRepositorio('No se pudo cancelar la ingesta.')
  }

  const resultado = data as {
    id: string
    estado: ResultadoCancelacionIngestaEditorial['estado']
    actualizadoEn: string
  } | null

  if (!resultado) throw crearErrorRepositorio('La cancelación no devolvió un resultado válido.')

  return {
    id: resultado.id,
    estado: resultado.estado,
    actualizadoEn: resultado.actualizadoEn
  }
}

export async function reencolarIngestaEditorial(
  clienteSupabase: SupabaseClient,
  ingestaId: string,
  requestId: string
): Promise<ResultadoReencolarIngestaEditorial> {
  const { data, error } = await clienteSupabase.rpc(
    'requeue_editorial_ingestion',
    {
      p_ingestion_id: ingestaId,
      p_request_id: requestId
    }
  )

  if (error) {
    throw crearErrorRepositorio('No se pudo reencolar la ingesta.')
  }

  if (data?.error?.codigo === 'RESULT_ALREADY_EXISTS') {
    throw createError({
      statusCode: 409,
      statusMessage: 'La evidencia ya esta lista y no necesita reprocesarse.',
      data: { codigo: 'EVIDENCIA_INGESTA_EXISTENTE' }
    })
  }

  if (data?.error) {
    throw createError({
      statusCode: 409,
      statusMessage: data.error.mensaje || 'La ingesta no se puede reencolar.',
      data: { codigo: data.error.codigo || 'INGESTA_NO_REENCOLABLE' }
    })
  }

  const resultado = data?.resultado as {
    ingestaId: string
    estado: ResultadoReencolarIngestaEditorial['estado']
    encoladoEn: string
  } | null

  if (!resultado) throw crearErrorRepositorio('El reintento no devolvió un resultado válido.')

  return {
    id: resultado.ingestaId,
    estado: resultado.estado,
    encoladoEn: resultado.encoladoEn
  }
}

export async function eliminarIngestaFallidaEditorial(
  clienteSupabase: SupabaseClient,
  ingestaId: string,
  confirmacion: string
): Promise<ResultadoEliminacionIngestaEditorial> {
  const { data, error } = await clienteSupabase.rpc(
    'delete_failed_editorial_ingestion',
    { p_ingestion_id: ingestaId, p_confirmation: confirmacion }
  )

  if (error) {
    const mensaje = error.message || ''
    if (mensaje.includes('MFA') || mensaje.includes('permiso') || mensaje.includes('sesion')) {
      throw createError({ statusCode: 403, statusMessage: mensaje })
    }
    if (mensaje.includes('solo puede eliminarse') || mensaje.includes('no existe')) {
      throw createError({ statusCode: 409, statusMessage: mensaje })
    }
    throw crearErrorRepositorio('No se pudo eliminar la ingesta fallida.')
  }

  const resultado = data as { id: string, eliminadoEn: string } | null
  if (!resultado) throw crearErrorRepositorio('La eliminación no devolvió un resultado válido.')

  return { id: resultado.id, eliminadoEn: resultado.eliminadoEn }
}

interface FilaIngestaParaRedaccion {
  id: string
  status: string
  result_version: number
  article_id: string | null
  title_hint: string | null
  editorial_instructions: string | null
  source_url: string
  category_id: string | null
  rules_snapshot: IngestaEditorial['reglas'] | null
  processing_result: unknown
}

export async function obtenerIngestaParaRedaccion(clienteSupabase: SupabaseClient, ingestaId: string): Promise<FilaIngestaParaRedaccion> {
  const { data, error } = await clienteSupabase.from('editorial_ingestions')
    .select('id, status, result_version, article_id, title_hint, editorial_instructions, source_url, category_id, rules_snapshot, processing_result')
    .eq('id', ingestaId).maybeSingle()
  if (error) throw crearErrorRepositorio('No se pudo cargar la evidencia de la ingesta.')
  if (!data) throw createError({ statusCode: 404, statusMessage: 'La ingesta no existe.', data: { codigo: 'INGESTA_NO_ENCONTRADA' } })
  return data as FilaIngestaParaRedaccion
}

export function obtenerEvidenciaRedactable(fila: FilaIngestaParaRedaccion) {
  if (fila.status !== 'evidence_ready' || fila.result_version !== 1) throw createError({ statusCode: 409, statusMessage: 'La ingesta todavía no tiene evidencia lista.' })
  const evidencia = esquemaEvidenciaIngestaEditorial.safeParse(fila.processing_result)
  if (!evidencia.success) throw createError({ statusCode: 409, statusMessage: 'La evidencia almacenada no es válida para redactar.' })
  const traducciones = new Map((evidencia.data.traduccion?.segmentos || []).map(segmento => [segmento.segmentoId, segmento.texto]))
  return { creditos: evidencia.data.metadatos.creditos, segmentos: evidencia.data.original.segmentos.map(segmento => ({ id: segmento.id, inicioSegundos: segmento.inicioSegundos, finSegundos: segmento.finSegundos, texto: traducciones.get(segmento.id) || segmento.texto })) }
}

export async function reservarBorradorDesdeIngesta(clienteSupabase: SupabaseClient, ingestaId: string, requestId: string, promptHash: string) {
  const { data, error } = await clienteSupabase.rpc('reserve_editorial_ai_draft', { p_ingestion_id: ingestaId, p_request_id: requestId, p_prompt_hash: promptHash })
  if (error) throw createError({ statusCode: error.code === '42501' ? 403 : 409, statusMessage: error.message || 'No se pudo reservar la generación.' })
  return data as { estado: 'reserved' | 'running' | 'completed', articleId?: string }
}

export async function registrarFalloBorradorDesdeIngesta(clienteSupabase: SupabaseClient, ingestaId: string, requestId: string, codigo: string, duracionMs: number) {
  await clienteSupabase.rpc('fail_editorial_ai_draft', { p_ingestion_id: ingestaId, p_request_id: requestId, p_error_code: codigo, p_duration_ms: duracionMs })
}

export async function crearBorradorDesdeIngesta(clienteSupabase: SupabaseClient, ingestaId: string, requestId: string, propuesta: PropuestaBorradorIa, redaccion: ResultadoRedaccionIa, promptHash: string): Promise<ResultadoBorradorDesdeIngesta> {
  const { data, error } = await clienteSupabase.rpc('create_draft_from_editorial_ingestion', {
    p_ingestion_id: ingestaId, p_request_id: requestId, p_provider: redaccion.proveedor, p_model: redaccion.modelo,
    p_instruction_version: 'redaccion-v1', p_prompt_hash: promptHash, p_proposal: propuesta,
    p_input_tokens: redaccion.consumo.tokensEntrada, p_output_tokens: redaccion.consumo.tokensSalida,
    p_reasoning_tokens: redaccion.consumo.tokensRazonamiento, p_cost_usd: redaccion.consumo.costoUsd,
    p_pricing_version: redaccion.consumo.versionTarifa, p_duration_ms: redaccion.consumo.duracionMs
  })
  if (error) {
    const mensaje = error.message || ''
    if (mensaje.includes('evidencia') || mensaje.includes('propuesta')) throw createError({ statusCode: 409, statusMessage: mensaje })
    if (mensaje.includes('permiso') || mensaje.includes('sesión')) throw createError({ statusCode: 403, statusMessage: mensaje })
    throw crearErrorRepositorio('No se pudo crear el borrador desde la ingesta.')
  }
  const resultado = data as { id?: string, slug?: string, yaExistia?: boolean } | null
  if (!resultado?.id) throw crearErrorRepositorio('La creación del borrador no devolvió un resultado válido.')
  return { id: resultado.id, slug: resultado.slug || '', yaExistia: Boolean(resultado.yaExistia) }
}
