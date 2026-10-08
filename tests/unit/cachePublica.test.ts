import { describe, expect, it } from 'vitest'
import {
  combinarVary,
  obtenerCabecerasCachePublica,
  obtenerTipoCachePartido,
  solicitudPuedeUsarCachePublica
} from '../../utils/cachePublica'

describe('políticas de caché del contenido público', () => {
  it('asigna políticas distintas a artículos, tablas y sitemaps', () => {
    expect(obtenerCabecerasCachePublica('articulo').cdnCacheControl)
      .toBe('public, s-maxage=300, stale-while-revalidate=600')
    expect(obtenerCabecerasCachePublica('tabla').cdnCacheControl)
      .toBe('public, s-maxage=30')
    expect(obtenerCabecerasCachePublica('sitemap').cdnCacheControl)
      .toBe('public, s-maxage=300, stale-while-revalidate=300')
  })

  it('no permite servir una respuesta viva desde stale y renueva rápido los pendientes', () => {
    expect(obtenerTipoCachePartido('IN_PLAY')).toBe('partidoEnVivo')
    expect(obtenerCabecerasCachePublica('partidoEnVivo').cdnCacheControl)
      .toBe('public, s-maxage=15')
    expect(obtenerTipoCachePartido('actualizacion_pendiente')).toBe('partidoPendiente')
    expect(obtenerCabecerasCachePublica('partidoPendiente').cdnCacheControl)
      .toBe('public, s-maxage=10')
    expect(obtenerTipoCachePartido('scheduled')).toBe('partidoProgramado')
    expect(obtenerTipoCachePartido('FT')).toBe('partidoFinalizado')
  })

  it('no comparte respuestas con sesión editorial o autorización', () => {
    expect(solicitudPuedeUsarCachePublica({ cookie: 'consent=accepted' })).toBe(true)
    expect(solicitudPuedeUsarCachePublica({ cookie: 'pont3la10-auth=token' })).toBe(false)
    expect(solicitudPuedeUsarCachePublica({ cookie: 'pont3la10-auth.0=token' })).toBe(false)
    expect(solicitudPuedeUsarCachePublica({ authorization: 'Bearer token' })).toBe(false)
    expect(solicitudPuedeUsarCachePublica({ setCookie: true })).toBe(false)
  })

  it('combina Vary sin duplicar encabezados y conserva el comodín', () => {
    expect(combinarVary('Accept-Encoding, cookie', ['Cookie', 'Authorization']))
      .toBe('Accept-Encoding, cookie, Authorization')
    expect(combinarVary('*', ['Cookie'])).toBe('*')
  })
})
