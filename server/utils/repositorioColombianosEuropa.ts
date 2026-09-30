import { createClient } from '@supabase/supabase-js'
import type {
  FilaMembresiaColombianoEuropa,
  RespuestaColombianosEuropa
} from '~/types/colombianosEuropa'
import { esFechaCalendario, filtrarMembresiasEuropeasActivas } from '~/utils/colombianosEuropa'
import { obtenerFechaEnZonaHoraria, zonaHorariaColombia } from '~/utils/zonasHorarias'

const tamanoPaginaMembresias = 500
const maximoMembresiasPublicas = 5_000

interface ConfiguracionPublicaSupabase {
  supabaseUrl?: unknown
  supabaseKey?: unknown
}

interface FilaEntidadDeportivaSupabase {
  id: string
  slug: string
  sport_code: string
  country_code: string | null
  is_public: boolean
  nationality_verified_at?: string | null
}

interface FilaMembresiaSupabase {
  id: string
  player_id: string
  team_id: string
  valid_from: string | null
  valid_until: string | null
  is_public: boolean
  sports_players: (FilaEntidadDeportivaSupabase & {
    display_name: string
    nationality_verified_at: string | null
  }) | (FilaEntidadDeportivaSupabase & {
    display_name: string
    nationality_verified_at: string | null
  })[] | null
  sports_teams: (FilaEntidadDeportivaSupabase & {
    name: string
  }) | (FilaEntidadDeportivaSupabase & {
    name: string
  })[] | null
}

export async function obtenerColombianosEuropa(
  configuracion: ConfiguracionPublicaSupabase | undefined,
  ahora = new Date()
): Promise<RespuestaColombianosEuropa> {
  const actualizadoEn = ahora.toISOString()
  const supabaseUrl = String(configuracion?.supabaseUrl || '')
  const supabaseKey = String(configuracion?.supabaseKey || '')
  const fechaColombia = obtenerFechaEnZonaHoraria(ahora, zonaHorariaColombia)
  if (!supabaseUrl || !supabaseKey || !esFechaCalendario(fechaColombia)) {
    return { disponible: false, actualizadoEn, jugadores: [] }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      },
      global: { fetch: fetchConTiempoLimite }
    })
    const consultaMembresias = () => supabase
      .from('sports_player_memberships')
      .select('id, player_id, team_id, valid_from, valid_until, is_public, sports_players!inner(id, slug, display_name, sport_code, country_code, is_public, nationality_verified_at), sports_teams!inner(id, slug, name, sport_code, country_code, is_public)')
      .eq('is_public', true)
      .eq('sports_players.is_public', true)
      .eq('sports_players.sport_code', 'futbol')
      .eq('sports_players.country_code', 'CO')
      // El CHECK de la migración exige fuente HTTPS cuando hay fecha de verificación;
      // la fuente no se otorga a anon y no se selecciona en la API pública.
      .not('sports_players.nationality_verified_at', 'is', null)
      .lte('sports_players.nationality_verified_at', ahora.toISOString())
      .eq('sports_teams.is_public', true)
      .eq('sports_teams.sport_code', 'futbol')
    const membresias: FilaMembresiaSupabase[] = []
    let catalogoCompleto = false
    let ultimoIdMembresia: string | undefined

    for (let desde = 0; desde < maximoMembresiasPublicas; desde += tamanoPaginaMembresias) {
      const consulta = ultimoIdMembresia
        ? consultaMembresias().gt('id', ultimoIdMembresia)
        : consultaMembresias()
      const { data, error } = await consulta
        .order('id', { ascending: true })
        .limit(tamanoPaginaMembresias)

      if (error || !data) return { disponible: false, actualizadoEn, jugadores: [] }
      const pagina = data as FilaMembresiaSupabase[]
      membresias.push(...pagina)
      if (data.length < tamanoPaginaMembresias) {
        catalogoCompleto = true
        break
      }
      ultimoIdMembresia = pagina.at(-1)?.id
    }

    // Si el catálogo excede el límite operativo, no presentar una lista incompleta como exhaustiva.
    if (!catalogoCompleto) {
      const { data, error } = await consultaMembresias()
        .gt('id', ultimoIdMembresia || '')
        .order('id', { ascending: true })
        .limit(1)
      if (error || !data || data.length > 0) return { disponible: false, actualizadoEn, jugadores: [] }
    }

    const filas: FilaMembresiaColombianoEuropa[] = membresias
      .flatMap((fila) => {
        const jugador = Array.isArray(fila.sports_players) ? fila.sports_players[0] : fila.sports_players
        const equipo = Array.isArray(fila.sports_teams) ? fila.sports_teams[0] : fila.sports_teams
        if (!jugador || !equipo || fila.player_id !== jugador.id || fila.team_id !== equipo.id) return []

        return [{
          jugador: {
            slug: jugador.slug,
            nombre: jugador.display_name,
            codigoPais: jugador.country_code,
            deporte: jugador.sport_code,
            publico: jugador.is_public,
            nacionalidadVerificadaEn: jugador.nationality_verified_at
          },
          membresia: {
            equipoId: fila.team_id,
            desde: fila.valid_from,
            hasta: fila.valid_until,
            publico: fila.is_public
          },
          equipo: {
            id: equipo.id,
            slug: equipo.slug,
            nombre: equipo.name,
            codigoPais: equipo.country_code,
            deporte: equipo.sport_code,
            publico: equipo.is_public
          }
        }]
      })

    return {
      disponible: true,
      actualizadoEn,
      jugadores: filtrarMembresiasEuropeasActivas(filas, fechaColombia)
    }
  } catch {
    // Sin esquema/configuración o ante una falla, la API pública degrada a un estado vacío seguro.
    return { disponible: false, actualizadoEn, jugadores: [] }
  }
}

function fetchConTiempoLimite(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const limite = AbortSignal.timeout(2_500)
  const signal = init?.signal ? AbortSignal.any([init.signal, limite]) : limite
  return fetch(input, { ...init, signal })
}
