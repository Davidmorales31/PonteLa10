import type { PartidoResultado, RespuestaResultados } from '~/types/resultados'
import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { crearNombreCorto } from '~/utils/resultadosDeportivos'
import { obtenerFechaEnZonaHoraria, zonaHorariaColombia } from '~/utils/zonasHorarias'

type FilaFixtureCanonico = {
  id: string
  scheduled_at: string
  competition_id: string
  home_team_id: string
  away_team_id: string
}

type FilaNombreCanonico = { id: string; name: string }

export default defineEventHandler(async (evento): Promise<RespuestaResultados> => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'No encontrado.' })
  }

  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) {
    return respuestaVacia('Calendario local no disponible: falta configurar el acceso privado de Supabase en el servidor.')
  }

  const fechaNegocio = obtenerFechaEnZonaHoraria(new Date(), zonaHorariaColombia)
  const inicioDiaUtc = Date.parse(`${fechaNegocio}T05:00:00.000Z`)
  if (!Number.isFinite(inicioDiaUtc)) return respuestaVacia('No se pudo calcular la fecha local de los partidos.')

  const ahora = Date.now()
  const { data: datosFixtures, error: errorFixtures } = await cliente
    .from('sports_fixtures')
    .select('id,scheduled_at,competition_id,home_team_id,away_team_id')
    .gte('scheduled_at', new Date(Math.max(inicioDiaUtc, ahora)).toISOString())
    .lt('scheduled_at', new Date(inicioDiaUtc + 24 * 60 * 60_000).toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(100)
  if (errorFixtures || !Array.isArray(datosFixtures)) {
    return respuestaVacia('Calendario local no disponible: no se pudo leer el calendario de Supabase.')
  }

  const fixtures = datosFixtures as unknown as FilaFixtureCanonico[]
  if (!fixtures.length) return respuestaVacia('No hay partidos futuros registrados para hoy.')

  const idsCompetencias = [...new Set(fixtures.map(fixture => fixture.competition_id))]
  const idsEquipos = [...new Set(fixtures.flatMap(fixture => [fixture.home_team_id, fixture.away_team_id]))]
  const [respuestaCompetencias, respuestaEquipos] = await Promise.all([
    cliente.from('sports_competitions').select('id,name').in('id', idsCompetencias),
    cliente.from('sports_teams').select('id,name').in('id', idsEquipos)
  ])
  if (respuestaCompetencias.error || respuestaEquipos.error
    || !Array.isArray(respuestaCompetencias.data) || !Array.isArray(respuestaEquipos.data)) {
    return respuestaVacia('Calendario local no disponible: no se pudieron leer los equipos y torneos.')
  }

  const nombresCompetencias = new Map((respuestaCompetencias.data as unknown as FilaNombreCanonico[])
    .map(fila => [fila.id, fila.name]))
  const nombresEquipos = new Map((respuestaEquipos.data as unknown as FilaNombreCanonico[])
    .map(fila => [fila.id, fila.name]))
  const partidos: PartidoResultado[] = fixtures.flatMap((fixture) => {
    const nombreLocal = nombresEquipos.get(fixture.home_team_id)?.trim()
    const nombreVisitante = nombresEquipos.get(fixture.away_team_id)?.trim()
    const fechaIso = fixture.scheduled_at
    if (!nombreLocal || !nombreVisitante || !Number.isFinite(Date.parse(fechaIso)) || Date.parse(fechaIso) < ahora) {
      return []
    }
    return [{
      id: fixture.id,
      deporte: 'futbol',
      competencia: nombresCompetencias.get(fixture.competition_id)?.trim() || 'Fútbol colombiano',
      fechaIso,
      estado: 'programado',
      equipoLocal: {
        id: fixture.home_team_id,
        nombre: nombreLocal,
        nombreCorto: crearNombreCorto(nombreLocal)
      },
      equipoVisitante: {
        id: fixture.away_team_id,
        nombre: nombreVisitante,
        nombreCorto: crearNombreCorto(nombreVisitante)
      }
    }]
  })

  return {
    partidos,
    clasificacion: [],
    actualizadoEn: new Date().toISOString(),
    origen: 'base-datos',
    aviso: partidos.length
      ? 'Calendario local de respaldo: marcador y estado en vivo esperan la sincronización del proveedor.'
      : 'No hay partidos futuros registrados para hoy.'
  }
})

function respuestaVacia(aviso: string): RespuestaResultados {
  return {
    partidos: [],
    clasificacion: [],
    actualizadoEn: new Date().toISOString(),
    origen: 'base-datos',
    aviso
  }
}
