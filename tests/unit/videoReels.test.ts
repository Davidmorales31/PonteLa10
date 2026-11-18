import { describe, expect, it } from 'vitest'
import * as reels from '../../scripts/video-reels.mjs'

interface Palabra { inicio: number, fin: number, texto: string }
interface Elegido { bloque: { id: string, club?: string }, duracion: number, puntaje: number }
const elegirBloques = reels.elegirBloques as (m: unknown, g: unknown, o?: { max?: number, forzar?: string[] }) => Elegido[]
const agruparPalabras = reels.agruparPalabras as (p: Palabra[], o?: { maxPalabras?: number, maxSegundos?: number }) => Palabra[][]
const construirAss = reels.construirAss as (p: Palabra[], o?: { etiqueta?: string, duracion?: number }) => string
const descripcionReel = reels.descripcionReel as (d: { titular?: string, resumen?: string, slug?: string, credito?: string }) => string

function proyecto(duraciones: Record<string, number>) {
  let t = 5
  const segmentos: Array<{ id: string, inicio: number, fin: number }> = []
  const bloques = Object.entries(duraciones).map(([id, duracion], i) => {
    segmentos.push({ id: `${id}-cara`, inicio: t, fin: t + 4 }, { id: `${id}-voz`, inicio: t + 4, fin: t + duracion })
    t += duracion
    return { id, club: `Club ${i}`, rumor: false }
  })
  return { manifiesto: { segmentos }, guion: { bloques } }
}

describe('divisor de Reels', () => {
  it('descarta noticias muy cortas o muy largas y mantiene el orden del video', () => {
    const { manifiesto, guion } = proyecto({ b1: 45, b2: 12, b3: 90, b4: 40 })
    expect(elegirBloques(manifiesto, guion).map(e => e.bloque.id)).toEqual(['b1', 'b4'])
  })

  it('prefiere noticias con dato o marcador, sin rumor, y un club distinto en cada una', () => {
    const { manifiesto, guion } = proyecto({ b1: 45, b2: 45, b3: 45, b4: 45, b5: 45, b6: 45 })
    const g = guion as { bloques: Array<Record<string, unknown>> }
    g.bloques[4].dato = { valor: 40 }
    g.bloques[5].marcador = { local: 'A' }
    g.bloques[0].rumor = true
    const ids = elegirBloques(manifiesto, guion, { max: 3 }).map(e => e.bloque.id)
    expect(ids).toContain('b5')
    expect(ids).toContain('b6')
    expect(ids).not.toContain('b1')
    g.bloques[1].club = g.bloques[2].club = 'Mismo club'
    const clubes = elegirBloques(manifiesto, guion, { max: 5 }).map(e => e.bloque.club)
    expect(clubes.filter(c => c === 'Mismo club').length).toBeLessThanOrEqual(1)
  })

  it('respeta los bloques pedidos aunque no cumplan el rango de duración', () => {
    const { manifiesto, guion } = proyecto({ b1: 10, b2: 45 })
    expect(elegirBloques(manifiesto, guion, { forzar: ['b1'] }).map(e => e.bloque.id)).toEqual(['b1'])
    expect(elegirBloques(manifiesto, guion, { forzar: ['b9'] })).toEqual([])
  })

  it('ignora bloques cuyos tramos no están en el manifiesto', () => {
    const { manifiesto, guion } = proyecto({ b1: 45 })
    ;(guion as { bloques: unknown[] }).bloques.push({ id: 'b2', club: 'X' })
    expect(elegirBloques(manifiesto, guion).map(e => e.bloque.id)).toEqual(['b1'])
  })

  it('agrupa palabras en subtítulos cortos y corta en pausas largas', () => {
    const palabras: Palabra[] = [
      { inicio: 0, fin: 0.3, texto: 'Colombia' }, { inicio: 0.3, fin: 0.5, texto: 'cerró' }, { inicio: 0.5, fin: 0.7, texto: 'el' },
      { inicio: 0.7, fin: 1, texto: 'año' }, { inicio: 3, fin: 3.3, texto: 'Fin' }
    ]
    const grupos = agruparPalabras(palabras)
    expect(grupos.map(g => g.map(p => p.texto).join(' '))).toEqual(['Colombia cerró el', 'año', 'Fin'])
  })

  it('construye subtítulos ASS con la palabra activa en amarillo y la etiqueta del club', () => {
    const ass = construirAss([{ inicio: 0, fin: 0.5, texto: 'Hola' }, { inicio: 0.5, fin: 1, texto: 'mundo' }], { etiqueta: 'Once Caldas', duracion: 2 })
    expect(ass).toContain('PlayResX: 1080')
    expect(ass).toContain('Style: Sub,Arial Black')
    expect(ass).toContain('ONCE CALDAS')
    expect(ass).toContain('{\\c&H0000D8FF&}HOLA{\\c&HFFFFFF&} MUNDO')
    expect(ass).toContain('Dialogue: 1,0:00:00.50,0:00:01.00,Sub')
  })

  it('nunca superpone dos subtítulos aunque las palabras se solapen', () => {
    const ass = construirAss([
      { inicio: 0, fin: 0.9, texto: 'Empezamos' }, { inicio: 0.9, fin: 1.1, texto: 'con' }, { inicio: 1.1, fin: 1.15, texto: 'la' },
      { inicio: 1.12, fin: 1.6, texto: 'Selección' }, { inicio: 1.6, fin: 2, texto: 'así' }
    ])
    const eventos = ass.split('\n').filter(l => l.startsWith('Dialogue: 1,')).map(l => l.split(',').slice(1, 3).map(h => { const [hh, mm, ss] = h.split(':'); return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) }))
    for (let i = 1; i < eventos.length; i++) expect(eventos[i - 1][1]).toBeLessThanOrEqual(eventos[i][0] + 0.001)
  })

  it('no deja pasar llaves ni barras que rompan el formato ASS', () => {
    const ass = construirAss([{ inicio: 0, fin: 1, texto: '{\\an8}hack' }])
    expect(ass).not.toContain('{\\an8}')
  })

  it('arma la descripción con enlace, crédito y etiquetas, dentro del límite', () => {
    const d = descripcionReel({ titular: 'Titular', resumen: 'Resumen', slug: 'mi-nota', credito: 'Colprensa (vía X)' })
    expect(d).toContain('https://www.pont3la10.com/articulos/mi-nota')
    expect(d).toContain('Foto: Colprensa (vía X)')
    expect(d).toContain('#Pont3la10')
    expect(descripcionReel({ titular: 'x'.repeat(5000), slug: 's' }).length).toBeLessThanOrEqual(2200)
  })
})
