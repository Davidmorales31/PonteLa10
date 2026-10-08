import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261008093417_hu_ed29_pruning_review.sql'),
  'utf8'
)
const rutaGet = readFileSync(resolve(process.cwd(), 'server/api/admin/seo/poda-contenido.get.ts'), 'utf8')
const rutaPost = readFileSync(resolve(process.cwd(), 'server/api/admin/seo/poda-contenido.post.ts'), 'utf8')

describe('HU-ED-29 · privacidad y seguridad', () => {
  it('protege las decisiones con RLS, solo concede lectura directa y escribe mediante RPC validado', () => {
    expect(migration).toContain('alter table public.editorial_content_pruning_reviews enable row level security')
    expect(migration).toMatch(/revoke all privileges on table public\.editorial_content_pruning_reviews[\s\S]+from public, anon, authenticated, service_role;/)
    expect(migration).toContain('grant select on public.editorial_content_pruning_reviews to authenticated')
    expect(migration).not.toMatch(/grant\s+(?:insert|update|delete)\s+on public\.editorial_content_pruning_reviews/i)
    expect(migration).toContain("public.has_editorial_permission('contenido.revisar')")
    expect(migration).toContain("(select public.has_aal2()) is not true")
    expect(migration).toMatch(/create policy "editorial reviewers can read pruning decisions"[\s\S]+?using \([\s\S]+?\(select public\.has_aal2\(\)\)\s*\);/)
    expect(migration).toContain("article.status::text = 'published'")
    expect(migration).toContain('redirect_target is not null')
    expect(migration).toContain('having pg_catalog.sum(metric.impressions) = 0')
  })

  it('audita solo cambios reales y nunca ejecuta eliminar, noindex ni cambiar rutas', () => {
    expect(migration).toContain("'seo.content_pruning.decision'")
    expect(migration).toContain('new.decision is not distinct from old.decision')
    expect(migration).toContain('decisionAnterior')
    expect(migration).toContain('resultado.decision is not distinct from p_decision')
    expect(migration).toContain("comment on table public.editorial_content_pruning_reviews is")
    expect(migration).not.toMatch(/update public\.articles|delete from public\.articles|insert into public\.articles/i)
    expect(migration).not.toMatch(/create table public\.(redirect|noindex|sitemap)/i)
  })

  it('aplica permiso, MFA y caché privada antes de exponer candidatos o guardar decisiones', () => {
    expect(rutaGet.indexOf("setResponseHeader(evento, 'Cache-Control', 'private, no-store')"))
      .toBeLessThan(rutaGet.indexOf("await exigirPermisoEditorial(evento, 'contenido.revisar', { exigirMfa: true })"))
    expect(rutaGet).toContain("await exigirPermisoEditorial(evento, 'contenido.revisar', { exigirMfa: true })")
    expect(rutaPost.indexOf("setResponseHeader(evento, 'Cache-Control', 'private, no-store')"))
      .toBeLessThan(rutaPost.indexOf("await exigirPermisoEditorial(evento, 'contenido.revisar', { exigirMfa: true })"))
    expect(rutaGet).not.toContain('service_role')
    expect(rutaGet).toContain("rpc('list_editorial_search_console_zero_impression_pages')")
    expect(rutaGet).not.toContain(".eq('impressions', 0)")
    expect(rutaGet).toContain(".select('id,period_start,period_end,imported_at')")
    expect(rutaGet).toMatch(/\.order\('period_end', \{ ascending: false \}\)[\s\S]+?\.order\('imported_at', \{ ascending: false \}\)/)
    expect(migration).toMatch(/order by report\.period_end desc, report\.imported_at desc/)
    expect(rutaPost).not.toContain('service_role')
  })
})
