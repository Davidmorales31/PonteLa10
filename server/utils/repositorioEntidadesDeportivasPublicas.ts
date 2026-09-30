import { createClient } from '@supabase/supabase-js'
import type {
  MapeoProveedorDeportivo,
  ProveedorDeportivo,
  TipoEntidadDeportiva
} from '~/types/entidadesDeportivas'
import { crearResolverIdentidadDeportiva, type ResolverIdentidadDeportiva } from '~/utils/entidadesDeportivas'

const maximoIdsExternosPorConsulta = 100

interface ConfiguracionPublicaSupabase {
  supabaseUrl?: unknown
  supabaseKey?: unknown
}

interface FilaMapeoProveedor {
  provider: string
  entity_type: string
  external_id: string
  competition_id: string | null
  team_id: string | null
  player_id: string | null
  fixture_id: string | null
  sports_fixtures: { slug: string } | { slug: string }[] | null
}

interface FilaMapeoPartidoProveedor {
  provider: string
  external_id: string
}

interface ConfiguracionPrivadaProveedores {
  apiSportsKey?: unknown
}

export async function obtenerResolverIdentidadDeportiva(
  configuracion: ConfiguracionPublicaSupabase | undefined,
  proveedor: ProveedorDeportivo,
  identificadoresExternos: readonly (string | number | null | undefined)[]
): Promise<ResolverIdentidadDeportiva> {
  const resolverVacio = crearResolverIdentidadDeportiva([])
  const supabaseUrl = String(configuracion?.supabaseUrl || '')
  const supabaseKey = String(configuracion?.supabaseKey || '')
  const idsExternos = [...new Set(identificadoresExternos
    .map(id => typeof id === 'number' ? String(id) : id)
    .filter((id): id is string => typeof id === 'string' && esIdExternoSeguro(id))
  )].slice(0, maximoIdsExternosPorConsulta)

  if (!supabaseUrl || !supabaseKey || !idsExternos.length) return resolverVacio

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      },
      global: {
        fetch: fetchConTiempoLimite
      }
    })
    const { data, error } = await supabase
      .from('sports_provider_mappings')
      .select('provider, entity_type, external_id, competition_id, team_id, player_id, fixture_id, sports_fixtures(slug)')
      .eq('provider', proveedor)
      .in('external_id', idsExternos)

    if (error || !data) return resolverVacio

    const mapeos = (data as FilaMapeoProveedor[])
      .flatMap((fila): MapeoProveedorDeportivo[] => {
        const tipoEntidad = normalizarTipoEntidad(fila.entity_type)
        const idInterno = obtenerIdInterno(fila, tipoEntidad)
        if (fila.provider !== proveedor || !tipoEntidad || !idInterno) return []

        const fixture = Array.isArray(fila.sports_fixtures) ? fila.sports_fixtures[0] : fila.sports_fixtures
        return [{
          proveedor,
          tipoEntidad,
          idExterno: fila.external_id,
          idInterno,
          ...(tipoEntidad === 'fixture' && fixture?.slug ? { slugInterno: fixture.slug } : {})
        }]
      })

    return crearResolverIdentidadDeportiva(mapeos)
  } catch {
    // El catálogo interno es opcional: si Supabase falta, los resultados actuales siguen funcionando.
    return resolverVacio
  }
}

export async function obtenerIdProveedorPorSlugPartido(
  configuracion: ConfiguracionPublicaSupabase | undefined,
  configuracionPrivada: ConfiguracionPrivadaProveedores | undefined,
  slug: string
): Promise<string | undefined> {
  const supabaseUrl = String(configuracion?.supabaseUrl || '')
  const supabaseKey = String(configuracion?.supabaseKey || '')
  if (!supabaseUrl || !supabaseKey) return undefined

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      },
      global: { fetch: fetchConTiempoLimite }
    })
    const { data: fixture, error: errorFixture } = await supabase
      .from('sports_fixtures')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (errorFixture) throw new Error('No fue posible resolver la identidad del partido.')
    if (!fixture?.id) return undefined

    const { data: mapeos, error: errorMapeos } = await supabase
      .from('sports_provider_mappings')
      .select('provider, external_id')
      .eq('entity_type', 'fixture')
      .eq('fixture_id', fixture.id)

    if (errorMapeos) throw new Error('No fue posible consultar el proveedor del partido.')

    const proveedorPrincipalDisponible = Boolean(configuracionPrivada?.apiSportsKey)
    const listaMapeos = (mapeos || []) as FilaMapeoPartidoProveedor[]
    const idApiSports = listaMapeos
      .find(mapeo => mapeo.provider === 'api-sports' && /^\d+$/.test(mapeo.external_id))?.external_id
    if (proveedorPrincipalDisponible && idApiSports) return idApiSports

    const idTheSportsDb = listaMapeos
      .find(mapeo => mapeo.provider === 'the-sports-db' && /^\d+$/.test(mapeo.external_id))?.external_id
    if (idTheSportsDb) return `tsdb-${idTheSportsDb}`

    return undefined
  } catch {
    // No se revela si una identidad pública existe cuando falla su almacén.
    throw new Error('No fue posible resolver la URL del partido.')
  }
}

function fetchConTiempoLimite(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const limite = AbortSignal.timeout(2_500)
  const signal = init?.signal
    ? AbortSignal.any([init.signal, limite])
    : limite

  return fetch(input, { ...init, signal })
}

function esIdExternoSeguro(id: string): boolean {
  return id.length >= 1 && id.length <= 128 && id === id.trim() && !/\p{Cc}/u.test(id)
}

function normalizarTipoEntidad(valor: string): TipoEntidadDeportiva | undefined {
  if (valor === 'competition' || valor === 'team' || valor === 'player' || valor === 'fixture') return valor
  return undefined
}

function obtenerIdInterno(
  fila: FilaMapeoProveedor,
  tipoEntidad: TipoEntidadDeportiva | undefined
): string | undefined {
  if (tipoEntidad === 'competition') return fila.competition_id || undefined
  if (tipoEntidad === 'team') return fila.team_id || undefined
  if (tipoEntidad === 'player') return fila.player_id || undefined
  if (tipoEntidad === 'fixture') return fila.fixture_id || undefined
  return undefined
}
