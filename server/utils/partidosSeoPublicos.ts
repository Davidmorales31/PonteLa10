import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { asignarSlugsPartidosSeo, buscarPartidoSeoPorSlug } from '~/utils/partidosSeo'
import { normalizarEstadoSeoPartido } from '~/utils/schemaPartidoSeo'
import { evaluarFrescuraPartido, type EvaluacionFrescuraDeportiva } from '~/utils/frescuraDatosDeportivos'
import { obtenerRutaPublicaEscudoPartidoSeo } from '~/server/utils/escudosPartidoSeo'
import type { ProgramacionTransmisionPublica } from '~/utils/partidos/programacion'

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
  team_key: string
  team_name: string
  team_logo_url: string | null
  is_public: boolean
  publication_rights_confirmed: boolean
}

const DURACION_CACHE_PARTIDOS_MS = 60_000
let cachePartidosPublicos: { venceEn: number, partidos: PartidoSeoAdministrable[] } | null = null
let cargaPartidosPublicos: Promise<PartidoSeoAdministrable[]> | null = null

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
  equipoLocalSlug?: string
  equipoVisitanteSlug?: string
  verificadoEn: string
  estadoFrescura?: EvaluacionFrescuraDeportiva
  transmisiones?: ProgramacionTransmisionPublica[]
}

export interface PartidoSeoAdministrable extends PartidoSeoPublico {
  identidadFuente: {
    competenciaSlug: string
    temporada: string
    proveedor: string
    idProveedor: string
  }
}

export async function listarPartidosSeoPublicos(cliente: SupabaseClient): Promise<PartidoSeoPublico[]> {
  return (await listarPartidosSeoAdministrables(cliente)).map(presentarPartidoSeoPublico)
}

