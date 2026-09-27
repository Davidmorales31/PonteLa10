import { createHash } from 'node:crypto'
import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  obtenerClienteCodexPrivado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { esquemaBorradorCodex } from '~/server/utils/esquemasCodexEditorial'
import { crearProveedorDeepSeekRedaccion } from '~/server/utils/ai/deepseekRedaccion'
import type { EntradaRedaccionIa } from '~/server/utils/ai/contratosRedaccion'

const limiteBorradorBytes = 1_000_000

function crearEntradaRedaccion(entrada: ReturnType<typeof esquemaBorradorCodex.parse>): EntradaRedaccionIa {
  let segmentoId = 0
  const segmentos = entrada.sources.flatMap(fuente => fuente.claims.map((claim) => {
    segmentoId += 1
    return {
      id: segmentoId,
      inicioSegundos: segmentoId - 1,
      finSegundos: segmentoId,
      texto: `${fuente.publisher} — ${fuente.titulo}: ${claim}`.slice(0, 5000)
    }
  })).slice(0, 100)

  if (segmentos.length < 2) {
    throw createError({
      statusCode: 422,
      statusMessage: 'El expediente no tiene suficientes afirmaciones para redactar.',
      data: { codigo: 'EXPEDIENTE_SIN_EVIDENCIA_SUFICIENTE' }
    })
  }

  return {
    ingestaId: entrada.idempotencyKey,
    tituloSugerido: entrada.titleHint,
    instrucciones: 'Redacción basada únicamente en el expediente verificado. No agregues hechos que no aparezcan en sus afirmaciones y fuentes.',
    urlFuente: entrada.primarySourceUrl,
    creditos: 'Fuentes documentadas en el expediente editorial; se mostrarán fuera del cuerpo de la noticia.',
    categoriaId: entrada.categoryId,
    tipoSugerido: entrada.contentType,
    segmentos,
    contextoInvestigacion: {
      consultaPrincipal: entrada.seoResearch.primaryQuery,
      consultasRelacionadas: entrada.seoResearch.relatedQueries,
      intencion: entrada.seoResearch.intent,
      resumen: entrada.researchSummary,
      senalTendencia: {
        termino: entrada.trend.term,
        titulo: entrada.trend.title,
        url: entrada.trend.url,
        observadaEn: entrada.trend.observedAt
      },
      fuentes: entrada.sources.map(fuente => ({
        url: fuente.url,
        titulo: fuente.titulo,
        publisher: fuente.publisher,
        publishedAt: fuente.publishedAt,
        tipo: fuente.tipo,
        claims: fuente.claims
      })),
      temasDisponibles: entrada.topicCatalog.map(tema => ({
        id: tema.id,
        nombre: tema.name,
        descripcion: tema.description
      })),
      articulosPublicados: entrada.relatedArticles.map(articulo => ({
        id: articulo.id,
        titulo: articulo.title,
        resumen: articulo.summary,
        categoria: articulo.categoryName
      }))
    }
  }
}

