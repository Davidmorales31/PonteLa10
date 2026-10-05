import { decodificarJsonFirmado, leerCuerpoFirmado, verificarFirmaCodex } from '~/server/utils/codexEditorialPrivado'
import { obtenerClienteSupabasePrivado } from '~/server/utils/clienteSupabasePrivado'
import { crearProveedoresFutbolConfigurados } from '~/server/utils/proveedoresFutbol/desdeConfiguracion'
import { crearGateReservaClasificaciones, fechaNegocioBogota } from '~/server/utils/proveedoresFutbol/configuracionWorkerClasificaciones'
import { crearReservaDiariaSupabaseFutbol } from '~/server/utils/proveedoresFutbol/presupuestoDiarioSupabase'
import { crearProveedorFixturesDiariosPersistidos } from '~/server/utils/proveedoresFutbol/proveedorFixturesDiariosPersistidos'
import { crearRepositorioSnapshotsSupabase } from '~/server/utils/proveedoresFutbol/repositorioSnapshotsSupabase'
import { sincronizarFixturesDiariosFutbol } from '~/server/utils/proveedoresFutbol/sincronizadorFixturesDiarios'
import {
  debeDiferirCargaInicialFutbol,
  esperaHastaLasSeisBogota,
  esperaHastaMantenimientoDiarioBogota
} from '~/utils/politicaWorkerFutbol'

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
  const fechaNegocio = fechaNegocioBogota()
  const repositorio = crearRepositorioSnapshotsSupabase(cliente)
  let proveedores
  try {
    proveedores = crearProveedoresFutbolConfigurados(config, {
      fechaNegocio,
      reservarPeticion: crearReservaDiariaSupabaseFutbol(cliente)
    })
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'El proveedor privado de fútbol no está configurado.', data: { codigo: 'PROVEEDOR_FUTBOL_NO_CONFIGURADO' } })
  }
  await repositorio.limpiarDatosFutbolCaducados()
  const maxConfigurado = Number(config.footballMaxDetailsPerSync || 3)
  if (!Number.isInteger(maxConfigurado) || maxConfigurado < 0 || maxConfigurado > 100) {
    throw createError({ statusCode: 503, statusMessage: 'El límite de detalles de fútbol no es válido.', data: { codigo: 'LIMITE_DETALLES_FUTBOL_INVALIDO' } })
  }
  // Goal API cobra una solicitud por fixture en vivo; impedir lotes amplios
  // evita vaciar la cuota cuando coinciden muchos partidos.
  const maxActualizaciones = Math.min(maxConfigurado, 3)
  const principal = crearProveedorFixturesDiariosPersistidos(proveedores.principal, repositorio, fechaNegocio)
  const secundario = proveedores.secundario
    ? crearProveedorFixturesDiariosPersistidos(proveedores.secundario, repositorio, fechaNegocio)
    : undefined
  const ahora = new Date()
  if (debeDiferirCargaInicialFutbol(ahora)) {
    const fuentes = [principal, ...(secundario ? [secundario] : [])]
    const calendariosCompletos = await Promise.all(fuentes.map(fuente =>
      repositorio.calendarioDiarioCompleto(fuente.id, fechaNegocio)
    ))
    if (calendariosCompletos.some(completo => !completo)) {
      return {
        estado: 'diferido_ventana_sin_partidos',
        provider: principal.id,
        solicitudes: 0,
        fixturesRecibidos: 0,
        fixturesGuardados: 0,
        detallesActualizados: 0,
        omitidos: null,
        siguienteEjecucionMs: esperaHastaLasSeisBogota(ahora),
        siguienteEjecucionMotivo: 'carga_inicial_diferida_hasta_las_seis_bogota'
      }
    }
  }
  const resultado = await sincronizarFixturesDiariosFutbol({ principal, ...(secundario ? { secundario } : {}), repositorio, fechaNegocio,
    maxActualizacionesPorCiclo: maxActualizaciones,
    puedeConsumir: crearGateReservaClasificaciones(provider => repositorio.reclamarVentanaWorker(provider, 'fixtures_diarios')) })
  let proxima = { esperaMs: 5 * 60_000, motivo: 'intervalo_seguro_por_defecto' }
  try {
    // El resultado puede venir del fallback; planear solo con ese proveedor
    // ocultaba snapshots vencidos del primario y dejaba dormido al worker.
    proxima = await repositorio.calcularEsperaSiguienteEjecucion(
      [principal.id, ...(secundario ? [secundario.id] : [])],
      fechaNegocio
    )
  } catch {
    // Si el cálculo de la próxima ventana falla, se conserva un ritmo moderado.
  }
  const siguienteEjecucionMs = resultado.estado === 'sin_cuota'
    ? esperaHastaMantenimientoDiarioBogota(ahora)
    : resultado.estado === 'ocupado'
      ? Math.max(proxima.esperaMs, 5 * 60_000)
      : proxima.esperaMs
  return {
    ...resultado,
    siguienteEjecucionMs,
    siguienteEjecucionMotivo: resultado.estado === 'sin_cuota'
      ? 'cuota_agotada_hasta_mantenimiento_bogota'
      : resultado.estado === 'ocupado' ? 'ventana_ocupada_reintento_5m' : proxima.motivo
  }
})
