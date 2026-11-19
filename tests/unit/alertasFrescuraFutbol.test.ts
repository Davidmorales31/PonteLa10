import { describe, expect, it } from 'vitest'
import { generarAlertasFrescuraFutbol } from '../../utils/alertasFrescuraFutbol'

const grupoSaludable = { estado: 'saludable' as const }

describe('alertas de frescura de fútbol', () => {
  it('avisa si una competición no tiene datos o si la cobertura está incompleta', () => {
    const alertas = generarAlertasFrescuraFutbol({
      calendario: [{ estado: 'sin_datos' }, grupoSaludable],
      tablas: [grupoSaludable],
      coberturaCompleta: false
    }, false)

    expect(alertas).toEqual([
      'Hay datos deportivos pendientes de actualización',
      'La cobertura del monitor de frescura es parcial'
    ])
  })

  it('avisa si el chequeo falla aunque no haya respuesta previa', () => {
    expect(generarAlertasFrescuraFutbol(null, true)).toEqual([
      'Monitor de frescura de fútbol no disponible'
    ])
  })

  it('no alerta si todos los grupos están saludables y la cobertura es completa', () => {
    expect(generarAlertasFrescuraFutbol({
      calendario: [grupoSaludable],
      tablas: [grupoSaludable],
      coberturaCompleta: true
    }, false)).toEqual([])
  })

  it('México alerta solo con datos vencidos, no mientras no tenga datos', () => {
    const base = { calendario: [grupoSaludable], tablas: [grupoSaludable], coberturaCompleta: true }
    expect(generarAlertasFrescuraFutbol({
      ...base,
      mexico: { calendario: [{ estado: 'sin_datos' }], tablas: [{ estado: 'sin_datos' }], coberturaCompleta: true }
    }, false)).toEqual([])
    expect(generarAlertasFrescuraFutbol({
      ...base,
      mexico: { calendario: [{ estado: 'atencion' }], tablas: [grupoSaludable], coberturaCompleta: false }
    }, false)).toEqual([
      'Hay datos deportivos de México pendientes de actualización',
      'La cobertura del monitor de frescura es parcial'
    ])
  })
})
