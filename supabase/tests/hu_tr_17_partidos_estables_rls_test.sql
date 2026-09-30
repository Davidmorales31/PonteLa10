BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(15);

INSERT INTO public.sports_competitions (id, slug, name, is_public) VALUES
  ('00000000-0000-0000-0000-000000000601', 'competencia-hu17-publica', 'Competencia HU17 pública', true),
  ('00000000-0000-0000-0000-000000000602', 'competencia-hu17-privada', 'Competencia HU17 privada', false);

INSERT INTO public.sports_teams (id, slug, name, is_public) VALUES
  ('00000000-0000-0000-0000-000000000601', 'local-hu17-publico', 'Local HU17 público', true),
  ('00000000-0000-0000-0000-000000000602', 'visita-hu17-publica', 'Visita HU17 pública', true),
  ('00000000-0000-0000-0000-000000000603', 'local-hu17-privado', 'Local HU17 privado', false);

INSERT INTO public.sports_fixtures (
  id, slug, competition_id, home_team_id, away_team_id, scheduled_at, is_public
) VALUES
  (
    '00000000-0000-0000-0000-000000000701', 'local-vs-visita-2026-09-30',
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000602',
    '2026-09-30T18:00:00Z', true
  ),
  (
    '00000000-0000-0000-0000-000000000702', 'oculto-vs-visita-2026-09-30',
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000602',
    '2026-09-30T18:00:00Z', false
  ),
  (
    '00000000-0000-0000-0000-000000000703', 'privado-vs-visita-2026-09-30',
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000602',
    '2026-09-30T18:00:00Z', true
  ),
  (
    '00000000-0000-0000-0000-000000000704', 'local-vs-competencia-privada-2026-09-30',
    '00000000-0000-0000-0000-000000000602',
    '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000602',
    '2026-09-30T18:00:00Z', true
  );

INSERT INTO public.sports_provider_mappings (
  provider, entity_type, external_id, fixture_id
) VALUES
  ('api-sports', 'fixture', 'fixture-publico', '00000000-0000-0000-0000-000000000701'),
  ('api-sports', 'fixture', 'fixture-no-aprobado', '00000000-0000-0000-0000-000000000702'),
  ('api-sports', 'fixture', 'fixture-equipo-privado', '00000000-0000-0000-0000-000000000703'),
  ('api-sports', 'fixture', 'fixture-competencia-privada', '00000000-0000-0000-0000-000000000704');

SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.sports_fixtures'::regclass),
  'RLS está habilitado en sports_fixtures'
);
SELECT is(
  (SELECT count(*) FROM pg_catalog.pg_trigger
   WHERE tgname IN ('sports_fixtures_updated_at', 'sports_fixtures_slug_immutable')
     AND NOT tgisinternal),
  2::bigint,
  'updated_at y la inmutabilidad del slug tienen triggers'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.sports_fixtures', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.sports_fixtures', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.sports_fixtures', 'DELETE'),
  'anon no puede escribir fixtures'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.sports_provider_mappings', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.sports_provider_mappings', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.sports_provider_mappings', 'DELETE'),
  'authenticated no puede escribir mappings de fixtures'
);
SELECT ok(
  has_table_privilege('service_role', 'public.sports_fixtures', 'INSERT')
  AND has_table_privilege('service_role', 'public.sports_fixtures', 'UPDATE')
  AND has_table_privilege('service_role', 'public.sports_fixtures', 'DELETE'),
  'las mutaciones de fixtures quedan en el servidor'
);
SELECT ok(
  has_column_privilege('anon', 'public.sports_fixtures', 'slug', 'SELECT')
  AND has_column_privilege('authenticated', 'public.sports_fixtures', 'scheduled_at', 'SELECT')
  AND has_column_privilege('anon', 'public.sports_provider_mappings', 'fixture_id', 'SELECT'),
  'los roles cliente reciben solo columnas de lectura necesarias'
);

SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(id) FROM public.sports_fixtures),
  1::bigint,
  'anon solo resuelve fixtures aprobados con equipos y competencia públicos'
);
SELECT is(
  (SELECT count(external_id) FROM public.sports_provider_mappings WHERE entity_type = 'fixture'),
  1::bigint,
  'anon solo ve el mapping del fixture plenamente aprobado'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(id) FROM public.sports_fixtures),
  1::bigint,
  'authenticated solo resuelve fixtures aprobados con equipos y competencia públicos'
);
SELECT is(
  (SELECT count(external_id) FROM public.sports_provider_mappings WHERE entity_type = 'fixture'),
  1::bigint,
  'authenticated solo ve el mapping del fixture plenamente aprobado'
);

RESET ROLE;
SELECT throws_ok(
  $$UPDATE public.sports_fixtures
    SET slug = 'slug-cambiado'
    WHERE id = '00000000-0000-0000-0000-000000000701'$$,
  '23514',
  'El slug de un partido publicado es inmutable.',
  'un fixture publicado no permite cambiar su URL canónica'
);
UPDATE public.sports_fixtures
SET is_public = false
WHERE id = '00000000-0000-0000-0000-000000000701';
SELECT throws_ok(
  $$UPDATE public.sports_fixtures
    SET slug = 'slug-cambiado-despues-de-despublicar'
    WHERE id = '00000000-0000-0000-0000-000000000701'$$,
  '23514',
  'El slug de un partido publicado es inmutable.',
  'despublicar un fixture tampoco libera una URL que ya fue publicada'
);
UPDATE public.sports_fixtures
SET is_public = true
WHERE id = '00000000-0000-0000-0000-000000000701';
UPDATE public.sports_fixtures
SET scheduled_at = '2026-10-01T18:00:00Z'
WHERE id = '00000000-0000-0000-0000-000000000701';
SELECT ok(
  (SELECT slug = 'local-vs-visita-2026-09-30'
          AND scheduled_at = '2026-10-01T18:00:00Z'::timestamptz
   FROM public.sports_fixtures
   WHERE id = '00000000-0000-0000-0000-000000000701'),
  'reprogramar el fixture conserva el slug publicado'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.sports_provider_mappings'::regclass
      AND conname = 'sports_provider_mappings_external_unique'
      AND contype = 'u'
  ),
  'provider, tipo e ID externo mantienen su unicidad exacta'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_index
    WHERE indexrelid = 'public.sports_provider_mappings_fixture_provider_unique'::regclass
      AND indisunique
      AND pg_catalog.pg_get_expr(indpred, indrelid) LIKE '%fixture%'
  ),
  'cada fixture tiene como máximo un ID externo por proveedor'
);

SELECT * FROM finish();
ROLLBACK;
