BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(12);

INSERT INTO public.sports_competitions (id, slug, name, is_public) VALUES
  ('00000000-0000-0000-0000-000000000201', 'competencia-publica', 'Competencia pública', true),
  ('00000000-0000-0000-0000-000000000202', 'competencia-privada', 'Competencia privada', false);

INSERT INTO public.sports_teams (id, slug, name, is_public) VALUES
  ('00000000-0000-0000-0000-000000000101', 'equipo-publico', 'Equipo público', true),
  ('00000000-0000-0000-0000-000000000102', 'equipo-privado', 'Equipo privado', false),
  ('00000000-0000-0000-0000-000000000103', 'otro-proveedor', 'Mismo ID externo, otro proveedor', false);

INSERT INTO public.sports_players (id, slug, display_name, is_public) VALUES
  ('00000000-0000-0000-0000-000000000301', 'jugador-publico', 'Jugador público', true),
  ('00000000-0000-0000-0000-000000000302', 'jugador-privado', 'Jugador privado', false);

INSERT INTO public.sports_player_memberships (
  id, player_id, team_id, is_public
) VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', true),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000101', false),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000101', true);

INSERT INTO public.sports_provider_mappings (provider, entity_type, external_id, team_id) VALUES
  ('api-sports', 'team', '101', '00000000-0000-0000-0000-000000000101'),
  ('api-sports', 'team', '102', '00000000-0000-0000-0000-000000000102'),
  ('the-sports-db', 'team', '101', '00000000-0000-0000-0000-000000000103');

INSERT INTO public.sports_provider_mappings (provider, entity_type, external_id, competition_id) VALUES
  ('api-sports', 'competition', 'league-1', '00000000-0000-0000-0000-000000000201'),
  ('api-sports', 'competition', 'league-2', '00000000-0000-0000-0000-000000000202');

INSERT INTO public.sports_provider_mappings (provider, entity_type, external_id, player_id) VALUES
  ('api-sports', 'player', 'player-1', '00000000-0000-0000-0000-000000000301'),
  ('api-sports', 'player', 'player-2', '00000000-0000-0000-0000-000000000302');

SELECT ok(
  (SELECT count(*) = 5 FROM pg_catalog.pg_class
   WHERE oid IN (
     'public.sports_competitions'::regclass,
     'public.sports_teams'::regclass,
     'public.sports_players'::regclass,
     'public.sports_player_memberships'::regclass,
     'public.sports_provider_mappings'::regclass
   ) AND relrowsecurity),
  'RLS está habilitado en las cinco tablas deportivas'
);
SELECT is(
  (SELECT count(*) FROM pg_catalog.pg_trigger
   WHERE tgname IN (
     'sports_competitions_updated_at',
     'sports_teams_updated_at',
     'sports_players_updated_at',
     'sports_player_memberships_updated_at',
     'sports_provider_mappings_updated_at'
   ) AND NOT tgisinternal),
  5::bigint,
  'las cinco tablas actualizan updated_at con trigger'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.sports_teams', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.sports_teams', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.sports_teams', 'DELETE'),
  'anon no puede modificar entidades'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.sports_provider_mappings', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.sports_provider_mappings', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.sports_provider_mappings', 'DELETE'),
  'authenticated no puede modificar mappings'
);

SELECT ok(
  has_table_privilege('service_role', 'public.sports_provider_mappings', 'INSERT')
  AND has_table_privilege('service_role', 'public.sports_provider_mappings', 'UPDATE'),
  'la escritura queda reservada al rol de servidor'
);

SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(id) FROM public.sports_teams)
    + (SELECT count(id) FROM public.sports_competitions)
    + (SELECT count(id) FROM public.sports_players)
    + (SELECT count(id) FROM public.sports_player_memberships),
  4::bigint,
  'anon solo ve equipos, competencias, jugadores y membresías aprobados'
);
SELECT is(
  (SELECT count(external_id) FROM public.sports_provider_mappings),
  3::bigint,
  'anon solo ve mappings de equipos, competencia y jugador aprobados'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(id) FROM public.sports_teams)
    + (SELECT count(id) FROM public.sports_competitions)
    + (SELECT count(id) FROM public.sports_players)
    + (SELECT count(id) FROM public.sports_player_memberships),
  4::bigint,
  'authenticated solo ve entidades y membresías aprobadas'
);
SELECT is(
  (SELECT count(external_id) FROM public.sports_provider_mappings),
  3::bigint,
  'authenticated solo ve mappings de entidades aprobadas'
);

RESET ROLE;
SELECT is(
  (SELECT count(DISTINCT team_id)
   FROM public.sports_provider_mappings
   WHERE entity_type = 'team' AND external_id = '101'),
  2::bigint,
  'el mismo ID externo en dos proveedores no fusiona equipos'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.sports_provider_mappings'::regclass
      AND conname = 'sports_provider_mappings_external_unique'
      AND contype = 'u'
  ),
  'cada provider, tipo e ID externo tiene mapping único'
);

UPDATE public.sports_teams
SET name = 'Nombre actualizado del equipo'
WHERE id = '00000000-0000-0000-0000-000000000101';
SELECT ok(
  (SELECT team_id = '00000000-0000-0000-0000-000000000101'::uuid
   FROM public.sports_provider_mappings
   WHERE provider = 'api-sports' AND entity_type = 'team' AND external_id = '101')
  AND (SELECT slug = 'equipo-publico'
       FROM public.sports_teams
       WHERE id = '00000000-0000-0000-0000-000000000101'),
  'cambiar el nombre conserva el ID interno y slug asignados'
);

SELECT * FROM finish();
ROLLBACK;
