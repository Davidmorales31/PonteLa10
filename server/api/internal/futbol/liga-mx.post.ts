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
  sincronizarLigasMexico,
  type FilaPartidoLiga,
  type FilaPosicionLiga
} from '~/server/utils/proveedoresFutbol/sincronizadorLigasMexico'
import { fechaNegocioBogota } from '~/server/utils/proveedoresFutbol/configuracionWorkerClasificaciones'

const limiteCuerpoBytes = 1_024
const esperaCompletadoMs = 3 * 60 * 60_000
const esperaReintentoMs = 30 * 60_000

/**
 * Sincronización de calendario y tabla de Liga MX y Liga MX Femenil (sitio `mx`). Worker
 * local autenticado por firma; no acepta parámetros ni se publica como cron. El gasto de
 * cuota pasa por el mismo presupuesto diario del proveedor que usa Colombia.
 */
export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const secretoWorker = typeof config.footballWorkerApiSecret === 'string' ? config.footballWorkerApiSecret.trim() : ''
  if (!secretoWorker) {
    throw createError({ statusCode: 503, statusMessage: 'El worker privado de fútbol no está configurado.', data: { codigo: 'WORKER_FUTBOL_NO_CONFIGURADO' } })
  }
  const cuerpo = await leerCuerpoFirmado(evento, limiteCuerpoBytes)
  await verificarFirmaCodex(evento, cuerpo, secretoWorker)

  const entrada = decodificarJsonFirmado<unknown>(cuerpo)
  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada) || Object.keys(entrada).length > 0) {
    throw createError({ statusCode: 422, statusMessage: 'La sincronización de Liga MX no acepta parámetros.', data: { codigo: 'ACTIVACION_LIGA_MX_INVALIDA' } })
  }

  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) {
    throw createError({ statusCode: 503, statusMessage: 'El worker privado de fútbol no está configurado.', data: { codigo: 'WORKER_FUTBOL_NO_CONFIGURADO' } })
  }
  if (typeof config.goalApiKey !== 'string' || !config.goalApiKey.trim()) {
    throw createError({ statusCode: 503, statusMessage: 'El proveedor privado de fútbol no está configurado.', data: { codigo: 'GOAL_API_NO_CONFIGURADA' } })
  }

  const fechaNegocio = fechaNegocioBogota()
  try {
    const transporte = crearTransporteConPresupuestoDiario('goal-api', fechaNegocio, crearReservaDiariaSupabaseFutbol(cliente))
    const proveedor = crearProveedorGoalApi({
      apiKey: config.goalApiKey,
      ...(typeof config.goalApiBaseUrl === 'string' && config.goalApiBaseUrl ? { baseUrl: config.goalApiBaseUrl } : {}),
      transporte
    })
    const resultado = await sincronizarLigasMexico({
      proveedor,
      derechosPublicacionConfirmados: config.futbolMxDerechosPublicacionConfirmados === true,
      repositorio: {
        upsertPartidos: async (filas: FilaPartidoLiga[]) => {
          const { error } = await cliente.from('league_fixtures')
            .upsert(filas, { onConflict: 'site,competition_slug,season,provider,provider_fixture_id' })
          if (error) throw new Error('PARTIDOS_UPSERT_FALLIDO')
        },
        upsertPosiciones: async (filas: FilaPosicionLiga[]) => {
          const { error } = await cliente.from('league_standings')
            .upsert(filas, { onConflict: 'site,competition_slug,season,phase,team_key' })
          if (error) throw new Error('POSICIONES_UPSERT_FALLIDO')
        }
      }
    })

    return {
      estado: resultado.estado,
      provider: 'goal-api',
      solicitudes: resultado.solicitudes,
      fixturesGuardados: resultado.partidosGuardados,
      posicionesPublicasActualizadas: resultado.posicionesGuardadas,
      ...(resultado.errorCode ? { errorCode: resultado.errorCode } : {}),
      siguienteEjecucionMs: resultado.estado === 'completado' ? esperaCompletadoMs : esperaReintentoMs,
      siguienteEjecucionMotivo: resultado.estado === 'completado' ? 'liga_mx_sincronizada' : 'reintento_liga_mx'
    }
  } catch {
    return {
      estado: 'fallido',
      provider: 'goal-api',
      solicitudes: 0,
      fixturesGuardados: 0,
      errorCode: 'LIGA_MX_SYNC_FALLIDA',
      siguienteEjecucionMs: esperaReintentoMs,
      siguienteEjecucionMotivo: 'reintento_liga_mx_fallida'
    }
  }
})
