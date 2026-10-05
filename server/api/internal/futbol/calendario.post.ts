import {
  decodificarJsonFirmado,
  leerCuerpoFirmado,
  verificarFirmaCodex
} from '~/server/utils/codexEditorialPrivado'
import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { crearProveedorGoalApi } from '~/server/utils/proveedoresFutbol/goalApi'
import { crearReservaDiariaSupabaseFutbol } from '~/server/utils/proveedoresFutbol/presupuestoDiarioSupabase'
import { crearTransporteConPresupuestoDiario } from '~/server/utils/proveedoresFutbol/transporteConPresupuestoDiario'
import {
  sincronizarCalendarioColombiano,
  type FilaCalendarioColombiano
} from '~/server/utils/proveedoresFutbol/sincronizadorCalendarioColombiano'
import {
  debeDiferirCargaInicialFutbol,
  esperaHastaLasSeisBogota,
  esperaHastaMantenimientoDiarioBogota
} from '~/utils/politicaWorkerFutbol'
import { fechaNegocioBogota } from '~/server/utils/proveedoresFutbol/configuracionWorkerClasificaciones'

const limiteCuerpoBytes = 1_024
const esperaReintentoMs = 30 * 60_000

/** Worker local autenticado; no se publica como cron ni acepta fechas del cliente. */
export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const secretoWorker = typeof config.footballWorkerApiSecret === 'string'
    ? config.footballWorkerApiSecret.trim()
    : ''
  if (!secretoWorker) {
    throw createError({
      statusCode: 503,
      statusMessage: 'El worker privado de fútbol no está configurado.',
      data: { codigo: 'WORKER_FUTBOL_NO_CONFIGURADO' }
    })
  }
  const cuerpo = await leerCuerpoFirmado(evento, limiteCuerpoBytes)
  await verificarFirmaCodex(evento, cuerpo, secretoWorker)

  const entrada = decodificarJsonFirmado<unknown>(cuerpo)
  if (!esObjetoVacio(entrada)) {
    throw createError({
      statusCode: 422,
      statusMessage: 'La activación del calendario no acepta parámetros.',
      data: { codigo: 'ACTIVACION_CALENDARIO_INVALIDA' }
    })
  }

  const ahora = new Date()
  if (debeDiferirCargaInicialFutbol(ahora)) {
    return {
      estado: 'diferido_ventana_sin_partidos',
      provider: 'goal-api',
      solicitudes: 0,
      fixturesRecibidos: 0,
      fixturesGuardados: 0,
      siguienteEjecucionMs: esperaHastaLasSeisBogota(ahora),
      siguienteEjecucionMotivo: 'calendario_diferido_hasta_las_seis_bogota'
    }
  }

  const fechaNegocio = fechaNegocioBogota()
  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) {
    throw createError({
      statusCode: 503,
      statusMessage: 'El worker privado de fútbol no está configurado.',
      data: { codigo: 'WORKER_FUTBOL_NO_CONFIGURADO' }
    })
  }
  if (typeof config.goalApiKey !== 'string' || !config.goalApiKey.trim()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'El proveedor privado de calendario no está configurado.',
      data: { codigo: 'GOAL_API_NO_CONFIGURADA' }
    })
  }

  const { data: reservaCruda, error: errorReserva } = await cliente.rpc('claim_football_league_calendar_sync', {
    p_business_date: fechaNegocio
  })
  const reserva = leerReservaCalendario(reservaCruda)
  if (errorReserva || !reserva || (reserva.estado === 'claimed' && !reserva.token)) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No fue posible reservar la sincronización del calendario.',
      data: { codigo: 'RESERVA_CALENDARIO_NO_DISPONIBLE' }
    })
  }
  if (reserva.estado === 'completed') {
    return {
      estado: 'ya_sincronizado',
      provider: 'goal-api',
      solicitudes: 0,
      fixturesRecibidos: 0,
      fixturesGuardados: 0,
      siguienteEjecucionMs: esperaHastaLasSeisBogota(ahora),
      siguienteEjecucionMotivo: 'siguiente_sincronizacion_diaria'
    }
  }
  if (reserva.estado === 'busy') {
    return {
      estado: 'ocupado',
      provider: 'goal-api',
      solicitudes: 0,
      fixturesRecibidos: 0,
      fixturesGuardados: 0,
      siguienteEjecucionMs: esperaReintentoMs,
      siguienteEjecucionMotivo: 'otra_sincronizacion_en_curso'
    }
  }
  if (reserva.estado === 'exhausted') {
    return {
      estado: 'sin_cuota',
      provider: 'goal-api',
      solicitudes: 0,
      fixturesRecibidos: 0,
      fixturesGuardados: 0,
      siguienteEjecucionMs: esperaHastaMantenimientoDiarioBogota(ahora),
      siguienteEjecucionMotivo: 'reintentos_diarios_calendario_agotados'
    }
  }

  let solicitudesConsumidas = 0
  try {
    const transporte = crearTransporteConPresupuestoDiario(
      'goal-api', fechaNegocio, crearReservaDiariaSupabaseFutbol(cliente)
    )
    const proveedor = crearProveedorGoalApi({
      apiKey: config.goalApiKey,
      ...(typeof config.goalApiBaseUrl === 'string' && config.goalApiBaseUrl
        ? { baseUrl: config.goalApiBaseUrl }
        : {}),
      transporte
    })
    const resultado = await sincronizarCalendarioColombiano({
      proveedor,
      fechaNegocio,
      derechosPublicacionConfirmados: config.futbolDerechosPublicacionConfirmados === true,
      repositorio: {
        upsertCalendario: async (filas: FilaCalendarioColombiano[]) => {
          const { error } = await cliente
            .from('colombian_league_fixtures')
            .upsert(filas, { onConflict: 'competition_slug,season,provider,provider_fixture_id' })
          if (error) throw new Error('CALENDARIO_UPSERT_FALLIDO')
        }
      }
    })
    solicitudesConsumidas = resultado.solicitudes

    const errorCode = resultado.estado === 'completado'
      ? null
      : resultado.errorCode || 'CALENDARIO_PARCIAL'
    const { error: errorFinalizacion } = await cliente.rpc('finish_football_league_calendar_sync', {
      p_business_date: fechaNegocio,
      p_claim_token: reserva.token,
      p_fixture_count: resultado.fixturesGuardados,
      p_error_code: errorCode
    })
    if (errorFinalizacion) {
      throw new Error('CALENDARIO_CIERRE_RESERVA_FALLIDO')
    }

    return {
      ...resultado,
      provider: 'goal-api',
      siguienteEjecucionMs: resultado.estado === 'completado'
        ? esperaHastaMantenimientoDiarioBogota(ahora)
        : esperaReintentoMs,
      siguienteEjecucionMotivo: resultado.estado === 'completado'
        ? 'calendario_completo_hasta_mantenimiento_bogota'
        : 'reintento_calendario_parcial'
    }
  } catch {
    try {
      await cliente.rpc('finish_football_league_calendar_sync', {
        p_business_date: fechaNegocio,
        p_claim_token: reserva.token,
        p_fixture_count: 0,
        p_error_code: 'CALENDARIO_SYNC_FALLIDA'
      })
    } catch {
      // Se conserva la respuesta segura aunque falle la liberación de la lease.
    }
    return {
      estado: 'fallido',
      provider: 'goal-api',
      solicitudes: solicitudesConsumidas,
      fixturesRecibidos: 0,
      fixturesGuardados: 0,
      errorCode: 'CALENDARIO_SYNC_FALLIDA',
      siguienteEjecucionMs: esperaReintentoMs,
      siguienteEjecucionMotivo: 'reintento_calendario_fallido'
    }
  }
})

function esObjetoVacio(valor: unknown): valor is Record<string, never> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) && Object.keys(valor).length === 0
}

function leerReservaCalendario(valor: unknown): {
  estado: 'claimed' | 'completed' | 'busy' | 'exhausted'
  token: string | null
} | null {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return null
  const registro = valor as Record<string, unknown>
  const estados = ['claimed', 'completed', 'busy', 'exhausted'] as const
  if (typeof registro.status !== 'string' || !estados.includes(registro.status as typeof estados[number])) return null
  const token = typeof registro.claim_token === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(registro.claim_token)
    ? registro.claim_token
    : null
  return { estado: registro.status as typeof estados[number], token }
}
