import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  obtenerClienteCodexPrivado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { esquemaPublicacionAutomaticaCodex } from '~/server/utils/esquemasCodexEditorial'

export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  if (!config.codexEditorialPublicationApiSecret
    || config.codexEditorialPublicationApiSecret === config.codexEditorialApiSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Falta una clave de publicación independiente.', data: { codigo: 'PUBLICACION_AUTOMATICA_NO_CONFIGURADA' } })
  }
  const cuerpo = await leerCuerpoFirmado(evento, 1_000_000)
  // La clave de investigación no autoriza aprobación ni programación.
  await verificarFirmaCodex(evento, cuerpo, String(config.codexEditorialPublicationApiSecret || ''))
  const entrada = esquemaPublicacionAutomaticaCodex.safeParse(decodificarJsonFirmado<unknown>(cuerpo))
  if (!entrada.success) {
    throw createError({ statusCode: 422, statusMessage: 'La propuesta o su revisión IA no cumple el contrato.', data: { codigo: 'PUBLICACION_AUTOMATICA_CODEX_INVALIDA', campos: entrada.error.flatten().fieldErrors } })
  }
  const { data, error } = await obtenerClienteCodexPrivado(evento).rpc('submit_and_schedule_codex_proposal', {
    p_input: entrada.data.proposal,
    p_brief: entrada.data.briefSeo,
    p_review: entrada.data.review
  })
  if (error) {
    const conflicto = ['23505', '40001'].includes(error.code)
    throw createError({
      statusCode: conflicto ? 409 : error.code === '22023' ? 422 : error.code === '42501' ? 403 : 503,
      statusMessage: 'No se pudo aprobar y programar la propuesta automática.',
      data: { codigo: conflicto ? 'PUBLICACION_AUTOMATICA_EN_CONFLICTO' : 'PUBLICACION_AUTOMATICA_RECHAZADA' }
    })
  }
  const recibo = data as { articleId?: string, estado?: string, autoApproved?: boolean, duplicado?: boolean, programadoPara?: string } | null
  const programado = recibo?.autoApproved === true && recibo.estado === 'scheduled' && Boolean(recibo.programadoPara)
  const duplicadoAjeno = recibo?.autoApproved === false && recibo.duplicado === true && typeof recibo.estado === 'string'
  if (!recibo?.articleId || (!programado && !duplicadoAjeno)) {
    throw createError({ statusCode: 502, statusMessage: 'El CRM devolvió un recibo incompleto.', data: { codigo: 'RECIBO_PUBLICACION_AUTOMATICA_INVALIDO' } })
  }
  setResponseStatus(evento, recibo.duplicado ? 200 : 201)
  return recibo
})
