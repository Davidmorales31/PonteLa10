import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { listarPartidosSeoPublicos } from '../../server/utils/partidosSeoPublicos'

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
      goals_home: 2
    }
    const filtrosAplicados: Array<[string, unknown, unknown]> = []
    const desdeTabla = vi.fn((tabla: string) => {
      const respuesta = tabla === 'colombian_league_fixtures'
        ? { data: [fixture, copiaGoalApi], error: null }
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
    expect(primera).toHaveLength(1)
    expect(desdeTabla).toHaveBeenCalledTimes(2)
    expect(filtrosAplicados).toContainEqual(['colombian_league_fixtures', 'is_public', true])
    expect(filtrosAplicados).toContainEqual(['colombian_league_fixtures', 'publication_rights_confirmed', true])
  })
})
