import { decodificarJsonFirmado, leerCuerpoFirmado, verificarFirmaCodex } from '~/server/utils/codexEditorialPrivado'
import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { crearProveedoresFutbolConfigurados } from '~/server/utils/proveedoresFutbol/desdeConfiguracion'
import { crearGateReservaClasificaciones, fechaNegocioBogota } from '~/server/utils/proveedoresFutbol/configuracionWorkerClasificaciones'
import { crearRepositorioSnapshotsSupabase } from '~/server/utils/proveedoresFutbol/repositorioSnapshotsSupabase'
import { sincronizarFixturesDiariosFutbol } from '~/server/utils/proveedoresFutbol/sincronizadorFixturesDiarios'

export default defineEventHandler(async (evento) => {
  const config = useRuntimeConfig(evento)
  const cuerpo = await leerCuerpoFirmado(evento, 1024)
  await verificarFirmaCodex(evento, cuerpo, String(config.footballWorkerApiSecret || ''))
  const entrada = decodificarJsonFirmado<unknown>(cuerpo)
  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada) || Object.keys(entrada).length) {
    throw createError({ statusCode: 422, statusMessage: 'La activación de fixtures no acepta parámetros.', data: { codigo: 'ACTIVACION_FIXTURES_INVALIDA' } })
  }
  const cliente = obtenerClienteSupabasePrivado(evento)
  if (!cliente) throw createError({ statusCode: 503, statusMessage: 'El worker privado de fútbol no está configurado.', data: { codigo: 'WORKER_FUTBOL_NO_CONFIGURADO' } })
  let proveedores
  try { proveedores = crearProveedoresFutbolConfigurados(config) } catch {
    throw createError({ statusCode: 503, statusMessage: 'El proveedor privado de fútbol no está configurado.', data: { codigo: 'PROVEEDOR_FUTBOL_NO_CONFIGURADO' } })
  }
  const maxActualizaciones = Number(config.footballMaxDetailsPerSync || 20)
  if (!Number.isInteger(maxActualizaciones) || maxActualizaciones < 0 || maxActualizaciones > 100) {
    throw createError({ statusCode: 503, statusMessage: 'El límite de detalles de fútbol no es válido.', data: { codigo: 'LIMITE_DETALLES_FUTBOL_INVALIDO' } })
  }
  const repositorio = crearRepositorioSnapshotsSupabase(cliente)
  return sincronizarFixturesDiariosFutbol({ ...proveedores, repositorio, fechaNegocio: fechaNegocioBogota(),
    maxActualizacionesPorCiclo: maxActualizaciones,
    puedeConsumir: crearGateReservaClasificaciones(provider => repositorio.reclamarVentanaWorker(provider, 'fixtures_diarios')) })
})
