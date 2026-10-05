import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { deduplicarFixturesSeo, listarPartidosSeoPublicos } from '../../server/utils/partidosSeoPublicos'

describe('caché del calendario público para páginas SEO', () => {
  it('agrupa lecturas concurrentes y reutiliza el resultado durante un minuto', async () => {
    const fixture = {
      provider: 'dimayor',
      provider_fixture_id: 'dimayor-2026-ii-13-cucuta-pereira',
      competition_slug: 'liga-betplay',
      season: '2026-II',
      round_name: 'Fecha 13',
      scheduled_at: '2026-10-05T23:00:00Z',
      home_team: 'Cúcuta Deportivo',
      away_team: 'Deportivo Pereira',
      status: 'scheduled',
      goals_home: null,
      goals_away: null,
      venue: null,
      city: null,
      checked_at: '2026-10-05T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      official_source_url: 'https://dimayor.com.co/programaciones-competencias-dimayor-2026-ii/',
      is_public: true,
      publication_rights_confirmed: true
    }
    const copiaGoalApi = {
      ...fixture,
      provider: 'goal-api',
      provider_fixture_id: 'goal-fixture-77',
      round_name: 'Matchday 13',
      checked_at: '2026-10-05T01:00:00Z',
      created_at: '2026-01-05T00:00:00Z',
      goals_home: 2
    }
    const revancha = {
      ...fixture,
      provider_fixture_id: 'dimayor-2027-i-13-cucuta-pereira',
      season: '2027-I',
      scheduled_at: '2027-10-05T23:00:00Z',
      created_at: '2026-01-02T00:00:00Z'
    }
    const filtrosAplicados: Array<[string, unknown, unknown]> = []
    const desdeTabla = vi.fn((tabla: string) => {
      const respuesta = tabla === 'colombian_league_fixtures'
        ? { data: [fixture, copiaGoalApi, revancha], error: null }
        : { data: [], error: null }
      const consulta = {
        select: () => consulta,
        eq: (campo: string, valor: unknown) => {
          filtrosAplicados.push([tabla, campo, valor])
          return consulta
        },
        order: () => consulta,
        limit: async () => respuesta
      }
      return consulta
    })
    const cliente = { from: desdeTabla } as unknown as SupabaseClient

    const [primera, concurrente] = await Promise.all([
      listarPartidosSeoPublicos(cliente),
      listarPartidosSeoPublicos(cliente)
    ])
    const reutilizada = await listarPartidosSeoPublicos(cliente)

    expect(primera).toEqual(concurrente)
    expect(primera).toEqual(reutilizada)
    expect(primera[0]).toMatchObject({
      slug: 'cucuta-deportivo-vs-deportivo-pereira',
      local: 'Cúcuta Deportivo',
      visitante: 'Deportivo Pereira',
      golesLocal: 2,
      fuenteOficialUrl: fixture.official_source_url
    })
    expect(primera[1]).toMatchObject({
      slug: 'cucuta-deportivo-vs-deportivo-pereira-liga-betplay-2027-i',
      slugsAlternos: [
        'cucuta-deportivo-vs-deportivo-pereira-liga-betplay-2027-i-fecha-13-dimayor-dimayor-2027-i-13-cucuta-pereira'
      ]
    })
    expect(primera).toHaveLength(2)
    expect(desdeTabla).toHaveBeenCalledTimes(2)
    expect(filtrosAplicados).toContainEqual(['colombian_league_fixtures', 'is_public', true])
    expect(filtrosAplicados).toContainEqual(['colombian_league_fixtures', 'publication_rights_confirmed', true])
  })

  it('no colapsa IDs del mismo proveedor cuando la ronda es desconocida y la fecha difiere', () => {
    const goalApi = {
      provider: 'goal-api',
      provider_fixture_id: 'goal-fixture-a',
      competition_slug: 'copa-colombia',
      season: '2026-I',
      round_name: 'Por confirmar',
      scheduled_at: '2026-05-15T21:00:00Z',
      home_team: 'Boca Juniors de Cali',
      away_team: 'Deportivo Cali',
      status: 'scheduled',
      goals_home: null,
      goals_away: null,
      venue: null,
      city: null,
      checked_at: '2026-05-01T00:00:00Z',
      official_source_url: null,
      created_at: '2026-01-01T00:00:00Z',
      is_public: true,
      publication_rights_confirmed: true
    }
    const segundaFechaGoalApi = {
      ...goalApi,
      provider_fixture_id: 'goal-fixture-b',
      scheduled_at: '2026-05-17T20:30:00Z',
      created_at: '2026-01-02T00:00:00Z'
    }
    const copiaDimayorMismaFecha = {
      ...goalApi,
      provider: 'dimayor',
      provider_fixture_id: 'dimayor-fixture-a',
      round_name: 'Fecha 3',
      checked_at: '2026-05-02T00:00:00Z',
      created_at: '2026-01-03T00:00:00Z'
    }

    const deduplicados = deduplicarFixturesSeo([goalApi, segundaFechaGoalApi, copiaDimayorMismaFecha])

    expect(deduplicados).toHaveLength(2)
    expect(deduplicados.map(fila => fila.provider_fixture_id)).toContain('goal-fixture-b')
    expect(deduplicados.map(fila => fila.provider_fixture_id)).toContain('dimayor-fixture-a')
    expect(deduplicados.find(fila => fila.provider_fixture_id === 'dimayor-fixture-a')?.created_at)
      .toBe(goalApi.created_at)
  })
})
