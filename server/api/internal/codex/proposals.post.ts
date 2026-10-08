import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  obtenerClienteCodexPrivado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import {
  esquemaBriefSeoListoPropuestaCodex,
  esquemaPropuestaCodex
} from '~/server/utils/esquemasCodexEditorial'

const limitePropuestaBytes = 1_000_000

export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const cuerpo = await leerCuerpoFirmado(evento, limitePropuestaBytes)
  await verificarFirmaCodex(evento, cuerpo, String(config.codexEditorialApiSecret || ''))

  const resultado = esquemaPropuestaCodex.safeParse(
    decodificarJsonFirmado<unknown>(cuerpo)
  )

  if (!resultado.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La propuesta no cumple el contrato editorial.',
      data: {
        codigo: 'PROPUESTA_CODEX_INVALIDA',
        campos: resultado.error.flatten().fieldErrors
      }
    })
  }

  const cliente = obtenerClienteCodexPrivado(evento)
  const { data: generacion, error: errorGeneracion } = await cliente
    .from('editorial_codex_draft_generations')
    .select('run_id,category_id,story_fingerprint,status,result')
    .eq('idempotency_key', resultado.data.idempotencyKey)
    .maybeSingle()

  if (errorGeneracion || !generacion) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No se pudo verificar el expediente de investigación y su brief SEO.',
      data: { codigo: 'BRIEF_SEO_CODEX_NO_DISPONIBLE' }
    })
  }

  const generacionEsperada = generacion as unknown as {
    run_id: string
    category_id: string
    story_fingerprint: string
    status: string
    result: unknown
  }
  if (generacionEsperada.status !== 'completed'
    || generacionEsperada.run_id.toLowerCase() !== resultado.data.runId.toLowerCase()
    || generacionEsperada.category_id.toLowerCase() !== resultado.data.categoryId.toLowerCase()
    || generacionEsperada.story_fingerprint.toLowerCase() !== resultado.data.storyFingerprint.toLowerCase()) {
    throw createError({
      statusCode: 409,
      statusMessage: 'El brief SEO no corresponde a la generación de esta propuesta.',
      data: { codigo: 'BRIEF_SEO_CODEX_GENERACION_INCONSISTENTE' }
    })
  }

  const briefPersistido = generacionEsperada.result
    && typeof generacionEsperada.result === 'object'
    ? (generacionEsperada.result as { briefSeo?: unknown }).briefSeo
    : undefined

  if (briefPersistido === undefined) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La generación no contiene un diferenciador editorial; no se creó un artículo para revisión.',
      data: { codigo: 'DIFERENCIADOR_EDITORIAL_AUSENTE' }
    })
  }

  const validacionBrief = esquemaBriefSeoListoPropuestaCodex.safeParse(briefPersistido)
  if (!validacionBrief.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La generación no demuestra un diferenciador editorial verificable; no se creó un artículo para revisión.',
      data: {
        codigo: 'DIFERENCIADOR_EDITORIAL_INSUFICIENTE',
        campos: validacionBrief.error.flatten().fieldErrors
      }
    })
  }
  const briefValidado = validacionBrief.data

  const { data, error } = await cliente.rpc('submit_codex_editorial_proposal', {
    p_input: resultado.data
  })

  if (error) {
    const codigo = error.code === '23505'
      ? 'IDEMPOTENCIA_EN_CONFLICTO'
      : error.code === '22023'
        ? 'PROPUESTA_CODEX_RECHAZADA'
        : 'PROPUESTA_CODEX_NO_DISPONIBLE'
    throw createError({
      statusCode: error.code === '23505' ? 409 : error.code === '22023' ? 422 : 502,
      statusMessage: error.code === '23505'
        ? 'La clave de idempotencia se usó con otro contenido.'
        : error.code === '22023'
          ? 'La propuesta fue rechazada por las reglas editoriales.'
          : 'No se pudo registrar la propuesta en el CRM.',
      data: { codigo }
    })
  }

  const respuesta = data as { articleId?: string, estado?: string, duplicado?: boolean } | null
  if (!respuesta?.articleId || respuesta.estado !== 'review') {
    throw createError({
      statusCode: 502,
      statusMessage: 'El CRM devolvió una respuesta incompleta.',
      data: { codigo: 'RESPUESTA_CRM_CODEX_INVALIDA' }
    })
  }

  const { error: errorBrief } = await cliente.rpc('propose_editorial_article_search_brief', {
    p_idempotency_key: resultado.data.idempotencyKey,
    p_article_id: respuesta.articleId,
    p_brief: briefValidado
  })

  if (errorBrief) {
    throw createError({
      statusCode: 503,
      statusMessage: 'La propuesta se registró, pero no se pudo guardar su brief SEO.',
      data: { codigo: 'BRIEF_SEO_CODEX_NO_PERSISTIDO' }
    })
  }

  setResponseStatus(evento, respuesta.duplicado ? 200 : 201)
  return respuesta
})
