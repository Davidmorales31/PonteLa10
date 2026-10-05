import type {
  CuotaProveedorFutbol,
  IdentificadorProveedorFutbol,
  PartidoFutbolProveedor,
  PaqueteActualizacionFutbolProveedor,
  RespuestaProveedorFutbol
} from '~/types/futbolProveedor'
import type { ProveedorFutbol } from './contrato'
import {
  crearFallbackProveedorFutbol,
  type RegistroFallbackFutbol,
  type ResultadoFallbackFutbol
} from './fallback'
import {
  proyectarSnapshotsFixturesFutbol,
  validarFechaNegocioFutbol,
  type DetalleFixtureFutbolPrivado,
  type MappingsProveedorFutbol,
  type SnapshotFixtureFutbolPrivado
} from './proyectarSnapshots'
import { prioridadCompetenciaFutbol } from './prioridadFixturesDiarios'
import { esVentanaWorkerOcupada } from './configuracionWorkerClasificaciones'

export interface RegistroCorridaFixturesFutbol {
  provider: IdentificadorProveedorFutbol
  operation: 'fixtures_diarios' | 'standings'
  started_at: string
  finished_at: string
  fixture_count: number
  requests_used: number
  quota_limit: number | null
  quota_remaining: number | null
  success: boolean
  error_code: string | null
  duration_ms: number
  reason: string | null
}

export interface RepositorioWorkerFixturesFutbol {
  cargarMappings(provider: IdentificadorProveedorFutbol, fechaNegocio: string): Promise<MappingsProveedorFutbol>
  cargarTiemposDetalle?(provider: IdentificadorProveedorFutbol, fechaNegocio: string, idsFixture: string[]): Promise<Map<string, string | null>>
  asegurarMappingsIniciales?(provider: IdentificadorProveedorFutbol, partidos: PartidoFutbolProveedor[]): Promise<void>
  marcarFixturesDiariosCargados?(provider: IdentificadorProveedorFutbol, fechaNegocio: string, fechasListado: string[]): Promise<void>
  upsertSnapshots(fixtures: SnapshotFixtureFutbolPrivado[]): Promise<void>
  upsertDetalles(fixtures: DetalleFixtureFutbolPrivado[]): Promise<void>
  registrarCorrida(corrida: RegistroCorridaFixturesFutbol): Promise<void>
}

export interface OpcionesSincronizadorFixturesFutbol {
  principal: ProveedorFutbol
  secundario?: ProveedorFutbol
  repositorio: RepositorioWorkerFixturesFutbol
  fechaNegocio: string
  ahora?: () => Date
  puedeConsumir?: (provider: IdentificadorProveedorFutbol) => boolean | Promise<boolean>
  maxActualizacionesPorCiclo?: number
}

export type ResultadoSincronizacionFixturesFutbol =
  | {
    estado: 'sin_mappings' | 'sin_cuota'
    provider: IdentificadorProveedorFutbol
    solicitudes: 0
    fixturesRecibidos: 0
    fixturesGuardados: 0
    detallesActualizados: 0
    omitidos: null
  }
  | {
    estado: 'completado'
    provider: IdentificadorProveedorFutbol
    solicitudes: number
    fixturesRecibidos: number
    fixturesGuardados: number
    detallesActualizados: number
    omitidos: ReturnType<typeof proyectarSnapshotsFixturesFutbol>['omitidos']
  }
  | {
    estado: 'fallido' | 'sin_cuota' | 'ocupado'
    provider: IdentificadorProveedorFutbol
    solicitudes: number
    fixturesRecibidos: number
    fixturesGuardados: number
    detallesActualizados: number
    omitidos: null | ReturnType<typeof proyectarSnapshotsFixturesFutbol>['omitidos']
    errorCode: 'MAPPINGS_UNAVAILABLE' | 'PROVIDER_FAILURE' | 'SNAPSHOT_PERSISTENCE_FAILED' | 'AUDIT_WRITE_FAILED' | 'WORKER_WINDOW_BUSY' | null
  }

/**
 * Sincroniza el catálogo privado de fútbol del día lógico de Bogotá. Descubre
 * mappings al cargar por primera vez y el fallback se intenta solo ante cuota
 * o error real del proveedor.
 */
