import { describe, expect, it } from 'vitest'
import type { FixtureFutbolPublico } from '~/types/futbolPublico'
import { deduplicarFixturesFutbol } from '~/utils/deduplicarFixturesFutbol'

function fixture(entrada: Partial<FixtureFutbolPublico> & Pick<FixtureFutbolPublico, 'id'>): FixtureFutbolPublico {
  const { id, ...sobreEscribir } = entrada
  return {
    id,
    businessDate: '2026-10-02',
    kickoffAt: '2026-10-02T18:45:00.000Z',
    competition: { name: 'UEFA Nations League', country: 'Europe', season: '2026', round: null, phase: null, group: null },
    homeTeam: { name: 'Francia' },
    awayTeam: { name: 'Italia' },
    status: 'scheduled',
    externalStatus: null,
    elapsed: null,
    goalsHome: null,
    goalsAway: null,
    venue: { name: null, city: null },
    providerFetchedAt: '2026-10-02T18:00:00.000Z',
    events: [],
    lineups: [],
    statistics: [],
    ...sobreEscribir
  }
}

describe('identidad pública de fixtures de fútbol', () => {
  it('une duplicados entre proveedores y conserva el snapshot en vivo', () => {
    const programado = fixture({ id: 'goal-id', providerFetchedAt: '2026-10-02T18:44:00.000Z' })
    const enVivo = fixture({
      id: 'api-id',
      competition: { ...programado.competition, name: 'Nations League' },
      status: 'live',
      elapsed: 34,
      goalsHome: 1,
      goalsAway: 0,
      providerFetchedAt: '2026-10-02T18:42:00.000Z'
    })

    expect(deduplicarFixturesFutbol([programado, enVivo])).toEqual([enVivo])
  })

  it('no deja que un snapshot en vivo viejo oculte un final más reciente', () => {
    const enVivoAntiguo = fixture({
      id: 'api-id', status: 'live', providerFetchedAt: '2026-10-02T18:00:00.000Z'
    })
    const finalActualizado = fixture({
      id: 'goal-id', status: 'finished', goalsHome: 2, goalsAway: 1,
      providerFetchedAt: '2026-10-02T18:45:00.000Z'
    })

    expect(deduplicarFixturesFutbol([enVivoAntiguo, finalActualizado])).toEqual([finalActualizado])
  })

  it('no fusiona otro rival, torneo o minuto de inicio', () => {
    const original = fixture({ id: 'original' })
    const fixtures = [
      original,
      fixture({ id: 'otro-rival', awayTeam: { name: 'España' } }),
      fixture({ id: 'otro-torneo', competition: { ...original.competition, name: 'UEFA Champions League' } }),
      fixture({ id: 'otro-horario', kickoffAt: '2026-10-02T19:00:00.000Z' })
    ]

    expect(deduplicarFixturesFutbol(fixtures).map(partido => partido.id)).toEqual([
      'original', 'otro-rival', 'otro-torneo', 'otro-horario'
    ])
  })

  it('ordena los encuentros únicos por hora ascendente', () => {
    const tarde = fixture({ id: 'tarde', kickoffAt: '2026-10-02T21:00:00.000Z' })
    const temprano = fixture({ id: 'temprano', kickoffAt: '2026-10-02T16:00:00.000Z' })

    expect(deduplicarFixturesFutbol([tarde, temprano]).map(partido => partido.id)).toEqual(['temprano', 'tarde'])
  })
})
