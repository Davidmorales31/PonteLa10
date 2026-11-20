import { describe, expect, it } from 'vitest'
import * as familia from '../../scripts/video-estudio-familia.mjs'

const nombrePadre = familia.nombrePadre as (n: string) => string | null
const numeroDeReel = familia.numeroDeReel as (n: string) => number
const hijosDe = familia.hijosDe as (r: string, n: string[]) => string[]
const raizDeFamilia = familia.raizDeFamilia as (n: string, todos: string[]) => string
const listaDeReels = familia.listaDeReels as (o: { cortes?: Array<Record<string, unknown>>, hijos?: Array<Record<string, unknown>> }) => Array<Record<string, unknown>>

const nombres = ['2026-11-19', '2026-11-19-reel-10', '2026-11-19-reel-2', '2026-11-19-reel-1', '2026-11-18', '2026-11-18-reel-1', '2026-11-20-reel-1']

describe('jerarquía de proyectos del estudio', () => {
  it('reconoce el proyecto principal de un Reel con guion propio', () => {
    expect(nombrePadre('2026-11-19-reel-3')).toBe('2026-11-19')
    expect(nombrePadre('2026-11-19')).toBeNull()
    expect(nombrePadre('2026-11-19-reel-x')).toBeNull()
    expect(numeroDeReel('2026-11-19-reel-12')).toBe(12)
  })

  it('ordena los subproyectos por número (no alfabéticamente)', () => {
    expect(hijosDe('2026-11-19', nombres)).toEqual(['2026-11-19-reel-1', '2026-11-19-reel-2', '2026-11-19-reel-10'])
    expect(hijosDe('2026-11-18', nombres)).toEqual(['2026-11-18-reel-1'])
  })

  it('la raíz de un subproyecto es su principal, si existe', () => {
    expect(raizDeFamilia('2026-11-19-reel-2', nombres)).toBe('2026-11-19')
    expect(raizDeFamilia('2026-11-19', nombres)).toBe('2026-11-19')
    expect(raizDeFamilia('2026-11-20-reel-1', nombres)).toBe('2026-11-20-reel-1') // huérfano: su principal no existe
  })

  it('une todos los Reels en una lista: guion propio primero (incluso pendientes) y los cortes después', () => {
    const lista = listaDeReels({
      hijos: [{ proyecto: 'a-reel-1', listo: true, id: 'r1' }, { proyecto: 'a-reel-2', listo: false, id: null }],
      cortes: [{ proyecto: 'a', id: 'c1' }]
    })
    expect(lista.map(r => `${r.origen}:${r.proyecto}:${r.listo}`)).toEqual(['guion:a-reel-1:true', 'guion:a-reel-2:false', 'video:a:true'])
  })
})