export async function sincronizarFixturesDiariosFutbol(
  opciones: OpcionesSincronizadorFixturesFutbol
): Promise<ResultadoSincronizacionFixturesFutbol> {
  validarFechaNegocioFutbol(opciones.fechaNegocio)
  const ahora = opciones.ahora ?? (() => new Date())
  const iniciadoMs = ahora().getTime()
  const iniciado = new Date(iniciadoMs).toISOString()
  const proveedores = [opciones.principal, ...(opciones.secundario ? [opciones.secundario] : [])]
  const mappingsPorProveedor = new Map<IdentificadorProveedorFutbol, MappingsProveedorFutbol>()

  try {
    const cargados = await Promise.all(proveedores.map(async proveedor => [
      proveedor.id,
      await opciones.repositorio.cargarMappings(proveedor.id, opciones.fechaNegocio)
    ] as const))
    for (const [id, mappings] of cargados) mappingsPorProveedor.set(id, mappings)
  } catch {
    // No se consulta al proveedor si falla el repositorio; diferenciarlo de una tabla vacía.
    return {
      estado: 'fallido', provider: opciones.principal.id, solicitudes: 0,
      fixturesRecibidos: 0, fixturesGuardados: 0, omitidos: null,
      detallesActualizados: 0,
      errorCode: 'MAPPINGS_UNAVAILABLE'
    }
  }

  const mapeados = proveedores.filter(proveedor => {
    const mappings = mappingsPorProveedor.get(proveedor.id)
    return Boolean(mappings
      && mappings.competencias.length > 0
      && mappings.equipos.length >= 2
      && mappings.fixtures.length > 0)
  })
  const elegibles = proveedores.filter(proveedor => mapeados.includes(proveedor)
    || proveedor.permiteDescubrimientoFixturesDiarios === true)
  if (elegibles.length === 0) {
    return {
      estado: 'sin_mappings', provider: opciones.principal.id, solicitudes: 0,
      fixturesRecibidos: 0, fixturesGuardados: 0, detallesActualizados: 0, omitidos: null
    }
  }

  const proveedorConMapeosPrincipal = mapeados.find(proveedor => proveedor.id === opciones.principal.id)
    ?? mapeados[0]
    ?? elegibles.find(proveedor => proveedor.id === opciones.principal.id)
    ?? elegibles[0]!
  const proveedorConMapeosSecundario = elegibles.find(proveedor => proveedor.id !== proveedorConMapeosPrincipal.id)
  const eventosFallback: RegistroFallbackFutbol[] = []
  const fallback = crearFallbackProveedorFutbol({
    principal: proveedorConMapeosPrincipal,
    ...(proveedorConMapeosSecundario ? { secundario: proveedorConMapeosSecundario } : {}),
    ...(opciones.puedeConsumir ? { puedeConsumir: opciones.puedeConsumir } : {}),
    registrar: evento => { eventosFallback.push(evento) }
  })

  type ResultadoProveedorDiario = RespuestaProveedorFutbol<PartidoFutbolProveedor> & {
    actualizaciones: PaqueteActualizacionFutbolProveedor[]
  }
  let consulta: ResultadoFallbackFutbol<ResultadoProveedorDiario>
  try {
    consulta = await fallback.consultar(
      'fixtures_diarios',
      async (proveedor): Promise<ResultadoProveedorDiario> => {
        const partidos = await proveedor.obtenerPartidosPorFecha({
          fecha: opciones.fechaNegocio,
          zonaHoraria: 'America/Bogota',
          limite: 100
        })
        const maxActualizaciones = limitarEntero(opciones.maxActualizacionesPorCiclo ?? 3, 0, 3)
        const ahoraMs = ahora().getTime()
        const candidatos = partidos.elementos
          .filter(partido => prioridadCompetenciaFutbol(partido) > 0 && esCandidatoDetalle(partido, ahoraMs))
        let tiemposDetalle = new Map<string, string | null>()
        if (candidatos.length && opciones.repositorio.cargarTiemposDetalle) {
          try {
            tiemposDetalle = await opciones.repositorio.cargarTiemposDetalle(
              proveedor.id,
              opciones.fechaNegocio,
              candidatos.map(partido => partido.idProveedor)
            )
          } catch {
            // El lote sigue acotado aunque falle esta lectura auxiliar.
          }
        }
        candidatos.sort((a, b) => prioridadDetalle(b, ahoraMs) - prioridadDetalle(a, ahoraMs)
          || antiguedadDetalle(a, tiemposDetalle) - antiguedadDetalle(b, tiemposDetalle)
          || Date.parse(a.inicioUtc) - Date.parse(b.inicioUtc))
        const candidatosLimitados = candidatos.slice(0, maxActualizaciones)
        let actualizaciones: PaqueteActualizacionFutbolProveedor[] = []
        let solicitudes = partidos.solicitudes ?? 1
        let cuota = partidos.cuota

        if (candidatosLimitados.length && proveedor.capacidades.actualizacionPorLote
          && proveedor.obtenerActualizacionesPorLote) {
          try {
            const lotes = gruposDe(candidatosLimitados.map(partido => partido.idProveedor), 20)
            const respuestas: RespuestaProveedorFutbol<PaqueteActualizacionFutbolProveedor>[] = []
            for (const ids of lotes) respuestas.push(await proveedor.obtenerActualizacionesPorLote(ids))
            actualizaciones = respuestas.flatMap(respuesta => respuesta.elementos)
            solicitudes += respuestas.reduce((total, respuesta) => total + (respuesta.solicitudes ?? 1), 0)
            cuota = combinarCuota(cuota, respuestas.map(respuesta => respuesta.cuota))
          } catch (error) {
            if (error && typeof error === 'object') {
              Object.assign(error, {
                solicitudesConsumidas: solicitudes + leerSolicitudesConsumidas(error)
              })
            }
            throw error
          }
        }

        return { ...partidos, cuota, solicitudes, actualizaciones }
      }
    )
  } catch (error) {
    const eventosConSolicitud = eventosFallback.filter(evento => evento.resultado !== 'cuota')
    const solicitudesUsadas = sumarSolicitudes(eventosConSolicitud)
    const ventanaOcupada = esVentanaWorkerOcupada(error)
    // El principal pudo gastar una llamada y fallar antes de que el fallback
    // quedara bloqueado por cuota. En ese caso también hay que dormir hasta mañana.
    const sinCuota = !ventanaOcupada && eventosFallback.some(evento => evento.resultado === 'cuota')
    const proveedor = eventosFallback.at(-1)?.proveedor ?? proveedorConMapeosPrincipal.id
    const terminado = ahora()
    const errorCode = ventanaOcupada ? 'WORKER_WINDOW_BUSY' : sinCuota ? null : 'PROVIDER_FAILURE'
    const corrida = crearRegistroCorrida({
      provider: proveedor,
      iniciado,
      terminado,
      requestsUsed: solicitudesUsadas,
      success: false,
      errorCode,
      reason: ventanaOcupada ? 'ventana_worker_ocupada' : sinCuota ? 'cuota_no_disponible' : 'proveedor_no_disponible'
    })
    try { await opciones.repositorio.registrarCorrida(corrida) } catch { /* Error de auditoría no debe filtrar datos del proveedor. */ }
    return {
      estado: ventanaOcupada ? 'ocupado' : sinCuota ? 'sin_cuota' : 'fallido',
      provider: proveedor,
      solicitudes: solicitudesUsadas,
      fixturesRecibidos: 0,
      fixturesGuardados: 0,
      detallesActualizados: 0,
      omitidos: null,
      errorCode
    }
  }
  const proveedorSeleccionado = proveedores.find(proveedor => proveedor.id === consulta.proveedor)
  if (proveedorSeleccionado?.seConsultoListadoDiario?.()) {
    try {
      await opciones.repositorio.asegurarMappingsIniciales?.(consulta.proveedor, consulta.datos.elementos)
      const mappingsActualizados = await opciones.repositorio.cargarMappings(consulta.proveedor, opciones.fechaNegocio)
      mappingsPorProveedor.set(consulta.proveedor, mappingsActualizados)
    } catch {
      return {
        estado: 'fallido', provider: consulta.proveedor, solicitudes: sumarSolicitudes(eventosFallback),
        fixturesRecibidos: consulta.datos.elementos.length, fixturesGuardados: 0,
        detallesActualizados: 0, omitidos: null, errorCode: 'MAPPINGS_UNAVAILABLE'
      }
    }
  }

  const mappingsCargados = mappingsPorProveedor.get(consulta.proveedor)
  const mappingsCompletos = Boolean(mappingsCargados && mappingsCargados.competencias.length > 0
    && mappingsCargados.equipos.length >= 2 && mappingsCargados.fixtures.length > 0)
  if (!mappingsCompletos && consulta.datos.elementos.length > 0) {
    return {
      estado: 'fallido', provider: consulta.proveedor, solicitudes: sumarSolicitudes(eventosFallback),
      fixturesRecibidos: consulta.datos.elementos.length, fixturesGuardados: 0,
      detallesActualizados: 0, omitidos: null, errorCode: 'MAPPINGS_UNAVAILABLE'
    }
  }

  if (consulta.datos.elementos.length === 0 && consulta.datos.solicitudes === 0 && !consulta.usoFallback) {
    return {
      estado: 'completado', provider: consulta.proveedor, solicitudes: 0,
      fixturesRecibidos: 0, fixturesGuardados: 0, detallesActualizados: 0,
      omitidos: { competencia_no_mapeada: 0, equipo_no_mapeado: 0, fixture_no_mapeado: 0,
        identidad_canonica_inconsistente: 0, datos_invalidos: 0 }
    }
  }

  const mappings = mappingsCargados ?? { competencias: [], equipos: [], fixtures: [] }

  const partidosConActualizaciones = new Map(consulta.datos.actualizaciones
    .map(actualizacion => [actualizacion.partido.idProveedor, actualizacion.partido] as const))
  const partidosParaProyeccion = consulta.datos.elementos.map(partido =>
    partidosConActualizaciones.get(partido.idProveedor) ?? partido)

  const proyeccion = proyectarSnapshotsFixturesFutbol(partidosParaProyeccion, {
    proveedor: consulta.proveedor,
    fechaNegocio: opciones.fechaNegocio,
    consultadoEn: consulta.datos.consultadoEn,
    mappings
  })
  if (proyeccion.snapshots.length > 0) {
    // Upsert por (provider, provider_fixture_id); no se purgan filas previas.
    try {
      await opciones.repositorio.upsertSnapshots(proyeccion.snapshots)
    } catch {
      const terminado = ahora()
      const corrida = crearRegistroCorrida({
        provider: consulta.proveedor,
        iniciado,
        terminado,
        requestsUsed: sumarSolicitudes(eventosFallback),
        success: false,
        errorCode: 'SNAPSHOT_PERSISTENCE_FAILED',
        reason: 'persistencia_snapshot_fallida'
      })
      try { await opciones.repositorio.registrarCorrida(corrida) } catch { /* No ocultar la falla original ni registrar payloads. */ }
      return {
        estado: 'fallido', provider: consulta.proveedor, solicitudes: corrida.requests_used,
        fixturesRecibidos: consulta.datos.elementos.length, fixturesGuardados: 0,
        detallesActualizados: 0, omitidos: null, errorCode: 'SNAPSHOT_PERSISTENCE_FAILED'
      }
    }
  }

  const idsDevueltos = new Set(consulta.datos.elementos.map(partido => partido.idProveedor))
  const idsYaProyectados = new Set(proyeccion.snapshots.map(snapshot => snapshot.provider_fixture_id))
  const detalles = consulta.datos.actualizaciones
    .filter(actualizacion => idsDevueltos.has(actualizacion.partido.idProveedor)
      && idsYaProyectados.has(actualizacion.partido.idProveedor))
    .map(actualizacion => crearDetallePrivado(consulta.proveedor, actualizacion, ahora().toISOString()))
  if (detalles.length) {
    try {
      await opciones.repositorio.upsertDetalles(detalles)
    } catch {
      const terminado = ahora()
      const registro = crearRegistroCorrida({
        provider: consulta.proveedor,
        iniciado,
        terminado,
        requestsUsed: sumarSolicitudes(eventosFallback),
        fixtureCount: proyeccion.snapshots.length,
        success: false,
        errorCode: 'SNAPSHOT_PERSISTENCE_FAILED',
        reason: 'persistencia_detalles_fallida'
      })
      try { await opciones.repositorio.registrarCorrida(registro) } catch { /* Preservar el error de persistencia. */ }
      return {
        estado: 'fallido', provider: consulta.proveedor, solicitudes: registro.requests_used,
        fixturesRecibidos: consulta.datos.elementos.length, fixturesGuardados: proyeccion.snapshots.length,
        detallesActualizados: 0, omitidos: proyeccion.omitidos,
        errorCode: 'SNAPSHOT_PERSISTENCE_FAILED'
      }
    }
  }

  if (proveedorSeleccionado?.seConsultoListadoDiario?.()) {
    try {
      const fechasListado = proveedorSeleccionado.fechasListadoDiario?.() ?? []
      await opciones.repositorio.marcarFixturesDiariosCargados?.(consulta.proveedor, opciones.fechaNegocio, fechasListado)
    } catch {
      return {
        estado: 'fallido', provider: consulta.proveedor, solicitudes: sumarSolicitudes(eventosFallback),
        fixturesRecibidos: consulta.datos.elementos.length, fixturesGuardados: proyeccion.snapshots.length,
        detallesActualizados: detalles.length, omitidos: proyeccion.omitidos,
        errorCode: 'SNAPSHOT_PERSISTENCE_FAILED'
      }
    }
  }

  const terminado = ahora()
  const solicitudesUsadas = sumarSolicitudes(eventosFallback)
  const registro = crearRegistroCorrida({
    provider: consulta.proveedor,
    iniciado,
    terminado,
    requestsUsed: solicitudesUsadas,
    fixtureCount: proyeccion.snapshots.length,
    success: true,
    quotaLimit: consulta.datos.cuota?.limite ?? null,
    quotaRemaining: consulta.datos.cuota?.restante ?? null,
    reason: consulta.usoFallback ? 'fallback_proveedor' : null
  })
  try {
    await opciones.repositorio.registrarCorrida(registro)
  } catch {
    return {
      estado: 'fallido', provider: consulta.proveedor, solicitudes: solicitudesUsadas,
      fixturesRecibidos: consulta.datos.elementos.length, fixturesGuardados: proyeccion.snapshots.length,
      detallesActualizados: detalles.length, omitidos: proyeccion.omitidos, errorCode: 'AUDIT_WRITE_FAILED'
    }
  }

  return {
    estado: 'completado',
    provider: consulta.proveedor,
    solicitudes: solicitudesUsadas,
    fixturesRecibidos: consulta.datos.elementos.length,
    fixturesGuardados: proyeccion.snapshots.length,
    detallesActualizados: detalles.length,
    omitidos: proyeccion.omitidos
  }
}

