import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as latam from '../../scripts/video-latam.mjs'
import * as edicion from '../../scripts/video-edicion.mjs'

type Nota = { slug: string, titulo: string, publicadoEn?: string, resumen?: string }
const config = JSON.parse(readFileSync('config/fuentesFutbolLatam.json', 'utf8'))
const entidad = latam.entidadLatam as (t: string, c: unknown) => string | null
const repartir = latam.repartirEdiciones as (o: Record<string, unknown>) => { latam: (Nota & { pais: string })[], internacional: Nota[] }

describe('edición latam: reparto de notas', () => {
  it('reconoce países, torneos, clubes y colombianos de la región, sin confundir otros nombres', () => {
    expect(entidad('Boca Juniors empata en La Bombonera', config)).toBe('Boca Juniors')
    expect(entidad('Palmeiras avanza en la Copa Libertadores', config)).toBe('Copa Libertadores')
    expect(entidad('Argentina golea a Chile', config)).toBe('Argentina')
    expect(entidad('Luis Díaz marca otro gol: el colombiano no para', config)).toBe('Colombia')
    expect(entidad('El Real Madrid golea al Barcelona en la Champions League', config)).toBeNull()
    // «chile» no coincide dentro de otra palabra.
    expect(entidad('El picante del chilenismo', config)).toBeNull()
  })

  it('Colombia siempre es de Latam; futbol-mundial se reparte y ninguna nota queda en los dos videos', () => {
    const r = repartir({
      colombianas: [{ slug: 'nacional-gana', titulo: 'Nacional gana el clásico' }],
      mundiales: [
        { slug: 'river-boca', titulo: 'River y Boca se enfrentan en la Libertadores' },
        { slug: 'madrid-barca', titulo: 'Madrid y Barcelona definen el clásico' },
        { slug: 'colombiano-premier', titulo: 'Un colombiano brilla en la Premier League' }
      ],
      config
    })
    expect(r.latam.map(n => n.slug)).toEqual(['nacional-gana', 'river-boca', 'colombiano-premier'])
    expect(r.internacional.map(n => n.slug)).toEqual(['madrid-barca'])
    expect(r.latam.find(n => n.slug === 'nacional-gana')!.pais).toBe('Colombia')
    const todos = [...r.latam, ...r.internacional].map(n => n.slug)
    expect(new Set(todos).size).toBe(todos.length)
  })

  it('no repite lo que el otro video del día ya usó', () => {
    const r = repartir({ colombianas: [{ slug: 'a', titulo: 'x' }, { slug: 'b', titulo: 'y' }], mundiales: [], config, usados: ['a'] })
    expect(r.latam.map(n => n.slug)).toEqual(['b'])
  })

  it('cuenta las historias por país y filtra por la fecha de Bogotá', () => {
    expect((latam.conteoPorPais as (h: unknown[]) => Record<string, number>)([{ pais: 'Colombia' }, { pais: 'Colombia' }, { pais: 'Chile' }])).toEqual({ Colombia: 2, Chile: 1 })
    // 02:00 UTC del 24 sigue siendo 23 en Bogotá (UTC−5); 06:00 UTC ya es 24.
    const notas = [{ slug: 'ayer', publicadoEn: '2026-11-24T02:00:00Z' }, { slug: 'hoy', publicadoEn: '2026-11-24T06:00:00Z' }]
    expect((latam.delDia as (a: unknown[], f: string) => { slug: string }[])(notas, '2026-11-24').map(n => n.slug)).toEqual(['hoy'])
  })

  it('la edición latam consulta las categorías de las que salen sus notas', () => {
    const e = (edicion.edicionDe as (g: unknown) => { categorias: string[] })({ edicion: 'latam' })
    expect(e.categorias).toEqual(['futbol-colombiano', 'futbol-mundial'])
  })
})
