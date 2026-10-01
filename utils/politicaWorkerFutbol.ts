import type { EstadoFixtureFutbol } from '~/types/futbolProveedor'

export type PrioridadFixtureFutbol = 'lejano' | 'proximo' | 'prepartido' | 'en_vivo' | 'recien_finalizado' | 'cerrado'
export type ModoCuotaFutbol = 'NORMAL' | 'CONSERVADOR' | 'CRITICO' | 'RESERVA'

export const configuracionSchedulerFutbolPredeterminada = {
  intervalosSegundos: {
    en_vivo: 60,
    prepartido: 120,
    proximo: 900,
    recien_finalizado: 300,
    lejano: 21_600
  }
} as const

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
