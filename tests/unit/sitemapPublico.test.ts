import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  construirIndiceSitemapPublico,
  construirUrlsetSitemapPublico,
  filtrarPublicacionesVentanaNews,
  rutasSitemapPublico
} from '../../server/utils/sitemapsPublicos'

const leerRuta = (ruta: string) => readFileSync(new URL(`../../server/routes/${ruta}`, import.meta.url), 'utf8')
const indice = leerRuta('sitemap-index.xml.get.ts')
const legado = leerRuta('sitemap.xml.get.ts')
const paginas = leerRuta('sitemap-pages.xml.get.ts')
const competencias = leerRuta('sitemap-competitions.xml.get.ts')
const articulos = leerRuta('sitemap-articles.xml.get.ts')
const partidos = leerRuta('sitemap-matches.xml.get.ts')
const equipos = leerRuta('sitemap-teams.xml.get.ts')
const hubs = leerRuta('sitemap-hubs.xml.get.ts')
const news = leerRuta('news-sitemap.xml.get.ts')
const robots = leerRuta('robots.txt.get.ts')

describe('sitemaps públicos por entidad', () => {
  it('expone un índice por tipo y mantiene el endpoint histórico sin redirigir', () => {
    for (const ruta of [
      '/sitemap-pages.xml',
      '/sitemap-articles.xml',
      '/sitemap-matches.xml',
      '/sitemap-teams.xml',
      '/sitemap-competitions.xml',
      '/sitemap-players.xml',
      '/sitemap-hubs.xml',
      '/news-sitemap.xml'
    ]) expect(rutasSitemapPublico).toContain(ruta)

    expect(indice).toContain('construirIndiceSitemapPublico')
    expect(legado).toContain('construirIndiceSitemapPublico')
    expect(legado).not.toContain('sendRedirect')
    expect(robots).toContain('/sitemap-index.xml')
  })

  it('serializa sitemap index con URLs absolutas y fechas W3C reales', () => {
    const xml = construirIndiceSitemapPublico([
      { ruta: '/sitemap-articles.xml', modificadoEn: '2026-10-06T12:30:00Z' }
    ], 'https://www.pont3la10.com')

    expect(xml).toContain('<sitemapindex')
    expect(xml).toContain('<loc>https://www.pont3la10.com/sitemap-articles.xml</loc>')
    expect(xml).toContain('<lastmod>2026-10-06T12:30:00.000Z</lastmod>')
  })

  it('serializa enlaces escapados y omite fechas inexistentes en urlsets', () => {
    const xml = construirUrlsetSitemapPublico([
      { ruta: '/articulos/uno?a=1&b=2', modificadoEn: 'no-es-fecha' },
      { ruta: '/partidos/uno', modificadoEn: '2026-10-06T12:30:00Z' }
    ], 'https://www.pont3la10.com')

    expect(xml).toContain('/articulos/uno?a=1&amp;b=2')
    expect(xml).not.toContain('no-es-fecha')
    expect(xml).toContain('<lastmod>2026-10-06T12:30:00.000Z</lastmod>')
  })

  it('filtra la ventana de News y rechaza fechas futuras o inválidas incluso en páginas mixtas', () => {
    const ahora = Date.parse('2026-10-06T12:00:00.000Z')
    const limite = ahora - 48 * 60 * 60 * 1000
    const recientes = filtrarPublicacionesVentanaNews([
      { publicadoEn: new Date(limite).toISOString(), slug: 'limite' },
      { publicadoEn: new Date(limite - 1).toISOString(), slug: 'anterior' }
    ], limite, ahora)

    expect(recientes.map(publicacion => publicacion.slug)).toEqual(['limite'])
    expect(() => filtrarPublicacionesVentanaNews([
      { publicadoEn: new Date(ahora + 1).toISOString() },
      { publicadoEn: new Date(limite - 1).toISOString() }
    ], limite, ahora)).toThrow('fechas inválidas o futuras')
    expect(() => filtrarPublicacionesVentanaNews([
      { publicadoEn: null },
      { publicadoEn: new Date(limite - 1).toISOString() }
    ], limite, ahora)).toThrow('fechas inválidas o futuras')
  })

  it('separa páginas públicas y la ficha permanente de Liga BetPlay', () => {
    expect(paginas).toContain("'/partidos-hoy'")
    expect(paginas).not.toContain("'/liga-colombiana'")
    expect(competencias).toContain("ruta: '/liga-colombiana'")
    expect(competencias).not.toContain('sendRedirect')
  })

  it('usa el RPC público de artículos y falla de forma observable ante límites o degradación', () => {
    expect(articulos).toContain('obtenerClienteSupabaseAnonimo')
    expect(articulos).toContain('MAX_ARTICULOS_SITEMAP = 50_000')
    expect(articulos).toContain('listarArticulosPublicosEditoriales')
    expect(articulos).toContain('modificadoEn: publicacion.publicadoEn')
    expect(articulos).toContain('registrarFalloSitemap(evento, \'articles\')')
    expect(articulos).not.toContain('obtenerClienteSupabaseEditorial')
  })

  it('filtra partidos incompletos y publica una sola URL canónica con fecha de verificación', () => {
    expect(partidos).toContain('obtenerClienteSupabaseAnonimo')
    expect(partidos).toContain('evaluarIndexabilidad({')
    expect(partidos).toContain('transmisionVerificada: partidosConTransmisionVerificada.has(partido.slug)')
    expect(partidos).toContain('`/partidos/${partido.slug}`')
    expect(partidos).toContain('modificadoEn: partido.verificadoEn')
    expect(partidos).not.toContain('`/donde-ver/${partido.slug}`')
    expect(partidos).not.toContain('`/como-quedo/${partido.slug}`')
  })

  it('incluye hubs solo cuando superan el umbral editorial de indexabilidad', () => {
    expect(hubs).toContain('evaluarIndexabilidad({ tipo: \'hub\'')
    expect(hubs).toContain('articulosDisponibles: articulosHub.length')
    expect(hubs).toContain('modificadoEn: articulosHub[0]?.publicadoEn')
    expect(hubs).toContain('obtenerClienteSupabaseAnonimo')
    expect(hubs).not.toContain('obtenerClienteSupabaseEditorial')
  })

  it('incluye solo fichas de equipo indexables derivadas de datos públicos autorizados', () => {
    expect(equipos).toContain('obtenerClienteSupabaseAnonimo')
    expect(equipos).toContain('listarEquiposLigaPublicos')
    expect(equipos).toContain('listarPartidosSeoPublicos')
    expect(equipos).toContain('evaluarIndexabilidad({')
    expect(equipos).toContain('`/equipos/${equipo.slug}`')
    expect(equipos).toContain("registrarFalloSitemap(evento, 'teams')")
    expect(equipos).not.toContain('obtenerClienteSupabaseEditorial')
  })

  it('conserva los 48 h de Google News, el tope de 1000 y expone errores', () => {
    expect(news).toContain('horasNoticiasGoogle = 48')
    expect(news).toContain('MAX_NOTICIAS_GOOGLE = 1000')
    expect(news).toContain('MAX_FILAS_EXAMINADAS_GOOGLE = 5000')
    expect(news).toContain('obtenerClienteSupabaseAnonimo')
    expect(news).toContain('filtrarPublicacionesVentanaNews(pagina, limite.getTime(), ahora)')
    expect(news).toContain('desplazamiento >= MAX_FILAS_EXAMINADAS_GOOGLE')
    expect(news).toContain('El sitemap de noticias excede el presupuesto de filas examinadas.')
    expect(news).toContain('registrarFalloSitemap(evento, \'news\')')
    expect(news).not.toContain('obtenerClienteSupabaseEditorial')
  })
})
