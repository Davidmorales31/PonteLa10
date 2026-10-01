BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(30);

SELECT has_table('public', 'football_fixtures_today', 'existe el snapshot diario de fixtures');
SELECT has_table('public', 'football_standings_today', 'existe el snapshot diario de standings');
SELECT has_table('public', 'football_sync_runs', 'existe el registro privado de sincronizaciones');

SELECT ok((SELECT relrowsecurity FROM pg_catalog.pg_class
  WHERE oid = 'public.football_fixtures_today'::regclass), 'RLS está activo en fixtures');
SELECT ok((SELECT relrowsecurity FROM pg_catalog.pg_class
  WHERE oid = 'public.football_standings_today'::regclass), 'RLS está activo en standings');
SELECT ok((SELECT relrowsecurity FROM pg_catalog.pg_class
  WHERE oid = 'public.football_sync_runs'::regclass), 'RLS está activo en logs');

SELECT ok(
  NOT has_table_privilege('anon', 'public.football_fixtures_today', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.football_fixtures_today', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.football_fixtures_today', 'DELETE'),
  'anon no puede mutar fixtures'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.football_standings_today', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.football_standings_today', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.football_standings_today', 'DELETE'),
  'authenticated no puede mutar standings'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.football_sync_runs', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.football_sync_runs', 'SELECT'),
  'los logs no son visibles para roles cliente'
);

SELECT ok(
  has_column_privilege('anon', 'public.football_fixtures_today', 'home_team_name', 'SELECT')
  AND has_column_privilege('authenticated', 'public.football_fixtures_today', 'status', 'SELECT'),
  'los roles cliente pueden leer campos de presentación permitidos'
);
SELECT ok(
  NOT has_column_privilege('anon', 'public.football_fixtures_today', 'provider_fixture_id', 'SELECT')
  AND NOT has_column_privilege('anon', 'public.football_fixtures_today', 'home_team_logo', 'SELECT')
  AND NOT has_column_privilege('anon', 'public.football_fixtures_today', 'status_external', 'SELECT')
  AND NOT has_column_privilege('anon', 'public.football_fixtures_today', 'publication_rights_reference', 'SELECT')
  AND NOT has_column_privilege('anon', 'public.football_fixtures_today', 'events', 'SELECT')
  AND NOT has_column_privilege('anon', 'public.football_fixtures_today', 'lineups', 'SELECT')
  AND NOT has_column_privilege('authenticated', 'public.football_fixtures_today', 'statistics', 'SELECT')
  AND NOT has_column_privilege('anon', 'public.football_standings_today', 'standings', 'SELECT'),
  'IDs externos, logos, JSON sin proyectar y evidencia de licencia no se exponen por Data API'
);

SELECT ok(
  has_table_privilege('service_role', 'public.football_fixtures_today', 'INSERT')
  AND has_table_privilege('service_role', 'public.football_fixtures_today', 'UPDATE')
  AND has_table_privilege('service_role', 'public.football_standings_today', 'UPDATE')
  AND has_table_privilege('service_role', 'public.football_sync_runs', 'INSERT'),
  'el backend privado puede guardar snapshots y auditoría'
);

SELECT ok(
  position('publication_rights_confirmed' in pg_catalog.pg_get_expr(polqual, polrelid)) > 0,
  'la política pública de fixtures exige derechos documentados'
) FROM pg_catalog.pg_policy WHERE polname = 'football_fixtures_approved_snapshot_read';
SELECT ok(
  position('publication_rights_confirmed' in pg_catalog.pg_get_expr(polqual, polrelid)) > 0,
  'la política pública de standings exige derechos documentados'
) FROM pg_catalog.pg_policy WHERE polname = 'football_standings_approved_snapshot_read';
SELECT ok(
  position('sports_provider_mappings' in pg_catalog.pg_get_expr(polqual, polrelid)) > 0,
  'la política pública de fixtures vuelve a comprobar el mapping canónico'
) FROM pg_catalog.pg_policy WHERE polname = 'football_fixtures_approved_snapshot_read';
SELECT ok(
  position('sports_provider_mappings' in pg_catalog.pg_get_expr(polqual, polrelid)) > 0,
  'la política pública de standings vuelve a comprobar el mapping canónico'
) FROM pg_catalog.pg_policy WHERE polname = 'football_standings_approved_snapshot_read';

