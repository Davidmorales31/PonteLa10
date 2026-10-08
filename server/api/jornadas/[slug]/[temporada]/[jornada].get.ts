import { getRouterParam } from 'h3'
import { obtenerClienteSupabaseAnonimo } from '~/server/utils/clienteSupabaseAnonimo'
import { obtenerFichaJornadaCompeticionPublica } from '~/server/utils/competicionesPublicas'
import { aplicarCachePublica } from '~/server/utils/aplicarCachePublica'

export default defineEventHandler(async (evento) => {
  const ficha = await obtenerFichaJornadaCompeticionPublica(
    obtenerClienteSupabaseAnonimo(evento),
    getRouterParam(evento, 'slug') || '',
    getRouterParam(evento, 'temporada') || '',
    getRouterParam(evento, 'jornada') || ''
  )
  if (!ficha) throw createError({ statusCode: 404, statusMessage: 'No encontramos una jornada completa y verificada.' })

  aplicarCachePublica(evento, 'competicion')
  return ficha
})
