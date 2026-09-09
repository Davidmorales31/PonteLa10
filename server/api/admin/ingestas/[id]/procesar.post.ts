import { procesarTikTok } from '~/server/utils/tiktok/procesadorTikTok'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { exigirPermisoEditorial } from '~/server/utils/autorizacionEditorial'
import { crearBorradorDesdeIngestaEditorial } from '~/server/utils/repositorioContenidoEditorial'
import { esquemaIdIngestaEditorial } from '~/utils/editorial/ingestas'

function crearDocumento(transcripcion: ResultadoTranscripcion[]): Record<string, unknown> {
  return {
    type: 'doc',
    content: transcripcion.map(segmento => ({
      type: 'paragraph',
      content: [{ type: 'text', text: segmento.texto }]
    }))
  }
}

interface ResultadoTranscripcion { texto: string }

export default defineEventHandler(async evento => {
  const contexto = await exigirPermisoEditorial(evento, 'ingestas.gestionar')
  const id = esquemaIdIngestaEditorial.parse(getRouterParam(evento, 'id'))
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  const { data: ingesta, error } = await clienteSupabase
    .from('editorial_ingestions')
    .select('id, source_url, source_platform, title_hint, editorial_instructions, category_id, rules_snapshot')
    .eq('id', id)
    .maybeSingle()

  if (error || !ingesta) throw createError({ statusCode: 404, statusMessage: 'La ingesta no existe.' })
  if (ingesta.source_platform !== 'tiktok') {
    throw createError({ statusCode: 422, statusMessage: 'La V1 solo procesa fuentes de TikTok.' })
  }

  const reserva = await clienteSupabase.rpc('claim_editorial_ingestion', { target_ingestion_id: id })
  if (reserva.error) throw createError({ statusCode: 409, statusMessage: reserva.error.message })

  try {
    const resultado = await procesarTikTok(ingesta.source_url)
    const primerTexto = resultado.transcripcion.map(segmento => segmento.texto).join(' ').trim()
    const titulo = ingesta.title_hint || resultado.metadatos.titulo || 'Nueva historia desde TikTok'
    const resumen = primerTexto.slice(0, 320)
    const borrador = await crearBorradorDesdeIngestaEditorial(clienteSupabase, {
      titulo: titulo.slice(0, 160),
      resumen,
      tipo: 'noticia',
      categoriaId: ingesta.category_id,
      documento: crearDocumento(resultado.transcripcion),
      fuente: {
        url: ingesta.source_url,
        nombre: 'TikTok',
        autor: resultado.metadatos.autor,
        creditos: `Video original: ${resultado.metadatos.autor || 'autor de TikTok'}`
      }
    }, contexto.usuario.id)
    const finalizacion = await clienteSupabase.rpc('complete_editorial_ingestion', {
      target_ingestion_id: id,
      target_article_id: borrador.id,
      source_metadata: resultado.metadatos,
      processing_result: resultado
    })
    if (finalizacion.error || finalizacion.data !== true) {
      throw createError({ statusCode: 503, statusMessage: 'El borrador se creo, pero no se pudo finalizar la ingesta. Revisa contenidos antes de reintentar.', data: { codigo: 'INGESTA_FINALIZACION_FAILED', articuloId: borrador.id } })
    }
    return { ...borrador, ingestaId: id }
  } catch (errorProcesamiento) {
    // Conservar la reserva si ya existe un borrador para evitar duplicarlo al reintentar.
    if ((errorProcesamiento as { data?: { codigo?: string } }).data?.codigo === 'INGESTA_FINALIZACION_FAILED') throw errorProcesamiento
    const fallo = await clienteSupabase.rpc('fail_editorial_ingestion', {
      target_ingestion_id: id,
      error_code: 'TIKTOK_PROCESSING_FAILED',
      error_message: errorProcesamiento instanceof Error ? errorProcesamiento.message : 'No se pudo procesar el video.'
    })
    if (fallo.error || fallo.data !== true) {
      throw createError({ statusCode: 503, statusMessage: 'El procesamiento fallo y no se pudo actualizar su estado. Revisa la migracion de ingestas.', data: { codigo: 'INGESTA_ESTADO_FAILED' } })
    }
    throw createError({ statusCode: 422, statusMessage: 'No se pudo procesar el TikTok.', data: { codigo: 'TIKTOK_PROCESSING_FAILED' } })
  }
})
