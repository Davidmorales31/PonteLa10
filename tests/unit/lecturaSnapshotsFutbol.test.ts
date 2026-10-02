import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { leerSnapshotsFutbolPublicos } from '../../server/utils/lecturaSnapshotsFutbol'

const snapshot = {
  fixture_id: '11111111-1111-4111-8111-111111111111',
  provider: 'api-football',
  provider_fixture_id: 'fixture-10',
  business_date: '2026-10-02',
  kickoff_at: '2026-10-02T18:00:00.000Z',
  league_id: 'league-20',
  league_name: 'Liga',
  league_country: 'Colombia',
  season: '2026',
  round: null,
  phase: null,
  group_name: null,
  home_team_provider_id: 'team-30',
  home_team_name: 'Local',
  home_team_logo: null,
  away_team_provider_id: 'team-40',
  away_team_name: 'Visitante',
  away_team_logo: null,
  status: 'scheduled',
  status_external: null,
  elapsed: null,
  goals_home: null,
  goals_away: null,
  venue_name: null,
  venue_city: null,
  events: [],
  lineups: [],
  statistics: [],
  provider_fetched_at: '2026-10-02T17:00:00.000Z',
  is_public: false,
  publication_rights_confirmed: false
}

const entidades = {
  sports_fixtures: [{
    id: snapshot.fixture_id,
    competition_id: '22222222-2222-4222-8222-222222222222',
    home_team_id: '33333333-3333-4333-8333-333333333333',
    away_team_id: '44444444-4444-4444-8444-444444444444',
    is_public: false
  }],
  sports_competitions: [{ id: '22222222-2222-4222-8222-222222222222', is_public: false }],
  sports_teams: [
    { id: '33333333-3333-4333-8333-333333333333', is_public: false },
    { id: '44444444-4444-4444-8444-444444444444', is_public: false }
  ],
  sports_provider_mappings: [
    { provider: 'api-football', entity_type: 'fixture', external_id: 'fixture-10', competition_id: null, team_id: null, fixture_id: snapshot.fixture_id },
    { provider: 'api-football', entity_type: 'competition', external_id: 'league-20', competition_id: '22222222-2222-4222-8222-222222222222', team_id: null, fixture_id: null },
    { provider: 'api-football', entity_type: 'team', external_id: 'team-30', competition_id: null, team_id: '33333333-3333-4333-8333-333333333333', fixture_id: null },
    { provider: 'api-football', entity_type: 'team', external_id: 'team-40', competition_id: null, team_id: '44444444-4444-4444-8444-444444444444', fixture_id: null }
  ]
}

function crearClienteMock(mappingRows = entidades.sports_provider_mappings) {
  const llamadas: Array<{ tabla: string; metodo: string; args: unknown[] }> = []
  const datosPorTabla: Record<string, Array<Record<string, unknown>>> = {
    football_fixtures_today: [snapshot],
    ...entidades,
    sports_provider_mappings: mappingRows
  }
  const cliente = {
    from: vi.fn((tabla: string) => {
      const filtros: Array<[string, unknown]> = []
      const consulta: Record<string, (...args: unknown[]) => unknown> & {
        then?: (resolve: (valor: unknown) => unknown, reject: (error: unknown) => unknown) => unknown
      } = {}
      for (const metodo of ['select', 'eq', 'in', 'order', 'limit']) {
        consulta[metodo] = vi.fn((...args: unknown[]) => {
          llamadas.push({ tabla, metodo, args })
          if (metodo === 'eq') filtros.push([String(args[0]), args[1]])
          return consulta
        })
      }
      consulta.then = (resolve, reject) => {
        let data = datosPorTabla[tabla] || []
        if (filtros.some(([columna, valor]) => columna === 'is_public' && valor === true)) {
          data = data.filter((fila) => (fila as { is_public?: boolean }).is_public === true)
        }
        return Promise.resolve({ data, error: null }).then(resolve, reject)
      }
      return consulta
    })
  } as unknown as SupabaseClient
  return { cliente, llamadas }
}

describe('lectura de snapshots públicos de fútbol', () => {
  it('por defecto exige los permisos por registro y no publica filas privadas', async () => {
    const { cliente, llamadas } = crearClienteMock()

    await expect(leerSnapshotsFutbolPublicos(cliente, { fechaNegocio: '2026-10-02' })).resolves.toEqual([])

    expect(llamadas).toContainEqual({ tabla: 'football_fixtures_today', metodo: 'eq', args: ['is_public', true] })
    expect(llamadas).toContainEqual({ tabla: 'football_fixtures_today', metodo: 'eq', args: ['publication_rights_confirmed', true] })
  })

  it('con autorización privada publica solo identidades completas y devuelve una proyección segura', async () => {
    const { cliente, llamadas } = crearClienteMock()

    const fixtures = await leerSnapshotsFutbolPublicos(cliente, {
      fechaNegocio: '2026-10-02',
      derechosPublicacionConfirmados: true
    })

    expect(fixtures).toHaveLength(1)
    expect(fixtures[0]).toMatchObject({
      id: snapshot.fixture_id,
      businessDate: '2026-10-02',
      competition: { name: 'Liga' },
      homeTeam: { name: 'Local' },
      awayTeam: { name: 'Visitante' }
    })
    expect(llamadas.some(({ tabla, metodo, args }) => tabla === 'sports_fixtures' && metodo === 'eq' && args[0] === 'is_public')).toBe(false)
    expect(llamadas.filter(({ tabla, metodo, args }) => tabla === 'sports_provider_mappings' && metodo === 'in' && args[0] === 'entity_type'))
      .toContainEqual({ tabla: 'sports_provider_mappings', metodo: 'in', args: ['entity_type', ['competition', 'team', 'fixture']] })
  })

  it('no publica cuando falta o no coincide un mapping canónico', async () => {
    const mappingsIncorrectos = entidades.sports_provider_mappings.filter(mapping => mapping.entity_type !== 'team' || mapping.external_id !== 'team-40')
    const { cliente } = crearClienteMock(mappingsIncorrectos)

    await expect(leerSnapshotsFutbolPublicos(cliente, { derechosPublicacionConfirmados: true })).resolves.toEqual([])
  })

  it('rechaza fechas e identificadores inválidos antes de consultar la base', async () => {
    const { cliente } = crearClienteMock()

    await expect(leerSnapshotsFutbolPublicos(cliente, { fechaNegocio: '02-10-2026' })).resolves.toEqual([])
    await expect(leerSnapshotsFutbolPublicos(cliente, { fixtureId: 'no-es-uuid' })).resolves.toEqual([])
    expect(cliente.from).not.toHaveBeenCalled()
  })
})
