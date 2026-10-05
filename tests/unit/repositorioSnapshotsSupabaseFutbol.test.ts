import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import type { RegistroCorridaFixturesFutbol } from '../../server/utils/proveedoresFutbol/sincronizadorFixturesDiarios'
import { crearRepositorioSnapshotsSupabase } from '../../server/utils/proveedoresFutbol/repositorioSnapshotsSupabase'

const fixtureMapping = {
  provider: 'goal-api',
  entity_type: 'fixture',
  external_id: 'external-fixture',
  competition_id: null,
  team_id: null,
  fixture_id: 'canonical-fixture',
  sports_fixtures: {
    id: 'canonical-fixture',
    competition_id: 'canonical-competition',
    home_team_id: 'canonical-home',
    away_team_id: 'canonical-away',
    scheduled_at: '2026-10-01T18:00:00.000Z'
  }
}

function crearClienteMock(respuestas: Record<string, Array<{ data: unknown; error: unknown }>>) {
  const llamadas: Array<{ tabla: string; metodo: string; args: unknown[] }> = []
  const cliente = {
    from: vi.fn((tabla: string) => {
      const respuesta = respuestas[tabla]?.shift() ?? { data: [], error: null }
      const consulta: Record<string, (...args: unknown[]) => unknown> & {
        then?: (resolve: (valor: unknown) => unknown, reject: (error: unknown) => unknown) => unknown
      } = {}
      for (const metodo of ['select', 'eq', 'in', 'gte', 'lt', 'range', 'order', 'upsert', 'insert', 'update']) {
        consulta[metodo] = vi.fn((...args: unknown[]) => {
          llamadas.push({ tabla, metodo, args })
          return consulta
        })
      }
      consulta.then = (resolve, reject) => Promise.resolve(respuesta).then(resolve, reject)
      return consulta
    }),
    rpc: vi.fn(async () => ({ data: true, error: null }))
  } as unknown as SupabaseClient
  return { cliente, llamadas }
}

