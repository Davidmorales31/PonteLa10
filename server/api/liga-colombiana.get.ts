import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarPartidosSeoPublicos } from '~/server/utils/partidosSeoPublicos'

const competiciones = ['liga-betplay', 'torneo-betplay', 'copa-colombia']
const columnasTabla = [
  'competition_slug', 'season', 'phase', 'team_key', 'team_name', 'position', 'played',
  'won', 'drawn', 'lost', 'goals_for', 'goals_against', 'goal_difference', 'points',
  'team_logo_url', 'checked_at', 'is_public', 'publication_rights_confirmed'
].join(',')

interface FilaTablaLiga {
  competition_slug: string
  season: string
  phase: string
  team_key: string
  team_name: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  team_logo_url: string | null
  checked_at: string
}

export default defineCachedEventHandler(async (evento) => {
  const cliente = obtenerClienteSupabaseEditorial(evento)
  const ahora = new Date()
  const desde = ahora.getTime() - 45 * 24 * 60 * 60 * 1000
  const hasta = ahora.getTime() + 90 * 24 * 60 * 60 * 1000
  const [todosLosPartidos, posiciones] = await Promise.all([
    listarPartidosSeoPublicos(cliente),
    cliente.from('colombian_league_standings')
      .select(columnasTabla)
      .in('competition_slug', competiciones)
      .eq('is_public', true)
      .eq('publication_rights_confirmed', true)
      .order('competition_slug', { ascending: true })
      .order('phase', { ascending: true })
      .order('position', { ascending: true })
      .limit(100)
  ])

  const filasPosiciones = (posiciones.data || []) as unknown as FilaTablaLiga[]
  const fixtures = todosLosPartidos
    .filter(partido => Date.parse(partido.fechaIso) >= desde && Date.parse(partido.fechaIso) <= hasta
      && competiciones.includes(partido.competencia))
    .map(partido => ({
      slug: partido.slug,
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
      verificadoEn: partido.verificadoEn
    }))
    .slice(0, 80)

  const tabla = posiciones.error ? [] : filasPosiciones.map((fila) => ({
    competencia: fila.competition_slug,
    temporada: fila.season,
    fase: fila.phase,
    equipoClave: fila.team_key,
    equipo: fila.team_name,
    posicion: fila.position,
    jugados: fila.played,
    ganados: fila.won,
    empatados: fila.drawn,
    perdidos: fila.lost,
    golesFavor: fila.goals_for,
    golesContra: fila.goals_against,
    diferencia: fila.goal_difference,
    puntos: fila.points,
    escudo: normalizarRutaEscudo(fila.team_logo_url),
    verificadoEn: fila.checked_at
  }))

  const verificados = [...todosLosPartidos, ...tabla]
    .map(fila => fila.verificadoEn)
    .filter((valor): valor is string => typeof valor === 'string')
    .sort((a, b) => Date.parse(b) - Date.parse(a))

  setResponseHeader(evento, 'Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600')
  return {
    estado: fixtures.length || tabla.length ? 'disponible' as const : 'sin_datos' as const,
    partidos: fixtures,
    tabla,
    actualizadoEn: verificados[0] || null,
    consultadoEn: ahora.toISOString()
  }
}, {
  maxAge: 300,
  swr: true,
  getKey: () => 'liga-colombiana-publica-v1'
})

function normalizarRutaEscudo(valor: unknown): string | null {
  if (typeof valor !== 'string' || !/^\/images\/escudos\/liga-colombiana\/[a-z0-9-]+\.png$/.test(valor)) {
    return null
  }
  return valor
}
