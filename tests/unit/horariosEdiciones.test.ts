import { describe, expect, it } from 'vitest'
import { proponerHoras } from '../../scripts/video-horarios.mjs'

type Opciones = { ahora?: number, cantidad?: number, ocupadas?: string[], tipo?: string, edicion?: string }
const horas = proponerHoras as (o: Opciones) => string[]
const bogota = (iso: string) => new Date(Date.parse(iso) - 5 * 3_600_000).toISOString().replace('T', ' ').slice(0, 16)

describe('franjas del video largo por edición', () => {
  // Lunes 23 de noviembre de 2026, 08:00 en Bogotá.
  const ahora = Date.parse('2026-11-23T13:00:00Z')

  it('Latinoamérica conserva las franjas históricas y la internacional tiene las suyas', () => {
    expect(horas({ ahora, cantidad: 2, tipo: 'video', edicion: 'latam' }).map(bogota)).toEqual(['2026-11-23 12:30', '2026-11-23 18:30'])
    expect(horas({ ahora, cantidad: 2, tipo: 'video', edicion: 'internacional' }).map(bogota)).toEqual(['2026-11-23 14:30', '2026-11-23 21:30'])
  })

  it('una edición sin franjas propias (Colombia) usa las del video largo de siempre', () => {
    expect(horas({ ahora, cantidad: 2, tipo: 'video', edicion: 'colombia' })).toEqual(horas({ ahora, cantidad: 2, tipo: 'video' }))
  })

  it('el documental solo sale los viernes a las 18:30', () => {
    const salida = horas({ ahora, cantidad: 2, tipo: 'video', edicion: 'documental' }).map(bogota)
    expect(salida).toEqual(['2026-11-27 18:30', '2026-12-04 18:30'])
  })

  it('el diario de Latinoamérica y el documental no se pisan el viernes', () => {
    const documental = horas({ ahora, tipo: 'video', edicion: 'documental' })
    const latam = horas({ ahora: Date.parse('2026-11-27T13:00:00Z'), cantidad: 2, tipo: 'video', edicion: 'latam', ocupadas: documental }).map(bogota)
    expect(latam[0]).toBe('2026-11-27 12:30')
    expect(latam[1]).not.toBe('2026-11-27 18:30')
  })

  it('los Reels y Shorts siguen usando sus franjas', () => {
    expect(horas({ ahora, cantidad: 1 }).map(bogota)[0]).toBe('2026-11-23 12:30')
  })
})
