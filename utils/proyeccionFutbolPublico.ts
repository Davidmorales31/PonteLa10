import type {
  ClasificacionFutbolPublica,
  FixtureFutbolPublico,
  FilaClasificacionPublica,
  GrupoClasificacionPublico,
  LadoPartidoFutbol
} from '~/types/futbolPublico'
import type { EstadoFixtureFutbol, TipoEventoFutbol } from '~/types/futbolProveedor'
import { normalizarUrlInsigniaFutbol } from '~/utils/insigniasFutbol'

interface FilaFixturePrivada {
  id: string
  fixture_id: string
  business_date: string
  kickoff_at: string
  league_name: string
  league_country: string | null
  season: string
  round: string | null
  phase: string | null
  group_name: string | null
  home_team_provider_id: string
  home_team_name: string
  home_team_logo?: string | null
  away_team_provider_id: string
  away_team_name: string
  away_team_logo?: string | null
  provider?: string
  status: EstadoFixtureFutbol
  status_external: string | null
  elapsed: number | null
  goals_home: number | null
  goals_away: number | null
  venue_name: string | null
  venue_city: string | null
  events: unknown
  lineups: unknown
  statistics: unknown
  provider_fetched_at: string
  is_public: boolean
  publication_rights_confirmed: boolean
}

interface FilaStandingsPrivada {
  business_date: string
  league_name: string
  season: string
  standings: unknown
  provider_fetched_at: string
  is_public: boolean
  publication_rights_confirmed: boolean
}

type Registro = Record<string, unknown>

function registro(valor: unknown): Registro | null {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? valor as Registro
    : null
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : []
}

function texto(valor: unknown, max = 300): string | null {
  if (typeof valor !== 'string') return null
  const limpio = valor.trim()
  return limpio ? limpio.slice(0, max) : null
}

function numero(valor: unknown, min = 0, max = 999): number | null {
  const convertido = typeof valor === 'number' ? valor : Number(valor)
  return Number.isInteger(convertido) && convertido >= min && convertido <= max ? convertido : null
}

function valorEstadistica(valor: unknown): number | string | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  return texto(valor, 64)
}

const tiposEvento = new Set<TipoEventoFutbol>([
  'goal', 'penalty', 'own-goal', 'yellow-card', 'red-card', 'substitution', 'var', 'other'
])

function ladoEquipo(id: unknown, localId: string, visitanteId: string): LadoPartidoFutbol {
  if (id === localId) return 'local'
  if (id === visitanteId) return 'visitante'
  return 'desconocido'
}

/** Lista permitida de eventos: nunca devuelve IDs de proveedor ni claves no reconocidas. */
function proyectarEventos(valor: unknown, localId: string, visitanteId: string): FixtureFutbolPublico['events'] {
  return lista(valor).flatMap((item) => {
    const fila = registro(item)
    if (!fila) return []
    const tipoRaw = texto(fila.tipo, 32) as TipoEventoFutbol | null
    return [{
      minuto: numero(fila.minuto, 0, 180),
      minutoTexto: texto(fila.minutoTexto, 24),
      tipo: tipoRaw && tiposEvento.has(tipoRaw) ? tipoRaw : 'other',
      lado: ladoEquipo(fila.equipoIdProveedor, localId, visitanteId),
      jugador: texto(fila.jugador, 120),
      jugadorRelacionado: texto(fila.jugadorRelacionado, 120),
      descripcion: texto(fila.descripcion, 300)
    }]
  })
}

function proyectarAlineaciones(valor: unknown, localId: string, visitanteId: string): FixtureFutbolPublico['lineups'] {
  return lista(valor).flatMap((item) => {
    const fila = registro(item)
    if (!fila) return []
    const lado = ladoEquipo(fila.equipoIdProveedor, localId, visitanteId)
    if (lado === 'desconocido') return []
    const jugadores = lista(fila.jugadores).flatMap((jugadorRaw) => {
      const jugador = registro(jugadorRaw)
      const nombre = jugador ? texto(jugador.nombre, 120) : null
      if (!jugador || !nombre) return []
      return [{
        nombre,
        numero: numero(jugador.numero, 1, 99),
        posicion: texto(jugador.posicion, 48),
        titular: jugador.titular === true
      }]
    })
    return [{
      lado,
      formacion: texto(fila.formacion, 32),
      entrenador: texto(fila.entrenador, 120),
      jugadores
    }]
  })
}

