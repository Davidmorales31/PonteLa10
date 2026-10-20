import type { EstadoFixtureFutbol } from '~/types/futbolProveedor'

export type PrioridadFixtureFutbol = 'lejano' | 'proximo' | 'prepartido' | 'en_vivo' | 'recien_finalizado' | 'cerrado'
export type ModoCuotaFutbol = 'NORMAL' | 'CONSERVADOR' | 'CRITICO' | 'RESERVA'

export const configuracionSchedulerFutbolPredeterminada = {
  intervalosSegundos: {
    en_vivo: 300,
    prepartido: 300,
    proximo: 900,
    recien_finalizado: 300,
    lejano: 21_600
  }
} as const

export interface SnapshotParaSchedulerFutbol {
  provider: 'goal-api' | 'api-football'
  estado: EstadoFixtureFutbol
  inicioUtc: string
  detallesActualizadosEn: string | null
}

export interface PlanCoberturaWorkerFutbol {
  esperaMs: number
  motivo: string
  solicitudesUsadas: number
  solicitudesRestantes: number
  partidosEnCobertura: number
  partidosPendientes: number
  franjasCobertura: FranjaCoberturaWorkerFutbol[]
}

export interface FranjaCoberturaWorkerFutbol {
  desdeBogota: string
  hastaBogota: string
  partidosSimultaneos: number
  solicitudesAsignadas: number
}

/** Reparte el saldo diario entre minutos con partidos de las ligas priorizadas. */
export function calcularSiguienteEjecucionCoberturaFutbol(
  snapshots: SnapshotParaSchedulerFutbol[],
  solicitudesUsadas: number,
  ahoraMs = Date.now(),
  maxSolicitudesPorActivacion = 2
): PlanCoberturaWorkerFutbol {
  const usadas = Number.isInteger(solicitudesUsadas) && solicitudesUsadas > 0 ? solicitudesUsadas : 0
  const restantes = Math.max(0, presupuestoDiarioGoalApi - usadas)
  const ventanas = snapshots
    .filter(snapshot => snapshot.provider === 'goal-api')
    .flatMap(snapshot => {
      const inicio = Date.parse(snapshot.inicioUtc)
      if (!Number.isFinite(inicio)) return []
      if (snapshot.estado === 'finished' && !snapshot.detallesActualizadosEn) {
        return [{ inicio: ahoraMs, fin: ahoraMs + esperaMinimaCoberturaMs }]
      }
      if (['finished', 'cancelled', 'abandoned', 'postponed', 'unknown'].includes(snapshot.estado)) return []
      if (snapshot.estado === 'scheduled' && inicio < ahoraMs - duracionProgramadaMs) return []

      const inicioVentana = inicio - anticipacionCoberturaMs
      const finVentana = snapshot.estado === 'live' || snapshot.estado === 'halftime'
        ? Math.max(inicio + duracionEnVivoMs, ahoraMs + 60_000)
        : inicio + duracionProgramadaMs
      return finVentana > ahoraMs ? [{ inicio: inicioVentana, fin: finVentana }] : []
    })
  const activas = ventanas.filter(ventana => ventana.inicio <= ahoraMs && ventana.fin > ahoraMs).length
  const pendientes = ventanas.filter(ventana => ventana.fin > ahoraMs).length
  const franjasCobertura = repartirPresupuestoEnFranjas(ventanas, restantes, ahoraMs)

  if (restantes === 0) {
    return {
      esperaMs: esperaHastaMantenimientoDiarioBogota(new Date(ahoraMs)),
      motivo: 'presupuesto_diario_agotado',
      solicitudesUsadas: usadas,
      solicitudesRestantes: 0,
      partidosEnCobertura: activas,
      partidosPendientes: pendientes,
      franjasCobertura
    }
  }

  if (!ventanas.length) {
    return {
      esperaMs: esperaHastaMantenimientoDiarioBogota(new Date(ahoraMs)),
      motivo: 'sin_ventanas_de_partidos',
      solicitudesUsadas: usadas,
      solicitudesRestantes: restantes,
      partidosEnCobertura: 0,
      partidosPendientes: 0,
      franjasCobertura
    }
  }

  if (activas === 0) {
    const proximas = ventanas.map(ventana => ventana.inicio).filter(inicio => inicio > ahoraMs)
    const proximaInicio = proximas.length ? Math.min(...proximas) : Number.NaN
    if (!Number.isFinite(proximaInicio)) {
      return {
        esperaMs: esperaHastaMantenimientoDiarioBogota(new Date(ahoraMs)),
        motivo: 'sin_ventanas_de_partidos',
        solicitudesUsadas: usadas,
        solicitudesRestantes: restantes,
        partidosEnCobertura: 0,
        partidosPendientes: 0,
        franjasCobertura
      }
    }
    return {
      esperaMs: Math.max(esperaMinimaCoberturaMs, proximaInicio - ahoraMs),
      motivo: 'espera_inicio_ventana',
      solicitudesUsadas: usadas,
      solicitudesRestantes: restantes,
      partidosEnCobertura: 0,
      partidosPendientes: pendientes,
      franjasCobertura
    }
  }

  const minutosFixturePendientesMs = ventanas.reduce(
    (total, ventana) => total + Math.max(0, ventana.fin - Math.max(ahoraMs, ventana.inicio)), 0
  )
  const solicitudesPorPartidoMs = minutosFixturePendientesMs / restantes
  const solicitudesDelProximoCiclo = Math.min(
    Math.max(1, Math.trunc(maxSolicitudesPorActivacion)), activas
  )
  const esperaMs = Math.max(
    esperaMinimaCoberturaMs,
    Math.ceil(solicitudesPorPartidoMs * solicitudesDelProximoCiclo / activas)
  )

  return {
    esperaMs,
    motivo: 'reparto_presupuesto_por_cobertura',
    solicitudesUsadas: usadas,
    solicitudesRestantes: restantes,
    partidosEnCobertura: activas,
    partidosPendientes: pendientes,
    franjasCobertura
  }
}

