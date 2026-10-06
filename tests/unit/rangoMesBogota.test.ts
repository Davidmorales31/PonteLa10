import { describe, expect, it } from 'vitest'
import { obtenerRangoMesBogota } from '~/server/utils/rangoMesBogota'

describe('rango mensual del calendario de Liga en hora colombiana', () => {
  it('usa límites de medianoche de Bogotá y cambia correctamente de diciembre a enero', () => {
    const octubre = obtenerRangoMesBogota('2026-10')
    expect(octubre).toEqual({
      desde: Date.parse('2026-10-01T05:00:00.000Z'),
      hasta: Date.parse('2026-11-01T05:00:00.000Z')
    })
    const diciembre = obtenerRangoMesBogota('2026-12')
    expect(diciembre?.hasta).toBe(Date.parse('2027-01-01T05:00:00.000Z'))
  })

  it('rechaza meses inexistentes o fuera del rango soportado', () => {
    expect(obtenerRangoMesBogota('2026-13')).toBeNull()
    expect(obtenerRangoMesBogota('2026-2')).toBeNull()
    expect(obtenerRangoMesBogota('1999-12')).toBeNull()
  })
})
