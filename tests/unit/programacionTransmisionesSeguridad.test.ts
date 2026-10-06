import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migracion = readFileSync(
  new URL('../../supabase/migrations/20261006154339_liga_broadcast_options_verified.sql', import.meta.url),
  'utf8'
)
const migracionAjustes = readFileSync(
  new URL('../../supabase/migrations/20261006155355_broadcast_policy_cleanup_indexes.sql', import.meta.url),
  'utf8'
)
const alta = readFileSync(new URL('../../server/api/admin/programacion/index.post.ts', import.meta.url), 'utf8')
const edicion = readFileSync(new URL('../../server/api/admin/programacion/[id].put.ts', import.meta.url), 'utf8')
const lecturaPublica = readFileSync(new URL('../../server/api/partidos-seo/[slug].get.ts', import.meta.url), 'utf8')
const imagenPublica = readFileSync(new URL('../../server/api/partidos-seo/[slug]/imagen.get.ts', import.meta.url), 'utf8')
const correspondenciaPublica = readFileSync(new URL('../../server/api/partidos-seo/correspondencia.get.ts', import.meta.url), 'utf8')
const sitemapPublico = readFileSync(new URL('../../server/routes/sitemap.xml.get.ts', import.meta.url), 'utf8')

describe('controles de seguridad para la programación de partidos', () => {
  it('habilita RLS, limita columnas públicas y exige MFA + permiso al modificar', () => {
    expect(migracion).toContain('enable row level security')
    expect(migracion).toContain('to anon, authenticated')
    expect(migracion).toContain('grant insert, update, delete on public.colombian_match_broadcast_options to authenticated')
    expect(migracion).not.toMatch(/grant select\s*\([^)]*verified_by/s)
    expect(migracion).toContain("has_editorial_permission('partidos.programacion.gestionar')")
    expect(migracion).toContain('(select public.has_aal2())')
    expect(migracion).toContain('execute function public.audit_editorial_change()')
    expect(migracion).toContain('new.verified_by := (select auth.uid())')
  })

  it('oculta transmisiones cuando el fixture asociado deja de estar publicado con derechos', () => {
    expect(migracion).toContain('foreign key (fixture_competition_slug, fixture_season, fixture_provider, provider_fixture_id)')
    expect(migracion).toContain('references public.colombian_league_fixtures (competition_slug, season, provider, provider_fixture_id)')
    expect(migracion).toContain('fixture.competition_slug = colombian_match_broadcast_options.fixture_competition_slug')
    expect(migracion).toContain('fixture.season = colombian_match_broadcast_options.fixture_season')
    expect(migracion).toContain('fixture.provider = colombian_match_broadcast_options.fixture_provider')
    expect(migracion).toContain('fixture.provider_fixture_id = colombian_match_broadcast_options.provider_fixture_id')
    expect(migracion).toContain('and fixture.is_public')
    expect(migracion).toContain('and fixture.publication_rights_confirmed')

    const grantPublico = /grant select\s*\(([^)]*)\) on public\.colombian_match_broadcast_options to anon, authenticated/s.exec(migracion)?.[1] || ''
    expect(grantPublico).not.toContain('fixture_competition_slug')
    expect(grantPublico).not.toContain('provider_fixture_id')
    for (const ruta of [lecturaPublica, imagenPublica, correspondenciaPublica, sitemapPublico]) {
      expect(ruta).toContain('obtenerClienteSupabaseAnonimo')
      expect(ruta).not.toContain('obtenerClienteSupabaseEditorial')
    }
    expect(lecturaPublica).toContain('obtenerPartidoSeoPublico')
    expect(lecturaPublica).not.toContain('listarPartidosSeoAdministrables')
  })

  it('evita solapamiento de lectura autenticada y añade índices a ambas claves foráneas', () => {
    expect(migracionAjustes).toContain('drop policy if exists "broadcast managers can read all options with mfa"')
    expect(migracionAjustes).toContain('for select to anon')
    expect(migracionAjustes).not.toContain('for select to anon, authenticated')
    expect(migracionAjustes).toContain('colombian_match_broadcast_fixture_idx')
    expect(migracionAjustes).toContain('fixture_competition_slug, fixture_season, fixture_provider, provider_fixture_id')
    expect(migracionAjustes).toContain('colombian_match_broadcast_verified_by_idx')
  })

  it('protege los dos endpoints de escritura con el mismo permiso y MFA', () => {
    for (const ruta of [alta, edicion]) {
      expect(ruta).toContain("exigirPermisoEditorial(evento, 'partidos.programacion.gestionar', { exigirMfa: true })")
      expect(ruta).toContain('validarEntradaEditorial(esquemaProgramacionTransmision')
      expect(ruta).not.toContain('service_role')
      expect(ruta).toContain('fixture_competition_slug: partido.identidadFuente.competenciaSlug')
      expect(ruta).toContain('fixture_season: partido.identidadFuente.temporada')
      expect(ruta).toContain('fixture_provider: partido.identidadFuente.proveedor')
      expect(ruta).toContain('provider_fixture_id: partido.identidadFuente.idProveedor')
    }
  })
})
