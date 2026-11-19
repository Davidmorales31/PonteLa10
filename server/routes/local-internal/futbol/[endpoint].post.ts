import { createError, defineEventHandler, getRouterParam, type EventHandler } from 'h3'
import activarFixtures from '~/server/api/internal/futbol/fixtures.post'
import actualizarResultadosLiga from '~/server/api/internal/futbol/liga-resultados.post'
import actualizarTablaDimayor from '~/server/api/internal/futbol/tabla-dimayor.post'
import sincronizarCalendario from '~/server/api/internal/futbol/calendario.post'
import sincronizarLigaMx from '~/server/api/internal/futbol/liga-mx.post'

const handlers: Record<string, EventHandler> = {
  fixtures: activarFixtures,
  'liga-resultados': actualizarResultadosLiga,
  'tabla-dimayor': actualizarTablaDimayor,
  calendario: sincronizarCalendario,
  'liga-mx': sincronizarLigaMx
}

export default defineEventHandler((evento) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'No encontrado.' })
  }

  const endpoint = getRouterParam(evento, 'endpoint')
  const handler = endpoint ? handlers[endpoint] : undefined
  if (!handler) throw createError({ statusCode: 404, statusMessage: 'No encontrado.' })
  return handler(evento)
})
