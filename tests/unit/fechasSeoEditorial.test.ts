import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migracion = readFileSync(
  new URL('../../supabase/migrations/20260930062225_hu_tr_11_fechas_seo_reales.sql', import.meta.url),
  'utf8'
)
const sitemap = readFileSync(
  new URL('../../server/routes/sitemap.xml.get.ts', import.meta.url),
  'utf8'
)

describe('fechas SEO editoriales', () => {
  it('mantiene datePublished estable y lo deriva de la primera versión publicada', () => {
    expect(migracion).toContain('order by primera_version.version_number asc')
    expect(migracion).toContain("primera_version.status = 'published'")
    expect(migracion.match(/coalesce\(primera_publicacion\.created_at, article\.published_at\)/g))
      .toHaveLength(7)
    expect(migracion).not.toContain("version.snapshot ->> 'published_at'")
  })

  it('deriva dateModified de la versión pública vigente', () => {
    expect(migracion.match(/'modificadoEn', version\.created_at/g)).toHaveLength(4)
    expect(migracion).toContain('inner join public.article_versions as version')
    expect(migracion).toContain('version.id = article.published_version_id')
    expect(migracion.match(/and version\.status = 'published'/g)).toHaveLength(4)
    expect(migracion.match(/security definer\s+set search_path = ''/g)).toHaveLength(4)
  })

  it('publica lastmod solo con una fecha real y no inventa frecuencia o prioridad', () => {
    expect(sitemap).toContain('normalizarFechaSeo(entrada.ultimaModificacion)')
    expect(sitemap).toContain('<lastmod>')
    expect(sitemap).not.toContain('<changefreq>')
    expect(sitemap).not.toContain('<priority>')
    expect(sitemap).toContain('publicacion.modificadoEn')
    expect(sitemap).toContain('hub.actualizadoEn')
  })
})
