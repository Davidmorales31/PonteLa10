import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  obtenerClienteCodexPrivado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { esquemaAgendaCodex } from '~/server/utils/esquemasCodexEditorial'

const limiteAgendaBytes = 1_000_000

export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const cuerpo = await leerCuerpoFirmado(evento, limiteAgendaBytes)
  await verificarFirmaCodex(evento, cuerpo, String(config.codexEditorialApiSecret || ''))

  const resultado = esquemaAgendaCodex.safeParse(
    decodificarJsonFirmado<unknown>(cuerpo)
  )
  if (!resultado.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La agenda no cumple el contrato de tendencias.',
      data: {
        codigo: 'AGENDA_CODEX_INVALIDA',
        campos: resultado.error.flatten().fieldErrors
      }
    })
  }

  const { data, error } = await obtenerClienteCodexPrivado(evento)
    .rpc('save_codex_editorial_agenda', {
      p_run_id: resultado.data.runId,
      p_categories: resultado.data.categories,
      p_status: resultado.data.status
    })
  if (error) {
    const rechazado = error.code === '22023' || error.code === '22P02'
    throw createError({
      statusCode: rechazado ? 422 : 502,
      statusMessage: rechazado
        ? 'La agenda fue rechazada por las reglas editoriales.'
        : 'No se pudo guardar el checkpoint editorial.',
      data: { codigo: rechazado ? 'AGENDA_CODEX_RECHAZADA' : 'AGENDA_CODEX_NO_DISPONIBLE' }
    })
  }

  if (!data || typeof data !== 'object') {
    throw createError({
      statusCode: 502,
      statusMessage: 'El CRM devolvió un checkpoint incompleto.',
      data: { codigo: 'RESPUESTA_AGENDA_CODEX_INVALIDA' }
    })
  }
  return data
})
