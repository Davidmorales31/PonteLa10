import type { SupabaseClient } from '@supabase/supabase-js'
import type { z } from 'zod'
import type { CategoriaEditorial } from '~/types/contenidoEditorial'
import type {
  IngestaEditorial,
  IngestaEditorialCreada,
  RespuestaBandejaIngestasEditoriales,
  ResultadoCancelacionIngestaEditorial
} from '~/types/ingestaEditorial'
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
    .from('editorial_ingestions')
    .insert({
      source_url: entrada.urlFuente,
      normalized_url: fuente.urlNormalizada,
      source_host: fuente.hostFuente,
      source_platform: fuente.plataforma,
      status: 'pending',
      title_hint: entrada.tituloSugerido || null,
      editorial_instructions: entrada.instrucciones || null,
      rules_snapshot: entrada.reglas,
      category_id: entrada.categoriaId,
      requested_by: solicitanteId
    })
    .select('id, source_platform, status, normalized_url, created_at')
    .single()

  if (error?.code === '23505') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Esta fuente ya tiene una solicitud activa.',
      data: { codigo: 'INGESTA_DUPLICADA' }
    })
  }
  if (error || !data) {
    throw crearErrorRepositorio('No se pudo registrar la fuente.')
  }

  return {
    id: String(data.id),
    plataforma: data.source_platform as IngestaEditorialCreada['plataforma'],
    estado: data.status as IngestaEditorialCreada['estado'],
    urlNormalizada: String(data.normalized_url),
    creadoEn: String(data.created_at)
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
