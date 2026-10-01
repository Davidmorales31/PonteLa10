import type { SupabaseClient } from '@supabase/supabase-js'
import type { IdentificadorProveedorFutbol } from '~/types/futbolProveedor'
import type { FixtureFutbolPublico } from '~/types/futbolPublico'
import { proyectarFixtureFutbolPublico } from '~/utils/proyeccionFutbolPublico'

type Fila = Record<string, unknown>
type FixtureCanonico = {
  id: string
  competition_id: string
  home_team_id: string
  away_team_id: string
  is_public: boolean
}
type Mapping = {
  provider: string
  entity_type: string
  external_id: string
  competition_id: string | null
  team_id: string | null
  fixture_id: string | null
}

const columnasSnapshot = [
  'fixture_id', 'provider', 'provider_fixture_id', 'business_date', 'kickoff_at',
  'league_id', 'league_name', 'league_country', 'season', 'round', 'phase', 'group_name',
  'home_team_provider_id', 'home_team_name', 'away_team_provider_id', 'away_team_name',
  'status', 'status_external', 'elapsed', 'goals_home', 'goals_away', 'venue_name',
  'venue_city', 'events', 'lineups', 'statistics', 'provider_fetched_at', 'is_public',
  'publication_rights_confirmed'
].join(',')

// service_role omite RLS; esta lectura repite explícitamente sus puertas de publicación.
export async function leerSnapshotsFutbolPublicos(
  cliente: SupabaseClient,
  filtros: { fechaNegocio?: string; fixtureId?: string; limite?: number } = {}
): Promise<FixtureFutbolPublico[]> {
  if (filtros.fechaNegocio && !/^\d{4}-\d{2}-\d{2}$/.test(filtros.fechaNegocio)) return []
  if (filtros.fixtureId && !/^[0-9a-f-]{36}$/i.test(filtros.fixtureId)) return []

  let consulta = cliente
    .from('football_fixtures_today')
    .select(columnasSnapshot)
    .eq('is_public', true)
    .eq('publication_rights_confirmed', true)
    .order('kickoff_at', { ascending: true })
    .limit(Math.min(Math.max(filtros.limite ?? 32, 1), 100))

  if (filtros.fechaNegocio) consulta = consulta.eq('business_date', filtros.fechaNegocio)
  if (filtros.fixtureId) consulta = consulta.eq('fixture_id', filtros.fixtureId)

  const { data, error } = await consulta
  if (error || !Array.isArray(data) || !data.length) return []
  const datosSnapshot = data as unknown as Fila[]
  const filas = datosSnapshot.filter(fila => Boolean(
    fila && typeof fila === 'object'
      && fila.is_public === true
      && fila.publication_rights_confirmed === true
  ))
  if (!filas.length || !(await validarIdentidadesPublicas(cliente, filas))) return []

  const salida: FixtureFutbolPublico[] = []
  for (const fila of filas) {
    try {
      salida.push(proyectarFixtureFutbolPublico(
        fila as unknown as Parameters<typeof proyectarFixtureFutbolPublico>[0]
      ))
    } catch {
      // Un registro inválido se omite; nunca se devuelve su payload crudo.
    }
  }
  return salida
}

async function validarIdentidadesPublicas(cliente: SupabaseClient, filas: Fila[]): Promise<boolean> {
  const idsFixture = valoresUnicos(filas, 'fixture_id')
  const proveedores = [...new Set(filas.map(fila => fila.provider).filter(esProveedor))]
  const idsExternos = [...new Set(filas.flatMap(fila => [
    fila.provider_fixture_id, fila.league_id,
    fila.home_team_provider_id, fila.away_team_provider_id
  ]).filter((valor): valor is string => typeof valor === 'string' && valor.length > 0))]
  if (!idsFixture.length || !proveedores.length || !idsExternos.length) return false

  const { data: fixtures, error: errorFixtures } = await cliente
    .from('sports_fixtures')
    .select('id,competition_id,home_team_id,away_team_id,is_public')
    .in('id', idsFixture)
    .eq('is_public', true)
  if (errorFixtures || !fixtures) return false

  const filasCanonicas = fixtures as unknown as FixtureCanonico[]
  const competitionIds = [...new Set(filasCanonicas.map(fixture => fixture.competition_id))]
  const teamIds = [...new Set(filasCanonicas.flatMap(fixture => [fixture.home_team_id, fixture.away_team_id]))]
  if (!competitionIds.length || !teamIds.length) return false

  const [competitions, teams, mappings] = await Promise.all([
    cliente.from('sports_competitions').select('id,is_public').in('id', competitionIds).eq('is_public', true),
    cliente.from('sports_teams').select('id,is_public').in('id', teamIds).eq('is_public', true),
    cliente.from('sports_provider_mappings')
      .select('provider,entity_type,external_id,competition_id,team_id,fixture_id')
      .in('provider', proveedores)
      .in('entity_type', ['competition', 'team', 'fixture'])
      .in('external_id', idsExternos)
      .limit(1000)
  ])
  if (competitions.error || teams.error || mappings.error
    || !competitions.data || !teams.data || !mappings.data) return false

  const idsCompetenciaPublica = new Set((competitions.data as Fila[]).map(fila => fila.id))
  const idsEquipoPublico = new Set((teams.data as Fila[]).map(fila => fila.id))
  const fixturesPorId = new Map(filasCanonicas.map(fixture => [fixture.id, fixture]))
  const mappingsPorClave = new Set<string>()
  for (const mapping of mappings.data as unknown as Mapping[]) {
    const destino = mapping.entity_type === 'competition' ? mapping.competition_id
      : mapping.entity_type === 'team' ? mapping.team_id
        : mapping.entity_type === 'fixture' ? mapping.fixture_id : null
    if (destino) mappingsPorClave.add(`${mapping.provider}\u0000${mapping.entity_type}\u0000${mapping.external_id}\u0000${destino}`)
  }

  return filas.every((fila) => {
    const fixtureId = texto(fila.fixture_id)
    const proveedor = esProveedor(fila.provider) ? fila.provider : null
    const canonico = fixtureId ? fixturesPorId.get(fixtureId) : undefined
    if (!fixtureId || !proveedor || !canonico || !canonico.is_public
      || !idsCompetenciaPublica.has(canonico.competition_id)
      || !idsEquipoPublico.has(canonico.home_team_id)
      || !idsEquipoPublico.has(canonico.away_team_id)) return false

    return tieneMapping(mappingsPorClave, proveedor, 'fixture', fila.provider_fixture_id, fixtureId)
      && tieneMapping(mappingsPorClave, proveedor, 'competition', fila.league_id, canonico.competition_id)
      && tieneMapping(mappingsPorClave, proveedor, 'team', fila.home_team_provider_id, canonico.home_team_id)
      && tieneMapping(mappingsPorClave, proveedor, 'team', fila.away_team_provider_id, canonico.away_team_id)
  })
}

function tieneMapping(mappings: Set<string>, proveedor: string, tipo: string, externo: unknown, canonico: string): boolean {
  const externalId = texto(externo)
  return Boolean(externalId && mappings.has(`${proveedor}\u0000${tipo}\u0000${externalId}\u0000${canonico}`))
}

function valoresUnicos(filas: Fila[], campo: string): string[] {
  return [...new Set(filas.map(fila => texto(fila[campo])).filter((valor): valor is string => Boolean(valor)))]
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null
}

function esProveedor(valor: unknown): valor is IdentificadorProveedorFutbol {
  return valor === 'api-football' || valor === 'goal-api'
}
