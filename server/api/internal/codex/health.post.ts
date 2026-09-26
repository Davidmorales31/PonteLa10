import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  obtenerClienteCodexPrivado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { esquemaConsultaSaludCodex } from '~/server/utils/esquemasCodexEditorial'

export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const cuerpo = await leerCuerpoFirmado(evento, 1024)
  await verificarFirmaCodex(evento, cuerpo, String(config.codexEditorialApiSecret || ''))

  const entrada = esquemaConsultaSaludCodex.safeParse(
    decodificarJsonFirmado<unknown>(cuerpo)
  )
  if (!entrada.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La consulta de salud no debe incluir parámetros.',
      data: { codigo: 'CONSULTA_SALUD_CODEX_INVALIDA' }
    })
  }

  const { data, error } = await obtenerClienteCodexPrivado(evento)
    .rpc('get_codex_editorial_health')
  if (error || !data || typeof data !== 'object'
    || !('worker' in data) || !('ingestas' in data)
    || !('codex' in data) || !('publicacion' in data) || !('cron' in data)) {
    throw createError({
      statusCode: 502,
      statusMessage: 'No se pudo obtener el estado operativo del flujo editorial.',
      data: { codigo: 'SALUD_EDITORIAL_NO_DISPONIBLE' }
    })
  }

  return data
})
