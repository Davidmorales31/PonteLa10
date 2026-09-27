import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'

export default defineEventHandler(async (
  evento
): Promise<ResumenArticuloPublico[] | { articulos: ResumenArticuloPublico[]; hayMas: boolean }> => {
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  const consulta = getQuery(evento)
  const paginado = consulta.paginado === 'true' || consulta.paginado === '1'
  const limiteSolicitado = Number(consulta.limite || 20)
  const limite = Number.isInteger(limiteSolicitado)
    ? Math.min(Math.max(limiteSolicitado, 1), paginado ? 49 : 50)
    : 20
  const desplazamientoSolicitado = Number(consulta.desplazamiento || 0)
  const desplazamiento = Number.isSafeInteger(desplazamientoSolicitado)
    ? Math.min(Math.max(desplazamientoSolicitado, 0), 100_000)
    : 0

  setResponseHeader(
    evento,
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
  )

  const articulos = await listarArticulosPublicosEditoriales(
    clienteSupabase,
    paginado ? limite + 1 : limite,
    desplazamiento
  )

  if (paginado) {
    return {
      articulos: articulos.slice(0, limite),
      hayMas: articulos.length > limite
    }
  }

  return articulos
})