export async function listarPartidosSeoAdministrables(cliente: SupabaseClient): Promise<PartidoSeoAdministrable[]> {
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
        .select('team_key,team_name,team_logo_url,is_public,publication_rights_confirmed')
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
    const slugsPorEquipo = crearMapaSlugsEquiposPublicos(
      respuestaEscudos.error || !respuestaEscudos.data
        ? []
        : respuestaEscudos.data as unknown as FilaEscudoEquipo[]
    )
    if (!respuestaEscudos.error && respuestaEscudos.data) {
      for (const fila of respuestaEscudos.data as unknown as FilaEscudoEquipo[]) {
        if (fila.is_public !== true || fila.publication_rights_confirmed !== true) continue
        const ruta = normalizarRutaEscudo(fila.team_logo_url)
        if (ruta) escudosPorEquipo.set(normalizarClaveEquipoLiga(fila.team_name), ruta)
      }
    }

      const ahoraMs = Date.now()
      return slugs.map(fila => ({
        slug: fila.slug,
      slugsAlternos: fila.slugsAlternos,
      competencia: fila.competition_slug,
      temporada: fila.season,
      jornada: fila.round_name,
      fechaIso: fila.scheduled_at,
      local: fila.home_team,
      visitante: fila.away_team,
      estado: normalizarEstadoSeoPartido(fila.status, fila.scheduled_at, fila.checked_at, ahoraMs),
      golesLocal: fila.goals_home,
      golesVisitante: fila.goals_away,
      estadio: fila.venue,
      ciudad: fila.city,
      fuenteOficialUrl: normalizarFuenteOficial(fila.official_source_url),
      escudoLocal: escudosPorEquipo.get(normalizarClaveEquipoLiga(fila.home_team))
        || obtenerRutaPublicaEscudoPartidoSeo(fila.home_team),
      escudoVisitante: escudosPorEquipo.get(normalizarClaveEquipoLiga(fila.away_team))
        || obtenerRutaPublicaEscudoPartidoSeo(fila.away_team),
      equipoLocalSlug: slugsPorEquipo.get(normalizarClaveEquipoLiga(fila.home_team)),
      equipoVisitanteSlug: slugsPorEquipo.get(normalizarClaveEquipoLiga(fila.away_team)),
        verificadoEn: fila.checked_at,
        estadoFrescura: evaluarFrescuraPartido({
          estado: normalizarEstadoSeoPartido(fila.status, fila.scheduled_at, fila.checked_at, ahoraMs),
          fechaIso: fila.scheduled_at,
          verificadoEn: fila.checked_at
        }, ahoraMs),
        identidadFuente: {
          competenciaSlug: fila.competition_slug,
          temporada: fila.season,
          proveedor: fila.provider,
          idProveedor: fila.provider_fixture_id
        }
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

function presentarPartidoSeoPublico(partido: PartidoSeoAdministrable): PartidoSeoPublico {
  return {
    slug: partido.slug,
    slugsAlternos: partido.slugsAlternos,
    competencia: partido.competencia,
    temporada: partido.temporada,
    jornada: partido.jornada,
    fechaIso: partido.fechaIso,
    local: partido.local,
    visitante: partido.visitante,
    estado: partido.estado,
    golesLocal: partido.golesLocal,
    golesVisitante: partido.golesVisitante,
    estadio: partido.estadio,
    ciudad: partido.ciudad,
    fuenteOficialUrl: partido.fuenteOficialUrl,
    escudoLocal: partido.escudoLocal,
    escudoVisitante: partido.escudoVisitante,
    equipoLocalSlug: partido.equipoLocalSlug,
    equipoVisitanteSlug: partido.equipoVisitanteSlug,
    verificadoEn: partido.verificadoEn,
    estadoFrescura: partido.estadoFrescura,
    transmisiones: partido.transmisiones
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
  return {
    ...partido,
    transmisiones: await listarProgramacionesTransmisionPublicas(cliente, partido.slug)
  }
}

export async function listarProgramacionesTransmisionPublicas(
  cliente: SupabaseClient,
  matchSlug: string
): Promise<ProgramacionTransmisionPublica[]> {
  const { data, error } = await cliente
    .from('colombian_match_broadcast_options')
    .select('id,match_slug,country_code,channel,platform,distribution_type,source_url,status,verified_at,notes')
    .eq('match_slug', matchSlug)
    .eq('status', 'confirmed')
    .not('verified_at', 'is', null)
    .order('country_code', { ascending: true })
    .order('channel', { ascending: true })
    .limit(30)

  if (error) {
    // La ficha de partido puede desplegarse antes que esta ampliación de esquema.
    if (error.code === '42P01' || error.code === 'PGRST205') return []
    throw createError({ statusCode: 503, statusMessage: 'La programación pública no está disponible.' })
  }

  return (data || []).flatMap((fila) => {
    if (fila.status !== 'confirmed' || !fila.verified_at || !fila.source_url) return []
    return [{
      id: fila.id,
      matchSlug: fila.match_slug,
      countryCode: fila.country_code,
      channel: fila.channel,
      platform: fila.platform,
      distributionType: fila.distribution_type,
      sourceUrl: fila.source_url,
      status: fila.status,
      verifiedAt: fila.verified_at,
      notes: fila.notes
    }]
  })
}

export async function listarSlugsConTransmisionVerificada(
  cliente: SupabaseClient
): Promise<Set<string>> {
  const { data, error } = await cliente
    .from('colombian_match_broadcast_options')
    .select('match_slug')
    .eq('status', 'confirmed')
    .not('verified_at', 'is', null)
    .limit(5000)

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return new Set()
    throw createError({ statusCode: 503, statusMessage: 'No se pudo validar el sitemap de partidos.' })
  }
  return new Set((data || []).map(fila => fila.match_slug))
}

function normalizarNombreEquipo(nombre: string): string {
  return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Solo resuelve enlaces cuando el slug procede de una fila pública y autorizada. */
export function crearMapaSlugsEquiposPublicos(filas: FilaEscudoEquipo[]): Map<string, string> {
  const slugsPorClave = new Map<string, string | null>()
  for (const fila of filas) {
    if (fila.is_public !== true || fila.publication_rights_confirmed !== true
      || typeof fila.team_name !== 'string' || !fila.team_name.trim()
      || typeof fila.team_key !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fila.team_key)) continue

    const clave = normalizarClaveEquipoLiga(fila.team_name)
    if (!clave) continue
    const previo = slugsPorClave.get(clave)
    if (previo === undefined) slugsPorClave.set(clave, fila.team_key)
    else if (previo !== fila.team_key) slugsPorClave.set(clave, null)
  }

  return new Map([...slugsPorClave.entries()].flatMap(([clave, slug]) =>
    slug ? [[clave, slug] as const] : []
  ))
}

/** Nombres documentados que los feeds oficiales usan indistintamente para el mismo club. */
export function normalizarClaveEquipoLiga(nombre: string): string {
  const normalizado = normalizarNombreEquipo(nombre)
  const alias: Record<string, string> = {
    'bogota': 'bogota fc',
    'bogota f c': 'bogota fc',
    'bogota fc': 'bogota fc',
    'envigado f c': 'envigado',
    'envigado fc': 'envigado',
    'envigado': 'envigado',
    'fortaleza ceif': 'fortaleza',
    'fortaleza': 'fortaleza',
    'deportivo pereira fc': 'deportivo pereira',
    'deportivo pereira': 'deportivo pereira',
    'jaguares de cordoba fc': 'jaguares de cordoba',
    'jaguares f c': 'jaguares de cordoba',
    'jaguares': 'jaguares de cordoba',
    'jaguares de cordoba': 'jaguares de cordoba',
    'independiente medellin': 'independiente medellin',
    'ind medellin': 'independiente medellin',
    'independiente santa fe': 'independiente santa fe',
    'santa fe': 'independiente santa fe',
    'patriotas boyaca': 'patriotas boyaca',
    'patriotas f c': 'patriotas boyaca',
    'patriotas': 'patriotas boyaca',
    'barranquilla': 'barranquilla fc',
    'barranquilla f c': 'barranquilla fc',
    'barranquilla fc': 'barranquilla fc',
    'internacional palmira': 'internacional fc de palmira',
    'internacional fc palmira': 'internacional fc de palmira',
    'internacional f c de palmira': 'internacional fc de palmira',
    'internacional fc de palmira': 'internacional fc de palmira',
    'llaneros f c': 'llaneros',
    'llaneros fc': 'llaneros',
    'llaneros': 'llaneros',
    'ind yumbo': 'independiente valle del cauca',
    'independiente yumbo': 'independiente valle del cauca',
    'independiente valle del cauca': 'independiente valle del cauca',
    'tigres fc': 'tigres',
    'tigres': 'tigres',
    'alianza': 'alianza valledupar',
    'alianza valledupar f c': 'alianza valledupar',
    'alianza valledupar': 'alianza valledupar',
    'atletico f c': 'atletico fc',
    'atletico fc': 'atletico fc',
    'boyaca chico f c': 'boyaca chico',
    'boyaca chico': 'boyaca chico',
    'junior f c': 'junior',
    'junior': 'junior',
    'leones f c': 'leones',
    'leones fc': 'leones',
    'leones': 'leones',
    'millonarios f c': 'millonarios',
    'millonarios fc': 'millonarios',
    'millonarios': 'millonarios',
    'once caldas daf': 'once caldas',
    'once caldas': 'once caldas',
    'orsomarso s c': 'orsomarso',
    'orsomarso': 'orsomarso',
    'real santander s a': 'real santander',
    'real santander': 'real santander',
    'tigres f c': 'tigres'
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
