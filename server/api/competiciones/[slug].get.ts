import { getQuery, getRouterParam, setResponseHeader } from 'h3'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { obtenerFichaCompeticionPublica } from '~/server/utils/competicionesPublicas'

export default defineEventHandler(async (evento) => {
  const slug = getRouterParam(evento, 'slug') || ''
  const valorTemporada = getQuery(evento).temporada
  if (valorTemporada !== undefined && typeof valorTemporada !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'La temporada solicitada no es válida.' })
  }

  const ficha = await obtenerFichaCompeticionPublica(
    obtenerClienteSupabaseAnonimo(evento),
    slug,
    valorTemporada
  )
  if (!ficha) throw createError({ statusCode: 404, statusMessage: 'No encontramos esa temporada de competición.' })

  setResponseHeader(evento, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60')
  return ficha
})
