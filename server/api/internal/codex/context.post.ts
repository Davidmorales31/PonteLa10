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

  const cliente = obtenerClienteCodexPrivado(evento)
  const { data, error } = await cliente
    .rpc('get_codex_editorial_context', { p_run_id: resultado.data.runId })
  if (error || !data || typeof data !== 'object') {
    const problema = clasificarErrorContextoCodex(error)
    throw createError({
      statusCode: problema.statusCode,
      statusMessage: problema.statusMessage,
      data: { codigo: problema.codigo }
    })
  }

  const { data: hubs, error: errorHubs } = await cliente
    .rpc('get_codex_editorial_hub_targets')
  if (errorHubs) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No se pudo cargar el catálogo seguro de hubs editoriales.',
      data: { codigo: 'CATALOGO_HUBS_CODEX_NO_DISPONIBLE' }
    })
  }

  const contexto = data as Record<string, unknown>
  const publicacionesRecientes = Array.isArray(contexto.recentPublished)
    ? contexto.recentPublished
    : []

  return {
    ...contexto,
    actionTargets: {
      articles: publicacionesRecientes,
      hubs: Array.isArray(hubs) ? hubs : []
    }
  }
})
