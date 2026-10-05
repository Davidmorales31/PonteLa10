import { createError } from 'h3'
import type { ResumenArticuloPublico } from '~/types/contenidoEditorial'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { analizarConsultaArticulosPublicos } from '~/server/utils/filtrosArticulosPublicos'
import { listarArticulosPublicosEditoriales } from '~/server/utils/repositorioContenidoEditorial'

export default defineEventHandler(async (
  evento
): Promise<ResumenArticuloPublico[] | { articulos: ResumenArticuloPublico[]; hayMas: boolean }> => {
  const clienteSupabase = obtenerClienteSupabaseEditorial(evento)
  const consulta = analizarConsultaArticulosPublicos(getQuery(evento))
  if (!consulta) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Los filtros de artículos no son válidos.'
    })
  }

  setResponseHeader(
    evento,
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
  )

  const articulos = await listarArticulosPublicosEditoriales(
    clienteSupabase,
    consulta.paginado ? consulta.limite + 1 : consulta.limite,
    consulta.desplazamiento,
    consulta.categoria || consulta.tema || consulta.buscar ? consulta : undefined
  )

  if (consulta.paginado) {
    return {
      articulos: articulos.slice(0, consulta.limite),
      hayMas: articulos.length > consulta.limite
    }
  }

  return articulos.slice(0, consulta.limite)
})
