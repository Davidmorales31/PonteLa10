import { describe, expect, it } from 'vitest'
import {
  clasificarPrioridadFixtureFutbol,
  configuracionSchedulerFutbolPredeterminada,
  debeConsultarWorkerFutbol,
  determinarModoCuotaFutbol
} from '~/utils/politicaWorkerFutbol'
import type { EstadoFixtureFutbol } from '~/types/futbolProveedor'

const ahora = Date.parse('2026-10-01T12:00:00.000Z')
const partido = (estado: EstadoFixtureFutbol, inicioUtc = '2026-10-01T14:00:00.000Z') => ({ estado, inicioUtc })

describe('política del worker de fútbol', () => {
  it('clasifica lejano, próximo, prepartido y vivo en las ventanas configuradas', () => {
    expect(clasificarPrioridadFixtureFutbol(partido('scheduled', '2026-10-02T12:00:00Z'), undefined, ahora)).toBe('lejano')
    expect(clasificarPrioridadFixtureFutbol(partido('scheduled', '2026-10-01T14:00:00Z'), undefined, ahora)).toBe('proximo')
    expect(clasificarPrioridadFixtureFutbol(partido('pre-match', '2026-10-01T12:20:00Z'), undefined, ahora)).toBe('prepartido')
    expect(clasificarPrioridadFixtureFutbol(partido('live'), undefined, ahora)).toBe('en_vivo')
  })

  it('no confunde suspendidos o aplazados con cerrados y archiva finales antiguos', () => {
    expect(clasificarPrioridadFixtureFutbol(partido('suspended', '2026-10-01T10:00:00Z'), undefined, ahora)).toBe('proximo')
    expect(clasificarPrioridadFixtureFutbol(partido('postponed', '2026-10-01T10:00:00Z'), undefined, ahora)).toBe('proximo')
    expect(clasificarPrioridadFixtureFutbol(partido('finished'), new Date(ahora - 10 * 60_000).toISOString(), ahora)).toBe('recien_finalizado')
    expect(clasificarPrioridadFixtureFutbol(partido('finished'), new Date(ahora - 20 * 60_000).toISOString(), ahora)).toBe('cerrado')
    expect(clasificarPrioridadFixtureFutbol(partido('cancelled'), undefined, ahora)).toBe('cerrado')
  })

  it('prefiere la cuota real y conserva un estimado local cuando el proveedor no publica headers', () => {
    expect(determinarModoCuotaFutbol({ proveedor: { limite: 100, restante: 50 }, limiteLocal: 100, restanteLocal: 1 })).toBe('NORMAL')
    expect(determinarModoCuotaFutbol({ proveedor: { limite: 100, restante: 35 } })).toBe('CONSERVADOR')
    expect(determinarModoCuotaFutbol({ proveedor: { limite: 100, restante: 15 } })).toBe('CRITICO')
    expect(determinarModoCuotaFutbol({ proveedor: { limite: 100, restante: 3 } })).toBe('RESERVA')
    expect(determinarModoCuotaFutbol({ limiteLocal: 20, restanteLocal: 10 })).toBe('NORMAL')
    expect(determinarModoCuotaFutbol({ limiteLocal: 20, restanteLocal: 6 })).toBe('CONSERVADOR')
  })

  it('evita llamadas repetidas cuando el snapshot sigue dentro de su intervalo', () => {
    const resultado = debeConsultarWorkerFutbol({
      prioridad: 'en_vivo', operacion: 'fixture', modo: 'NORMAL',
      actualizadoEn: new Date(ahora - 20_000).toISOString()
    }, ahora)
    expect(resultado).toEqual({ permitido: false, razon: 'snapshot_aun_vigente' })
  })

  it('en CRITICO y RESERVA conserva live/cierre final pero descarta standings y contenido secundario', () => {
    expect(debeConsultarWorkerFutbol({ prioridad: 'en_vivo', operacion: 'fixture', modo: 'CRITICO' }, ahora).permitido).toBe(true)
    expect(debeConsultarWorkerFutbol({ prioridad: 'en_vivo', operacion: 'estadisticas', modo: 'CRITICO' }, ahora).permitido).toBe(false)
    expect(debeConsultarWorkerFutbol({ prioridad: 'proximo', operacion: 'standings', modo: 'RESERVA' }, ahora).permitido).toBe(false)
    expect(debeConsultarWorkerFutbol({ prioridad: 'recien_finalizado', operacion: 'snapshot_final', modo: 'RESERVA' }, ahora).permitido).toBe(true)
  })

  it('omite juegos lejanos en modo conservador y nunca consulta fixtures cerrados', () => {
    expect(debeConsultarWorkerFutbol({ prioridad: 'lejano', operacion: 'fixture', modo: 'CONSERVADOR' }, ahora).permitido).toBe(false)
    expect(debeConsultarWorkerFutbol({ prioridad: 'cerrado', operacion: 'fixture', modo: 'NORMAL' }, ahora).permitido).toBe(false)
  })

  it('usa los intervalos configurados y permite forzar una actualización al vencerlos', () => {
    const actualizadoEn = new Date(ahora - (configuracionSchedulerFutbolPredeterminada.intervalosSegundos.en_vivo! + 1) * 1000).toISOString()
    expect(debeConsultarWorkerFutbol({ prioridad: 'en_vivo', operacion: 'fixture', modo: 'NORMAL', actualizadoEn }, ahora).permitido).toBe(true)
    expect(debeConsultarWorkerFutbol({ prioridad: 'lejano', operacion: 'fixture', modo: 'NORMAL' }, ahora).permitido).toBe(true)
  })
})