SELECT ok(
  EXISTS (SELECT 1 FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public' AND indexname = 'football_fixtures_provider_external_unique'),
  'el upsert de fixtures tiene unicidad por proveedor y fixture externo'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.football_standings_today'::regclass
      AND conname = 'football_standings_snapshot_unique'),
  'los standings tienen unicidad por fecha, proveedor, liga y temporada'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.football_fixtures_today'::regclass
      AND conname = 'football_fixtures_today_fixture_id_fkey'
      AND confrelid = 'public.sports_fixtures'::regclass),
  'cada snapshot de fixture referencia una identidad deportiva canónica'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public' AND indexname = 'football_fixtures_fixture_id_idx'),
  'la clave foránea de fixtures tiene índice de soporte'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public' AND indexname = 'football_standings_competition_id_idx'),
  'la clave foránea de standings tiene índice de soporte'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.football_fixtures_today'::regclass
      AND tgname = 'football_fixture_mapping_guard' AND NOT tgisinternal),
  'cada snapshot verifica el mapping de proveedor al fixture canónico'
);
SELECT ok(
  position('home_team_provider_id' in pg_catalog.pg_get_functiondef(
    'public.validar_mapping_snapshot_fixture_futbol()'::regprocedure
  )) > 0
  AND position('away_team_provider_id' in pg_catalog.pg_get_functiondef(
    'public.validar_mapping_snapshot_fixture_futbol()'::regprocedure
  )) > 0,
  'el mapping también garantiza los equipos local y visitante canónicos'
);
SELECT ok(
  position('new.league_id' in pg_catalog.pg_get_functiondef(
    'public.validar_mapping_snapshot_fixture_futbol()'::regprocedure
  )) > 0
  AND position('competition_mapping.competition_id = fixture.competition_id' in pg_catalog.pg_get_functiondef(
    'public.validar_mapping_snapshot_fixture_futbol()'::regprocedure
  )) > 0,
  'el trigger comprueba que la liga externa coincida con la competición del fixture'
);
SELECT ok(
  position('competition_mapping' in pg_catalog.pg_get_expr(polqual, polrelid)) > 0
  AND position('league_id' in pg_catalog.pg_get_expr(polqual, polrelid)) > 0,
  'la política pública vuelve a comprobar el mapping de liga del fixture'
) FROM pg_catalog.pg_policy WHERE polname = 'football_fixtures_approved_snapshot_read';
SELECT ok(
  EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.football_standings_today'::regclass
      AND tgname = 'football_standings_mapping_guard' AND NOT tgisinternal),
  'cada standing verifica el mapping de proveedor a la competencia canónica'
);

INSERT INTO public.sports_competitions (id, slug, name, is_public) VALUES
  ('00000000-0000-0000-0000-000000000801', 'competencia-fut-check', 'Competencia FUT check', true),
  ('00000000-0000-0000-0000-000000000802', 'competencia-ajena-fut-check', 'Competencia ajena FUT check', true);
INSERT INTO public.sports_teams (id, slug, name, is_public) VALUES
  ('00000000-0000-0000-0000-000000000801', 'local-fut-check', 'Local FUT check', true),
  ('00000000-0000-0000-0000-000000000802', 'visitante-fut-check', 'Visitante FUT check', true);
INSERT INTO public.sports_fixtures (
  id, slug, competition_id, home_team_id, away_team_id, scheduled_at, is_public
) VALUES (
  '00000000-0000-0000-0000-000000000801', 'fixture-fut-check-2026-10-01',
  '00000000-0000-0000-0000-000000000801',
  '00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000802',
  '2026-10-01T18:00:00Z', true
);
INSERT INTO public.sports_provider_mappings (
  provider, entity_type, external_id, competition_id
) VALUES
  ('api-football', 'competition', 'liga-canonica-fut-check', '00000000-0000-0000-0000-000000000801'),
  ('api-football', 'competition', 'liga-ajena-fut-check', '00000000-0000-0000-0000-000000000802');
