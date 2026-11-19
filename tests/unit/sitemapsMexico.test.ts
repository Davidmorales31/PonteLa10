import { describe, expect, it } from 'vitest'
import type { ResumenArticuloPublico } from '../../types/contenidoEditorial'
import { construirSitemapMexico, hubsMexico, paginasPublicasMexico } from '../../server/utils/sitemapsMexico'

const origen = 'https://mx.pont3la10.com'
const articulo = (slug: string, publicadoEn = '2026-11-19T12:00:00Z'): ResumenArticuloPublico => ({
  id: slug, slug, titulo: slug, resumen: 'r', tipo: 'noticia', publicadoEn, autorNombre: 'a', categoria: 'c', imagen: ''
}) as ResumenArticuloPublico

describe('mapas del sitio de México', () => {
  it('los mapas de datos de Colombia salen vacíos y el desconocido no se resuelve', async () => {
    const dep = { articulos: async () => [], noticiasHub: async () => [] }
    for (const ruta of ['/sitemap-matches.xml', '/sitemap-teams.xml', '/sitemap-competitions.xml', '/sitemap-rounds.xml', '/sitemap-players.xml']) {
      const xml = await construirSitemapMexico(ruta, origen, dep)
      expect(xml).toContain('<urlset')
      expect(xml).not.toContain('<url>')
    }
    expect(await construirSitemapMexico('/news-sitemap.xml', origen, dep)).toBeNull()
    expect(await construirSitemapMexico('/otra.xml', origen, dep)).toBeNull()
  })

  it('páginas e índice usan el dominio de México y nunca páginas de Colombia', async () => {
    const dep = { articulos: async () => [], noticiasHub: async () => [] }
    const paginas = (await construirSitemapMexico('/sitemap-pages.xml', origen, dep))!
    expect(paginas).toContain('https://mx.pont3la10.com/liga-mx')
    expect(paginas).not.toMatch(/colombia|betplay|www\.pont3la10/i)
    expect(paginasPublicasMexico.every(ruta => ruta.startsWith('/'))).toBe(true)
    for (const alias of ['/sitemap-index.xml', '/sitemap.xml']) {
      const indice = (await construirSitemapMexico(alias, origen, dep))!
      expect(indice).toContain('<sitemapindex')
      expect(indice).toContain('https://mx.pont3la10.com/sitemap-articles.xml')
      expect(indice).toContain('https://mx.pont3la10.com/news-sitemap.xml')
      expect(indice).not.toContain('sitemap-matches')
    }
  })

  it('lista los artículos de México en lotes hasta que se acaban', async () => {
    const todos = Array.from({ length: 120 }, (_, i) => articulo(`nota-${i}`))
    const llamadas: number[] = []
    const xml = (await construirSitemapMexico('/sitemap-articles.xml', origen, {
      articulos: async (limite, desplazamiento) => { llamadas.push(desplazamiento); return todos.slice(desplazamiento, desplazamiento + limite) },
      noticiasHub: async () => []
    }))!
    expect(llamadas).toEqual([0, 50, 100])
    expect(xml.match(/<url>/g)).toHaveLength(120)
    expect(xml).toContain('https://mx.pont3la10.com/articulos/nota-119')
  })

  it('un hub entra solo si tiene noticias suficientes', async () => {
    const xml = (await construirSitemapMexico('/sitemap-hubs.xml', origen, {
      articulos: async () => [],
      noticiasHub: async filtro => filtro.categoria === 'futbol-mexicano' ? [articulo('a'), articulo('b'), articulo('c')] : []
    }))!
    expect(xml).toContain('https://mx.pont3la10.com/futbol-mexicano')
    expect(xml).not.toContain('/seleccion-mexicana')
    expect(hubsMexico.map(h => h.ruta)).toContain('/mexicanos-en-el-exterior')
  })
})
