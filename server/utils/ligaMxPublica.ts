import { ligasMexico } from '~/data/ligaMx'
import { configuracionSitios } from '~/utils/sitio'

export interface FilaPartidoPublicoLigaMx {
  competition_slug: string
  season: string
  tournament: string
  provider_fixture_id: string
  round_name: string
  scheduled_at: string
  home_team: string
  away_team: string
  status: string
  goals_home: number | null
  goals_away: number | null
  venue: string | null
  city: string | null
  checked_at: string
}

export interface FilaPosicionPublicaLigaMx {
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
  checked_at: string
}

export const columnasPartidosLigaMx = 'competition_slug,season,tournament,provider_fixture_id,round_name,scheduled_at,home_team,away_team,status,goals_home,goals_away,venue,city,checked_at'
export const columnasPosicionesLigaMx = 'competition_slug,season,phase,team_key,team_name,position,played,won,drawn,lost,goals_for,goals_against,goal_difference,points,checked_at'

const DIA_MS = 24 * 60 * 60 * 1000

function fechaEnMexico(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: configuracionSitios.mx.zonaHoraria, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(fecha)
}

const nombreLiga = new Map<string, string>(ligasMexico.map(liga => [liga.slug, liga.nombre]))
const ordenLiga = new Map<string, number>(ligasMexico.map((liga, indice) => [liga.slug, indice]))

/** Ventana pública del calendario: 45 días atrás y 90 adelante, ordenado por fecha y liga. */
export function darFormaRespuestaLigaMx(
  partidos: FilaPartidoPublicoLigaMx[],
  posiciones: FilaPosicionPublicaLigaMx[],
  ahora: Date
) {
  const desde = ahora.getTime() - 45 * DIA_MS
  const hasta = ahora.getTime() + 90 * DIA_MS
  const hoy = fechaEnMexico(ahora)

  const calendario = partidos
    .filter(fila => nombreLiga.has(fila.competition_slug))
    .map(fila => ({
      id: fila.provider_fixture_id,
      competencia: fila.competition_slug,
      competenciaNombre: nombreLiga.get(fila.competition_slug) || fila.competition_slug,
      temporada: fila.season,
      torneo: fila.tournament,
      jornada: fila.round_name,
      fechaIso: fila.scheduled_at,
      fechaMexico: fechaEnMexico(new Date(fila.scheduled_at)),
      local: fila.home_team,
      visitante: fila.away_team,
      estado: fila.status,
      golesLocal: fila.goals_home,
      golesVisitante: fila.goals_away,
      estadio: fila.venue,
      ciudad: fila.city,
      verificadoEn: fila.checked_at
    }))
    .filter(fila => {
      const instante = Date.parse(fila.fechaIso)
      return instante >= desde && instante <= hasta
    })
    .sort((a, b) => Date.parse(a.fechaIso) - Date.parse(b.fechaIso)
      || (ordenLiga.get(a.competencia) ?? 9) - (ordenLiga.get(b.competencia) ?? 9))

  const tabla = posiciones
    .filter(fila => nombreLiga.has(fila.competition_slug))
    .map(fila => ({
      competencia: fila.competition_slug,
      competenciaNombre: nombreLiga.get(fila.competition_slug) || fila.competition_slug,
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
      verificadoEn: fila.checked_at
    }))
    .sort((a, b) => (ordenLiga.get(a.competencia) ?? 9) - (ordenLiga.get(b.competencia) ?? 9)
      || a.temporada.localeCompare(b.temporada) || a.fase.localeCompare(b.fase) || a.posicion - b.posicion)

  const verificados = [...calendario, ...tabla].map(fila => fila.verificadoEn)
    .sort((a, b) => Date.parse(b) - Date.parse(a))

  return {
    estado: calendario.length || tabla.length ? 'disponible' as const : 'sin_datos' as const,
    hoyMexico: hoy,
    partidos: calendario,
    tabla,
    actualizadoEn: verificados[0] || null,
    consultadoEn: ahora.toISOString()
  }
}