export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const cuerpo = await leerCuerpoFirmado(evento, limiteBorradorBytes)
  await verificarFirmaCodex(evento, cuerpo, String(config.codexEditorialApiSecret || ''))

  const parseado = esquemaBorradorCodex.safeParse(
    decodificarJsonFirmado<unknown>(cuerpo)
  )
  if (!parseado.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'El expediente de investigación no cumple el contrato.',
      data: {
        codigo: 'EXPEDIENTE_CODEX_INVALIDO',
        campos: parseado.error.flatten().fieldErrors
      }
    })
  }

  const entrada = crearEntradaRedaccion(parseado.data)
  const { retryUncertain, ...contenidoSolicitud } = parseado.data
  const hashSolicitud = createHash('sha256').update(JSON.stringify(contenidoSolicitud)).digest('hex')
  const cliente = obtenerClienteCodexPrivado(evento)
  const { data: reserva, error: errorReserva } = await cliente.rpc('reserve_codex_editorial_draft', {
    p_idempotency_key: parseado.data.idempotencyKey,
    p_run_id: parseado.data.runId,
    p_category_id: parseado.data.categoryId,
    p_story_fingerprint: parseado.data.storyFingerprint.toLowerCase(),
    p_request_hash: hashSolicitud,
    p_retry_uncertain: retryUncertain
  })

  if (errorReserva) {
    const limiteDiario = errorReserva.code === '54000'
    const conflicto = errorReserva.code === '23505'
    throw createError({
      statusCode: limiteDiario ? 429 : conflicto ? 409 : 503,
      statusMessage: limiteDiario
        ? 'La corrida alcanzó su límite diario.'
        : conflicto
          ? 'La clave de generación ya está ligada a otra solicitud.'
          : 'No se pudo reservar la generación DeepSeek.',
      data: { codigo: limiteDiario ? 'LIMITE_CORRIDAS_DIARIO' : conflicto ? 'IDEMPOTENCIA_CODEX_EN_CONFLICTO' : 'RESERVA_DEEPSEEK_NO_DISPONIBLE' }
    })
  }

  const estadoReserva = reserva && typeof reserva === 'object'
    ? reserva as { estado?: string, resultado?: unknown }
    : {}
  if (estadoReserva.estado === 'completed' && estadoReserva.resultado) {
    return estadoReserva.resultado
  }
  if (estadoReserva.estado === 'running') {
    throw createError({
      statusCode: 409,
      statusMessage: 'La redacción DeepSeek ya está en curso; reintenta con la misma clave más tarde.',
      data: { codigo: 'DEEPSEEK_GENERACION_EN_CURSO' }
    })
  }
  if (estadoReserva.estado === 'uncertain' || estadoReserva.estado === 'retry_exhausted') {
    throw createError({
      statusCode: 409,
      statusMessage: 'No se pudo confirmar el resultado de DeepSeek. Se bloqueó otro cobro automático; verifica el registro antes de autorizar un único reintento.',
      data: { codigo: estadoReserva.estado === 'uncertain' ? 'DEEPSEEK_RESULTADO_INCIERTO' : 'DEEPSEEK_REINTENTO_INCIERTO_AGOTADO' }
    })
  }
  if (estadoReserva.estado !== 'reserved') {
    throw createError({ statusCode: 503, statusMessage: 'La reserva de redacción devolvió un estado desconocido.', data: { codigo: 'RESERVA_DEEPSEEK_INVALIDA' } })
  }

  let proveedorInvocado = false
  try {
    proveedorInvocado = true
    const resultado = await crearProveedorDeepSeekRedaccion().redactarBorrador(entrada)
    const salida = {
      propuesta: resultado.propuesta,
      seleccionEditorial: resultado.seleccionEditorial,
      proveedor: resultado.proveedor,
      modelo: resultado.modelo,
      consumo: resultado.consumo
    }
    const { data: resultadoGuardado, error: errorGuardado } = await cliente.rpc('complete_codex_editorial_draft', {
      p_idempotency_key: parseado.data.idempotencyKey,
      p_resultado: salida
    })
    if (errorGuardado || !resultadoGuardado) {
      throw createError({ statusCode: 503, statusMessage: 'DeepSeek redactó el borrador, pero no se pudo guardar el resultado idempotente.', data: { codigo: 'DEEPSEEK_RESULTADO_NO_PERSISTIDO' } })
    }
    return resultadoGuardado
  } catch (error) {
    const codigo = (error as { data?: { codigo?: string } })?.data?.codigo
      || 'DEEPSEEK_GENERACION_FALLIDA'
    if (codigo === 'IA_REDACCION_NO_CONFIGURADA') {
      await cliente.rpc('fail_codex_editorial_draft', {
        p_idempotency_key: parseado.data.idempotencyKey,
        p_error_code: codigo
      })
    } else if (proveedorInvocado) {
      await cliente.rpc('mark_codex_editorial_draft_uncertain', {
        p_idempotency_key: parseado.data.idempotencyKey,
        p_error_code: codigo
      })
    }
    throw error
  }
})
