import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import * as latam from '../../scripts/video-latam.mjs'
import * as edicion from '../../scripts/video-edicion.mjs'
import * as selector from '../../scripts/documental-elegir.mjs'

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
    expect(entidad('Julián Álvarez, dos asistencias en el Atlético ante Getafe', config)).toBe('Figura: julian alvarez')
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

describe('un artículo no se repite entre el video de Latinoamérica y el internacional', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'latam-'))
  afterAll(() => rmSync(carpeta, { recursive: true, force: true }))
  const guion = (nombre: string, slugs: string[]) => {
    mkdirSync(join(carpeta, nombre), { recursive: true })
    writeFileSync(join(carpeta, nombre, 'guion.json'), JSON.stringify({ bloques: slugs.map(articuloSlug => ({ articuloSlug })) }))
  }
  const usadas = latam.slugsUsados as (o: { fecha: string, carpeta: string }) => Promise<{ latam: Set<string>, internacional: Set<string> }>
  const sinRepetir = latam.sinRepetirEntreVideos as (r: unknown, u: unknown) => { latam: { slug: string }[], internacional: { slug: string }[] }

  it('lee lo que usó cada video del día (Colombia y Latinoamérica juntos, internacional aparte)', async () => {
    guion('2026-11-24', ['a', 'b'])
    guion('2026-11-24-latam', ['c'])
    guion('2026-11-24-internacional', ['x', 'y'])
    guion('2026-11-23', ['z'])
    const u = await usadas({ fecha: '2026-11-24', carpeta })
    expect([...u.latam].sort()).toEqual(['a', 'b', 'c'])
    expect([...u.internacional].sort()).toEqual(['x', 'y'])
    expect((await usadas({ fecha: '2026-11-25', carpeta })).latam.size).toBe(0)
  })

  it('quita de cada lista lo que ya usó el video de la otra edición', () => {
    const reparto = { latam: [{ slug: 'a' }, { slug: 'x' }], internacional: [{ slug: 'y' }, { slug: 'a' }, { slug: 'k' }] }
    const r = sinRepetir(reparto, { latam: new Set(['a']), internacional: new Set(['x', 'y']) })
    expect(r.latam.map(n => n.slug)).toEqual(['a'])
    expect(r.internacional.map(n => n.slug)).toEqual(['y', 'k'])
  })
})

describe('el selector de documentales lee también las tendencias de Latinoamérica', () => {
  const carpeta = mkdtempSync(join(tmpdir(), 'tendencias-'))
  afterAll(() => rmSync(carpeta, { recursive: true, force: true }))
  it('incluye las fotos AAAA-MM-DD.json y AAAA-MM-DD-latam.json de los últimos 7 días y nada más', async () => {
    for (const n of ['2026-11-23.json', '2026-11-23-latam.json', '2026-11-22-latam.json', '2026-10-01-latam.json', 'notas.json', '2026-11-23-otra.json']) writeFileSync(join(carpeta, n), JSON.stringify({ temas: [{ tema: n }] }))
    const leer = selector.leerFotosSemana as (hoy: string, dir: string) => Promise<{ temas: { tema: string }[] }[]>
    const fotos = await leer('2026-11-24', carpeta)
    expect(fotos.map(f => f.temas[0].tema).sort()).toEqual(['2026-11-22-latam.json', '2026-11-23-latam.json', '2026-11-23.json'])
  })
})