function repartirPresupuestoEnFranjas(
  ventanas: Array<{ inicio: number; fin: number }>,
  solicitudes: number,
  ahoraMs: number
): FranjaCoberturaWorkerFutbol[] {
  const limites = [...new Set(ventanas.flatMap(ventana => [Math.max(ahoraMs, ventana.inicio), ventana.fin]))]
    .sort((a, b) => a - b)
  const segmentos = limites.slice(0, -1).flatMap((desde, indice) => {
    const hasta = limites[indice + 1]!
    if (hasta <= desde) return []
    const simultaneos = ventanas.filter(ventana => ventana.inicio < hasta && ventana.fin > desde).length
    return simultaneos > 0 ? [{ desde, hasta, simultaneos, peso: (hasta - desde) * simultaneos }] : []
  })
  const pesoTotal = segmentos.reduce((total, segmento) => total + segmento.peso, 0)
  if (!pesoTotal) return []

  let solicitudesAcumuladas = 0
  let pesoAcumulado = 0
  return segmentos.map((segmento) => {
    pesoAcumulado += segmento.peso
    const asignadasAcumuladas = Math.round(solicitudes * pesoAcumulado / pesoTotal)
    const asignadas = asignadasAcumuladas - solicitudesAcumuladas
    solicitudesAcumuladas = asignadasAcumuladas
    return {
      desdeBogota: fechaHoraBogota(segmento.desde),
      hastaBogota: fechaHoraBogota(segmento.hasta),
      partidosSimultaneos: segmento.simultaneos,
      solicitudesAsignadas: asignadas
    }
  })
}

function fechaHoraBogota(instante: number): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(instante))
  const obtener = (tipo: string) => partes.find(parte => parte.type === tipo)?.value || ''
  return `${obtener('year')}-${obtener('month')}-${obtener('day')} ${obtener('hour')}:${obtener('minute')}`
}

const minimoReintentoMs = 60_000
const maximoDescansoMs = 6 * 60 * 60_000
export const presupuestoDiarioGoalApi = 900
const anticipacionCoberturaMs = 20 * 60_000
const duracionProgramadaMs = 150 * 60_000
const duracionEnVivoMs = 4 * 60 * 60_000
const esperaMinimaCoberturaMs = 15_000

