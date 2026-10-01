import type {
  ClasificacionFutbolProveedor,
  EstadoFixtureFutbol,
  IdentificadorProveedorFutbol,
  PartidoFutbolProveedor,
  PaqueteActualizacionFutbolProveedor
} from '~/types/futbolProveedor'

/** Identidad canónica cargada desde sports_fixtures, no desde nombres externos. */
export interface IdentidadFixtureCanonicaFutbol {
  id: string
  competitionId: string
  homeTeamId: string
  awayTeamId: string
}

export interface MappingCompetenciaFutbol {
  externalId: string
  competitionId: string
}

export interface MappingEquipoFutbol {
  externalId: string
  teamId: string
}

export interface MappingFixtureFutbol {
  externalId: string
  fixtureId: string
  fixture: IdentidadFixtureCanonicaFutbol
}

export interface MappingsProveedorFutbol {
  competencias: MappingCompetenciaFutbol[]
  equipos: MappingEquipoFutbol[]
  fixtures: MappingFixtureFutbol[]
}

/** Esquema de escritura alineado con football_fixtures_today. */
export interface SnapshotFixtureFutbolPrivado {
  fixture_id: string
  provider: IdentificadorProveedorFutbol
  provider_fixture_id: string
  business_date: string
  kickoff_at: string
  league_id: string
  league_name: string
  league_country: string | null
  season: string
  round: string | null
  phase: string | null
  group_name: string | null
  home_team_provider_id: string
  home_team_name: string
  home_team_logo: null
  away_team_provider_id: string
  away_team_name: string
  away_team_logo: null
  status: EstadoFixtureFutbol
  status_external: string | null
  elapsed: number | null
  goals_home: number | null
  goals_away: number | null
  venue_name: string | null
  venue_city: string | null
  events: []
  lineups: []
  statistics: []
  player_statistics: []
  provider_fetched_at: string
  is_public: false
  publication_rights_confirmed: false
  publication_rights_source: null
  publication_rights_reference: null
  publication_rights_checked_at: null
}

export interface DetalleFixtureFutbolPrivado {
  provider: IdentificadorProveedorFutbol
  provider_fixture_id: string
  events: NonNullable<PaqueteActualizacionFutbolProveedor['eventos']>
  lineups: NonNullable<PaqueteActualizacionFutbolProveedor['alineaciones']>
  statistics: NonNullable<PaqueteActualizacionFutbolProveedor['estadisticas']>
  provider_fetched_at: string
}

export type MotivoOmitirFixtureFutbol =
  | 'competencia_no_mapeada'
  | 'equipo_no_mapeado'
  | 'fixture_no_mapeado'
  | 'identidad_canonica_inconsistente'
  | 'datos_invalidos'

export interface ResultadoProyeccionSnapshotsFutbol {
  snapshots: SnapshotFixtureFutbolPrivado[]
  omitidos: Record<MotivoOmitirFixtureFutbol, number>
}

export interface SnapshotClasificacionFutbolPrivado {
  business_date: string
  provider: IdentificadorProveedorFutbol
  competition_id: string
  league_id: string
  league_name: string
  season: string
  standings: {
    grupos: Array<{
      nombre: string
      etapa: string | null
      filas: Array<{
        posicion: number
        equipo: { id: string; providerId: string; nombre: string }
        jugados: number
        ganados: number
        empatados: number
        perdidos: number
        golesFavor: number
        golesContra: number
        diferenciaGoles: number
        puntos: number
        forma: string[]
        puntosDeduccion: number | null
      }>
    }>
  }
  provider_fetched_at: string
  is_public: false
  publication_rights_confirmed: false
  publication_rights_source: null
  publication_rights_reference: null
  publication_rights_checked_at: null
}

export type ResultadoClasificacionFutbolPrivada =
  | { snapshot: SnapshotClasificacionFutbolPrivado; omitido: null }
  | { snapshot: null; omitido: 'competencia_no_mapeada' | 'equipo_no_mapeado' | 'clasificacion_invalida' }

/** Permite al worker saltarse la API entera cuando no hay competencias curadas. */
export function tieneCompetenciasMapeadasFutbol(mappings: MappingsProveedorFutbol): boolean {
  return mappings.competencias.length > 0
}