function esCandidatoDetalle(partido: PartidoFutbolProveedor, ahoraMs: number): boolean {
  if (['live', 'halftime', 'finished', 'suspended', 'pre-match'].includes(partido.estado)) return true
  if (partido.estado !== 'scheduled') return false
  const inicioMs = Date.parse(partido.inicioUtc)
  // El calendario persistido solo contiene la fecha de negocio vigente. No
  // excluir los programados vencidos: deben recibir una consulta de confirmación.
  return Number.isFinite(inicioMs) && inicioMs <= ahoraMs + 90 * 60_000
}

function prioridadDetalle(partido: PartidoFutbolProveedor, ahoraMs: number): number {
  const prioridadCompetencia = prioridadCompetenciaFutbol(partido)
  switch (partido.estado) {
    case 'live': return prioridadCompetencia * 100 + 40
    case 'halftime': return prioridadCompetencia * 100 + 30
    case 'pre-match': return prioridadCompetencia * 100 + 20
    case 'scheduled': {
      if (!esCandidatoDetalle(partido, ahoraMs)) return 0
      const vencido = Date.parse(partido.inicioUtc) < ahoraMs - 2 * 60 * 60_000
      return prioridadCompetencia * 100 + (vencido ? 5 : 20)
    }
    case 'finished': case 'suspended': return prioridadCompetencia * 100 + 10
    default: return 0
  }
}

