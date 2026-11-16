import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { obtenerCabecerasCachePublica } from '../../utils/cachePublica'
import { partidoEnVentanaSitemap } from '../../utils/ventanaSitemapPartidos'

const ahora = Date.parse('2026-11-14T12:00:00Z')
const dias = (n: number) => new Date(ahora + n * 24 * 60 * 60 * 1000).toISOString()

describe('ventana del sitemap de partidos', () => {
  it('incluye partidos recientes y próximos', () => {
    expect(partidoEnVentanaSitemap(dias(-1), ahora)).toBe(true)
    expect(partidoEnVentanaSitemap(dias(-44), ahora)).toBe(true)
    expect(partidoEnVentanaSitemap(dias(20), ahora)).toBe(true)
  })

  it('excluye partidos antiguos, lejanos o con fecha inválida', () => {
    expect(partidoEnVentanaSitemap(dias(-46), ahora)).toBe(false)
    expect(partidoEnVentanaSitemap(dias(22), ahora)).toBe(false)
    expect(partidoEnVentanaSitemap('no-es-fecha', ahora)).toBe(false)
  })

  it('el sitemap de partidos aplica la ventana antes de la indexabilidad', () => {
    const ruta = readFileSync(new URL('../../server/routes/sitemap-matches.xml.get.ts', import.meta.url), 'utf8')
    expect(ruta.indexOf('partidoEnVentanaSitemap(partido.fechaIso')).toBeGreaterThan(-1)
    expect(ruta.indexOf('partidoEnVentanaSitemap(partido.fechaIso'))
      .toBeLessThan(ruta.indexOf('evaluarIndexabilidad({'))
  })
})

describe('caché de partidos finalizados', () => {
  it('permite una caché larga con revalidación en segundo plano', () => {
    expect(obtenerCabecerasCachePublica('partidoFinalizado').cdnCacheControl)
      .toBe('public, s-maxage=3600, stale-while-revalidate=86400')
  })

  it('mantiene corta la caché de partidos vivos, pendientes y programados', () => {
    expect(obtenerCabecerasCachePublica('partidoEnVivo').cdnCacheControl).toBe('public, s-maxage=15')
    expect(obtenerCabecerasCachePublica('partidoPendiente').cdnCacheControl).toBe('public, s-maxage=10')
    expect(obtenerCabecerasCachePublica('partidoProgramado').cdnCacheControl).toBe('public, s-maxage=30')
  })
})
