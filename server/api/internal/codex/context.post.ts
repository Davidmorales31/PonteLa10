import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  obtenerClienteCodexPrivado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { esquemaContextoCodex } from '~/server/utils/esquemasCodexEditorial'
import { clasificarErrorContextoCodex } from '~/server/utils/errorContextoCodex'

const limiteContextoBytes = 20_000

export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const cuerpo = await leerCuerpoFirmado(evento, limiteContextoBytes)
  await verificarFirmaCodex(evento, cuerpo, String(config.codexEditorialApiSecret || ''))

  const resultado = esquemaContextoCodex.safeParse(
    decodificarJsonFirmado<unknown>(cuerpo)
  )
  if (!resultado.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La consulta de contexto no es válida.',
      data: { codigo: 'CONTEXTO_CODEX_INVALIDO' }
    })
  }

  const { data, error } = await obtenerClienteCodexPrivado(evento)
    .rpc('get_codex_editorial_context', { p_run_id: resultado.data.runId })
  if (error || !data || typeof data !== 'object') {
    const problema = clasificarErrorContextoCodex(error)
    throw createError({
      statusCode: problema.statusCode,
      statusMessage: problema.statusMessage,
      data: { codigo: problema.codigo }
    })
  }

  return data
})
