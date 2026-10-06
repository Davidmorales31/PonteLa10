import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { asignarSlugsPartidosSeo, buscarPartidoSeoPorSlug } from '~/utils/partidosSeo'
import { normalizarEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import { obtenerRutaPublicaEscudoPartidoSeo } from '~/server/utils/escudosPartidoSeo'

const columnasFixtures = [
  'provider', 'provider_fixture_id', 'competition_slug', 'season', 'round_name', 'scheduled_at',
  'home_team', 'away_team', 'status', 'goals_home', 'goals_away', 'venue', 'city', 'checked_at',
  'official_source_url', 'created_at',
  'is_public', 'publication_rights_confirmed'
].join(',')

interface FilaPartidoSeo {
  provider: string
  provider_fixture_id: string
  competition_slug: string
  season: string
  round_name: string | null
  scheduled_at: string
  home_team: string
  away_team: string
  status: string | null
  goals_home: number | null
  goals_away: number | null
  venue: string | null
  city: string | null
  checked_at: string
  official_source_url: string | null
  created_at: string
  is_public: boolean
  publication_rights_confirmed: boolean
}

interface FilaEscudoEquipo {
  team_name: string
  team_logo_url: string | null
  is_public: boolean
  publication_rights_confirmed: boolean
}

const DURACION_CACHE_PARTIDOS_MS = 60_000
let cachePartidosPublicos: { venceEn: number, partidos: PartidoSeoPublico[] } | null = null
let cargaPartidosPublicos: Promise<PartidoSeoPublico[]> | null = null

export interface PartidoSeoPublico {
  slug: string
  slugsAlternos?: string[]
  competencia: string
  temporada: string
  jornada: string | null
  fechaIso: string
  local: string
  visitante: string
  estado: string | null
  golesLocal: number | null
  golesVisitante: number | null
  estadio: string | null
  ciudad: string | null
  fuenteOficialUrl: string | null
  escudoLocal: string | null
  escudoVisitante: string | null
  verificadoEn: string
}

export async function listarPartidosSeoPublicos(cliente: SupabaseClient): Promise<PartidoSeoPublico[]> {
  const ahora = Date.now()
  if (cachePartidosPublicos && cachePartidosPublicos.venceEn > ahora) {
    return cachePartidosPublicos.partidos
  }
  if (cargaPartidosPublicos) return cargaPartidosPublicos

  const carga = (async () => {
    const [respuestaFixtures, respuestaEscudos] = await Promise.all([
      cliente.from('colombian_league_fixtures')
        .select(columnasFixtures)
        .eq('is_public', true)
        .eq('publication_rights_confirmed', true)
        .order('scheduled_at', { ascending: true })
        .limit(1000),
      cliente.from('colombian_league_standings')
        .select('team_name,team_logo_url,is_public,publication_rights_confirmed')
        .eq('is_public', true)
        .eq('publication_rights_confirmed', true)
        .limit(500)
    ])

    if (respuestaFixtures.error || !respuestaFixtures.data) {
      throw createError({ statusCode: 503, statusMessage: 'El calendario público no está disponible.' })
    }

    const filas = deduplicarFixturesSeo((respuestaFixtures.data as unknown as FilaPartidoSeo[])
      .filter(fila => fila.is_public === true && fila.publication_rights_confirmed === true
        && fila.provider_fixture_id.trim() && fila.home_team.trim() && fila.away_team.trim()))
    const slugs = asignarSlugsPartidosSeo(filas)
    const escudosPorEquipo = new Map<string, string>()
    if (!respuestaEscudos.error && respuestaEscudos.data) {
      for (const fila of respuestaEscudos.data as unknown as FilaEscudoEquipo[]) {
        if (fila.is_public !== true || fila.publication_rights_confirmed !== true) continue
        const ruta = normalizarRutaEscudo(fila.team_logo_url)
        if (ruta) escudosPorEquipo.set(normalizarClaveEquipoLiga(fila.team_name), ruta)
      }
    }

    return slugs.map(fila => ({
      slug: fila.slug,
      slugsAlternos: fila.slugsAlternos,
      competencia: fila.competition_slug,
      temporada: fila.season,
      jornada: fila.round_name,
      fechaIso: fila.scheduled_at,
      local: fila.home_team,
      visitante: fila.away_team,
      estado: normalizarEstadoSeoPartido(fila.status, fila.scheduled_at, fila.checked_at),
      golesLocal: fila.goals_home,
      golesVisitante: fila.goals_away,
      estadio: fila.venue,
      ciudad: fila.city,
      fuenteOficialUrl: normalizarFuenteOficial(fila.official_source_url),
      escudoLocal: escudosPorEquipo.get(normalizarClaveEquipoLiga(fila.home_team))
        || obtenerRutaPublicaEscudoPartidoSeo(fila.home_team),
      escudoVisitante: escudosPorEquipo.get(normalizarClaveEquipoLiga(fila.away_team))
        || obtenerRutaPublicaEscudoPartidoSeo(fila.away_team),
      verificadoEn: fila.checked_at
    }))
  })()

  cargaPartidosPublicos = carga
  try {
    const partidos = await carga
    cachePartidosPublicos = { partidos, venceEn: Date.now() + DURACION_CACHE_PARTIDOS_MS }
    return partidos
  } finally {
    if (cargaPartidosPublicos === carga) cargaPartidosPublicos = null
  }
}

/** Agrupa copias del mismo fixture importadas desde DIMAYOR y los proveedores. */
export function deduplicarFixturesSeo(filas: FilaPartidoSeo[]): FilaPartidoSeo[] {
  const porCruce = new Map<string, FilaPartidoSeo[]>()
  for (const fila of filas) {
    const cruce = claveCruceFixture(fila)
    const grupo = porCruce.get(cruce) || []
    const indiceCoincidente = grupo.findIndex(actual => esMismoFixtureSeo(actual, fila))
    if (indiceCoincidente < 0) {
      grupo.push(fila)
      porCruce.set(cruce, grupo)
      continue
    }

    const actual = grupo[indiceCoincidente]!
    const prioritaria = compararCalidadFixture(fila, actual) > 0 ? fila : actual
    grupo[indiceCoincidente] = {
      ...prioritaria,
      created_at: primeraCreacion(actual.created_at, fila.created_at)
    }
    porCruce.set(cruce, grupo)
  }
  return [...porCruce.values()].flat()
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at))
}