/**
 * Proyecta respuestas normalizadas solo si competencia, fixture y ambos
 * equipos coinciden con mappings explícitos. Las filas siempre quedan privadas;
 * no propaga escudos, payload externo ni evidencia ficticia de publicación.
 */
export function proyectarSnapshotsFixturesFutbol(
  partidos: PartidoFutbolProveedor[],
  opciones: {
    proveedor: IdentificadorProveedorFutbol
    fechaNegocio: string
    consultadoEn: string
    mappings: MappingsProveedorFutbol
  }
): ResultadoProyeccionSnapshotsFutbol {
  validarFecha(opciones.fechaNegocio)
  const consultadoEn = normalizarInstante(opciones.consultadoEn)
  if (!consultadoEn) throw new Error('La fecha de consulta del proveedor no es válida.')
  const competencias = indexar(
    opciones.mappings.competencias,
    mapping => mapping.externalId,
    mapping => mapping.competitionId
  )
  const equipos = indexar(
    opciones.mappings.equipos,
    mapping => mapping.externalId,
    mapping => mapping.teamId
  )
  const fixtures = indexarFixtures(opciones.mappings.fixtures)

  const resultado: ResultadoProyeccionSnapshotsFutbol = {
    snapshots: [],
    omitidos: {
      competencia_no_mapeada: 0,
      equipo_no_mapeado: 0,
      fixture_no_mapeado: 0,
      identidad_canonica_inconsistente: 0,
      datos_invalidos: 0
    }
  }

  for (const partido of partidos) {
    const competenciaId = competencias.get(partido.competencia.idProveedor)
    if (!competenciaId) {
      resultado.omitidos.competencia_no_mapeada += 1
      continue
    }

    const equipoLocalId = equipos.get(partido.local.idProveedor)
    const equipoVisitanteId = equipos.get(partido.visitante.idProveedor)
    if (!equipoLocalId || !equipoVisitanteId) {
      resultado.omitidos.equipo_no_mapeado += 1
      continue
    }

    const fixtureMapeado = fixtures.get(partido.idProveedor)
    if (!fixtureMapeado) {
      resultado.omitidos.fixture_no_mapeado += 1
      continue
    }

    const fixture = fixtureMapeado.fixture
    const identidadCoincide = fixtureMapeado.fixtureId === fixture.id
      && fixture.competitionId === competenciaId
      && fixture.homeTeamId === equipoLocalId
      && fixture.awayTeamId === equipoVisitanteId
    if (!identidadCoincide) {
      resultado.omitidos.identidad_canonica_inconsistente += 1
      continue
    }

    const snapshot = crearSnapshot(partido, {
      proveedor: opciones.proveedor,
      fechaNegocio: opciones.fechaNegocio,
      consultadoEn,
      fixtureId: fixture.id
    })
    if (!snapshot) {
      resultado.omitidos.datos_invalidos += 1
      continue
    }
    resultado.snapshots.push(snapshot)
  }

  return resultado
}

/**
 * Rechaza una tabla incompleta si falta la identidad de cualquier equipo; una
 * clasificación parcial podría mostrarse como si fuera el torneo completo.
 */
