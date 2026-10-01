import type { SupabaseClient } from '@supabase/supabase-js'
import type { IdentificadorProveedorFutbol } from '~/types/futbolProveedor'
import type {
  MappingCompetenciaFutbol,
  MappingEquipoFutbol,
  MappingFixtureFutbol,
  MappingsProveedorFutbol,
  SnapshotClasificacionFutbolPrivado,
  DetalleFixtureFutbolPrivado
} from './proyectarSnapshots'
import type { RepositorioWorkerFixturesFutbol } from './sincronizadorFixturesDiarios'

const filasPorPagina = 500
const milisegundosDia = 24 * 60 * 60 * 1000
const diferenciaBogotaUtc = 5 * 60 * 60 * 1000

export interface RepositorioSnapshotsSupabaseFutbol extends RepositorioWorkerFixturesFutbol {
  cargarMappingsClasificacion(
    provider: IdentificadorProveedorFutbol,
    competenciasExternas: string[]
  ): Promise<Pick<MappingsProveedorFutbol, 'competencias' | 'equipos'>>
  reclamarVentanaWorker(provider: IdentificadorProveedorFutbol, operation: 'standings' | 'fixtures_diarios'): Promise<boolean>
  upsertSnapshotsClasificacion(snapshots: SnapshotClasificacionFutbolPrivado[]): Promise<void>
}

interface FilaMappingSupabase {
  provider: string
  entity_type: string
  external_id: string
  competition_id: string | null
  team_id: string | null
  fixture_id: string | null
  sports_fixtures?: FilaFixtureCanonico | FilaFixtureCanonico[] | null
}

interface FilaFixtureCanonico {
  id: string
  competition_id: string
  home_team_id: string
  away_team_id: string
  scheduled_at: string
}

/**
 * Adaptador privado del worker. Recibe el cliente desde Nitro; no crea clientes,
 * no lee credenciales y nunca publica automáticamente los snapshots.
 */
export function crearRepositorioSnapshotsSupabase(
  cliente: SupabaseClient
): RepositorioSnapshotsSupabaseFutbol {
  return {
    cargarMappings: async (provider, fechaNegocio) => cargarMappingsDelDia(cliente, provider, fechaNegocio),
    cargarMappingsClasificacion: async (provider, competenciasExternas) => {
      const ids = [...new Set(competenciasExternas.filter(id => typeof id === 'string' && id.trim()))]
      if (!ids.length) return { competencias: [], equipos: [] }
      const [filasCompetencia, filasEquipo] = await Promise.all([
        cargarMappingsPermitidos(cliente, provider, 'competition', ids),
        cargarMappingsCanonicos(cliente, provider, 'team', 'team_id', [])
      ])
      return {
        competencias: mapearCompetencias(filasCompetencia, provider),
        equipos: mapearEquipos(filasEquipo, provider)
      }
    },
    reclamarVentanaWorker: async (provider, operation) => {
      const { data, error } = await cliente.rpc('claim_football_sync_lease', {
        p_provider: provider,
        p_operation: operation,
        p_window_seconds: 900
      })
      if (error || typeof data !== 'boolean') {
        throw new Error('No fue posible reservar la ventana de clasificación.')
      }
      return data
    },
    upsertSnapshots: async (snapshots) => {
      if (!snapshots.length) return
      // Los arrays de detalle viajan por un canal de escritura independiente:
      // un ciclo limitado de consultas no debe vaciar detalles guardados antes.
      const filasBase = snapshots.map((snapshot) => {
        const filaBase: Record<string, unknown> = { ...snapshot }
        delete filaBase.events
        delete filaBase.lineups
        delete filaBase.statistics
        delete filaBase.player_statistics
        // La aprobación de publicación pertenece a la persona responsable y
        // no se debe revocar ni volver a otorgar durante una sincronización.
        delete filaBase.is_public
        delete filaBase.publication_rights_confirmed
        delete filaBase.publication_rights_source
        delete filaBase.publication_rights_reference
        delete filaBase.publication_rights_checked_at
        return filaBase
      })
      const { error } = await cliente
        .from('football_fixtures_today')
        .upsert(filasBase, { onConflict: 'provider,provider_fixture_id' })
      if (error) throw new Error('No fue posible guardar los snapshots de fútbol.')
    },
    upsertDetalles: async (detalles: DetalleFixtureFutbolPrivado[]) => {
      for (const detalle of detalles) {
        const { error } = await cliente
          .from('football_fixtures_today')
          .update({
            events: detalle.events,
            lineups: detalle.lineups,
            statistics: detalle.statistics,
            provider_fetched_at: detalle.provider_fetched_at
          })
          .eq('provider', detalle.provider)
          .eq('provider_fixture_id', detalle.provider_fixture_id)
        if (error) throw new Error('No fue posible guardar los detalles del snapshot de fútbol.')
      }
    },
    upsertSnapshotsClasificacion: async (snapshots) => {
      if (!snapshots.length) return
      const filasPrivadas = snapshots.map((snapshot) => {
        const fila = { ...snapshot } as Record<string, unknown>
        delete fila.is_public
        delete fila.publication_rights_confirmed
        delete fila.publication_rights_source
        delete fila.publication_rights_reference
        delete fila.publication_rights_checked_at
        return fila
      })
      const { error } = await cliente
        .from('football_standings_today')
        .upsert(filasPrivadas, { onConflict: 'business_date,provider,competition_id,league_id,season' })
      if (error) throw new Error('No fue posible guardar los snapshots de clasificación.')
    },
    registrarCorrida: async (corrida) => {
      const { error } = await cliente.from('football_sync_runs').insert(corrida)
      if (error) throw new Error('No fue posible registrar la corrida del worker de fútbol.')
    }
  }
}

