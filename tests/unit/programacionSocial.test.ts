import { describe, expect, it } from 'vitest'
import { esquemaProgramacionSocial, fechasProgramacionSocial, inicioProgramacionColombia } from '~/utils/editorial/programacionSocial'
const entrada = { operacionId: '11111111-1111-4111-8111-111111111111', confirmar: true, articulos: ['22222222-2222-4222-8222-222222222222'], destinos: ['facebook','instagram'], inicio: '2026-11-14T12:00:00-05:00', intervaloMinutos: 15 }
describe('programación social aprobada', () => {
  it('interpreta hora de Colombia independientemente de la zona del navegador', () => {
    expect(inicioProgramacionColombia('2026-11-14T12:00')).toBe('2026-11-14T17:00:00.000Z')
    expect(inicioProgramacionColombia('2026-02-30T12:00')).toBe('')
  })
  it('espacia noticias y cruza medianoche correctamente', () => {
    expect(fechasProgramacionSocial('2026-11-14T23:50:00-05:00', 15, 3)).toEqual([
      '2026-11-15T04:50:00.000Z','2026-11-15T05:05:00.000Z','2026-11-15T05:20:00.000Z'
    ])
  })
  it('admite únicamente el lote confirmado y redes soportadas', () => {
    expect(esquemaProgramacionSocial.safeParse(entrada).success).toBe(true)
    for (const cambio of [{ confirmar: false }, { intervaloMinutos: 0 }, { intervaloMinutos: 1.5 }, { destinos: ['x'] },
      { destinos: ['facebook','facebook'] }, { articulos: [] }, { articulos: [...entrada.articulos,...entrada.articulos] }]) {
      expect(esquemaProgramacionSocial.safeParse({ ...entrada,...cambio }).success).toBe(false)
    }
  })
})
