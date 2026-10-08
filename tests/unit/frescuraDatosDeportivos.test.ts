import { describe, expect, it } from 'vitest'
import {
  evaluarFrescuraPartido,
  evaluarFrescuraTabla,
  evaluarFrescuraTemporada
} from '../../utils/frescuraDatosDeportivos'

const ahora = Date.parse('2026-10-08T12:00:00.000Z')

function verificadoHace(minutos: number) {
  return new Date(ahora - minutos * 60_000).toISOString()
}

describe('frescura de datos deportivos', () => {
  it('aplica umbrales distintos para directo, prepartido, calendario y tabla', () => {
    expect(evaluarFrescuraPartido({
      estado: 'live', fechaIso: new Date(ahora - 20 * 60_000).toISOString(), verificadoEn: verificadoHace(3)
    }, ahora)).toMatchObject({ estado: 'actualizado', umbralMinutos: 3 })
    expect(evaluarFrescuraPartido({
      estado: 'live', fechaIso: new Date(ahora - 20 * 60_000).toISOString(), verificadoEn: verificadoHace(14)
    }, ahora)).toMatchObject({ estado: 'desactualizado', umbralMinutos: 3 })
    expect(evaluarFrescuraPartido({
      estado: 'live', fechaIso: new Date(ahora - 20 * 60_000).toISOString(), verificadoEn: verificadoHace(4)
    }, ahora)).toMatchObject({ estado: 'desactualizado', umbralMinutos: 3 })
    expect(evaluarFrescuraPartido({
      estado: 'scheduled', fechaIso: new Date(ahora + 45 * 60_000).toISOString(), verificadoEn: verificadoHace(30)
    }, ahora)).toMatchObject({ estado: 'actualizado', umbralMinutos: 30 })
    expect(evaluarFrescuraPartido({
      estado: 'scheduled', fechaIso: new Date(ahora + 45 * 60_000).toISOString(), verificadoEn: verificadoHace(31)
    }, ahora)).toMatchObject({ estado: 'desactualizado', umbralMinutos: 30 })
    expect(evaluarFrescuraPartido({
      estado: 'scheduled', fechaIso: new Date(ahora + 4 * 60 * 60_000).toISOString(), verificadoEn: verificadoHace(36 * 60)
    }, ahora)).toMatchObject({ estado: 'actualizado', umbralMinutos: 36 * 60 })
    expect(evaluarFrescuraTabla(verificadoHace(60), ahora)).toMatchObject({ estado: 'actualizado', umbralMinutos: 60 })
    expect(evaluarFrescuraTabla(verificadoHace(61), ahora)).toMatchObject({ estado: 'desactualizado', umbralMinutos: 60 })
  })

  it('no redondea hacia abajo para permitir frescura por encima del umbral', () => {
    expect(evaluarFrescuraPartido({
      estado: 'live', fechaIso: new Date(ahora - 20 * 60_000).toISOString(),
      verificadoEn: new Date(ahora - 3 * 60_000 - 1).toISOString()
    }, ahora)).toMatchObject({ estado: 'desactualizado', edadMinutos: 3, umbralMinutos: 3 })
  })

  it('mantiene resultados terminales estables sin dejar pasar fechas ausentes o futuras', () => {
    expect(evaluarFrescuraPartido({
      estado: 'finished', fechaIso: '2020-01-01T00:00:00.000Z', verificadoEn: '2020-01-01T02:00:00.000Z'
    }, ahora)).toMatchObject({ estado: 'estable', actualizado: true, umbralMinutos: null })
    expect(evaluarFrescuraPartido({
      estado: 'finished', fechaIso: '2020-01-01T00:00:00.000Z', verificadoEn: ''
    }, ahora)).toMatchObject({ estado: 'sin_verificar', actualizado: false })
    expect(evaluarFrescuraTabla('2026-10-08T13:00:00.000Z', ahora)).toMatchObject({ estado: 'fecha_invalida', actualizado: false })
  })

  it('marca la temporada actual si cualquier dato activo o tabla excede su umbral', () => {
    const partido = {
      estado: 'scheduled',
      fechaIso: new Date(ahora + 8 * 60 * 60_000).toISOString(),
      verificadoEn: verificadoHace(37 * 60)
    }
    expect(evaluarFrescuraTemporada([partido], [], true, ahora).actualizado).toBe(false)
    expect(evaluarFrescuraTemporada([{
      estado: 'finished', fechaIso: '2026-10-01T00:00:00.000Z', verificadoEn: '2026-10-01T03:00:00.000Z'
    }], [{ verificadoEn: verificadoHace(61) }], true, ahora).actualizado).toBe(false)
    expect(evaluarFrescuraTemporada([{
      estado: 'finished', fechaIso: '2025-10-01T00:00:00.000Z', verificadoEn: '2025-10-01T03:00:00.000Z'
    }], [], false, ahora).estado).toBe('estable')
  })
})
