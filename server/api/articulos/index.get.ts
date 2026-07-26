import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'

export default defineEventHandler(async (
  evento
): Promise<ResumenArticuloPublico[]> => {
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  const limiteSolicitado = Number(getQuery(evento).limite || 20)
  const limite = Number.isInteger(limiteSolicitado)
    ? Math.min(Math.max(limiteSolicitado, 1), 50)
    : 20

  setResponseHeader(
    evento,
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
  )

  return listarArticulosPublicosEditoriales(clienteSupabase, limite)
})
