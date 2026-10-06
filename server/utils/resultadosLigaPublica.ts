import { normalizarClaveEquipoLiga } from '~/server/utils/partidosSeoPublicos'

export interface FixtureLigaPublicado {
  competition_slug: string
  season: string
  provider: string
  provider_fixture_id: string
  scheduled_at: string
  home_team: string
  away_team: string
  status: string
  goals_home: number | null
  goals_away: number | null
  checked_at: string
}

export interface SnapshotResultadoLiga {
  provider: string
  league_name: string
  kickoff_at: string
  home_team_name: string
  away_team_name: string
  status: string
  goals_home: number | null
  goals_away: number | null
  provider_fetched_at: string
}

export interface ActualizacionResultadoLiga {
  competition_slug: string
  season: string
  provider: string
  provider_fixture_id: string
  status: string
  goals_home: number | null
  goals_away: number | null
  checked_at: string
}

const estadosValidos = new Set([
  'scheduled', 'pre-match', 'live', 'halftime', 'finished', 'postponed', 'suspended',
  'abandoned', 'cancelled', 'unknown'
])
const margenHorarioMs = 6 * 60 * 60 * 1000
const edadMaximaSnapshotMs = 36 * 60 * 60 * 1000

/** Proyecta solo marcadores del proveedor sobre fixtures que ya tienen permiso público. */
export function crearActualizacionesResultadosLiga(
  fixtures: FixtureLigaPublicado[],
  snapshots: SnapshotResultadoLiga[],
  ahora = Date.now()
): ActualizacionResultadoLiga[] {
  const candidatos = snapshots
    .filter(snapshot => (snapshot.provider === 'api-football' || snapshot.provider === 'goal-api')
      && competenciaDesdeNombre(snapshot.league_name)
      && estadosValidos.has(snapshot.status)
      && Number.isFinite(Date.parse(snapshot.kickoff_at))
      && Number.isFinite(Date.parse(snapshot.provider_fetched_at))
      && ahora - Date.parse(snapshot.provider_fetched_at) <= edadMaximaSnapshotMs
      && (snapshot.goals_home === null || Number.isInteger(snapshot.goals_home) && snapshot.goals_home >= 0 && snapshot.goals_home <= 99)
      && (snapshot.goals_away === null || Number.isInteger(snapshot.goals_away) && snapshot.goals_away >= 0 && snapshot.goals_away <= 99))
    .sort((a, b) => Date.parse(b.provider_fetched_at) - Date.parse(a.provider_fetched_at)
      || prioridadProveedor(a.provider) - prioridadProveedor(b.provider))

  const actualizaciones: ActualizacionResultadoLiga[] = []
  for (const fixture of fixtures) {
    const proveedor = candidatos.find(snapshot => {
      const competencia = competenciaDesdeNombre(snapshot.league_name)
      const diferenciaHora = Math.abs(Date.parse(snapshot.kickoff_at) - Date.parse(fixture.scheduled_at))
      return competencia === fixture.competition_slug
        && diferenciaHora <= margenHorarioMs
        && normalizarClaveEquipoLiga(snapshot.home_team_name) === normalizarClaveEquipoLiga(fixture.home_team)
        && normalizarClaveEquipoLiga(snapshot.away_team_name) === normalizarClaveEquipoLiga(fixture.away_team)
    })
    if (!proveedor) continue

    const obtenidoEn = Date.parse(proveedor.provider_fetched_at)
    const verificadoEn = Date.parse(fixture.checked_at)
    if (Number.isFinite(verificadoEn) && obtenidoEn <= verificadoEn) continue
    if (fixture.status === 'finished' && proveedor.status !== 'finished') continue
    if (esTerminal(fixture.status) && !esTerminal(proveedor.status)) continue
    // Un snapshot atrasado no puede devolver al prepartido un partido que ya inició.
    if ((fixture.status === 'live' || fixture.status === 'halftime')
      && ['scheduled', 'pre-match', 'unknown'].includes(proveedor.status)) continue
    if (proveedor.status === 'finished' && (proveedor.goals_home === null || proveedor.goals_away === null)) continue
    if (proveedor.status === 'live' || proveedor.status === 'halftime') {
      if (ahora - obtenidoEn > 10 * 60 * 1000) continue
    }
    // Durante el juego el marcador no retrocede por lecturas incompletas o antiguas.
    // Un marcador final más reciente sí puede corregir una decisión oficial del proveedor.
    if (proveedor.status !== 'finished'
      && ((fixture.goals_home !== null && proveedor.goals_home !== null && proveedor.goals_home < fixture.goals_home)
        || (fixture.goals_away !== null && proveedor.goals_away !== null && proveedor.goals_away < fixture.goals_away))) continue

    actualizaciones.push({
      competition_slug: fixture.competition_slug,
      season: fixture.season,
      provider: fixture.provider,
      provider_fixture_id: fixture.provider_fixture_id,
      status: proveedor.status,
      goals_home: proveedor.goals_home ?? fixture.goals_home,
      goals_away: proveedor.goals_away ?? fixture.goals_away,
      checked_at: new Date(obtenidoEn).toISOString()
    })
  }
  return actualizaciones
}

function competenciaDesdeNombre(nombre: string): string | null {
  const valor = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
  if (/primera\s*a|liga\s*(betplay|dimayor)|division\s*profesional/.test(valor)) return 'liga-betplay'
  if (/primera\s*b|torneo\s*(betplay|dimayor)/.test(valor)) return 'torneo-betplay'
  if (/copa\s*colombia/.test(valor)) return 'copa-colombia'
  return null
}

function prioridadProveedor(provider: string): number {
  return provider === 'api-football' ? 0 : 1
}

function esTerminal(estado: string): boolean {
  return ['finished', 'postponed', 'suspended', 'abandoned', 'cancelled'].includes(estado)
}