/** Decide la siguiente activación a partir del siguiente detalle realmente vencido. */
export function calcularSiguienteEjecucionWorkerFutbol(
  snapshots: SnapshotParaSchedulerFutbol[],
  ahoraMs = Date.now()
): { esperaMs: number; motivo: string } {
  const hora = partesBogota(new Date(ahoraMs))
  const esFranjaNocturna = hora.hora >= 1 && hora.hora < 6
  const proximosVencimientos = snapshots
    .filter(snapshot => !esFranjaNocturna || puedeActualizarDuranteFranjaNocturna(snapshot))
    .map(snapshot => vencimientoSnapshot(snapshot, ahoraMs))
    .filter((vencimiento): vencimiento is number => vencimiento !== null)
  const proximoVencimiento = proximosVencimientos.length ? Math.min(...proximosVencimientos) : null

  if (proximoVencimiento !== null) {
    const esperaMs = Math.max(minimoReintentoMs, proximoVencimiento - ahoraMs)
    return {
      esperaMs: Math.min(esperaMs, maximoDescansoMs),
      motivo: proximoVencimiento <= ahoraMs ? 'fixture_debe_actualizarse' : 'espera_fixture'
    }
  }

  if (esFranjaNocturna) {
    return { esperaMs: Math.max(minimoReintentoMs, hastaHoraBogota(ahoraMs, 6, 0)), motivo: 'franja_nocturna_sin_partidos' }
  }
  const hastaMantenimiento = hastaHoraBogota(ahoraMs, 0, 5)
  return {
    esperaMs: Math.max(minimoReintentoMs, Math.min(maximoDescansoMs, hastaMantenimiento)),
    motivo: snapshots.length ? 'sin_detalles_vencidos' : 'sin_partidos_en_calendario'
  }
}

function puedeActualizarDuranteFranjaNocturna(snapshot: SnapshotParaSchedulerFutbol): boolean {
  if (snapshot.estado === 'live' || snapshot.estado === 'halftime') return true
  const inicio = Date.parse(snapshot.inicioUtc)
  if (!Number.isFinite(inicio)) return false
  const horaInicio = partesBogota(new Date(inicio)).hora
  return horaInicio >= 1 && horaInicio < 6
}

export function debeDiferirCargaInicialFutbol(ahora = new Date()): boolean {
  const hora = partesBogota(ahora).hora
  return hora >= 1 && hora < 6
}

export function esperaHastaLasSeisBogota(ahora = new Date()): number {
  const ahoraMs = ahora.getTime()
  return Math.max(minimoReintentoMs, hastaHoraBogota(ahoraMs, 6, 0))
}

/** Espera al mantenimiento del siguiente día de negocio cuando se agota la cuota. */
export function esperaHastaMantenimientoDiarioBogota(ahora = new Date()): number {
  return Math.max(minimoReintentoMs, hastaHoraBogota(ahora.getTime(), 0, 5))
}

function vencimientoSnapshot(snapshot: SnapshotParaSchedulerFutbol, ahoraMs: number): number | null {
  const inicio = Date.parse(snapshot.inicioUtc)
  const actualizado = snapshot.detallesActualizadosEn ? Date.parse(snapshot.detallesActualizadosEn) : Number.NaN
  const minutosDesdeInicio = Number.isFinite(inicio) ? (ahoraMs - inicio) / 60_000 : 0
  const cadenciaViva = minutosDesdeInicio >= 240
    ? 30 * 60_000
    : minutosDesdeInicio >= 180
      ? 15 * 60_000
      : snapshot.provider === 'goal-api' ? 5 * 60_000 : 3 * 60_000
  const cadenciaPrevia = snapshot.provider === 'goal-api' ? 5 * 60_000 : 10 * 60_000

  if (snapshot.estado === 'live' || snapshot.estado === 'halftime') {
    return Number.isFinite(actualizado) ? actualizado + cadenciaViva : ahoraMs
  }
  if (snapshot.estado === 'finished' || snapshot.estado === 'cancelled' || snapshot.estado === 'abandoned') {
    return Number.isFinite(actualizado) ? null : ahoraMs
  }
  if (snapshot.estado === 'suspended' || snapshot.estado === 'postponed') {
    return Number.isFinite(actualizado) ? actualizado + 30 * 60_000 : ahoraMs
  }
  if (snapshot.estado !== 'scheduled' && snapshot.estado !== 'pre-match') return null
  if (!Number.isFinite(inicio)) return null

  // Un fixture que sigue "programado" después de su hora no se puede descartar:
  // puede haber empezado o terminado mientras el PC estaba apagado. Se intenta
  // confirmar de inmediato si no hay detalle y, si el proveedor aún no corrige
  // el estado, se revisa con cadencia moderada en vez de dormir seis horas.
  if (inicio < ahoraMs - 2 * 60 * 60_000) {
    return Number.isFinite(actualizado) ? actualizado + 30 * 60_000 : ahoraMs
  }

  const empiezaVentana = inicio - 90 * 60_000
  if (empiezaVentana > ahoraMs) return empiezaVentana
  return Number.isFinite(actualizado) ? actualizado + cadenciaPrevia : ahoraMs
}

