import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  obtenerClienteCodexPrivado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { esquemaPropuestaCodex } from '~/server/utils/esquemasCodexEditorial'

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

  setResponseStatus(evento, respuesta.duplicado ? 200 : 201)
  return respuesta
})
