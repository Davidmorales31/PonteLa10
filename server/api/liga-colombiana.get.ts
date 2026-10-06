import { getQuery } from 'h3'
import { obtenerClienteSupabaseEditorial } from '~/server/utils/clienteSupabaseEditorial'
import { listarPartidosSeoPublicos } from '~/server/utils/partidosSeoPublicos'
import { obtenerRangoMesBogota } from '~/server/utils/rangoMesBogota'

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

export default defineEventHandler(async (evento) => {
  const consultaMes = getQuery(evento).mes
  const mesSolicitado = consultaMes === undefined ? null : typeof consultaMes === 'string' ? consultaMes : ''
  const rangoMes = mesSolicitado === null ? null : obtenerRangoMesBogota(mesSolicitado)
  if (mesSolicitado !== null && !rangoMes) {
    throw createError({ statusCode: 400, statusMessage: 'El mes debe usar el formato AAAA-MM.' })
  }

  const cliente = obtenerClienteSupabaseEditorial(evento)
  const ahora = new Date()
  const desde = ahora.getTime() - 45 * 24 * 60 * 60 * 1000
  const hasta = ahora.getTime() + 90 * 24 * 60 * 60 * 1000
  const hoy = fechaEnBogota(ahora)
  const inicioHoy = Date.parse(`${hoy}T05:00:00.000Z`)
  const inicioManana = inicioHoy + 24 * 60 * 60 * 1000
  const inicioOctavoDia = inicioHoy + 8 * 24 * 60 * 60 * 1000
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
  const mapearPartido = (partido: (typeof todosLosPartidos)[number]) => ({
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
  })
  const fixturesEnVentana = todosLosPartidos
    .filter(partido => Date.parse(partido.fechaIso) >= desde && Date.parse(partido.fechaIso) <= hasta
      && competiciones.includes(partido.competencia))
    .map(mapearPartido)
  const fixturesDelMes = rangoMes
    ? todosLosPartidos.filter(partido => {
      const inicio = Date.parse(partido.fechaIso)
      return inicio >= rangoMes.desde && inicio < rangoMes.hasta && competiciones.includes(partido.competencia)
    }).sort(ordenarPorFecha).slice(0, 120).map(mapearPartido)
    : null
  const fixturesHoy = fixturesEnVentana.filter(partido => {
    const inicio = Date.parse(partido.fechaIso)
    return inicio >= inicioHoy && inicio < inicioManana
  })
  const recientes = fixturesEnVentana
    .filter(partido => Date.parse(partido.fechaIso) < inicioHoy && /finish|full.?time|\bft\b|final/i.test(partido.estado || ''))
    .sort((a, b) => Date.parse(b.fechaIso) - Date.parse(a.fechaIso))
    .slice(0, 24)
  const proximos = fixturesEnVentana
    .filter(partido => Date.parse(partido.fechaIso) >= inicioManana && Date.parse(partido.fechaIso) < inicioOctavoDia)
    .sort(ordenarPorFecha)
    .slice(0, 32)
  const masAdelante = fixturesEnVentana
    .filter(partido => Date.parse(partido.fechaIso) >= inicioOctavoDia)
    .sort(ordenarPorFecha)
    .slice(0, 24)
  const fixtures = fixturesDelMes || [...new Map([...recientes, ...fixturesHoy, ...proximos, ...masAdelante]
    .map(partido => [`${partido.competencia}|${partido.temporada}|${partido.slug}`, partido])).values()]
    .sort(ordenarPorFecha)

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

  setResponseHeader(evento, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=60')
  return {
    estado: fixtures.length || tabla.length ? 'disponible' as const : 'sin_datos' as const,
    partidos: fixtures,
    tabla,
    actualizadoEn: verificados[0] || null,
    consultadoEn: ahora.toISOString()
  }
})

function normalizarRutaEscudo(valor: unknown): string | null {
  if (typeof valor !== 'string' || !/^\/images\/escudos\/liga-colombiana\/[a-z0-9-]+\.png$/.test(valor)) {
    return null
  }
  return valor
}

function fechaEnBogota(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(fecha)
}

function prioridadCompetencia(competencia: string): number {
  return competencia === 'liga-betplay' ? 0 : competencia === 'copa-colombia' ? 1 : 2
}

function ordenarPorFecha(a: { fechaIso: string, competencia: string }, b: { fechaIso: string, competencia: string }): number {
  return Date.parse(a.fechaIso) - Date.parse(b.fechaIso)
    || prioridadCompetencia(a.competencia) - prioridadCompetencia(b.competencia)
}
