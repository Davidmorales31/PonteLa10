import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as radar from '../../scripts/tendencias-futbol-latam.mjs'
import * as internacional from '../../scripts/tendencias-futbol-internacional.mjs'
import * as salud from '../../scripts/fuentes-salud.mjs'

const latam = JSON.parse(readFileSync('config/fuentesFutbolLatam.json', 'utf8'))
type ConfigRadar = { competiciones: { nombre: string, consulta: string }[], clubesDeMayorInteres: { nombre: string }[], figuras: string[], tendencias: { paises: string[] } }
const configRadar = radar.configRadarLatam as (c: unknown) => ConfigRadar

describe('radar de Latinoamérica', () => {
  const config = configRadar(latam)

  it('arma la configuración del radar sin competiciones repetidas', () => {
    const nombres = config.competiciones.map(c => c.nombre.toLowerCase())
    expect(new Set(nombres).size).toBe(nombres.length)
    expect(nombres).toContain('copa libertadores')
    expect(nombres).toContain('fútbol chileno')
    expect(config.clubesDeMayorInteres.map(c => c.nombre)).toEqual(expect.arrayContaining(['Boca Juniors', 'Atlético Nacional']))
    expect(config.figuras).toContain('Lionel Messi')
    expect(config.tendencias.paises).toEqual(expect.arrayContaining(['CO', 'AR', 'BR']))
  })

  it('el radar internacional ordena temas de la región con esta configuración', () => {
    const rankear = internacional.rankearTemas as (o: Record<string, unknown>) => { tema: string, entidades: string[] }[]
    const temas = rankear({
      config,
      trends: [{ termino: 'Boca Juniors', trafico: 200000, fecha: '', pais: 'AR', noticias: [] }, { termino: 'receta de arroz', trafico: 900000, fecha: '', pais: 'CO', noticias: [] }],
      noticias: [{ titulo: 'Palmeiras avanza en la Copa Libertadores', medio: 'Olé', radar: '', fecha: '', consulta: 'Copa Libertadores' }]
    })
    expect(temas.some(t => t.entidades.includes('Boca Juniors'))).toBe(true)
    expect(temas.some(t => t.entidades.includes('Palmeiras'))).toBe(true)
    expect(temas.some(t => /arroz/.test(t.tema))).toBe(false)
  })

  it('la línea del listado muestra el titular, sea texto u objeto', () => {
    const linea = radar.lineaDeTema as (t: unknown, n: number) => string
    const base = { puntaje: 40, tema: 'neymar', entidades: ['Neymar'], paises: ['AR'], trafico: 500 }
    expect(linea({ ...base, titulares: [{ titulo: 'Neymar vuelve', medio: 'Olé' }] }, 2)).toBe(' 2. [40] neymar · Neymar · Trends AR 500+ · Neymar vuelve')
    expect(linea({ ...base, paises: [], titulares: ['Otro titular'] }, 10)).toBe('10. [40] neymar · Neymar · Otro titular')
    expect(linea({ ...base, paises: [], titulares: [] }, 1)).not.toContain('object')
  })

  it('lee los feeds de medios y les pone el nombre del medio', async () => {
    const xml = '<rss><channel><item><title>Gol de River</title><link>https://x.com/a</link><pubDate>Tue, 24 Nov 2026 12:00:00 GMT</pubDate></item></channel></rss>'
    const recoger = radar.recogerFeeds as (f: unknown[], o: { leer: (u: string) => Promise<string> }) => Promise<{ titulo: string, medio: string, pais: string }[]>
    const noticias = await recoger([{ nombre: 'Olé · últimas', pais: 'Argentina', url: 'https://x.com/feed' }, { nombre: 'Roto', pais: 'Chile', url: 'https://x.com/roto' }], {
      leer: async (url: string) => { if (url.endsWith('roto')) throw new Error('HTTP 404'); return xml }
    })
    expect(noticias).toHaveLength(1)
    expect(noticias[0]).toMatchObject({ titulo: 'Gol de River', medio: 'Olé · últimas', pais: 'Argentina' })
  })
})

describe('salud de las fuentes', () => {
  const resumir = salud.resumirFeed as (xml: string, o: { ahora: number, maximoHoras?: number }) => { notas: number, horas: number | null, activo: boolean }
  const ahora = Date.parse('2026-11-24T18:00:00Z')

  it('un feed con notas de hoy está sano', () => {
    const xml = '<rss><item><pubDate>Tue, 24 Nov 2026 16:00:00 GMT</pubDate></item><item><pubDate>Mon, 23 Nov 2026 10:00:00 GMT</pubDate></item></rss>'
    expect(resumir(xml, { ahora })).toMatchObject({ notas: 2, horas: 2, activo: true })
  })

  it('un feed viejo, vacío o sin fechas no está sano', () => {
    expect(resumir('<rss><item><pubDate>Thu, 07 Nov 2026 08:34:00 GMT</pubDate></item></rss>', { ahora }).activo).toBe(false)
    expect(resumir('<rss></rss>', { ahora })).toMatchObject({ notas: 0, activo: false })
    expect(resumir('<rss><item><title>x</title></item></rss>', { ahora })).toMatchObject({ notas: 1, horas: null, activo: false })
  })

  it('acepta feeds Atom y reúne los feeds de las dos configuraciones', () => {
    expect(resumir('<feed><entry><updated>2026-11-24T17:00:00Z</updated></entry></feed>', { ahora }).activo).toBe(true)
    const feedsDe = salud.feedsDeConfiguracion as (c: unknown) => { origen: string }[]
    const todos = feedsDe({ internacional: { rss: [{ nombre: 'BBC', url: 'u' }] }, latam })
    expect(todos.filter(f => f.origen === 'internacional')).toHaveLength(1)
    expect(todos.filter(f => f.origen === 'latam').length).toBe(latam.rss.feeds.length)
  })
})
