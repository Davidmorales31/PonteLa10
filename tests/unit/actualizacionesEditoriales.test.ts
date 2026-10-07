import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migracion = readFileSync(new URL(
  '../../supabase/migrations/20261007111822_hu_ed23_actualizaciones_editoriales.sql',
  import.meta.url
), 'utf8')
const articulo = readFileSync(new URL('../../pages/articulos/[slug].vue', import.meta.url), 'utf8')
const sitemap = readFileSync(new URL('../../server/routes/sitemap-articles.xml.get.ts', import.meta.url), 'utf8')
const newsSitemap = readFileSync(new URL('../../server/routes/news-sitemap.xml.get.ts', import.meta.url), 'utf8')

describe('HU-ED-23: actualizaciones editoriales', () => {
  it('separa fechas, recupera la primera publicación y detecta republicaciones por versión', () => {
    expect(migracion).toContain('add column modified_at timestamptz')
    expect(migracion).toContain('add column correction_note text')
    expect(migracion).toContain('order by version.article_id, version.version_number')
    expect(migracion).toContain("new.published_at := old.published_at")
    expect(migracion).toContain('new.modified_at := pg_catalog.now()')
    expect(migracion).toContain('current_publication.version_created_at')
    expect(migracion).toContain('version_id is distinct from initial_publication.version_id')
    expect(migracion).toContain('published_at,\n    modified_at\n  on public.articles')
  })

  it('conserva control de concurrencia e historial y limita los RPC a sus roles previstos', () => {
    expect(migracion).toContain('correction_note\n  on public.articles')
    expect(migracion).toContain('correction_note = normalized_correction_note')
    expect(migracion).toContain("from public, anon, authenticated, service_role")
    expect(migracion).toContain('to authenticated;')
    expect(migracion).toContain('revoke update on table public.articles from public, anon, authenticated')
    expect(migracion).toContain("status::text in ('draft', 'changes_requested')")
    expect(migracion).toContain('version.article_id = article.id')
    expect(migracion).toContain("version.status::text = 'published'")
    expect(migracion).toContain('create or replace function public.save_editorial_article(')
    expect(migracion).toContain('current_correction_note')
    expect(migracion).toContain('editorial_private.sync_latest_article_version_metadata')
    expect(migracion).toContain('security definer\nset search_path = \'\'')
    expect(migracion).toContain('grant usage on schema editorial_private to authenticated')
    expect(migracion).toContain('create policy "article autosaves owner delete"')
  })

  it('impide escritura directa sobre publicaciones y snapshots ajenos', () => {
    expect(migracion).toContain('grant update (\n  slug,\n  title,')
    expect(migracion).not.toContain('grant update on table public.articles to authenticated')
    expect(migracion).toContain('version.article_id = article.id')
    expect(migracion).toContain("version.status::text = 'published'")
  })

  it('sirve la nota solo desde la versión pública y mantiene la fecha original en News Sitemap', () => {
    expect(migracion).toContain("'notaCorreccion', coalesce(nullif(pg_catalog.btrim(version.snapshot ->> 'correction_note')")
    expect(migracion).toContain("'publicadoEn', article.published_at")
    expect(articulo).toContain('dateModified: articuloPublicado.value.modificadoEn || articuloPublicado.value.publicadoEn')
    expect(sitemap).toContain('modificadoEn: publicacion.modificadoEn || publicacion.publicadoEn')
    expect(newsSitemap).toContain('articulo.publicadoEn')
    expect(newsSitemap).not.toContain('modificadoEn')
  })
})
