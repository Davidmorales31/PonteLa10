import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import {
  descargarTablasPosicionesDimayor,
  proyectarTablasDimayorAutorizadas,
  type BaseTablaLigaAutorizada
} from '~/server/utils/tablaPosicionesDimayor'

const limiteCuerpoBytes = 1_024

/** Actualiza Liga A y B con sus tablas oficiales, no con cuotas de APIs. */
export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const cuerpo = await leerCuerpoFirmado(evento, limiteCuerpoBytes)
  await verificarFirmaCodex(evento, cuerpo, String(config.footballWorkerApiSecret || ''))
  if (!esObjetoVacio(decodificarJsonFirmado<unknown>(cuerpo))) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La actualización de posiciones no acepta parámetros.',
      data: { codigo: 'ACTIVACION_TABLA_DIMAYOR_INVALIDA' }
    })
  }
  if (config.futbolDerechosPublicacionConfirmados !== true) {
    return { estado: 'derechos_no_confirmados', solicitudes: 0, posicionesPublicasActualizadas: 0 }
  }

  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) {
    throw createError({
      statusCode: 503,
      statusMessage: 'El worker privado de fútbol no está configurado.',
      data: { codigo: 'WORKER_FUTBOL_NO_CONFIGURADO' }
    })
  }

  const respuestaReserva = await cliente.rpc('claim_dimayor_standings_sync')
  if (respuestaReserva.error || (respuestaReserva.data !== null
    && (typeof respuestaReserva.data !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(respuestaReserva.data)))) {
    throw createError({ statusCode: 503, statusMessage: 'No se pudo reservar la actualización segura de DIMAYOR.' })
  }
  if (respuestaReserva.data === null) {
    return {
      estado: 'omitido',
      causa: 'actualizacion_reciente_o_en_curso',
      fuente: 'DIMAYOR',
      solicitudes: 0,
      posicionesPublicasActualizadas: 0
    }
  }

  const tokenReserva = respuestaReserva.data
  try {
    const tablas = await descargarTablasPosicionesDimayor()

    const respuestaBase = await cliente.from('colombian_league_standings')
      .select('competition_slug,season,phase,team_key,team_name,is_public,publication_rights_confirmed')
      .in('competition_slug', ['liga-betplay', 'torneo-betplay'])
      .eq('is_public', true).eq('publication_rights_confirmed', true)
      .limit(200)
    if (respuestaBase.error || !respuestaBase.data) {
      throw createError({ statusCode: 503, statusMessage: 'No se pudo leer la tabla colombiana autorizada.' })
    }

    const actualizaciones = proyectarTablasDimayorAutorizadas(
      tablas,
      respuestaBase.data as BaseTablaLigaAutorizada[],
      fechaNegocioBogota()
    )
    if (!actualizaciones.length) {
      throw createError({
        statusCode: 503,
        statusMessage: 'La tabla oficial no cubre exactamente todas las filas autorizadas activas; se conservaron los datos actuales.',
        data: { codigo: 'TABLA_DIMAYOR_INCOMPLETA' }
      })
    }

    const { data, error } = await cliente.rpc('actualizar_posiciones_liga_dimayor', {
      p_claim_token: tokenReserva,
      p_actualizaciones: actualizaciones.map(fila => ({
        competition_slug: fila.competition_slug,
        season: fila.season,
        phase: fila.phase,
        team_key: fila.team_key,
        position: fila.position,
        played: fila.played,
        won: fila.won,
        drawn: fila.drawn,
        lost: fila.lost,
        goals_for: fila.goals_for,
        goals_against: fila.goals_against,
        goal_difference: fila.goal_difference,
        points: fila.points,
        source_name: fila.source_name,
        source_url: fila.source_url
      }))
    })
    if (error || typeof data !== 'number' || data !== actualizaciones.length) {
      throw createError({
        statusCode: 503,
        statusMessage: 'La actualización completa de posiciones no se confirmó; la base conserva la tabla anterior.',
        data: { codigo: 'TABLA_DIMAYOR_NO_GUARDADA' }
      })
    }

    return {
      estado: 'completado',
      fuente: 'DIMAYOR',
      solicitudes: 0,
      posicionesPublicasActualizadas: data
    }
  } catch (error) {
    try {
      await cliente.rpc('release_dimayor_standings_sync', { p_claim_token: tokenReserva })
    } catch {
      // La lease vence en dos minutos; el error original conserva su diagnóstico.
    }
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    throw createError({
      statusCode: 503,
      statusMessage: 'Falló la actualización oficial de DIMAYOR; se conservaron las posiciones anteriores.',
      data: { codigo: 'TABLA_DIMAYOR_NO_DISPONIBLE' }
    })
  }
})

function esObjetoVacio(valor: unknown): valor is Record<string, never> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) && Object.keys(valor).length === 0
}
