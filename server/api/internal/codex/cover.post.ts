import { esquemaAsignarPortadaCodex } from '~/server/utils/esquemasCodexEditorial'
import {
  decodificarJsonFirmado, leerCuerpoFirmado, obtenerClienteCodexPrivado, verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'

export default defineEventHandler(async (evento) => {
  const cuerpo = await leerCuerpoFirmado(evento, 10_000)
  await verificarFirmaCodex(evento, cuerpo, String(useRuntimeConfig(evento).codexEditorialApiSecret || ''))
  const entrada = esquemaAsignarPortadaCodex.safeParse(decodificarJsonFirmado<unknown>(cuerpo))
  if (!entrada.success) {
    throw createError({ statusCode: 422, statusMessage: 'La asignación de portada no es válida.', data: { codigo: 'PORTADA_CODEX_INVALIDA' } })
  }
  const { data, error } = await obtenerClienteCodexPrivado(evento).rpc('asignar_portada_borrador_codex', {
    p_article_id: entrada.data.articleId,
    p_media_id: entrada.data.coverMediaId,
    p_expected_lock_version: entrada.data.expectedLockVersion,
    p_cover_flag: entrada.data.coverFlag
  })
  if (error) {
    throw createError({
      statusCode: error.code === '23505' ? 409 : error.code === '22023' ? 422 : 502,
      statusMessage: 'No se pudo asignar la portada al borrador Codex.',
      data: { codigo: error.code === '23505' ? 'PORTADA_CODEX_EN_CONFLICTO' : 'PORTADA_CODEX_NO_ASIGNADA' }
    })
  }
  const respuesta = data as { articleId?: string, estado?: string, coverMediaId?: string } | null
  if (respuesta?.articleId !== entrada.data.articleId || respuesta.estado !== 'review'
    || respuesta.coverMediaId !== entrada.data.coverMediaId) {
    throw createError({ statusCode: 502, statusMessage: 'No se confirmó la portada.', data: { codigo: 'RESPUESTA_PORTADA_CODEX_INVALIDA' } })
  }
  return data
})