async function cargarMappingsDelDia(
  cliente: SupabaseClient,
  provider: IdentificadorProveedorFutbol,
  fechaNegocio: string
): Promise<MappingsProveedorFutbol> {
  const { inicioUtc, finUtc } = rangoUtcBogota(fechaNegocio)
  const filasFixture = await cargarPaginas<FilaMappingSupabase>(async (desde, hasta) => {
    const { data, error } = await cliente
      .from('sports_provider_mappings')
      .select('provider,entity_type,external_id,competition_id,team_id,fixture_id,sports_fixtures!inner(id,competition_id,home_team_id,away_team_id,scheduled_at)')
      .eq('provider', provider)
      .eq('entity_type', 'fixture')
      .gte('sports_fixtures.scheduled_at', inicioUtc)
      .lt('sports_fixtures.scheduled_at', finUtc)
      .range(desde, hasta)

    if (error || !data) throw new Error('No fue posible cargar los mappings de fixtures.')
    return data as unknown as FilaMappingSupabase[]
  })

  const relaciones = filasFixture.map(fila => ({
    fila,
    fixture: obtenerRelacionFixture(fila.sports_fixtures)
  }))
  if (relaciones.some(({ fila, fixture }) => fila.provider !== provider
    || fila.entity_type !== 'fixture'
    || !fila.external_id || !fila.fixture_id
    || !fixture || fixture.id !== fila.fixture_id
    || !fixture.competition_id || !fixture.home_team_id || !fixture.away_team_id)) {
    throw new Error('Los mappings de fixtures tienen referencias canónicas inconsistentes.')
  }

  const fixtureIds = new Set(relaciones.map(({ fixture }) => fixture!.id))
  const competenciaIds = [...new Set(relaciones.map(({ fixture }) => fixture!.competition_id))]
  const equipoIds = [...new Set(relaciones.flatMap(({ fixture }) => [
    fixture!.home_team_id,
    fixture!.away_team_id
  ]))]

  if (!fixtureIds.size) return { competencias: [], equipos: [], fixtures: [] }

  const [filasCompetencia, filasEquipo] = await Promise.all([
    cargarMappingsCanonicos(cliente, provider, 'competition', 'competition_id', competenciaIds),
    cargarMappingsCanonicos(cliente, provider, 'team', 'team_id', equipoIds)
  ])

  return {
    competencias: mapearCompetencias(filasCompetencia, provider),
    equipos: mapearEquipos(filasEquipo, provider),
    fixtures: relaciones.map(({ fila, fixture }): MappingFixtureFutbol => ({
      externalId: fila.external_id,
      fixtureId: fila.fixture_id!,
      fixture: {
        id: fixture!.id,
        competitionId: fixture!.competition_id,
        homeTeamId: fixture!.home_team_id,
        awayTeamId: fixture!.away_team_id
      }
    }))
  }
}