function antiguedadDetalle(partido: PartidoFutbolProveedor, tiempos: Map<string, string | null>): number {
  const marca = tiempos.get(partido.idProveedor)
  if (!marca) return Number.NEGATIVE_INFINITY
  const instante = Date.parse(marca)
  return Number.isFinite(instante) ? instante : Number.NEGATIVE_INFINITY
}

function limitarEntero(valor: number, minimo: number, maximo: number): number {
  return Number.isFinite(valor) ? Math.min(maximo, Math.max(minimo, Math.trunc(valor))) : minimo
}

function gruposDe<T>(elementos: T[], tamano: number): T[][] {
  const grupos: T[][] = []
  for (let indice = 0; indice < elementos.length; indice += tamano) {
    grupos.push(elementos.slice(indice, indice + tamano))
  }
  return grupos
}

function combinarCuota(
  inicial: CuotaProveedorFutbol | undefined,
  adicionales: Array<CuotaProveedorFutbol | undefined>
): CuotaProveedorFutbol | undefined {
  const cuotas = [inicial, ...adicionales].filter((cuota): cuota is CuotaProveedorFutbol => Boolean(cuota))
  if (!cuotas.length) return undefined
  const limites = cuotas.flatMap(cuota => cuota.limite === undefined ? [] : [cuota.limite])
  const restantes = cuotas.flatMap(cuota => cuota.restante === undefined ? [] : [cuota.restante])
  return {
    ...(limites.length ? { limite: Math.min(...limites) } : {}),
    ...(restantes.length ? { restante: Math.min(...restantes) } : {})
  }
}

