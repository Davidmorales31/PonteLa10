import type { IdentificadorProveedorFutbol } from '~/types/futbolProveedor'
import type { ProveedorFutbol } from './contrato'
import { crearFallbackProveedorFutbol, type RegistroFallbackFutbol } from './fallback'
import {
  proyectarSnapshotClasificacionFutbol,
  validarFechaNegocioFutbol,
  type MappingsProveedorFutbol,
  type SnapshotClasificacionFutbolPrivado
} from './proyectarSnapshots'
import type { RegistroCorridaFixturesFutbol } from './sincronizadorFixturesDiarios'
import { esVentanaWorkerOcupada } from './configuracionWorkerClasificaciones'

export interface ObjetivoClasificacionFutbol {
  competenciaExterna: string
  temporada: number | string
}

export interface RepositorioWorkerClasificacionesFutbol {
  cargarMappingsClasificacion(
    provider: IdentificadorProveedorFutbol,
    competenciasExternas: string[]
  ): Promise<Pick<MappingsProveedorFutbol, 'competencias' | 'equipos'>>
  upsertSnapshotsClasificacion(snapshots: SnapshotClasificacionFutbolPrivado[]): Promise<void>
  registrarCorrida(corrida: RegistroCorridaFixturesFutbol): Promise<void>
}

export interface OpcionesSincronizadorClasificacionesFutbol {
  principal: ProveedorFutbol
  secundario?: ProveedorFutbol
  repositorio: RepositorioWorkerClasificacionesFutbol
  fechaNegocio: string
  objetivos: ObjetivoClasificacionFutbol[]
  ahora?: () => Date
  puedeConsumir?: (provider: IdentificadorProveedorFutbol) => boolean | Promise<boolean>
}

export type ResultadoSincronizacionClasificacionesFutbol = {
  estado: 'sin_objetivos' | 'sin_mappings' | 'sin_cuota' | 'completado' | 'fallido' | 'ocupado'
  provider: IdentificadorProveedorFutbol
  solicitudes: number
  clasificacionesRecibidas: number
  clasificacionesGuardadas: number
  omitidos: Record<'competencia_no_mapeada' | 'equipo_no_mapeado' | 'clasificacion_invalida', number> | null
  errorCode?: 'MAPPINGS_UNAVAILABLE' | 'PROVIDER_FAILURE' | 'SNAPSHOT_PERSISTENCE_FAILED' | 'AUDIT_WRITE_FAILED' | 'WORKER_WINDOW_BUSY' | null
}

/**
 * Sincroniza clasificaciones únicamente para una allowlist explícita de
 * competencia+temporada. No infiere temporadas ni IDs desde nombres y no llama
 * a un proveedor si faltan mappings canónicos de competencia o equipo.
 */