function partesBogota(fecha: Date): { anio: number; mes: number; dia: number; hora: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(fecha)
  const leer = (tipo: string) => Number(partes.find(parte => parte.type === tipo)?.value)
  return { anio: leer('year'), mes: leer('month'), dia: leer('day'), hora: leer('hour') }
}

/** Bogotá usa UTC-5; normalizar con UTC evita depender de la zona horaria del PC. */
function hastaHoraBogota(ahoraMs: number, hora: number, minuto: number): number {
  const local = partesBogota(new Date(ahoraMs))
  let objetivoUtc = Date.UTC(local.anio, local.mes - 1, local.dia, hora + 5, minuto)
  if (objetivoUtc <= ahoraMs) objetivoUtc += 24 * 60 * 60_000
  return objetivoUtc - ahoraMs
}

export function clasificarPrioridadFixtureFutbol(
  fixture: { estado: EstadoFixtureFutbol; inicioUtc: string },
  actualizadoEn?: string,
  ahoraMs = Date.now()
): PrioridadFixtureFutbol {
  if (fixture.estado === 'live' || fixture.estado === 'halftime') return 'en_vivo'
  if (fixture.estado === 'finished') {
    const actualizadoMs = actualizadoEn ? Date.parse(actualizadoEn) : Number.NaN
    return Number.isFinite(actualizadoMs) && ahoraMs - actualizadoMs > 15 * 60_000
      ? 'cerrado'
      : 'recien_finalizado'
  }
  if (fixture.estado === 'cancelled' || fixture.estado === 'abandoned') return 'cerrado'
  if (fixture.estado === 'suspended' || fixture.estado === 'postponed') return 'proximo'
  if (fixture.estado === 'pre-match') return 'prepartido'
  if (fixture.estado !== 'scheduled') return 'proximo'

  const inicioMs = Date.parse(fixture.inicioUtc)
  if (!Number.isFinite(inicioMs)) return 'proximo'
  const diferenciaMs = inicioMs - ahoraMs
  if (diferenciaMs >= 24 * 60 * 60_000) return 'lejano'
  if (diferenciaMs <= 30 * 60_000) return 'prepartido'
  return 'proximo'
}

export function determinarModoCuotaFutbol(entrada: {
  proveedor?: { limite?: number; restante?: number }
  limiteLocal?: number
  restanteLocal?: number
}): ModoCuotaFutbol {
  const limite = entrada.proveedor?.limite ?? entrada.limiteLocal
  const restante = entrada.proveedor?.restante ?? entrada.restanteLocal
  if (!Number.isFinite(limite) || !Number.isFinite(restante) || !limite || limite <= 0 || restante! < 0) return 'NORMAL'
  const proporcion = Math.min(1, restante! / limite)
  if (proporcion <= 0.1) return 'RESERVA'
  if (proporcion <= 0.2) return 'CRITICO'
  if (proporcion <= 0.4) return 'CONSERVADOR'
  return 'NORMAL'
}

export function debeConsultarWorkerFutbol(
  entrada: {
    prioridad: PrioridadFixtureFutbol
    operacion: 'fixture' | 'estadisticas' | 'standings' | 'snapshot_final'
    modo: ModoCuotaFutbol
    actualizadoEn?: string
  },
  ahoraMs = Date.now()
): { permitido: boolean; razon: string } {
  if (entrada.prioridad === 'cerrado') return { permitido: false, razon: 'fixture_cerrado' }

  if (entrada.modo === 'CRITICO' || entrada.modo === 'RESERVA') {
    const esFixtureEnVivo = entrada.prioridad === 'en_vivo' && entrada.operacion === 'fixture'
    const esCierreReciente = entrada.prioridad === 'recien_finalizado' && entrada.operacion === 'snapshot_final'
    if (!esFixtureEnVivo && !esCierreReciente) return { permitido: false, razon: 'cuota_limitada' }
  }

  if (entrada.modo === 'CONSERVADOR'
    && entrada.prioridad === 'lejano'
    && entrada.operacion === 'fixture') {
    return { permitido: false, razon: 'fixture_lejano' }
  }

  const intervaloSegundos = configuracionSchedulerFutbolPredeterminada.intervalosSegundos[entrada.prioridad]
  const actualizadoMs = entrada.actualizadoEn ? Date.parse(entrada.actualizadoEn) : Number.NaN
  if (Number.isFinite(actualizadoMs) && ahoraMs - actualizadoMs < intervaloSegundos * 1000) {
    return { permitido: false, razon: 'snapshot_aun_vigente' }
  }
  return { permitido: true, razon: 'actualizacion_vencida' }
}
