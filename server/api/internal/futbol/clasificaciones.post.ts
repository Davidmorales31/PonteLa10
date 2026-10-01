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
import { sincronizarClasificacionesFutbol } from '~/server/utils/proveedoresFutbol/sincronizadorClasificaciones'

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
    proveedores = crearProveedoresFutbolConfigurados(config)
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'El proveedor privado de fútbol no está configurado.',
      data: { codigo: 'PROVEEDOR_FUTBOL_NO_CONFIGURADO' }
    })
  }

  const repositorio = crearRepositorioSnapshotsSupabase(cliente)
  const resultado = await sincronizarClasificacionesFutbol({
    ...proveedores,
    repositorio,
    fechaNegocio: fechaNegocioBogota(),
    objetivos,
    // Reserva atómica por proveedor antes de cada llamada, incluso en fallback.
    puedeConsumir: crearGateReservaClasificaciones(provider => repositorio.reclamarVentanaWorker(provider, 'standings'))
  })
  return resultado
})

function esObjetoVacio(valor: unknown): valor is Record<string, never> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor) && Object.keys(valor).length === 0
}