function primeraCreacion(a: string, b: string): string {
  if (!a) return b
  if (!b) return a
  return Date.parse(a) <= Date.parse(b) ? a : b
}

function claveCruceFixture(fila: FilaPartidoSeo): string {
  return [fila.competition_slug, fila.season, normalizarClaveEquipoLiga(fila.home_team),
    normalizarClaveEquipoLiga(fila.away_team)].join('|')
}

function esMismoFixtureSeo(a: FilaPartidoSeo, b: FilaPartidoSeo): boolean {
  if (a.provider === b.provider) return a.provider_fixture_id === b.provider_fixture_id

  const jornadaA = normalizarJornada(a.round_name)
  const jornadaB = normalizarJornada(b.round_name)
  if (jornadaA && jornadaB && jornadaA === jornadaB) return true

  const fechaA = fechaPartidoBogota(a.scheduled_at)
  return Boolean(fechaA && fechaA === fechaPartidoBogota(b.scheduled_at))
}

function normalizarJornada(valor: string | null): string {
  const jornada = valor?.trim()
  if (!jornada) return ''
  const numeros = /\d+/.exec(jornada)?.[0]
  return numeros ? `jornada:${Number(numeros)}` : ''
}

function fechaPartidoBogota(fechaIso: string): string {
  const fecha = new Date(fechaIso)
  if (Number.isNaN(fecha.getTime())) return ''

  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(fecha)
  const parte = (tipo: string) => partes.find(valor => valor.type === tipo)?.value || ''
  return `${parte('year')}-${parte('month')}-${parte('day')}`
}

function compararCalidadFixture(a: FilaPartidoSeo, b: FilaPartidoSeo): number {
  const frescura = Date.parse(a.checked_at) - Date.parse(b.checked_at)
  if (frescura) return frescura
  const prioridad = (proveedor: string) => proveedor === 'dimayor' ? 3 : proveedor === 'goal-api' ? 2 : 1
  return prioridad(a.provider) - prioridad(b.provider)
}

export async function obtenerPartidoSeoPublico(
  cliente: SupabaseClient,
  slugSolicitado: string
): Promise<PartidoSeoPublico> {
  const partidos = await listarPartidosSeoPublicos(cliente)
  const partido = buscarPartidoSeoPorSlug(partidos, slugSolicitado)

  if (!partido) throw createError({ statusCode: 404, statusMessage: 'No encontramos ese partido.' })
  return partido
}

function normalizarNombreEquipo(nombre: string): string {
  return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Nombres documentados que los feeds oficiales usan indistintamente para el mismo club. */
export function normalizarClaveEquipoLiga(nombre: string): string {
  const normalizado = normalizarNombreEquipo(nombre)
  const alias: Record<string, string> = {
    'bogota': 'bogota fc',
    'bogota fc': 'bogota fc',
    'envigado fc': 'envigado',
    'envigado': 'envigado',
    'fortaleza ceif': 'fortaleza',
    'fortaleza': 'fortaleza',
    'deportivo pereira fc': 'deportivo pereira',
    'deportivo pereira': 'deportivo pereira',
    'jaguares de cordoba fc': 'jaguares de cordoba',
    'jaguares': 'jaguares de cordoba',
    'jaguares de cordoba': 'jaguares de cordoba',
    'independiente medellin': 'independiente medellin',
    'ind medellin': 'independiente medellin',
    'independiente santa fe': 'independiente santa fe',
    'santa fe': 'independiente santa fe',
    'patriotas boyaca': 'patriotas boyaca',
    'patriotas': 'patriotas boyaca',
    'barranquilla': 'barranquilla fc',
    'barranquilla fc': 'barranquilla fc',
    'internacional palmira': 'internacional fc de palmira',
    'internacional fc palmira': 'internacional fc de palmira',
    'internacional fc de palmira': 'internacional fc de palmira',
    'ind yumbo': 'independiente valle del cauca',
    'independiente yumbo': 'independiente valle del cauca',
    'independiente valle del cauca': 'independiente valle del cauca',
    'tigres fc': 'tigres',
    'tigres': 'tigres',
    'alianza': 'alianza valledupar',
    'alianza valledupar': 'alianza valledupar'
  }
  return alias[normalizado] || normalizado
}

function normalizarRutaEscudo(valor: unknown): string | null {
  return typeof valor === 'string'
    && /^\/images\/escudos\/liga-colombiana\/[a-z0-9-]+\.png$/.test(valor)
    ? valor
    : null
}

function normalizarFuenteOficial(valor: unknown): string | null {
  return typeof valor === 'string' && /^https:\/\/dimayor\.com\.co\/[a-z0-9/_-]+\/?$/i.test(valor)
    ? valor
    : null
}
