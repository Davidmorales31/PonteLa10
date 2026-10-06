import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('disponibilidad del sitemap público', () => {
  const ruta = readFileSync(new URL('../../server/routes/sitemap.xml.get.ts', import.meta.url), 'utf8')

  it('no guarda respuestas parciales cuando Supabase o el límite de contenido fallan', () => {
    expect(ruta).not.toContain('defineCachedEventHandler')
    expect(ruta).toContain("setResponseStatus(evento, 503, 'Sitemap temporalmente no disponible')")
    expect(ruta).toContain("setResponseHeader(evento, 'Cache-Control', 'no-store')")
    expect(ruta).toContain('El sitemap de artículos supera el máximo seguro.')
  })

  it('mantiene límite de tamaño y caché CDN breve solo para la respuesta completa', () => {
    expect(ruta).toContain('MAX_ARTICULOS_SITEMAP = 40_000')
    expect(ruta).toContain('s-maxage=300, stale-while-revalidate=300')
    expect(ruta).toContain("setResponseHeader(evento, 'Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=300')")
  })

  it('publica una sola URL canónica por partido y excluye fichas incompletas', () => {
    expect(ruta).toContain('transmisionVerificada: partidosConTransmisionVerificada.has(partido.slug)')
    expect(ruta).toContain('if (!evaluarIndexabilidad({')
    expect(ruta).toContain('`/partidos/${partido.slug}`')
    expect(ruta).not.toContain('`/donde-ver/${partido.slug}`')
    expect(ruta).not.toContain('`/como-quedo/${partido.slug}`')
    expect(ruta).toContain("{ ruta: '/seleccion-colombia'")
    expect(ruta).toContain("{ ruta: '/futbol-colombiano'")
    expect(ruta).toContain("{ ruta: '/futbol-internacional'")
  })
})
