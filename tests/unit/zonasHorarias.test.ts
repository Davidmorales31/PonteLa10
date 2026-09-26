import { describe, expect, it } from 'vitest'
import { normalizarZonaHoraria, obtenerFechaEnZonaHoraria, zonaHorariaColombia } from '../../utils/zonasHorarias'

describe('zonas horarias públicas', () => {
  it('usa Colombia como respaldo para zonas inválidas o con formato inesperado', () => {
    expect(normalizarZonaHoraria('no-es-una-zona')).toBe(zonaHorariaColombia)
    expect(normalizarZonaHoraria('x'.repeat(65))).toBe(zonaHorariaColombia)
  })

  it('calcula el día del proveedor en el calendario de cada dispositivo', () => {
    const instante = new Date('2026-09-26T02:00:00.000Z')

    expect(obtenerFechaEnZonaHoraria(instante, 'America/Bogota')).toBe('2026-09-25')
    expect(obtenerFechaEnZonaHoraria(instante, 'Asia/Tokyo')).toBe('2026-09-26')
  })
})