export async function sincronizarClasificacionesFutbol(
  opciones: OpcionesSincronizadorClasificacionesFutbol
): Promise<ResultadoSincronizacionClasificacionesFutbol> {
  validarFechaNegocioFutbol(opciones.fechaNegocio)
  const objetivos = normalizarObjetivos(opciones.objetivos)
  if (!objetivos.length) return vacio('sin_objetivos', opciones.principal.id)

  const proveedores = [opciones.principal, ...(opciones.secundario ? [opciones.secundario] : [])]
  const idsCompetencia = [...new Set(objetivos.map(objetivo => objetivo.competenciaExterna))]
  const mappings = new Map<IdentificadorProveedorFutbol, Pick<MappingsProveedorFutbol, 'competencias' | 'equipos'>>()
  try {
    const cargados = await Promise.all(proveedores.map(async proveedor => [
      proveedor.id,
      await opciones.repositorio.cargarMappingsClasificacion(proveedor.id, idsCompetencia)
    ] as const))
    for (const [id, cargado] of cargados) mappings.set(id, cargado)
  } catch {
    return { ...vacio('fallido', opciones.principal.id), errorCode: 'MAPPINGS_UNAVAILABLE' }
  }

  const disponibles = proveedores.filter(proveedor => {
    const mapping = mappings.get(proveedor.id)
    return Boolean(mapping && mapping.competencias.length > 0 && mapping.equipos.length > 0)
  })
  if (!disponibles.length) return vacio('sin_mappings', opciones.principal.id)

  const ahora = opciones.ahora ?? (() => new Date())
  const iniciado = ahora()
  const eventos: RegistroFallbackFutbol[] = []
  const fallback = crearFallbackProveedorFutbol({
    principal: disponibles[0]!,
    ...(disponibles[1] ? { secundario: disponibles[1] } : {}),
    ...(opciones.puedeConsumir ? { puedeConsumir: opciones.puedeConsumir } : {}),
    registrar: evento => { eventos.push(evento) }
  })
  let guardadas = 0
  let recibidas = 0
  let persistenciaFallida = false
  const omitidos = { competencia_no_mapeada: 0, equipo_no_mapeado: 0, clasificacion_invalida: 0 }
  let proveedorFinal = disponibles[0]!.id

  try {
    for (const objetivo of objetivos) {
      const consulta = await fallback.consultar('standings', proveedor => proveedor.obtenerClasificacion(
        objetivo.competenciaExterna,
        objetivo.temporada
      ))
      proveedorFinal = consulta.proveedor
      if (!consulta.datos) continue
      recibidas += 1
      // La respuesta debe confirmar exactamente el objetivo autorizado.
      if (consulta.datos.competencia.idProveedor !== objetivo.competenciaExterna
        || String(consulta.datos.competencia.temporada) !== String(objetivo.temporada)) {
        omitidos.clasificacion_invalida += 1
        continue
      }
      const mapping = mappings.get(consulta.proveedor)
      if (!mapping) throw new Error('No están disponibles los mappings del proveedor seleccionado.')
      const proyeccion = proyectarSnapshotClasificacionFutbol(consulta.datos, {
        proveedor: consulta.proveedor,
        fechaNegocio: opciones.fechaNegocio,
        mappings: { ...mapping, fixtures: [] }
      })
      if (proyeccion.omitido) {
        omitidos[proyeccion.omitido] += 1
        continue
      }
      try {
        await opciones.repositorio.upsertSnapshotsClasificacion([proyeccion.snapshot])
      } catch {
        persistenciaFallida = true
        throw new Error('No fue posible guardar el snapshot de clasificación.')
      }
      guardadas += 1
    }
  } catch (error) {
    const solicitudes = eventos.filter(evento => evento.resultado !== 'cuota').length
    const ventanaOcupada = esVentanaWorkerOcupada(error)
    const sinCuota = !ventanaOcupada && eventos.length > 0 && solicitudes === 0
    const errorCode = ventanaOcupada ? 'WORKER_WINDOW_BUSY' : sinCuota ? null : 'PROVIDER_FAILURE'
    const estado = ventanaOcupada ? 'ocupado' : sinCuota ? 'sin_cuota' : 'fallido'
    const definitivo = persistenciaFallida ? 'SNAPSHOT_PERSISTENCE_FAILED' : errorCode
    await registrarSinOcultarError(opciones.repositorio, crearRegistro(proveedorFinal, iniciado, ahora(), solicitudes, guardadas, false, definitivo,
      ventanaOcupada ? 'ventana_worker_ocupada' : undefined))
    return { estado, provider: proveedorFinal, solicitudes, clasificacionesRecibidas: recibidas,
      clasificacionesGuardadas: guardadas, omitidos, errorCode: definitivo }
  }

  const solicitudes = eventos.filter(evento => evento.resultado !== 'cuota').length
  try {
    await opciones.repositorio.registrarCorrida(crearRegistro(proveedorFinal, iniciado, ahora(), solicitudes, guardadas, true, null))
  } catch {
    return { estado: 'fallido', provider: proveedorFinal, solicitudes, clasificacionesRecibidas: recibidas,
      clasificacionesGuardadas: guardadas, omitidos, errorCode: 'AUDIT_WRITE_FAILED' }
  }
  return { estado: 'completado', provider: proveedorFinal, solicitudes, clasificacionesRecibidas: recibidas,
    clasificacionesGuardadas: guardadas, omitidos }
}

function normalizarObjetivos(entrada: ObjetivoClasificacionFutbol[]): ObjetivoClasificacionFutbol[] {
  const vistos = new Set<string>()
  const salida: ObjetivoClasificacionFutbol[] = []
  for (const objetivo of entrada) {
    const competenciaExterna = typeof objetivo?.competenciaExterna === 'string' ? objetivo.competenciaExterna.trim() : ''
    const temporada = typeof objetivo?.temporada === 'string' ? objetivo.temporada.trim() : objetivo?.temporada
    if (!competenciaExterna || competenciaExterna.length > 128 || temporada === '' || temporada === undefined
      || String(temporada).length > 32) throw new Error('El objetivo de clasificación no es válido.')
    const clave = `${competenciaExterna}\u0000${temporada}`
    if (!vistos.has(clave)) { vistos.add(clave); salida.push({ competenciaExterna, temporada }) }
  }
  return salida
}

function vacio(estado: 'sin_objetivos' | 'sin_mappings' | 'fallido', provider: IdentificadorProveedorFutbol): ResultadoSincronizacionClasificacionesFutbol {
  return { estado, provider, solicitudes: 0, clasificacionesRecibidas: 0, clasificacionesGuardadas: 0, omitidos: null }
}

function crearRegistro(provider: IdentificadorProveedorFutbol, iniciado: Date, terminado: Date, solicitudes: number, guardadas: number, success: boolean, errorCode: RegistroCorridaFixturesFutbol['error_code'], reason?: string): RegistroCorridaFixturesFutbol {
  return { provider, operation: 'standings', started_at: iniciado.toISOString(), finished_at: terminado.toISOString(),
    fixture_count: guardadas, requests_used: solicitudes, quota_limit: null, quota_remaining: null,
    success, error_code: errorCode, duration_ms: Math.max(0, terminado.getTime() - iniciado.getTime()), reason: reason ?? null }
}

async function registrarSinOcultarError(repositorio: RepositorioWorkerClasificacionesFutbol, corrida: RegistroCorridaFixturesFutbol): Promise<void> {
  try { await repositorio.registrarCorrida(corrida) } catch { /* La falla principal prevalece sobre auditoría. */ }
}
