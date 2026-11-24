import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as rotacion from '../../scripts/video-estructura.mjs'

const config = JSON.parse(readFileSync('config/videoDiario.json', 'utf8'))
const elegir = rotacion.elegirEstructura as (o: Record<string, unknown>) => { estructura: string, excluidas: string[], candidatas: string[] }

describe('rotación de la estructura del video de noticias', () => {
  it('es determinista: el mismo día y la misma edición dan lo mismo', () => {
    const a = elegir({ fecha: '2026-11-25', edicion: 'latam', historial: [], config })
    const b = elegir({ fecha: '2026-11-25', edicion: 'latam', historial: [], config })
    expect(a).toEqual(b)
    expect(Object.keys(config.estructuras)).toContain(a.estructura)
  })

  it('no repite las dos últimas estructuras', () => {
    for (let dia = 1; dia <= 28; dia++) {
      const fecha = `2026-12-${String(dia).padStart(2, '0')}`
      const r = elegir({ fecha, edicion: 'latam', historial: ['directa', 'top'], config })
      expect(['directa', 'top']).not.toContain(r.estructura)
    }
  })

  it('con el tiempo usa todas las estructuras y la directa es la más frecuente', () => {
    const cuenta: Record<string, number> = {}
    let historial: string[] = []
    for (let dia = 0; dia < 300; dia++) {
      const fecha = new Date(Date.UTC(2027, 0, 1 + dia)).toISOString().slice(0, 10)
      const { estructura } = elegir({ fecha, edicion: 'internacional', historial, config })
      cuenta[estructura] = (cuenta[estructura] || 0) + 1
      historial = [estructura, ...historial]
    }
    expect(Object.keys(cuenta).sort()).toEqual(Object.keys(config.estructuras).sort())
    expect(cuenta.directa).toBeGreaterThan(cuenta.top)
  })

  it('el azar determinista queda entre 0 y 1 y cambia con el texto', () => {
    const f = rotacion.azarDeterminista as (t: string) => number
    expect(f('a')).toBeGreaterThanOrEqual(0)
    expect(f('a')).toBeLessThan(1)
    expect(f('a')).not.toBe(f('b'))
  })

  it('con todas excluidas por el historial igualmente elige una', () => {
    const r = elegir({ fecha: '2026-12-01', edicion: 'latam', historial: ['directa', 'historia-a-fondo', 'top', 'pregunta-del-dia'], config: { ...config, rotacion: { ...config.rotacion, noRepetirUltimas: 4 } } })
    expect(Object.keys(config.estructuras)).toContain(r.estructura)
  })
})
