import { describe, expect, it } from 'vitest'
import {
  calcularSiguienteEjecucionWorkerFutbol,
  clasificarPrioridadFixtureFutbol,
  configuracionSchedulerFutbolPredeterminada,
  debeDiferirCargaInicialFutbol,
  debeConsultarWorkerFutbol,
  esperaHastaMantenimientoDiarioBogota,
  esperaHastaLasSeisBogota,
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

  it('difiere la carga inicial nocturna hasta las seis de Bogotá', () => {
    const unaBogota = new Date('2026-10-02T06:00:00.000Z')
    const seisBogota = new Date('2026-10-02T11:00:00.000Z')
    expect(debeDiferirCargaInicialFutbol(unaBogota)).toBe(true)
    expect(esperaHastaLasSeisBogota(unaBogota)).toBe(5 * 60 * 60_000)
    expect(debeDiferirCargaInicialFutbol(seisBogota)).toBe(false)
  })

  it('ajusta la siguiente activación a la vigencia de cada proveedor', () => {
    const instante = Date.parse('2026-10-02T20:00:00.000Z')
    const goalVivo = calcularSiguienteEjecucionWorkerFutbol([{
      provider: 'goal-api', estado: 'live', inicioUtc: '2026-10-02T19:00:00.000Z',
      detallesActualizadosEn: new Date(instante - 60_000).toISOString()
    }], instante)
    const apiVivo = calcularSiguienteEjecucionWorkerFutbol([{
      provider: 'api-football', estado: 'live', inicioUtc: '2026-10-02T19:00:00.000Z',
      detallesActualizadosEn: new Date(instante - 60_000).toISOString()
    }], instante)

    expect(goalVivo.esperaMs).toBe(4 * 60_000)
    expect(apiVivo.esperaMs).toBe(2 * 60_000)
  })

  it('reduce la frecuencia de un estado en vivo que lleva horas sin confirmación', () => {
    const instante = Date.parse('2026-10-02T20:00:00.000Z')
    const resultado = calcularSiguienteEjecucionWorkerFutbol([{
      provider: 'goal-api', estado: 'live', inicioUtc: '2026-10-02T16:00:00.000Z',
      detallesActualizadosEn: new Date(instante - 10 * 60_000).toISOString()
    }], instante)

    expect(resultado.esperaMs).toBe(20 * 60_000)
  })

  it('espera el cambio del día de Bogotá para reanudar tras agotar la cuota', () => {
    const instante = new Date('2026-10-01T20:00:00.000Z')
    expect(esperaHastaMantenimientoDiarioBogota(instante)).toBe(9 * 60 * 60_000 + 5 * 60_000)
  })

  it('reactiva un programado vencido sin detalles en vez de dormir hasta mantenimiento', () => {
    const instante = Date.parse('2026-10-03T02:00:00.000Z')
    const resultado = calcularSiguienteEjecucionWorkerFutbol([{
      provider: 'api-football', estado: 'scheduled', inicioUtc: '2026-10-02T22:00:00.000Z',
      detallesActualizadosEn: null
    }], instante)

    expect(resultado).toEqual({ esperaMs: 60_000, motivo: 'fixture_debe_actualizarse' })
  })

  it('limita a treinta minutos la repetición si el proveedor mantiene un estado programado vencido', () => {
    const instante = Date.parse('2026-10-03T02:00:00.000Z')
    const resultado = calcularSiguienteEjecucionWorkerFutbol([{
      provider: 'goal-api', estado: 'scheduled', inicioUtc: '2026-10-02T22:00:00.000Z',
      detallesActualizadosEn: new Date(instante - 10 * 60_000).toISOString()
    }], instante)

    expect(resultado).toEqual({ esperaMs: 20 * 60_000, motivo: 'espera_fixture' })
  })

  it('no sondea una madrugada vacía y duerme hasta la próxima ventana', () => {
    const instante = Date.parse('2026-10-02T06:00:00.000Z')
    const resultado = calcularSiguienteEjecucionWorkerFutbol([], instante)
    expect(resultado.esperaMs).toBe(5 * 60 * 60_000)
    expect(resultado.motivo).toBe('franja_nocturna_sin_partidos')
  })

  it('difiere los prepartidos posteriores a las seis y conserva los partidos nocturnos y en vivo', () => {
    const cincoBogota = Date.parse('2026-10-02T10:00:00.000Z')
    const partidoDeLasSeisYMedia = calcularSiguienteEjecucionWorkerFutbol([{
      provider: 'goal-api', estado: 'scheduled', inicioUtc: '2026-10-02T11:30:00.000Z',
      detallesActualizadosEn: '2026-10-02T09:55:00.000Z'
    }], cincoBogota)
    expect(partidoDeLasSeisYMedia).toEqual({ esperaMs: 60 * 60_000, motivo: 'franja_nocturna_sin_partidos' })

    const partidoDeLasCincoYMedia = calcularSiguienteEjecucionWorkerFutbol([{
      provider: 'goal-api', estado: 'scheduled', inicioUtc: '2026-10-02T10:30:00.000Z',
      detallesActualizadosEn: '2026-10-02T09:55:00.000Z'
    }], cincoBogota)
    expect(partidoDeLasCincoYMedia.esperaMs).toBe(60_000)

    const partidoEnVivo = calcularSiguienteEjecucionWorkerFutbol([{
      provider: 'goal-api', estado: 'live', inicioUtc: '2026-10-02T09:30:00.000Z',
      detallesActualizadosEn: '2026-10-02T09:58:00.000Z'
    }], cincoBogota)
    expect(partidoEnVivo.esperaMs).toBe(3 * 60_000)
  })
})