describe('repositorio privado de snapshots de fútbol en Supabase', () => {
  it('carga mappings solo de fixtures de la fecha Bogotá y enlaza identidades canónicas', async () => {
    const { cliente, llamadas } = crearClienteMock({
      sports_provider_mappings: [
        { data: [fixtureMapping], error: null },
        { data: [{
          provider: 'goal-api', entity_type: 'competition', external_id: 'external-league',
          competition_id: 'canonical-competition', team_id: null, fixture_id: null
        }], error: null },
        { data: [
          { provider: 'goal-api', entity_type: 'team', external_id: 'external-home',
            competition_id: null, team_id: 'canonical-home', fixture_id: null },
          { provider: 'goal-api', entity_type: 'team', external_id: 'external-away',
            competition_id: null, team_id: 'canonical-away', fixture_id: null }
        ], error: null }
      ]
    })
    const repositorio = crearRepositorioSnapshotsSupabase(cliente)

    const mappings = await repositorio.cargarMappings('goal-api', '2026-10-01')

    expect(mappings).toEqual({
      competencias: [{ externalId: 'external-league', competitionId: 'canonical-competition' }],
      equipos: [
        { externalId: 'external-home', teamId: 'canonical-home' },
        { externalId: 'external-away', teamId: 'canonical-away' }
      ],
      fixtures: [{
        externalId: 'external-fixture', fixtureId: 'canonical-fixture',
        fixture: {
          id: 'canonical-fixture', competitionId: 'canonical-competition',
          homeTeamId: 'canonical-home', awayTeamId: 'canonical-away'
        }
      }]
    })
    expect(llamadas).toContainEqual({
      tabla: 'sports_provider_mappings', metodo: 'gte', args: ['sports_fixtures.scheduled_at', '2026-10-01T05:00:00.000Z']
    })
    expect(llamadas).toContainEqual({
      tabla: 'sports_provider_mappings', metodo: 'lt', args: ['sports_fixtures.scheduled_at', '2026-10-02T05:00:00.000Z']
    })
    expect(llamadas.some(llamada => llamada.metodo === 'range' && llamada.args[0] === 500)).toBe(false)
  })

  it('omite lecturas de equipos y competencias cuando ese día no tiene fixtures mapeados', async () => {
    const { cliente } = crearClienteMock({ sports_provider_mappings: [{ data: [], error: null }] })
    const repositorio = crearRepositorioSnapshotsSupabase(cliente)

    await expect(repositorio.cargarMappings('api-football', '2026-10-01'))
      .resolves.toEqual({ competencias: [], equipos: [], fixtures: [] })
    expect(cliente.from).toHaveBeenCalledOnce()
  })

  it('solo reutiliza el calendario de Goal cuando se confirmaron las dos fechas UTC', async () => {
    const incompleto = crearClienteMock({
      football_provider_fixture_lists: [{
        data: [{ fixture_date: '2026-10-01', loaded_at: '2026-10-01T06:00:00.000Z' }], error: null
      }]
    })
    const repositorioIncompleto = crearRepositorioSnapshotsSupabase(incompleto.cliente)
    await expect(repositorioIncompleto.cargarFixturesDiarios('goal-api', '2026-10-01')).resolves.toBeNull()
    expect(incompleto.cliente.from).toHaveBeenCalledOnce()

    const completo = crearClienteMock({
      football_provider_fixture_lists: [{
        data: [
          { fixture_date: '2026-10-01', loaded_at: '2026-10-01T06:00:00.000Z' },
          { fixture_date: '2026-10-02', loaded_at: '2026-10-01T06:00:00.000Z' }
        ], error: null
      }],
      football_fixtures_today: [{ data: [], error: null }]
    })
    const repositorioCompleto = crearRepositorioSnapshotsSupabase(completo.cliente)
    await expect(repositorioCompleto.cargarFixturesDiarios('goal-api', '2026-10-01')).resolves.toEqual([])
    expect(completo.llamadas).toContainEqual({
      tabla: 'football_provider_fixture_lists', metodo: 'in', args: ['fixture_date', ['2026-10-01', '2026-10-02']]
    })
  })

  it('confirma que Goal completó ambas fechas antes de diferir una carga nocturna', async () => {
    const { cliente, llamadas } = crearClienteMock({
      football_provider_fixture_lists: [{ data: [
        { fixture_date: '2026-10-01', loaded_at: '2026-10-01T06:00:00.000Z' },
        { fixture_date: '2026-10-02', loaded_at: '2026-10-01T06:00:00.000Z' }
      ], error: null }]
    })
    const repositorio = crearRepositorioSnapshotsSupabase(cliente)

    await expect(repositorio.calendarioDiarioCompleto('goal-api', '2026-10-01')).resolves.toBe(true)
    expect(llamadas).toContainEqual({
      tabla: 'football_provider_fixture_lists', metodo: 'in', args: ['fixture_date', ['2026-10-01', '2026-10-02']]
    })
  })

  it('calcula el siguiente sondeo sobre primario y fallback para no ignorar snapshots vencidos', async () => {
    const instante = new Date('2026-10-03T02:00:00.000Z')
    const { cliente, llamadas } = crearClienteMock({
      football_fixtures_today: [{ data: [
        { provider: 'api-football', status: 'scheduled', kickoff_at: '2026-10-02T22:00:00.000Z', details_fetched_at: null },
        { provider: 'goal-api', status: 'finished', kickoff_at: '2026-10-02T20:00:00.000Z', details_fetched_at: '2026-10-02T22:40:00.000Z' }
      ], error: null }]
    })
    const repositorio = crearRepositorioSnapshotsSupabase(cliente)

    await expect(repositorio.calcularEsperaSiguienteEjecucion(['api-football', 'goal-api'], '2026-10-02', instante))
      .resolves.toEqual({ esperaMs: 60_000, motivo: 'fixture_debe_actualizarse' })
    expect(llamadas).toContainEqual({ tabla: 'football_fixtures_today', metodo: 'in', args: ['provider', ['api-football', 'goal-api']] })
    expect(llamadas).toContainEqual({ tabla: 'football_fixtures_today', metodo: 'eq', args: ['business_date', '2026-10-02'] })
  })

  it('lee la última actualización por proveedor para rotar detalles con justicia', async () => {
    const { cliente, llamadas } = crearClienteMock({
      football_fixtures_today: [{ data: [
        { provider_fixture_id: 'fixture-1', details_fetched_at: null },
        { provider_fixture_id: 'fixture-2', details_fetched_at: '2026-10-01T19:30:00.000Z' }
      ], error: null }]
    })
    const repositorio = crearRepositorioSnapshotsSupabase(cliente)

    await expect(repositorio.cargarTiemposDetalle('goal-api', '2026-10-01', ['fixture-1', 'fixture-2']))
      .resolves.toEqual(new Map([
        ['fixture-1', null], ['fixture-2', '2026-10-01T19:30:00.000Z']
      ]))
    expect(llamadas).toContainEqual({
      tabla: 'football_fixtures_today', metodo: 'select', args: ['provider_fixture_id,details_fetched_at']
    })
    expect(llamadas).toContainEqual({
      tabla: 'football_fixtures_today', metodo: 'in', args: ['provider_fixture_id', ['fixture-1', 'fixture-2']]
    })
  })

  it('carga mappings de clasificación sólo para la allowlist y todos los equipos canónicos del proveedor', async () => {
    const { cliente, llamadas } = crearClienteMock({
      sports_provider_mappings: [
        { data: [{ provider: 'goal-api', entity_type: 'competition', external_id: 'liga-permitida', competition_id: 'liga-canonica', team_id: null, fixture_id: null }], error: null },
        { data: [{ provider: 'goal-api', entity_type: 'team', external_id: 'equipo-ext', competition_id: null, team_id: 'equipo-canonico', fixture_id: null }], error: null }
      ]
    })
    const repositorio = crearRepositorioSnapshotsSupabase(cliente)
    await expect(repositorio.cargarMappingsClasificacion('goal-api', ['liga-permitida']))
      .resolves.toEqual({ competencias: [{ externalId: 'liga-permitida', competitionId: 'liga-canonica' }], equipos: [{ externalId: 'equipo-ext', teamId: 'equipo-canonico' }] })
    expect(llamadas).toContainEqual({ tabla: 'sports_provider_mappings', metodo: 'in', args: ['external_id', ['liga-permitida']] })
    expect(llamadas.filter(llamada => llamada.metodo === 'in')).toHaveLength(1)
  })

  it('hace upsert idempotente por proveedor e ID externo y registra solo campos de auditoría', async () => {
    const { cliente, llamadas } = crearClienteMock({
      football_fixtures_today: [{ data: null, error: null }],
      football_standings_today: [{ data: null, error: null }],
      football_sync_runs: [{ data: null, error: null }]
    })
    const repositorio = crearRepositorioSnapshotsSupabase(cliente)
    const snapshot = {
      provider: 'goal-api', provider_fixture_id: 'external-fixture', is_public: true,
      publication_rights_confirmed: true, publication_rights_source: 'revision-humana',
      publication_rights_reference: 'evidencia-validada', publication_rights_checked_at: '2026-10-01T18:00:00.000Z'
    } as never
    const clasificacion = {
      provider: 'goal-api', league_id: 'external-league', season: '2026', is_public: true,
      publication_rights_confirmed: true, publication_rights_source: 'revision-humana',
      publication_rights_reference: 'evidencia-validada', publication_rights_checked_at: '2026-10-01T18:00:00.000Z'
    } as never
    const corrida: RegistroCorridaFixturesFutbol = {
      provider: 'goal-api', operation: 'fixtures_diarios',
      started_at: '2026-10-01T18:00:00.000Z', finished_at: '2026-10-01T18:00:01.000Z',
      fixture_count: 1, requests_used: 1, quota_limit: 1000, quota_remaining: 999,
      success: true, error_code: null, duration_ms: 1000, reason: null
    }

    await repositorio.upsertSnapshots([snapshot])
    await repositorio.upsertDetalles([{
      provider: 'goal-api', provider_fixture_id: 'external-fixture',
      events: [], lineups: [], statistics: [], provider_fetched_at: '2026-10-01T18:00:00.000Z'
    }])
    await repositorio.upsertSnapshotsClasificacion([clasificacion])
    await repositorio.registrarCorrida(corrida)

    expect(llamadas).toContainEqual({
      tabla: 'football_fixtures_today', metodo: 'upsert',
      args: [[{ provider: 'goal-api', provider_fixture_id: 'external-fixture' }], { onConflict: 'provider,provider_fixture_id' }]
    })
    expect(llamadas).toContainEqual({
      tabla: 'football_fixtures_today', metodo: 'update',
      args: [{ events: [], lineups: [], statistics: [], provider_fetched_at: '2026-10-01T18:00:00.000Z', details_fetched_at: '2026-10-01T18:00:00.000Z' }]
    })
    expect(llamadas).toContainEqual({ tabla: 'football_fixtures_today', metodo: 'eq', args: ['provider', 'goal-api'] })
    expect(llamadas).toContainEqual({ tabla: 'football_fixtures_today', metodo: 'eq', args: ['provider_fixture_id', 'external-fixture'] })
    expect(llamadas).toContainEqual({
      tabla: 'football_standings_today', metodo: 'upsert',
      args: [[{ provider: 'goal-api', league_id: 'external-league', season: '2026' }],
        { onConflict: 'business_date,provider,competition_id,league_id,season' }]
    })
    expect(llamadas).toContainEqual({ tabla: 'football_sync_runs', metodo: 'insert', args: [corrida] })
  })

  it('reclama ventanas adaptativas para fixtures y conserva la ventana de standings', async () => {
    const { cliente } = crearClienteMock({})
    const repositorio = crearRepositorioSnapshotsSupabase(cliente)
    await expect(repositorio.reclamarVentanaWorker('goal-api', 'standings')).resolves.toBe(true)
    expect(cliente.rpc).toHaveBeenCalledWith('claim_football_sync_lease', {
      p_provider: 'goal-api', p_operation: 'standings', p_window_seconds: 900
    })
    await repositorio.reclamarVentanaWorker('goal-api', 'fixtures_diarios')
    expect(cliente.rpc).toHaveBeenLastCalledWith('claim_football_sync_lease', {
      p_provider: 'goal-api', p_operation: 'fixtures_diarios', p_window_seconds: 300
    })
    await repositorio.reclamarVentanaWorker('api-football', 'fixtures_diarios')
    expect(cliente.rpc).toHaveBeenLastCalledWith('claim_football_sync_lease', {
      p_provider: 'api-football', p_operation: 'fixtures_diarios', p_window_seconds: 300
    })
  })

  it('no filtra detalles crudos de Supabase al reportar fallas de mappings', async () => {
    const { cliente } = crearClienteMock({
      sports_provider_mappings: [{ data: null, error: { message: 'secret SQL details' } }]
    })
    const repositorio = crearRepositorioSnapshotsSupabase(cliente)

    let mensaje = ''
    try {
      await repositorio.cargarMappings('goal-api', '2026-10-01')
    } catch (error) {
      mensaje = error instanceof Error ? error.message : String(error)
    }
    expect(mensaje).toBe('No fue posible cargar los mappings de fixtures.')
    expect(mensaje).not.toContain('secret SQL details')
  })
})
