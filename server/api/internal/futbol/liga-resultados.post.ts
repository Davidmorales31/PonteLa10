import { decodificarJsonFirmado, leerCuerpoFirmado, verificarFirmaCodex } from '~/server/utils/codexEditorialPrivado'
import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { fechaNegocioBogota } from '~/server/utils/proveedoresFutbol/configuracionWorkerClasificaciones'
import {
  crearActualizacionesResultadosLiga,
  type FixtureLigaPublicado,
  type SnapshotResultadoLiga
} from '~/server/utils/resultadosLigaPublica'

const limiteCuerpoBytes = 1_024
const columnasFixtures = 'competition_slug,season,provider,provider_fixture_id,scheduled_at,home_team,away_team,status,goals_home,goals_away,checked_at'
const columnasSnapshots = 'provider,league_name,kickoff_at,home_team_name,away_team_name,status,goals_home,goals_away,provider_fetched_at'

/** Reconcilia marcadores recientes sin consultar proveedores ni publicar snapshots privados. */
export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const cuerpo = await leerCuerpoFirmado(evento, limiteCuerpoBytes)
  await verificarFirmaCodex(evento, cuerpo, String(config.footballWorkerApiSecret || ''))
  if (!esObjetoVacio(decodificarJsonFirmado<unknown>(cuerpo))) {
    throw createError({ statusCode: 422, statusMessage: 'La actualización de resultados no acepta parámetros.' })
  }

  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) throw createError({ statusCode: 503, statusMessage: 'El worker privado de fútbol no está configurado.' })
  const fecha = fechaNegocioBogota()
  const desde = new Date(`${fecha}T05:00:00.000Z`).toISOString()
  const hasta = new Date(Date.parse(`${fecha}T05:00:00.000Z`) + 24 * 60 * 60 * 1000).toISOString()
  const [respuestaFixtures, respuestaSnapshots] = await Promise.all([
    cliente.from('colombian_league_fixtures').select(columnasFixtures)
      .in('competition_slug', ['liga-betplay', 'torneo-betplay', 'copa-colombia'])
      .eq('is_public', true).eq('publication_rights_confirmed', true)
      .gte('scheduled_at', desde).lt('scheduled_at', hasta).limit(250),
    cliente.from('football_fixtures_today').select(columnasSnapshots)
      .eq('business_date', fecha).eq('league_country', 'Colombia')
      .in('provider', ['api-football', 'goal-api']).limit(400)
  ])
  if (respuestaFixtures.error || !respuestaFixtures.data || respuestaSnapshots.error || !respuestaSnapshots.data) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudieron reconciliar los resultados verificados.' })
  }

  const actualizaciones = crearActualizacionesResultadosLiga(
    respuestaFixtures.data as unknown as FixtureLigaPublicado[],
    respuestaSnapshots.data as unknown as SnapshotResultadoLiga[]
  )
  let guardadas = 0
  for (const fila of actualizaciones) {
    const { error } = await cliente.from('colombian_league_fixtures').update({
      status: fila.status,
      goals_home: fila.goals_home,
      goals_away: fila.goals_away,
      checked_at: fila.checked_at
    }).eq('competition_slug', fila.competition_slug).eq('season', fila.season)
      .eq('provider', fila.provider).eq('provider_fixture_id', fila.provider_fixture_id)
      .eq('is_public', true).eq('publication_rights_confirmed', true)
    if (error) throw createError({ statusCode: 503, statusMessage: 'No se pudo guardar un resultado confirmado.' })
    guardadas += 1
  }

  return { estado: 'completado', partidosRevisados: respuestaFixtures.data.length, marcadoresActualizados: guardadas }
})

function esObjetoVacio(valor: unknown): valor is Record<string, never> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) && Object.keys(valor).length === 0
}
