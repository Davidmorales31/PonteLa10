import { describe, expect, it } from 'vitest'
import * as tendencias from '../../scripts/tendencias-futbol-internacional.mjs'

type Trend = { termino: string, trafico: number, pais: string, noticias: Array<{ titulo: string, url: string, medio: string }> }
type Noticia = { titulo: string, medio: string, consulta: string }
type Tema = { tema: string, puntaje: number, entidades: string[], paises: string[], titularesRadar: number }

const traficoAproximado = tendencias.traficoAproximado as (v: string) => number
const leerRssTrends = tendencias.leerRssTrends as (xml: string, pais: string) => Trend[]
const leerRssNoticias = tendencias.leerRssNoticias as (xml: string, consulta: string) => Noticia[]
const leerRssBing = tendencias.leerRssBing as (xml: string) => Array<{ titulo: string, url: string, medio: string }>
const rankearTemas = tendencias.rankearTemas as (o: { trends?: Trend[], noticias?: Noticia[], config: unknown, maximo?: number }) => Tema[]

const config = {
  competiciones: [{ nombre: 'Premier League', terminos: ['premier league'] }],
  clubesDeMayorInteres: [{ nombre: 'Tottenham', terminos: ['tottenham', 'spurs'] }, { nombre: 'Inter Miami', terminos: ['inter miami'] }],
  figuras: ['Lionel Messi', 'Harry Kane'],
  excluir: { terminos: ['liga mx', 'pumas'], otrosDeportes: ['nba'] }
}

const rssTrends = `<rss><channel>
<item><title>lionel messi</title><ht:approx_traffic>500+</ht:approx_traffic><pubDate>Sat, 21 Nov 2026</pubDate>
<ht:news_item><ht:news_item_title>Messi y el Inter Miami caen en playoffs</ht:news_item_title><ht:news_item_url>https://ejemplo.com/a</ht:news_item_url><ht:news_item_source>Medio</ht:news_item_source></ht:news_item></item>
<item><title>spurs - pelicans</title><ht:approx_traffic>200+</ht:approx_traffic>
<ht:news_item><ht:news_item_title>Spurs vencen a los Pelicans en la NBA</ht:news_item_title><ht:news_item_url>https://ejemplo.com/b</ht:news_item_url><ht:news_item_source>NBA</ht:news_item_source></ht:news_item></item>
<item><title>pumas - monterrey</title><ht:approx_traffic>200+</ht:approx_traffic></item>
</channel></rss>`

describe('fase de tendencias del fútbol internacional', () => {
  it('interpreta el tráfico aproximado de Google Trends', () => {
    expect(traficoAproximado('2000+')).toBe(2000)
    expect(traficoAproximado('10K+')).toBe(10000)
    expect(traficoAproximado('')).toBe(0)
  })

  it('lee el RSS de Trends con sus noticias asociadas', () => {
    const lista = leerRssTrends(rssTrends, 'CO')
    expect(lista).toHaveLength(3)
    expect(lista[0]).toMatchObject({ termino: 'lionel messi', trafico: 500, pais: 'CO' })
    expect(lista[0]!.noticias[0]!.url).toBe('https://ejemplo.com/a')
  })

  it('quita el medio del titular del radar de noticias', () => {
    const [n] = leerRssNoticias('<item><title>Kane, operado - Win Sports</title><source url="x">Win Sports</source></item>', 'Kane')
    expect(n).toMatchObject({ titulo: 'Kane, operado', medio: 'Win Sports' })
  })

  it('saca la URL real de las notas del RSS de Bing Noticias', () => {
    const xml = '<item><title>Boca campeón</title><link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;url=https%3a%2f%2fwww.winsports.co%2fnota-1&amp;c=1</link><News:Source>Win Sports</News:Source></item><item><title>Sin enlace</title><link>http://x</link></item>'
    expect(leerRssBing(xml)).toEqual([{ titulo: 'Boca campeón', url: 'https://www.winsports.co/nota-1', medio: 'Win Sports', fecha: '' }])
  })

  it('ordena temas de fútbol internacional y descarta falsos positivos y temas excluidos', () => {
    const temas = rankearTemas({
      trends: leerRssTrends(rssTrends, 'CO'),
      noticias: [
        { titulo: 'Harry Kane fue operado del tobillo', medio: 'A', consulta: 'Kane' },
        { titulo: 'Kane estará varios meses fuera', medio: 'B', consulta: 'Kane' },
        { titulo: 'Messi recibe el Botín de Oro', medio: 'C', consulta: 'Messi' },
        { titulo: 'Pumas y la Liga MX', medio: 'D', consulta: 'Liga MX' }
      ],
      config
    })
    const nombres = temas.map(t => t.tema)
    expect(nombres[0]).toBe('lionel messi')
    expect(nombres).toContain('Harry Kane')
    expect(nombres).not.toContain('spurs - pelicans')
    expect(nombres.some(n => /pumas/i.test(n))).toBe(false)
    const messi = temas[0]!
    expect(messi.paises).toEqual(['CO'])
    expect(messi.titularesRadar).toBe(1)
    expect(temas.find(t => t.tema === 'Harry Kane')!.titularesRadar).toBe(2)
  })
})
