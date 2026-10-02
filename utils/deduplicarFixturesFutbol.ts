import type { FixtureFutbolPublico } from '~/types/futbolPublico'

/** Colapsa solo identidades exactas; ante información incompleta conserva ambas filas. */
export function deduplicarFixturesFutbol(fixtures: FixtureFutbolPublico[]): FixtureFutbolPublico[] {
  const elegidos = new Map<string, FixtureFutbolPublico>()
  for (const fixture of fixtures) {
    const clave = crearClaveIdentidad(fixture)
    if (!clave) {
      elegidos.set(`${fixture.id}\u0000${elegidos.size}`, fixture)
      continue
    }
    const actual = elegidos.get(clave)
    if (!actual || compararFixture(fixture, actual) > 0) elegidos.set(clave, fixture)
  }
  return [...elegidos.values()].sort((primero, segundo) =>
    Date.parse(primero.kickoffAt) - Date.parse(segundo.kickoffAt)
    || primero.id.localeCompare(segundo.id)
  )
}

function crearClaveIdentidad(fixture: FixtureFutbolPublico): string | null {
  const fecha = Date.parse(fixture.kickoffAt)
  const competencia = normalizarIdentidad(fixture.competition.name)
  const local = normalizarIdentidad(fixture.homeTeam.name)
  const visitante = normalizarIdentidad(fixture.awayTeam.name)
  if (!Number.isFinite(fecha) || !competencia || !local || !visitante) return null
  const minuto = Math.floor(fecha / 60_000)
  const temporada = normalizarIdentidad(fixture.competition.season)
  return [competencia, temporada, local, visitante, String(minuto)].join('\u0000')
}

function compararFixture(primero: FixtureFutbolPublico, segundo: FixtureFutbolPublico): number {
  const actualizadoPrimero = Date.parse(primero.providerFetchedAt)
  const actualizadoSegundo = Date.parse(segundo.providerFetchedAt)
  const porActualizacion = (Number.isFinite(actualizadoPrimero) ? actualizadoPrimero : 0)
    - (Number.isFinite(actualizadoSegundo) ? actualizadoSegundo : 0)
  // Una diferencia mayor que la cadencia viva máxima indica que el estado más
  // reciente debe prevalecer, incluso si el anterior decía "en vivo".
  if (Math.abs(porActualizacion) > 3 * 60_000) return porActualizacion

  const prioridadEstado: Record<FixtureFutbolPublico['status'], number> = {
    live: 8, halftime: 7, finished: 6, 'pre-match': 5, scheduled: 4,
    suspended: 3, postponed: 2, abandoned: 1, cancelled: 0, unknown: -1
  }
  const porEstado = prioridadEstado[primero.status] - prioridadEstado[segundo.status]
  if (porEstado) return porEstado
  if (porActualizacion) return porActualizacion
  const detallePrimero = primero.events.length + primero.lineups.length * 4 + primero.statistics.length * 2
  const detalleSegundo = segundo.events.length + segundo.lineups.length * 4 + segundo.statistics.length * 2
  return detallePrimero - detalleSegundo
}

function normalizarIdentidad(valor: string): string {
  let normalizado = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  normalizado = normalizado.replace(/^uefa\s+/, '')
  normalizado = normalizado.replace(/[^a-z0-9]+/g, ' ').trim()
  const alias: Record<string, string> = {
    'czech republic': 'czechia',
    'republic of ireland': 'ireland',
    turkiye: 'turkey',
    'korea republic': 'south korea',
    'korea dpr': 'north korea'
  }
  return alias[normalizado] || normalizado
}
