import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as shorts from '../../scripts/documental-shorts.mjs'

type Hecho = { id: string, acto: string, capitulo: string, frase: string, contraste: boolean, fuentes: { medio: string }[] }
type Material = {
  hechos: Hecho[], citas: { texto: string }[], fotos: { imagen: string }[], hitos: unknown[], videos: unknown[], fuentes: unknown[],
  sugerencias: { formato: string, hechos?: string[], hitos?: unknown[] }[]
}
const material = shorts.materialParaShorts as (g: unknown, o?: unknown) => Material

const guion = {
  protagonista: 'Fulano', tema: 'fulano', preguntaCentral: '¿Cómo lo logró?',
  fuentes: [{ id: 'f1', medio: 'Marca', url: 'https://marca.com/a' }, { id: 'f2', medio: 'AS', url: 'https://as.com/b' }],
  actos: [
    { id: 'pregunta', capitulos: [{ id: 'c00', voz: 'A los 40 años nadie lo conocía fuera de su país. ¿Cómo lo logró en 2026 contra todos los pronósticos?', fuentes: ['f1'], visuales: [{ tipo: 'foto', imagen: 'https://x/1.jpg', credito: 'A' }] }] },
    { id: 'origen', capitulos: [{ id: 'c01', voz: 'Nació en 1986 en una isla pequeña y creció jugando descalzo en la calle de su barrio.', fuentes: ['f1', 'f2'], visuales: [{ tipo: 'foto', imagen: 'https://x/1.jpg', credito: 'A' }, { tipo: 'cita', texto: 'Yo sueño con esto', autor: 'Fulano' }] }] },
    { id: 'ascenso', capitulos: [{ id: 'c02', voz: 'Fue profesional a los 25 años, pero nadie creía que llegaría a una selección mayor.', fuentes: ['f2'], visuales: [{ tipo: 'linea-tiempo', hitos: [{ ano: 2012, texto: 'Debut' }, { ano: 2026, texto: 'Mundial' }] }, { tipo: 'video', video: 'https://c/v.webm', entrevista: true }] }] },
    { id: 'legado', capitulos: [{ id: 'c03', voz: 'En 2026 paró siete balones ante la campeona de Europa y el estadio entero aplaudió.', fuentes: [], visuales: [{ tipo: 'ficha', texto: '7 ATAJADAS' }] }] }
  ]
}

describe('banco de leyendas: material de un documental para sus Shorts', () => {
  const m = material(guion)

  it('reúne hechos con número y su fuente, sin tomar las preguntas como hechos', () => {
    expect(m.hechos.length).toBeGreaterThanOrEqual(4)
    expect(m.hechos.every(h => !h.frase.includes('?'))).toBe(true)
    const nacimiento = m.hechos.find(h => h.frase.includes('1986'))!
    expect(nacimiento.acto).toBe('origen')
    expect(nacimiento.fuentes.map(f => f.medio)).toEqual(['Marca', 'AS'])
    expect(m.hechos.find(h => h.frase.includes('25 años'))?.contraste).toBe(true)
  })

  it('junta citas, hitos y fotos sin repetir, y deja fuera las entrevistas a cámara', () => {
    expect(m.citas.map(c => c.texto)).toEqual(['Yo sueño con esto'])
    expect(m.hitos).toHaveLength(2)
    expect(m.fotos).toHaveLength(1)
    expect(m.videos).toHaveLength(0)
    expect(m.fuentes).toHaveLength(2)
  })

  it('propone estructuras con ids de hechos que existen y tres actos distintos para la leyenda', () => {
    const ids = new Set(m.hechos.map(h => h.id))
    for (const s of m.sugerencias) for (const id of s.hechos || []) expect(ids.has(id)).toBe(true)
    const leyenda = m.sugerencias.find(s => s.formato === 'leyenda')!
    const actos = leyenda.hechos!.map(id => m.hechos.find(h => h.id === id)!.acto)
    expect(actos).toEqual(['origen', 'ascenso', 'legado'])
    expect(m.sugerencias.some(s => s.formato === 'antes-despues')).toBe(true)
    expect(m.sugerencias.some(s => s.formato === 'dato-no-cuadra')).toBe(true)
  })

  it('un guion vacío no rompe y no propone nada', () => {
    expect(material({}).sugerencias).toEqual([])
  })

  it('sirve con el documental real de Vozinha', () => {
    const real = JSON.parse(readFileSync('videos/documentales/2026-11-27-vozinha/guion.json', 'utf8'))
    const r = material(real)
    expect(r.hechos.length).toBeGreaterThan(15)
    expect(r.sugerencias.some(s => s.formato === 'leyenda')).toBe(true)
    expect(r.hechos.every(h => !h.frase.includes('?'))).toBe(true)
  })
})
