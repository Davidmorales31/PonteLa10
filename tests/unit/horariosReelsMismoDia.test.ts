import { describe, expect, it } from 'vitest'
import { proponerHoras } from '../../scripts/video-horarios.mjs'

const horas = proponerHoras as (o: { ahora?: number, cantidad?: number, ocupadas?: string[], tipo?: string }) => string[]
const diaBogota = (iso: string) => new Date(Date.parse(iso) - 5 * 3_600_000).toISOString().slice(0, 10)

describe('Reels de un video: todos el mismo día', () => {
  // El video sale de noche (22:40 en Bogotá): todos sus Reels deben caer al día siguiente.
  const ahora = Date.parse('2026-11-23T03:40:00Z')

  it('coloca 30 Reels el mismo día siguiente, sin pasar al subsiguiente', () => {
    const salida = horas({ ahora, cantidad: 30 })
    expect(salida).toHaveLength(30)
    expect(new Set(salida.map(diaBogota)).size).toBe(1)
    expect(diaBogota(salida[0])).toBe('2026-11-23')
  })

  it('las programaciones una por una también llenan el mismo día', () => {
    const ocupadas: string[] = []
    for (let i = 0; i < 25; i++) ocupadas.push(horas({ ahora, ocupadas, cantidad: 1 })[0])
    expect(new Set(ocupadas.map(diaBogota)).size).toBe(1)
    for (const h of ocupadas) {
      const hora = new Date(Date.parse(h) - 5 * 3_600_000).getUTCHours()
      expect(hora >= 5 && hora < 23).toBe(true)
    }
  })

  it('el video largo conserva sus franjas propias', () => {
    const salida = horas({ ahora, cantidad: 3, tipo: 'video' })
    expect(new Set(salida.map(diaBogota)).size).toBeGreaterThan(1)
  })
})
