import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { construirFeedRssEditorial } from '../../utils/rssEditorial'

const rutaFeed = readFileSync(new URL('../../server/routes/feed.xml.get.ts', import.meta.url), 'utf8')
const nuxtConfig = readFileSync(new URL('../../nuxt.config.ts', import.meta.url), 'utf8')

describe('HU-DIST-01 · feed RSS público', () => {
  it('genera RSS 2.0 con URLs absolutas, autor, resumen y fechas RFC 822', () => {
    const xml = construirFeedRssEditorial([{
      slug: 'liga-betplay-final',
      titulo: 'América & Nacional <final>',
      resumen: 'Análisis "completo" del torneo.',
      publicadoEn: '2026-10-08T09:00:00.000Z',
      autorNombre: 'Equipo Pont3la10'
    }], 'https://www.pont3la10.com', new Date('2026-10-08T10:00:00.000Z'))

    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<link>https://www.pont3la10.com/articulos/liga-betplay-final</link>')
    expect(xml).toContain('<dc:creator>Equipo Pont3la10</dc:creator>')
    expect(xml).toContain('<pubDate>Thu, 08 Oct 2026 09:00:00 GMT</pubDate>')
    expect(xml).toContain('América &amp; Nacional &lt;final&gt;')
    expect(xml).toContain('Análisis &quot;completo&quot; del torneo.')
  })

  it('ordena publicaciones de más reciente a más antigua y escapa autores y URLs', () => {
    const xml = construirFeedRssEditorial([
      { slug: 'anterior', titulo: 'Anterior', resumen: '', publicadoEn: '2026-10-07T00:00:00Z', autorNombre: 'Redacción' },
      { slug: 'reciente', titulo: 'Reciente', resumen: null, publicadoEn: '2026-10-08T00:00:00Z', autorNombre: 'Ana & Luis' }
    ], 'https://pont3la10.com', new Date('2026-10-08T12:00:00Z'))

    expect(xml.indexOf('<title>Reciente</title>')).toBeLessThan(xml.indexOf('<title>Anterior</title>'))
    expect(xml).toContain('<dc:creator>Ana &amp; Luis</dc:creator>')
    expect(xml).toContain('<link>https://pont3la10.com/articulos/reciente</link>')
    expect(xml).toContain('rel="self" type="application/rss+xml"')
  })

  it('rechaza fechas inválidas o futuras en vez de emitir un feed engañoso', () => {
    expect(() => construirFeedRssEditorial([
      { slug: 'futuro', titulo: 'Futuro', resumen: '', publicadoEn: '2026-10-09T00:00:00Z', autorNombre: null }
    ], 'https://pont3la10.com', new Date('2026-10-08T12:00:00Z'))).toThrow('inválidas o futuras')
  })

  it('usa la RPC pública de artículos, limita el feed y aplica caché pública segura', () => {
    expect(rutaFeed).toContain('obtenerClienteSupabaseAnonimo')
    expect(rutaFeed).toContain('listarArticulosPublicosEditoriales')
    expect(rutaFeed).toContain('limiteArticulosFeed = 50')
    expect(rutaFeed).toContain("aplicarCachePublica(evento, 'sitemap')")
    expect(rutaFeed).toContain("'Content-Type', 'application/rss+xml; charset=utf-8'")
    expect(rutaFeed).not.toContain('service_role')
    expect(rutaFeed).not.toContain(".from('articles')")
    expect(nuxtConfig).toContain("type: 'application/rss+xml'")
    expect(nuxtConfig).toContain("href: '/feed.xml'")
  })
})