INSERT INTO public.sports_provider_mappings (
  provider, entity_type, external_id, team_id
) VALUES
  ('api-football', 'team', 'local-externo-fut-check', '00000000-0000-0000-0000-000000000801'),
  ('api-football', 'team', 'visitante-externo-fut-check', '00000000-0000-0000-0000-000000000802');
INSERT INTO public.sports_provider_mappings (
  provider, entity_type, external_id, fixture_id
) VALUES (
  'api-football', 'fixture', 'fixture-externo-fut-check', '00000000-0000-0000-0000-000000000801'
);

SELECT throws_ok(
  $$INSERT INTO public.football_fixtures_today (
      provider, provider_fixture_id, fixture_id, business_date, kickoff_at,
      league_id, league_name, season, home_team_provider_id, home_team_name,
      away_team_provider_id, away_team_name, status, provider_fetched_at,
      is_public, publication_rights_confirmed, publication_rights_source,
      publication_rights_reference, publication_rights_checked_at
    ) VALUES (
      'api-football', 'fixture-externo-fut-check', '00000000-0000-0000-0000-000000000801',
      '2026-10-01', '2026-10-01T18:00:00Z', 'liga-ajena-fut-check', 'Liga ajena', '2026',
      'local-externo-fut-check', 'Local FUT check', 'visitante-externo-fut-check', 'Visitante FUT check',
      'scheduled', '2026-10-01T17:00:00Z', true, true, 'contrato', 'ref-contrato', '2026-10-01T16:00:00Z'
    )$$,
  '23514',
  'Los equipos o la competición del snapshot no coinciden con el fixture canónico.',
  'rechaza una liga externa asignada a otra competición canónica'
);

INSERT INTO public.football_fixtures_today (
  provider, provider_fixture_id, fixture_id, business_date, kickoff_at,
  league_id, league_name, season, home_team_provider_id, home_team_name,
  away_team_provider_id, away_team_name, status, provider_fetched_at,
  is_public, publication_rights_confirmed, publication_rights_source,
  publication_rights_reference, publication_rights_checked_at
) VALUES (
  'api-football', 'fixture-externo-fut-check', '00000000-0000-0000-0000-000000000801',
  '2026-10-01', '2026-10-01T18:00:00Z', 'liga-canonica-fut-check', 'Liga canónica FUT check', '2026',
  'local-externo-fut-check', 'Local FUT check', 'visitante-externo-fut-check', 'Visitante FUT check',
  'scheduled', '2026-10-01T17:00:00Z', true, true, 'contrato', 'ref-contrato', '2026-10-01T16:00:00Z'
);

SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::bigint FROM public.football_fixtures_today
   WHERE business_date = '2026-10-01' AND league_name = 'Liga canónica FUT check'),
  1::bigint,
  'anon solo ve el snapshot cuya liga corresponde al fixture canónico'
);
RESET ROLE;
SELECT throws_ok(
  $$UPDATE public.football_fixtures_today
    SET league_id = 'liga-ajena-fut-check'
    WHERE provider = 'api-football'
      AND provider_fixture_id = 'fixture-externo-fut-check'$$,
  '23514',
  'Los equipos o la competición del snapshot no coinciden con el fixture canónico.',
  'rechaza actualizar una liga externa a otra competición canónica'
);
UPDATE public.sports_provider_mappings
SET competition_id = '00000000-0000-0000-0000-000000000802'
WHERE provider = 'api-football'
  AND entity_type = 'competition'
  AND external_id = 'liga-canonica-fut-check';
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::bigint FROM public.football_fixtures_today
   WHERE business_date = '2026-10-01' AND league_name = 'Liga canónica FUT check'),
  0::bigint,
  'la política oculta el snapshot cuando el mapping de liga deja de coincidir'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
