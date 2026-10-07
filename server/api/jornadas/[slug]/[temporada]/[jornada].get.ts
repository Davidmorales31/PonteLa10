import { getRouterParam, setResponseHeader } from 'h3'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { obtenerFichaJornadaCompeticionPublica } from '~/server/utils/competicionesPublicas'

export default defineEventHandler(async (evento) => {
  const ficha = await obtenerFichaJornadaCompeticionPublica(
    obtenerClienteSupabaseAnonimo(evento),
    getRouterParam(evento, 'slug') || '',
    getRouterParam(evento, 'temporada') || '',
    getRouterParam(evento, 'jornada') || ''
  )
  if (!ficha) throw createError({ statusCode: 404, statusMessage: 'No encontramos una jornada completa y verificada.' })

  setResponseHeader(evento, 'Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=300')
  return ficha
})