async function cargarMappingsCanonicos(
  cliente: SupabaseClient,
  provider: IdentificadorProveedorFutbol,
  entityType: 'competition' | 'team',
  columnaDestino: 'competition_id' | 'team_id',
  idsCanonicos: string[]
): Promise<FilaMappingSupabase[]> {
  return cargarPaginas(async (desde, hasta) => {
    let consulta = cliente
      .from('sports_provider_mappings')
      .select('provider,entity_type,external_id,competition_id,team_id,fixture_id')
      .eq('provider', provider)
      .eq('entity_type', entityType)

    if (idsCanonicos.length) {
      consulta = columnaDestino === 'competition_id'
        ? consulta.in('competition_id', idsCanonicos)
        : consulta.in('team_id', idsCanonicos)
    }

    const { data, error } = await consulta.range(desde, hasta)
    if (error || !data) throw new Error('No fue posible cargar los mappings deportivos.')
    return data as unknown as FilaMappingSupabase[]
  })
}

async function cargarMappingsPermitidos(
  cliente: SupabaseClient,
  provider: IdentificadorProveedorFutbol,
  entityType: 'competition',
  idsExternos: string[]
): Promise<FilaMappingSupabase[]> {
  return cargarPaginas(async (desde, hasta) => {
    const { data, error } = await cliente
      .from('sports_provider_mappings')
      .select('provider,entity_type,external_id,competition_id,team_id,fixture_id')
      .eq('provider', provider)
      .eq('entity_type', entityType)
      .in('external_id', idsExternos)
      .range(desde, hasta)
    if (error || !data) throw new Error('No fue posible cargar los mappings de clasificación.')
    return data as unknown as FilaMappingSupabase[]
  })
}

async function cargarPaginas<T>(
  cargarPagina: (desde: number, hasta: number) => Promise<T[]>
): Promise<T[]> {
  const resultado: T[] = []
  for (let desde = 0; ; desde += filasPorPagina) {
    const pagina = await cargarPagina(desde, desde + filasPorPagina - 1)
    resultado.push(...pagina)
    if (pagina.length < filasPorPagina) return resultado
  }
}

function mapearCompetencias(
  filas: FilaMappingSupabase[],
  provider: IdentificadorProveedorFutbol
): MappingCompetenciaFutbol[] {
  return filas.flatMap(fila => fila.provider === provider
    && fila.entity_type === 'competition'
    && fila.external_id && fila.competition_id
    ? [{ externalId: fila.external_id, competitionId: fila.competition_id }]
    : [])
}

function mapearEquipos(
  filas: FilaMappingSupabase[],
  provider: IdentificadorProveedorFutbol
): MappingEquipoFutbol[] {
  return filas.flatMap(fila => fila.provider === provider
    && fila.entity_type === 'team'
    && fila.external_id && fila.team_id
    ? [{ externalId: fila.external_id, teamId: fila.team_id }]
    : [])
}

function obtenerRelacionFixture(
  relacion: FilaFixtureCanonico | FilaFixtureCanonico[] | null | undefined
): FilaFixtureCanonico | null {
  if (Array.isArray(relacion)) return relacion.length === 1 ? relacion[0]! : null
  return relacion ?? null
}

/** Convierte el día civil de Bogotá (UTC-5, sin horario estacional) al rango UTC. */
function rangoUtcBogota(fechaNegocio: string): { inicioUtc: string; finUtc: string } {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaNegocio)
  if (!coincidencia) throw new Error('La fecha de negocio debe tener formato YYYY-MM-DD.')
  const [, anio, mes, dia] = coincidencia
  const medianocheUtc = Date.UTC(Number(anio), Number(mes) - 1, Number(dia))
  const fechaValidada = new Date(medianocheUtc)
  if (fechaValidada.toISOString().slice(0, 10) !== fechaNegocio) {
    throw new Error('La fecha de negocio debe tener formato YYYY-MM-DD.')
  }
  const inicio = medianocheUtc + diferenciaBogotaUtc
  return {
    inicioUtc: new Date(inicio).toISOString(),
    finUtc: new Date(inicio + milisegundosDia).toISOString()
  }
}
