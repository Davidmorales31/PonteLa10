import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { crearProveedoresFutbolConfigurados } from '~/server/utils/proveedoresFutbol/desdeConfiguracion'
import {
  crearGateReservaClasificaciones,
  fechaNegocioBogota,
  leerAllowlistClasificacionesFutbol
} from '~/server/utils/proveedoresFutbol/configuracionWorkerClasificaciones'
import { crearRepositorioSnapshotsSupabase } from '~/server/utils/proveedoresFutbol/repositorioSnapshotsSupabase'
import { crearReservaDiariaSupabaseFutbol } from '~/server/utils/proveedoresFutbol/presupuestoDiarioSupabase'
import { sincronizarClasificacionesFutbol } from '~/server/utils/proveedoresFutbol/sincronizadorClasificaciones'
import { proyectarClasificacionLigaPublica, type FilaClasificacionLigaBase, type SnapshotClasificacionLigaPrivada } from '~/server/utils/clasificacionLigaPublica'

const limiteCuerpoBytes = 1_024

/** Activación interna firmada; no configura cron ni acepta objetivos del cliente. */
export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const cuerpo = await leerCuerpoFirmado(evento, limiteCuerpoBytes)
  await verificarFirmaCodex(evento, cuerpo, String(config.footballWorkerApiSecret || ''))

  const entrada = decodificarJsonFirmado<unknown>(cuerpo)
  if (!esObjetoVacio(entrada)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La activación de clasificaciones no acepta parámetros.',
      data: { codigo: 'ACTIVACION_CLASIFICACIONES_INVALIDA' }
    })
  }

  let objetivos
  try {
    objetivos = leerAllowlistClasificacionesFutbol(config.footballStandingsAllowlist)
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'La allowlist privada de clasificaciones no está configurada correctamente.',
      data: { codigo: 'ALLOWLIST_CLASIFICACIONES_INVALIDA' }
    })
  }
  if (!objetivos.length) {
    return { estado: 'sin_objetivos', solicitudes: 0, clasificacionesGuardadas: 0 }
  }

  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) {
    throw createError({
      statusCode: 503,
      statusMessage: 'El worker privado de fútbol no está configurado.',
      data: { codigo: 'WORKER_FUTBOL_NO_CONFIGURADO' }
    })
  }

  let proveedores
  try {
    proveedores = crearProveedoresFutbolConfigurados(config, {
      fechaNegocio: fechaNegocioBogota(),
      reservarPeticion: crearReservaDiariaSupabaseFutbol(cliente)
    })
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'El proveedor privado de fútbol no está configurado.',
      data: { codigo: 'PROVEEDOR_FUTBOL_NO_CONFIGURADO' }
    })
  }

  const repositorio = crearRepositorioSnapshotsSupabase(cliente)
  const fechaNegocio = fechaNegocioBogota()
  const resultado = await sincronizarClasificacionesFutbol({
    ...proveedores,
    repositorio,
    fechaNegocio,
    objetivos,
    // Reserva atómica por proveedor antes de cada llamada, incluso en fallback.
    puedeConsumir: crearGateReservaClasificaciones(provider => repositorio.reclamarVentanaWorker(provider, 'standings'))
  })
  if (resultado.estado !== 'completado' || config.futbolDerechosPublicacionConfirmados !== true) return resultado
  const posicionesPublicasActualizadas = await actualizarTablaLigaPublica(cliente, fechaNegocio)
  return { ...resultado, posicionesPublicasActualizadas }
})

async function actualizarTablaLigaPublica(cliente: ReturnType<typeof obtenerClienteSupabasePrivado> & {}, fechaNegocio: string): Promise<number> {
  const [respuestaSnapshots, respuestaBase] = await Promise.all([
    cliente.from('football_standings_today')
      .select('provider,league_name,season,standings,provider_fetched_at')
      .eq('business_date', fechaNegocio)
      .order('provider_fetched_at', { ascending: false })
      .limit(40),
    cliente.from('colombian_league_standings')
      .select('competition_slug,season,phase,team_key,team_name,team_logo_url,is_public,publication_rights_confirmed')
      .in('competition_slug', ['liga-betplay', 'torneo-betplay'])
      .eq('is_public', true).eq('publication_rights_confirmed', true)
      .limit(200)
  ])
  if (respuestaSnapshots.error || !respuestaSnapshots.data || respuestaBase.error || !respuestaBase.data) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo sincronizar la tabla colombiana autorizada.' })
  }
  const filas = proyectarClasificacionLigaPublica(
    respuestaSnapshots.data as unknown as SnapshotClasificacionLigaPrivada[],
    respuestaBase.data as unknown as FilaClasificacionLigaBase[],
    fechaNegocio
  )
  if (!filas.length) return 0
  const actualizaciones = await Promise.all(filas.map(async (fila) => {
    const { competition_slug, season, phase, team_key, position, played, won, drawn, lost,
      goals_for, goals_against, goal_difference, points, source_name, source_url, checked_at } = fila
    const { data, error } = await cliente.from('colombian_league_standings')
      .update({ position, played, won, drawn, lost, goals_for, goals_against,
        goal_difference, points, source_name, source_url, checked_at })
      .eq('competition_slug', competition_slug).eq('season', season).eq('phase', phase).eq('team_key', team_key)
      // Revalida el permiso dentro de la misma escritura para respetar una revocación concurrente.
      .eq('is_public', true).eq('publication_rights_confirmed', true)
      .select('team_key')
    if (error) throw error
    return data?.length || 0
  }))
  if (actualizaciones.some(resultado => resultado > 1)) {
    throw createError({ statusCode: 503, statusMessage: 'La sincronización encontró filas públicas duplicadas.' })
  }
  return actualizaciones.reduce((total, cantidad) => total + cantidad, 0)
}

function esObjetoVacio(valor: unknown): valor is Record<string, never> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) && Object.keys(valor).length === 0
}
