import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EstadoFixtureFutbol, IdentificadorProveedorFutbol, PartidoFutbolProveedor } from '~/types/futbolProveedor'
import type {
  MappingCompetenciaFutbol,
  MappingEquipoFutbol,
  MappingFixtureFutbol,
  MappingsProveedorFutbol,
  SnapshotClasificacionFutbolPrivado,
  DetalleFixtureFutbolPrivado
} from './proyectarSnapshots'
import type { RepositorioWorkerFixturesFutbol } from './sincronizadorFixturesDiarios'
import {
  calcularSiguienteEjecucionWorkerFutbol,
  type SnapshotParaSchedulerFutbol
} from '~/utils/politicaWorkerFutbol'

const filasPorPagina = 500
const milisegundosDia = 24 * 60 * 60 * 1000
const diferenciaBogotaUtc = 5 * 60 * 60 * 1000

export interface RepositorioSnapshotsSupabaseFutbol extends RepositorioWorkerFixturesFutbol {
  cargarFixturesDiarios(provider: IdentificadorProveedorFutbol, fechaNegocio: string): Promise<PartidoFutbolProveedor[] | null>
  calendarioDiarioCompleto(provider: IdentificadorProveedorFutbol, fechaNegocio: string): Promise<boolean>
  calcularEsperaSiguienteEjecucion(provider: IdentificadorProveedorFutbol, fechaNegocio: string, ahora?: Date): Promise<{ esperaMs: number; motivo: string }>
  asegurarMappingsIniciales(
    provider: IdentificadorProveedorFutbol,
    partidos: PartidoFutbolProveedor[]
  ): Promise<void>
  marcarFixturesDiariosCargados(provider: IdentificadorProveedorFutbol, fechaNegocio: string, fechasListado: string[]): Promise<void>
  limpiarDatosFutbolCaducados(): Promise<void>
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

interface FilaFixtureDiario {
  provider_fixture_id: string
  kickoff_at: string
  league_id: string
  league_name: string
  league_country: string | null
  season: string
  status: EstadoFixtureFutbol
  status_external: string | null
  elapsed: number | null
  goals_home: number | null
  goals_away: number | null
  home_team_provider_id: string
  home_team_name: string
  away_team_provider_id: string
  away_team_name: string
  details_fetched_at: string | null
}

/**
 * Adaptador privado del worker. Recibe el cliente desde Nitro; no crea clientes,
 * no lee credenciales y nunca publica automáticamente los snapshots.
 */
export function crearRepositorioSnapshotsSupabase(
  cliente: SupabaseClient
): RepositorioSnapshotsSupabaseFutbol {
  return {
    cargarFixturesDiarios: async (provider, fechaNegocio) => cargarFixturesDiarios(cliente, provider, fechaNegocio),
    calendarioDiarioCompleto: async (provider, fechaNegocio) => calendarioDiarioCompleto(cliente, provider, fechaNegocio),
    calcularEsperaSiguienteEjecucion: async (provider, fechaNegocio, ahora = new Date()) => {
      const { data, error } = await cliente
        .from('football_fixtures_today')
        .select('provider,status,kickoff_at,details_fetched_at')
        .eq('provider', provider)
        .eq('business_date', fechaNegocio)
        .order('kickoff_at', { ascending: true })
      if (error || !data) throw new Error('No fue posible consultar el calendario para el worker.')
      const snapshots: SnapshotParaSchedulerFutbol[] = (data as Array<{
        provider: IdentificadorProveedorFutbol
        status: EstadoFixtureFutbol
        kickoff_at: string
        details_fetched_at: string | null
      }>).map(fila => ({
        provider: fila.provider,
        estado: fila.status,
        inicioUtc: fila.kickoff_at,
        detallesActualizadosEn: fila.details_fetched_at
      }))
      return calcularSiguienteEjecucionWorkerFutbol(snapshots, ahora.getTime())
    },
    asegurarMappingsIniciales: async (provider, partidos) => asegurarMappingsIniciales(cliente, provider, partidos),
    marcarFixturesDiariosCargados: async (provider, fechaNegocio, fechasListado) => {
      const { error } = await cliente.rpc('mark_football_provider_fixture_list_loaded', {
        p_provider: provider,
        p_business_date: fechaNegocio,
        p_fixture_list_dates: fechasListado
      })
      if (error) throw new Error('No fue posible marcar la carga diaria de partidos.')
    },
    limpiarDatosFutbolCaducados: async () => {
      const { error } = await cliente.rpc('purge_old_football_daily_data')
      if (error) throw new Error('No fue posible limpiar los datos diarios de fútbol caducados.')
    },
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
        p_window_seconds: operation === 'fixtures_diarios'
          ? provider === 'goal-api' ? 60 : 180
          : 900
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
            provider_fetched_at: detalle.provider_fetched_at,
            details_fetched_at: detalle.provider_fetched_at
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

async function cargarFixturesDiarios(
  cliente: SupabaseClient,
  provider: IdentificadorProveedorFutbol,
  fechaNegocio: string
): Promise<PartidoFutbolProveedor[] | null> {
  const fechasEsperadas = provider === 'goal-api'
    ? [fechaNegocio, sumarDias(fechaNegocio, 1)]
    : [fechaNegocio]
  const { data: listas, error: errorListas } = await cliente
    .from('football_provider_fixture_lists')
    .select('fixture_date,loaded_at')
    .eq('provider', provider)
    .eq('business_date', fechaNegocio)
    .in('fixture_date', fechasEsperadas)
  if (errorListas || !listas) throw new Error('No fue posible leer el estado diario de fútbol.')
  const fechasCargadas = new Set(listas
    .filter((fila: { fixture_date: string; loaded_at: string | null }) => fila.loaded_at)
    .map((fila: { fixture_date: string }) => fila.fixture_date))
  if (fechasEsperadas.some(fecha => !fechasCargadas.has(fecha))) return null

  const { data, error } = await cliente
    .from('football_fixtures_today')
    .select('provider_fixture_id,kickoff_at,league_id,league_name,league_country,season,status,status_external,elapsed,goals_home,goals_away,home_team_provider_id,home_team_name,away_team_provider_id,away_team_name,details_fetched_at')
    .eq('provider', provider)
    .eq('business_date', fechaNegocio)
    .order('kickoff_at', { ascending: true })
  if (error || !data) throw new Error('No fue posible leer los partidos privados de hoy.')

  const ahora = Date.now()
  return (data as FilaFixtureDiario[])
    .filter(fila => requiereActualizarDetalle(fila, ahora, provider))
    .map(fila => ({
      idProveedor: fila.provider_fixture_id,
      competencia: {
        idProveedor: fila.league_id,
        nombre: fila.league_name,
        ...(fila.league_country ? { pais: fila.league_country } : {}),
        temporada: fila.season
      },
      inicioUtc: fila.kickoff_at,
      estado: fila.status,
      ...(fila.status_external ? { estadoProveedor: fila.status_external } : {}),
      ...(fila.elapsed !== null ? { minutoTranscurrido: fila.elapsed } : {}),
      local: { idProveedor: fila.home_team_provider_id, nombre: fila.home_team_name },
      visitante: { idProveedor: fila.away_team_provider_id, nombre: fila.away_team_name },
      golesLocal: fila.goals_home,
      golesVisitante: fila.goals_away
  }))
}

async function calendarioDiarioCompleto(
  cliente: SupabaseClient,
  provider: IdentificadorProveedorFutbol,
  fechaNegocio: string
): Promise<boolean> {
  const fechasEsperadas = provider === 'goal-api'
    ? [fechaNegocio, sumarDias(fechaNegocio, 1)]
    : [fechaNegocio]
  const { data, error } = await cliente
    .from('football_provider_fixture_lists')
    .select('fixture_date,loaded_at')
    .eq('provider', provider)
    .eq('business_date', fechaNegocio)
    .in('fixture_date', fechasEsperadas)
  if (error || !data) throw new Error('No fue posible leer el estado diario de fútbol.')
  const cargadas = new Set(data
    .filter((fila: { fixture_date: string; loaded_at: string | null }) => Boolean(fila.loaded_at))
    .map((fila: { fixture_date: string }) => fila.fixture_date))
  return fechasEsperadas.every(fecha => cargadas.has(fecha))
}

function sumarDias(fecha: string, dias: number): string {
  const inicio = Date.parse(`${fecha}T00:00:00Z`)
  if (!Number.isFinite(inicio)) throw new Error('La fecha diaria del proveedor no es válida.')
  return new Date(inicio + dias * milisegundosDia).toISOString().slice(0, 10)
}

function requiereActualizarDetalle(fila: FilaFixtureDiario, ahora: number, provider: IdentificadorProveedorFutbol): boolean {
  const ultimoDetalle = fila.details_fetched_at ? Date.parse(fila.details_fetched_at) : Number.NaN
  const transcurrido = Number.isFinite(ultimoDetalle) ? ahora - ultimoDetalle : Number.POSITIVE_INFINITY
  const inicio = Date.parse(fila.kickoff_at)
  const distanciaAlInicio = inicio - ahora

  if (fila.status === 'live' || fila.status === 'halftime') {
    const cadencia = provider === 'goal-api' ? 60_000 : 3 * 60_000
    return transcurrido >= cadencia
  }
  if (fila.status === 'finished' || fila.status === 'cancelled' || fila.status === 'abandoned') {
    return !Number.isFinite(ultimoDetalle)
  }
  if (fila.status === 'suspended' || fila.status === 'postponed') return transcurrido >= 30 * 60_000
  if (fila.status === 'scheduled' || fila.status === 'pre-match') {
    return distanciaAlInicio >= -2 * 60 * 60_000
      && distanciaAlInicio <= 90 * 60_000
      && transcurrido >= (provider === 'goal-api' ? 3 : 10) * 60_000
  }
  return false
}

async function asegurarMappingsIniciales(
  cliente: SupabaseClient,
  provider: IdentificadorProveedorFutbol,
  partidos: PartidoFutbolProveedor[]
): Promise<void> {
  if (!partidos.length) return
  const validos = partidos.filter(partido => esPartidoMapeable(partido))
  if (!validos.length) return

  const idsCompetencia = [...new Set(validos.map(partido => partido.competencia.idProveedor))]
  const idsEquipo = [...new Set(validos.flatMap(partido => [partido.local.idProveedor, partido.visitante.idProveedor]))]
  const idsFixture = [...new Set(validos.map(partido => partido.idProveedor))]
  const [mappingCompetencia, mappingEquipo, mappingFixture] = await Promise.all([
    cargarMappingsExternos(cliente, provider, 'competition', idsCompetencia),
    cargarMappingsExternos(cliente, provider, 'team', idsEquipo),
    cargarMappingsExternos(cliente, provider, 'fixture', idsFixture)
  ])
  const competencias = new Map(mappingCompetencia.flatMap(fila => fila.competition_id
    ? [[fila.external_id, fila.competition_id] as const] : []))
  const equipos = new Map(mappingEquipo.flatMap(fila => fila.team_id
    ? [[fila.external_id, fila.team_id] as const] : []))
  const fixturesExistentes = new Set(mappingFixture.flatMap(fila => fila.fixture_id ? [fila.external_id] : []))

  const nuevasCompetencias = [...new Map(validos
    .filter(partido => !competencias.has(partido.competencia.idProveedor))
    .map(partido => [partido.competencia.idProveedor, partido] as const)).values()]
  if (nuevasCompetencias.length) {
    const filas = [...new Map(nuevasCompetencias.map(partido => {
      const slug = slugCanonico('competition', `${partido.competencia.pais || ''}|${partido.competencia.nombre}`)
      return [slug, { sport_code: 'futbol', slug, name: limitarTexto(partido.competencia.nombre, 160) }] as const
    })).values()]
    const { data, error } = await cliente.from('sports_competitions')
      .upsert(filas, { onConflict: 'sport_code,slug' }).select('id,slug')
    if (error || !data) throw new Error('No fue posible inicializar las competencias privadas de fútbol.')
    const idPorSlug = new Map(data.map(fila => [fila.slug, fila.id]))
    for (const partido of nuevasCompetencias) {
      const id = idPorSlug.get(slugCanonico('competition', `${partido.competencia.pais || ''}|${partido.competencia.nombre}`))
      if (id) competencias.set(partido.competencia.idProveedor, id)
    }
  }

  const nuevosEquipos = [...new Map(validos
    .flatMap(partido => [
      ...(!equipos.has(partido.local.idProveedor) ? [[partido.local.idProveedor, partido.local.nombre, partido.competencia.pais || ''] as const] : []),
      ...(!equipos.has(partido.visitante.idProveedor) ? [[partido.visitante.idProveedor, partido.visitante.nombre, partido.competencia.pais || ''] as const] : [])
    ])
    .map(item => [item[0], item] as const)).values()]
  if (nuevosEquipos.length) {
    const filas = [...new Map(nuevosEquipos.map(([, nombre, pais]) => {
      const slug = slugCanonico('team', `${pais}|${nombre}`)
      return [slug, { sport_code: 'futbol', slug, name: limitarTexto(nombre, 160) }] as const
    })).values()]
    const { data, error } = await cliente.from('sports_teams')
      .upsert(filas, { onConflict: 'sport_code,slug' }).select('id,slug')
    if (error || !data) throw new Error('No fue posible inicializar los equipos privados de fútbol.')
    const idPorSlug = new Map(data.map(fila => [fila.slug, fila.id]))
    for (const [externalId, nombre, pais] of nuevosEquipos) {
      const id = idPorSlug.get(slugCanonico('team', `${pais}|${nombre}`))
      if (id) equipos.set(externalId, id)
    }
  }

  const mappingsNuevos: Record<string, unknown>[] = []
  for (const [externalId, competitionId] of competencias) {
    if (!mappingCompetencia.some(fila => fila.external_id === externalId)) {
      mappingsNuevos.push({ provider, entity_type: 'competition', external_id: externalId, competition_id: competitionId })
    }
  }
  for (const [externalId, teamId] of equipos) {
    if (!mappingEquipo.some(fila => fila.external_id === externalId)) {
      mappingsNuevos.push({ provider, entity_type: 'team', external_id: externalId, team_id: teamId })
    }
  }
  if (mappingsNuevos.length) {
    const { error } = await cliente.from('sports_provider_mappings').upsert(mappingsNuevos, {
      onConflict: 'provider,entity_type,external_id', ignoreDuplicates: true
    })
    if (error) throw new Error('No fue posible guardar los mappings privados de fútbol.')
  }

  const fixturesNuevos = validos.filter(partido => !fixturesExistentes.has(partido.idProveedor))
    .flatMap(partido => {
      const competitionId = competencias.get(partido.competencia.idProveedor)
      const homeTeamId = equipos.get(partido.local.idProveedor)
      const awayTeamId = equipos.get(partido.visitante.idProveedor)
      if (!competitionId || !homeTeamId || !awayTeamId) return []
      const minutoUtc = Math.floor(Date.parse(partido.inicioUtc) / 60_000)
      const slug = slugCanonico('fixture', `${competitionId}|${homeTeamId}|${awayTeamId}|${minutoUtc}`)
      return [{ partido, competitionId, homeTeamId, awayTeamId, slug }]
    })
  if (fixturesNuevos.length) {
    const filasFixture = [...new Map(fixturesNuevos.map(({ partido, competitionId, homeTeamId, awayTeamId, slug }) => [slug, {
      sport_code: 'futbol', slug, competition_id: competitionId,
      home_team_id: homeTeamId, away_team_id: awayTeamId, scheduled_at: partido.inicioUtc
    }] as const)).values()]
    const { data, error } = await cliente.from('sports_fixtures').upsert(filasFixture, { onConflict: 'slug' }).select('id,slug')
    if (error || !data) throw new Error('No fue posible inicializar los partidos canónicos privados de fútbol.')
    const idPorSlug = new Map(data.map(fila => [fila.slug, fila.id]))
    const mappingsFixture = fixturesNuevos.flatMap(({ partido, slug }) => {
      const fixtureId = idPorSlug.get(slug)
      return fixtureId ? [{ provider, entity_type: 'fixture', external_id: partido.idProveedor, fixture_id: fixtureId }] : []
    })
    if (mappingsFixture.length) {
      const { error: errorMapping } = await cliente.from('sports_provider_mappings').upsert(mappingsFixture, {
        onConflict: 'provider,entity_type,external_id', ignoreDuplicates: true
      })
      if (errorMapping) throw new Error('No fue posible guardar los mappings privados de partidos.')
    }
  }
}

async function cargarMappingsExternos(
  cliente: SupabaseClient,
  provider: IdentificadorProveedorFutbol,
  entityType: 'competition' | 'team' | 'fixture',
  externalIds: string[]
): Promise<FilaMappingSupabase[]> {
  if (!externalIds.length) return []
  const { data, error } = await cliente.from('sports_provider_mappings')
    .select('provider,entity_type,external_id,competition_id,team_id,fixture_id')
    .eq('provider', provider).eq('entity_type', entityType).in('external_id', externalIds)
  if (error || !data) throw new Error('No fue posible cargar los mappings iniciales de fútbol.')
  return data as unknown as FilaMappingSupabase[]
}

function esPartidoMapeable(partido: PartidoFutbolProveedor): boolean {
  const ids = [partido.idProveedor, partido.competencia.idProveedor, partido.local.idProveedor, partido.visitante.idProveedor]
  const nombres = [partido.competencia.nombre, partido.local.nombre, partido.visitante.nombre]
  return ids.every(valor => typeof valor === 'string' && valor.trim().length > 0 && valor.length <= 128)
    && nombres.every(valor => typeof valor === 'string' && valor.trim().length > 0 && valor.length <= 160)
    && Number.isFinite(Date.parse(partido.inicioUtc))
}

function slugCanonico(tipo: 'competition' | 'team' | 'fixture', clave: string): string {
  return `worker-futbol-${tipo}-${createHash('sha256').update(clave).digest('hex').slice(0, 32)}`
}

function limitarTexto(valor: string, limite: number): string {
  return valor.trim().slice(0, limite)
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