export function proyectarSnapshotClasificacionFutbol(
  clasificacion: ClasificacionFutbolProveedor,
  opciones: {
    proveedor: IdentificadorProveedorFutbol
    fechaNegocio: string
    mappings: MappingsProveedorFutbol
  }
): ResultadoClasificacionFutbolPrivada {
  validarFecha(opciones.fechaNegocio)
  const competencia = opciones.mappings.competencias.find(
    mapping => mapping.externalId === clasificacion.competencia.idProveedor
  )
  if (!competencia) return { snapshot: null, omitido: 'competencia_no_mapeada' }

  const temporada = texto(clasificacion.competencia.temporada, 32)
  const nombre = texto(clasificacion.competencia.nombre, 160)
  const consultadoEn = normalizarInstante(clasificacion.consultadoEn)
  if (!temporada || !nombre || !consultadoEn || clasificacion.grupos.length === 0) {
    return { snapshot: null, omitido: 'clasificacion_invalida' }
  }

  const equipos = indexar(opciones.mappings.equipos, mapping => mapping.externalId, mapping => mapping.teamId)
  const grupos: SnapshotClasificacionFutbolPrivado['standings']['grupos'] = []
  const nombresGrupo = new Set<string>()

  for (const grupo of clasificacion.grupos) {
    const groupName = texto(grupo.nombre, 120)
    const stage = texto(grupo.etapa, 120)
    if (!groupName || nombresGrupo.has(groupName) || grupo.filas.length === 0) {
      return { snapshot: null, omitido: 'clasificacion_invalida' }
    }
    nombresGrupo.add(groupName)

    const posiciones = new Set<number>()
    const equiposGrupo = new Set<string>()
    const filas: SnapshotClasificacionFutbolPrivado['standings']['grupos'][number]['filas'] = []

    for (const fila of grupo.filas) {
      const equipoId = equipos.get(fila.equipo.idProveedor)
      if (!equipoId) return { snapshot: null, omitido: 'equipo_no_mapeado' }
      const equipoExternoId = texto(fila.equipo.idProveedor, 128)
      const teamName = texto(fila.equipo.nombre, 160)
      if (!equipoExternoId || !teamName || !Number.isInteger(fila.posicion) || fila.posicion < 1 || fila.posicion > 1000
        || posiciones.has(fila.posicion) || equiposGrupo.has(equipoId)
        || ![fila.jugados, fila.ganados, fila.empatados, fila.perdidos, fila.golesFavor, fila.golesContra, fila.puntos]
          .every(value => Number.isInteger(value) && value >= 0 && value <= 999)
        || !Number.isInteger(fila.diferenciaGoles) || fila.diferenciaGoles < -999 || fila.diferenciaGoles > 999
        || (fila.puntosDeduccion !== undefined
          && (!Number.isInteger(fila.puntosDeduccion) || fila.puntosDeduccion > 0 || fila.puntosDeduccion < -999))) {
        return { snapshot: null, omitido: 'clasificacion_invalida' }
      }

      posiciones.add(fila.posicion)
      equiposGrupo.add(equipoId)
      filas.push({
        posicion: fila.posicion,
        equipo: { id: equipoId, providerId: equipoExternoId, nombre: teamName },
        jugados: fila.jugados,
        ganados: fila.ganados,
        empatados: fila.empatados,
        perdidos: fila.perdidos,
        golesFavor: fila.golesFavor,
        golesContra: fila.golesContra,
        diferenciaGoles: fila.diferenciaGoles,
        puntos: fila.puntos,
        forma: (fila.forma ?? []).filter(estado => ['W', 'D', 'L'].includes(estado)).slice(0, 10),
        puntosDeduccion: fila.puntosDeduccion ?? null
      })
    }

    grupos.push({ nombre: groupName, etapa: stage, filas })
  }

  return {
    omitido: null,
    snapshot: {
      business_date: opciones.fechaNegocio,
      provider: opciones.proveedor,
      competition_id: competencia.competitionId,
      league_id: clasificacion.competencia.idProveedor,
      league_name: nombre,
      season: temporada,
      standings: { grupos },
      provider_fetched_at: consultadoEn,
      is_public: false,
      publication_rights_confirmed: false,
      publication_rights_source: null,
      publication_rights_reference: null,
      publication_rights_checked_at: null
    }
  }
}