function proyectarEstadisticas(valor: unknown, localId: string, visitanteId: string): FixtureFutbolPublico['statistics'] {
  return lista(valor).flatMap((item) => {
    const fila = registro(item)
    if (!fila) return []
    let local: number | string | null = null
    let visitante: number | string | null = null
    for (const valorRaw of lista(fila.valoresPorEquipo)) {
      const valorEquipo = registro(valorRaw)
      if (!valorEquipo) continue
      const lado = ladoEquipo(valorEquipo.equipoIdProveedor, localId, visitanteId)
      if (lado === 'local') local = valorEstadistica(valorEquipo.valor)
      if (lado === 'visitante') visitante = valorEstadistica(valorEquipo.valor)
    }
    const clave = texto(fila.clave, 80)
    const etiqueta = texto(fila.etiqueta, 120)
    if (!clave || !etiqueta) return []
    return [{ clave, etiqueta, unidad: texto(fila.unidad, 24), local, visitante }]
  })
}

function proyectarFilaClasificacion(valor: unknown): FilaClasificacionPublica | null {
  const fila = registro(valor)
  const equipo = fila ? registro(fila.equipo) : null
  const nombre = equipo ? texto(equipo.nombre, 160) : null
  const posicion = fila ? numero(fila.posicion, 1, 1000) : null
  if (!fila || !nombre || posicion === null) return null
  return {
    posicion,
    equipo: { nombre },
    jugados: numero(fila.jugados) ?? 0,
    ganados: numero(fila.ganados) ?? 0,
    empatados: numero(fila.empatados) ?? 0,
    perdidos: numero(fila.perdidos) ?? 0,
    golesFavor: numero(fila.golesFavor) ?? 0,
    golesContra: numero(fila.golesContra) ?? 0,
    diferenciaGoles: numero(fila.diferenciaGoles, -999, 999) ?? 0,
    puntos: numero(fila.puntos) ?? 0,
    forma: lista(fila.forma).flatMap(estado => {
      const limpio = texto(estado, 1)?.toUpperCase()
      return limpio && ['W', 'D', 'L'].includes(limpio) ? [limpio] : []
    }).slice(0, 10),
    puntosDeduccion: fila.puntosDeduccion === undefined ? null : numero(fila.puntosDeduccion, -999, 0)
  }
}

function proyectarGrupos(valor: unknown): GrupoClasificacionPublico[] {
  return lista(valor).flatMap((grupoRaw) => {
    const grupo = registro(grupoRaw)
    const nombre = grupo ? texto(grupo.nombre, 120) : null
    if (!grupo || !nombre) return []
    const filas = lista(grupo.filas).flatMap((fila) => {
      const proyectada = proyectarFilaClasificacion(fila)
      return proyectada ? [proyectada] : []
    })
    return [{ nombre, etapa: texto(grupo.etapa, 120), filas }]
  })
}

export function proyectarFixtureFutbolPublico(fila: FilaFixturePrivada): FixtureFutbolPublico {
  if (!fila.is_public || !fila.publication_rights_confirmed) {
    throw new Error('El fixture no está aprobado para publicación.')
  }
  const proveedor = esProveedorFutbol(fila.provider) ? fila.provider : null
  const logoLocal = proveedor ? normalizarUrlInsigniaFutbol(fila.home_team_logo, proveedor) : null
  const logoVisitante = proveedor ? normalizarUrlInsigniaFutbol(fila.away_team_logo, proveedor) : null
  return {
    id: fila.fixture_id,
    businessDate: fila.business_date,
    kickoffAt: fila.kickoff_at,
    competition: {
      name: fila.league_name,
      country: fila.league_country,
      season: fila.season,
      round: fila.round,
      phase: fila.phase,
      group: fila.group_name
    },
    homeTeam: {
      name: fila.home_team_name,
      ...(logoLocal ? { logo: logoLocal } : {})
    },
    awayTeam: {
      name: fila.away_team_name,
      ...(logoVisitante ? { logo: logoVisitante } : {})
    },
    status: fila.status,
    externalStatus: fila.status_external,
    elapsed: fila.elapsed,
    goalsHome: fila.goals_home,
    goalsAway: fila.goals_away,
    venue: { name: fila.venue_name, city: fila.venue_city },
    providerFetchedAt: fila.provider_fetched_at,
    events: proyectarEventos(fila.events, fila.home_team_provider_id, fila.away_team_provider_id),
    lineups: proyectarAlineaciones(fila.lineups, fila.home_team_provider_id, fila.away_team_provider_id),
    statistics: proyectarEstadisticas(fila.statistics, fila.home_team_provider_id, fila.away_team_provider_id)
  }
}

function esProveedorFutbol(valor: unknown): valor is 'api-football' | 'goal-api' {
  return valor === 'api-football' || valor === 'goal-api'
}

export function proyectarStandingsFutbolPublicos(fila: FilaStandingsPrivada): ClasificacionFutbolPublica {
  if (!fila.is_public || !fila.publication_rights_confirmed) {
    throw new Error('La clasificación no está aprobada para publicación.')
  }
  const documento = registro(fila.standings)
  return {
    businessDate: fila.business_date,
    competition: { name: fila.league_name, season: fila.season },
    providerFetchedAt: fila.provider_fetched_at,
    groups: proyectarGrupos(documento?.grupos)
  }
}