function leerSolicitudesConsumidas(error: unknown): number {
  if (error && typeof error === 'object') {
    const valor = (error as { solicitudesConsumidas?: unknown }).solicitudesConsumidas
    if (typeof valor === 'number' && Number.isInteger(valor) && valor >= 0) return valor
  }
  return 1
}

function sumarSolicitudes(eventos: RegistroFallbackFutbol[]): number {
  return eventos.reduce((total, evento) => total
    + (evento.resultado === 'cuota' ? 0 : evento.solicitudes ?? 1), 0)
}

function crearDetallePrivado(
  provider: IdentificadorProveedorFutbol,
  actualizacion: PaqueteActualizacionFutbolProveedor,
  providerFetchedAt: string
): DetalleFixtureFutbolPrivado {
  return {
    provider,
    provider_fixture_id: actualizacion.partido.idProveedor,
    events: Array.isArray(actualizacion.eventos) ? actualizacion.eventos : [],
    lineups: Array.isArray(actualizacion.alineaciones) ? actualizacion.alineaciones : [],
    statistics: Array.isArray(actualizacion.estadisticas) ? actualizacion.estadisticas : [],
    provider_fetched_at: providerFetchedAt
  }
}

function crearRegistroCorrida(entrada: {
  provider: IdentificadorProveedorFutbol
  iniciado: string
  terminado: Date
  requestsUsed: number
  fixtureCount?: number
  success: boolean
  errorCode?: RegistroCorridaFixturesFutbol['error_code']
  quotaLimit?: number | null
  quotaRemaining?: number | null
  reason?: string | null
}): RegistroCorridaFixturesFutbol {
  const terminadoMs = entrada.terminado.getTime()
  const iniciadoMs = Date.parse(entrada.iniciado)
  return {
    provider: entrada.provider,
    operation: 'fixtures_diarios',
    started_at: entrada.iniciado,
    finished_at: new Date(Math.max(iniciadoMs, terminadoMs)).toISOString(),
    fixture_count: entrada.fixtureCount ?? 0,
    requests_used: entrada.requestsUsed,
    quota_limit: entrada.quotaLimit ?? null,
    quota_remaining: entrada.quotaRemaining ?? null,
    success: entrada.success,
    error_code: entrada.errorCode ?? null,
    duration_ms: Math.max(0, terminadoMs - iniciadoMs),
    reason: entrada.reason ?? null
  }
}