function crearSnapshot(
  partido: PartidoFutbolProveedor,
  identidad: { proveedor: IdentificadorProveedorFutbol; fechaNegocio: string; consultadoEn: string; fixtureId: string }
): SnapshotFixtureFutbolPrivado | null {
  const kickoff = normalizarInstante(partido.inicioUtc)
  const externalId = texto(partido.idProveedor, 128)
  const competitionId = texto(partido.competencia.idProveedor, 128)
  const competitionName = texto(partido.competencia.nombre, 160)
  const season = texto(partido.competencia.temporada, 32)
  const homeProviderId = texto(partido.local.idProveedor, 128)
  const homeName = texto(partido.local.nombre, 160)
  const awayProviderId = texto(partido.visitante.idProveedor, 128)
  const awayName = texto(partido.visitante.nombre, 160)

  if (!kickoff || !externalId || !competitionId || !competitionName || !season
    || !homeProviderId || !homeName || !awayProviderId || !awayName
    || !estadosFixtureValidos.has(partido.estado)) return null

  const elapsed = enteroLimitado(partido.minutoTranscurrido, 0, 180)
  if (partido.minutoTranscurrido !== undefined && elapsed === null) return null
  const goalsHome = goles(partido.golesLocal)
  const goalsAway = goles(partido.golesVisitante)
  if (goalsHome === undefined || goalsAway === undefined) return null

  return {
    fixture_id: identidad.fixtureId,
    provider: identidad.proveedor,
    provider_fixture_id: externalId,
    business_date: identidad.fechaNegocio,
    kickoff_at: kickoff,
    league_id: competitionId,
    league_name: competitionName,
    league_country: texto(partido.competencia.pais, 80),
    season,
    round: texto(partido.competencia.jornada, 160),
    phase: texto(partido.competencia.etapa, 120),
    group_name: texto(partido.competencia.grupo, 120),
    home_team_provider_id: homeProviderId,
    home_team_name: homeName,
    home_team_logo: null,
    away_team_provider_id: awayProviderId,
    away_team_name: awayName,
    away_team_logo: null,
    status: partido.estado,
    status_external: texto(partido.estadoProveedor, 64),
    elapsed,
    goals_home: goalsHome,
    goals_away: goalsAway,
    venue_name: texto(partido.sede, 180),
    venue_city: texto(partido.ciudad, 120),
    events: [],
    lineups: [],
    statistics: [],
    player_statistics: [],
    provider_fetched_at: identidad.consultadoEn,
    is_public: false,
    publication_rights_confirmed: false,
    publication_rights_source: null,
    publication_rights_reference: null,
    publication_rights_checked_at: null
  }
}

function indexar<T>(
  items: T[],
  leerExterno: (item: T) => string,
  leerCanonico: (item: T) => string
): Map<string, string> {
  const mapa = new Map<string, string>()
  for (const item of items) {
    const externalId = texto(leerExterno(item), 128)
    const target = texto(leerCanonico(item), 128)
    if (!externalId || !target || mapa.has(externalId)) {
      throw new Error('Los mappings de fútbol tienen identificadores vacíos o duplicados.')
    }
    mapa.set(externalId, target)
  }
  return mapa
}

function indexarFixtures(items: MappingFixtureFutbol[]): Map<string, MappingFixtureFutbol> {
  const mapa = new Map<string, MappingFixtureFutbol>()
  for (const item of items) {
    if (!texto(item.externalId, 128) || !texto(item.fixtureId, 128)
      || !texto(item.fixture.id, 128) || mapa.has(item.externalId)) {
      throw new Error('Los mappings de fixtures tienen identificadores vacíos o duplicados.')
    }
    mapa.set(item.externalId, item)
  }
  return mapa
}

function texto(valor: unknown, maximo: number): string | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null
  const normalizado = String(valor).trim()
  return normalizado.length > 0 && normalizado.length <= maximo ? normalizado : null
}

function normalizarInstante(valor: string): string | null {
  if (typeof valor !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(valor)) return null
  const tiempo = Date.parse(valor)
  return Number.isFinite(tiempo) ? new Date(tiempo).toISOString() : null
}

function validarFecha(valor: string): void {
  const parseada = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00Z`) : null
  if (!parseada || !Number.isFinite(parseada.getTime()) || parseada.toISOString().slice(0, 10) !== valor) {
    throw new Error('La fecha de negocio debe tener formato YYYY-MM-DD.')
  }
}

export function validarFechaNegocioFutbol(valor: string): void {
  validarFecha(valor)
}

function enteroLimitado(valor: number | undefined, minimo: number, maximo: number): number | null {
  if (valor === undefined) return null
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo ? valor : null
}

function goles(valor: number | null): number | null | undefined {
  if (valor === null) return null
  return enteroLimitado(valor, 0, 99) ?? undefined
}

const estadosFixtureValidos = new Set<EstadoFixtureFutbol>([
  'scheduled', 'pre-match', 'live', 'halftime', 'finished', 'postponed',
  'suspended', 'abandoned', 'cancelled', 'unknown'
])
