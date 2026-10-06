import { describe, expect, it } from 'vitest'
import { crearActualizacionesResultadosLiga } from '~/server/utils/resultadosLigaPublica'

describe('reconciliación de resultados de la Liga Colombiana', () => {
  const fixture = {
    competition_slug: 'torneo-betplay', season: '2026-II', provider: 'dimayor',
    provider_fixture_id: 'dimayor-2026-ii-12-bogota-envigado',
    scheduled_at: '2026-10-05T22:00:00.000Z', home_team: 'Bogotá FC', away_team: 'Envigado',
    status: 'scheduled', goals_home: null, goals_away: null, checked_at: '2026-10-04T05:00:00.000Z'
  }

  it('proyecta el marcador Goal API sobre el fixture autorizado aunque cambien los alias', () => {
    const resultado = crearActualizacionesResultadosLiga([fixture], [{
      provider: 'goal-api', league_name: 'Primera B', kickoff_at: fixture.scheduled_at,
      home_team_name: 'Bogotá', away_team_name: 'Envigado FC', status: 'finished',
      goals_home: 3, goals_away: 3, provider_fetched_at: '2026-10-06T00:00:00.000Z'
    }], Date.parse('2026-10-06T00:05:00.000Z'))

    expect(resultado).toEqual([expect.objectContaining({
      status: 'finished', goals_home: 3, goals_away: 3,
      provider: 'dimayor', provider_fixture_id: fixture.provider_fixture_id,
      checked_at: '2026-10-06T00:00:00.000Z'
    })])
  })

  it('ignora una fuente de otra competencia, nombres distintos y estados en vivo vencidos', () => {
    const resultado = crearActualizacionesResultadosLiga([fixture], [
      { provider: 'goal-api', league_name: 'Primera A', kickoff_at: fixture.scheduled_at,
        home_team_name: 'Bogotá', away_team_name: 'Envigado FC', status: 'finished',
        goals_home: 3, goals_away: 3, provider_fetched_at: '2026-10-06T00:00:00.000Z' },
      { provider: 'goal-api', league_name: 'Primera B', kickoff_at: fixture.scheduled_at,
        home_team_name: 'Bogotá', away_team_name: 'Envigado FC', status: 'live',
        goals_home: 1, goals_away: 0, provider_fetched_at: '2026-10-05T23:50:00.000Z' }
    ], Date.parse('2026-10-06T00:05:00.000Z'))

    expect(resultado).toEqual([])
  })

  it('no permite que una lectura atrasada revierta un resultado final', () => {
    const resultado = crearActualizacionesResultadosLiga([{
      ...fixture, status: 'finished', goals_home: 2, goals_away: 1
    }], [{
      provider: 'goal-api', league_name: 'Primera B', kickoff_at: fixture.scheduled_at,
      home_team_name: 'Bogotá', away_team_name: 'Envigado FC', status: 'scheduled',
      goals_home: null, goals_away: null, provider_fetched_at: '2026-10-06T00:00:00.000Z'
    }], Date.parse('2026-10-06T00:05:00.000Z'))

    expect(resultado).toEqual([])
  })

  it('no devuelve al prepartido un juego en curso ni reduce un marcador parcial', () => {
    const snapshot = {
      provider: 'goal-api', league_name: 'Primera B', kickoff_at: fixture.scheduled_at,
      home_team_name: 'Bogotá', away_team_name: 'Envigado FC',
      goals_home: 1, goals_away: 0, provider_fetched_at: '2026-10-06T00:04:00.000Z'
    }
    const enJuego = { ...fixture, status: 'live', goals_home: 2, goals_away: 0, checked_at: '2026-10-06T00:00:00.000Z' }

    expect(crearActualizacionesResultadosLiga([enJuego], [
      { ...snapshot, status: 'scheduled', goals_home: null, goals_away: null }
    ], Date.parse('2026-10-06T00:05:00.000Z'))).toEqual([])
    expect(crearActualizacionesResultadosLiga([enJuego], [
      { ...snapshot, status: 'live' }
    ], Date.parse('2026-10-06T00:05:00.000Z'))).toEqual([])
  })

  it('acepta el retorno de medio tiempo a en juego sin cambiar el marcador', () => {
    const resultado = crearActualizacionesResultadosLiga([{
      ...fixture, status: 'halftime', goals_home: 1, goals_away: 0,
      checked_at: '2026-10-06T00:00:00.000Z'
    }], [{
      provider: 'goal-api', league_name: 'Primera B', kickoff_at: fixture.scheduled_at,
      home_team_name: 'Bogotá', away_team_name: 'Envigado FC', status: 'live',
      goals_home: 1, goals_away: 0, provider_fetched_at: '2026-10-06T00:04:00.000Z'
    }], Date.parse('2026-10-06T00:05:00.000Z'))

    expect(resultado[0]).toMatchObject({ status: 'live', goals_home: 1, goals_away: 0 })
  })
})
