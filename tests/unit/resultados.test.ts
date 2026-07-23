import { describe, expect, it } from 'vitest'
import type { FixtureApiFootball, PartidoResultado } from '../../types/resultados'
import {
  crearNombreCorto,
  mapearFixtureApiFootball,
  obtenerEstadoPartidoApi,
  obtenerEtiquetaEstado,
  ordenarPartidosRelevantes
} from '../../utils/resultadosDeportivos'

const fixtureBase: FixtureApiFootball = {
  fixture: { id: 10, date: '2026-07-22T20:00:00-05:00', status: { short: '2H', elapsed: 67 }, venue: { name: 'Metropolitano', city: 'Barranquilla' } },
  league: { id: 1, name: 'Liga BetPlay', country: 'Colombia', round: 'Fecha 4', season: 2026 },
  teams: { home: { id: 1, name: 'Atlético Nacional' }, away: { id: 2, name: 'Millonarios' } },
  goals: { home: 2, away: 1 }
}

describe('resultados deportivos', () => {
  it('normaliza estados del proveedor', () => {
    expect(obtenerEstadoPartidoApi('2H')).toBe('en-vivo')
    expect(obtenerEstadoPartidoApi('FT')).toBe('finalizado')
    expect(obtenerEstadoPartidoApi('NS')).toBe('programado')
  })

  it('mapea un fixture sin filtrar datos del proveedor al cliente', () => {
    const partido = mapearFixtureApiFootball(fixtureBase)
    expect(partido).toMatchObject({ id: '10', estado: 'en-vivo', minuto: 67, marcadorLocal: 2, marcadorVisitante: 1 })
    expect(partido.equipoLocal.nombreCorto).toBe('AN')
  })

  it('prioriza partidos en vivo y destacados', () => {
    const partidoFinalizado = { ...mapearFixtureApiFootball(fixtureBase), id: 'final', estado: 'finalizado' as const }
    const partidoEnVivo = { ...mapearFixtureApiFootball(fixtureBase), id: 'vivo', destacado: false }
    expect(ordenarPartidosRelevantes([partidoFinalizado, partidoEnVivo])[0]?.id).toBe('vivo')
  })

  it('genera etiquetas legibles y abreviaciones estables', () => {
    const partido = mapearFixtureApiFootball(fixtureBase)
    expect(obtenerEtiquetaEstado(partido)).toBe('67′')
    expect(crearNombreCorto('Real Madrid Club')).toBe('RMC')
    expect(obtenerEtiquetaEstado({ ...partido, estado: 'finalizado' } as PartidoResultado)).toBe('Finalizado')
  })
})
