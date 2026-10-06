begin;
select plan(28);

select has_function('public', 'actualizar_posiciones_liga_dimayor', array['uuid', 'jsonb'], 'Existe la escritura atómica DIMAYOR cercada');
select has_function('public', 'claim_dimayor_standings_sync', array[]::text[], 'Existe la reclamación exclusiva de DIMAYOR');
select has_function('public', 'release_dimayor_standings_sync', array['uuid'], 'Existe la liberación cercada de DIMAYOR');
select function_privs_are('anon', 'public', 'actualizar_posiciones_liga_dimayor', array['uuid', 'jsonb'], array[]::text[], 'anon no puede alterar posiciones');
select function_privs_are('authenticated', 'public', 'actualizar_posiciones_liga_dimayor', array['uuid', 'jsonb'], array[]::text[], 'authenticated no puede alterar posiciones');
select function_privs_are('service_role', 'public', 'actualizar_posiciones_liga_dimayor', array['uuid', 'jsonb'], array['EXECUTE'], 'solo el worker privilegiado ejecuta la escritura');
select function_privs_are('anon', 'public', 'claim_dimayor_standings_sync', array[]::text[], array[]::text[], 'anon no puede reclamar una escritura');
select function_privs_are('service_role', 'public', 'claim_dimayor_standings_sync', array[]::text[], array['EXECUTE'], 'solo service_role puede reclamar una escritura');
select function_privs_are('anon', 'public', 'release_dimayor_standings_sync', array['uuid'], array[]::text[], 'anon no puede liberar una escritura');
select function_privs_are('service_role', 'public', 'release_dimayor_standings_sync', array['uuid'], array['EXECUTE'], 'solo service_role puede liberar una escritura');
select ok((select p.prosecdef and p.proconfig @> array['search_path=""']
  from pg_catalog.pg_proc as p
  where p.oid = 'public.actualizar_posiciones_liga_dimayor(uuid,jsonb)'::regprocedure),
  'La escritura privilegiada fija search_path vacío');
select ok((select c.relrowsecurity from pg_catalog.pg_class as c
  where c.oid = 'public.colombian_league_standings'::regclass), 'La tabla continúa protegida con RLS');
select ok((select c.relrowsecurity from pg_catalog.pg_class as c
  where c.oid = 'private.dimayor_standings_sync_state'::regclass), 'El estado privado de la reserva continúa protegido con RLS');

create temporary table dimayor_claim_fixture on commit drop as
select public.claim_dimayor_standings_sync() as token;
select ok((select token is not null from dimayor_claim_fixture), 'El primer worker obtiene un token cercado');
select is(public.claim_dimayor_standings_sync(), null::uuid, 'Una activación simultánea no obtiene un segundo token');

select throws_ok(
  $$select public.actualizar_posiciones_liga_dimayor((select token from dimayor_claim_fixture), null::jsonb)$$,
  '22023', 'La actualización de posiciones no es válida.', 'Rechaza payload nulo'
);
select throws_ok(
  $$select public.actualizar_posiciones_liga_dimayor((select token from dimayor_claim_fixture), '{}'::jsonb)$$,
  '22023', 'La actualización de posiciones no es válida.', 'Rechaza objetos en vez de arrays'
);
select throws_ok(
  $$select public.actualizar_posiciones_liga_dimayor((select token from dimayor_claim_fixture), '[]'::jsonb)$$,
  '22023', 'La actualización de posiciones no es válida.', 'Rechaza lote vacío'
);
select throws_ok(
  $$select public.actualizar_posiciones_liga_dimayor((select token from dimayor_claim_fixture), '[{},{}]'::jsonb)$$,
  '22023', 'La tabla DIMAYOR debe cubrir todas las filas autorizadas de cada fase.',
  'Rechaza filas no verificadas y no autorizadas'
);

-- Fixtures temporales: todo el test se revierte al final de la transacción.
insert into public.colombian_league_standings (
  competition_slug, season, phase, team_key, team_name, position, played, won, drawn, lost,
  goals_for, goals_against, goal_difference, points, source_name, source_url,
  is_public, publication_rights_confirmed
)
select fixture.competition_slug, periodo.temporada, fixture.phase, fixture.team_key, fixture.team_name,
  fixture.position, 0, 0, 0, 0, 0, 0, 0, 0, 'test fixture', fixture.source_url, true, true
from (values
  ('liga-betplay', 'Todos contra todos', 'codex-test-liga-1', 'Equipo Prueba Liga Uno', 1,
    'https://dimayor.com.co/liga-betplay-dimayor/'),
  ('liga-betplay', 'Todos contra todos', 'codex-test-liga-2', 'Equipo Prueba Liga Dos', 2,
    'https://dimayor.com.co/liga-betplay-dimayor/'),
  ('torneo-betplay', 'Fase todos contra todos', 'codex-test-torneo-1', 'Equipo Prueba Torneo Uno', 1,
    'https://dimayor.com.co/torneo-betplay-dimayor/'),
  ('torneo-betplay', 'Fase todos contra todos', 'codex-test-torneo-2', 'Equipo Prueba Torneo Dos', 2,
    'https://dimayor.com.co/torneo-betplay-dimayor/')
) as fixture(competition_slug, phase, team_key, team_name, position, source_url)
cross join (
  select pg_catalog.to_char(fecha, 'YYYY')
    || case when pg_catalog.to_char(fecha, 'MM') <= '06' then '-I' else '-II' end as temporada
  from (select (pg_catalog.now() at time zone 'America/Bogota')::date as fecha) as reloj
) as periodo
on conflict (competition_slug, season, phase, team_key) do nothing;

create temporary table posiciones_dimayor_payload on commit drop as
select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
  'competition_slug', datos.competition_slug,
  'season', datos.season,
  'phase', datos.phase,
  'team_key', datos.team_key,
  'position', datos.posicion,
  'played', 0,
  'won', 0,
  'drawn', 0,
  'lost', 0,
  'goals_for', 0,
  'goals_against', 0,
  'goal_difference', 0,
  'points', 0,
  'source_name', 'DIMAYOR',
  'source_url', case datos.competition_slug
    when 'liga-betplay' then 'https://dimayor.com.co/liga-betplay-dimayor/'
    else 'https://dimayor.com.co/torneo-betplay-dimayor/' end
) order by datos.competition_slug, datos.phase, datos.posicion) as payload
from (
  select base.competition_slug, base.season, base.phase, base.team_key,
    pg_catalog.row_number() over (
      partition by base.competition_slug, base.season, base.phase order by base.team_key
    )::integer as posicion
  from public.colombian_league_standings as base
  where base.competition_slug in ('liga-betplay', 'torneo-betplay')
    and base.season = (
      select pg_catalog.to_char(fecha, 'YYYY')
        || case when pg_catalog.to_char(fecha, 'MM') <= '06' then '-I' else '-II' end
      from (select (pg_catalog.now() at time zone 'America/Bogota')::date as fecha) as reloj
    )
    and base.is_public is true and base.publication_rights_confirmed is true
) as datos;

update public.colombian_league_standings
set publication_rights_confirmed = false
where team_key = 'codex-test-liga-1';
select throws_ok(
  $$select public.actualizar_posiciones_liga_dimayor(
    (select token from dimayor_claim_fixture), payload
  ) from posiciones_dimayor_payload$$,
  '22023', 'La tabla DIMAYOR debe cubrir todas las filas autorizadas de cada fase.',
  'Revalida derechos antes de escribir cada fila'
);
update public.colombian_league_standings
set publication_rights_confirmed = true
where team_key = 'codex-test-liga-1';

select throws_ok(
  $$select public.actualizar_posiciones_liga_dimayor(
    (select token from dimayor_claim_fixture), (
    select pg_catalog.jsonb_agg(fila)
    from pg_catalog.jsonb_array_elements(payload) as elementos(fila)
    where not (fila->>'competition_slug' = 'liga-betplay' and fila->>'team_key' = 'codex-test-liga-1')
  )) from posiciones_dimayor_payload$$,
  '22023', 'La tabla DIMAYOR debe cubrir todas las filas autorizadas de cada fase.',
  'Rechaza una actualización parcial sin aplicar parte de la tabla');
select is((select source_name from public.colombian_league_standings where team_key = 'codex-test-liga-1'),
  'test fixture', 'El rechazo del lote parcial no escribe ni una fila');

create temporary table resultado_actualizacion_dimayor on commit drop as
select public.actualizar_posiciones_liga_dimayor(
  (select token from dimayor_claim_fixture), payload
) as cantidad
from posiciones_dimayor_payload;
select is((select cantidad from resultado_actualizacion_dimayor),
  (select pg_catalog.jsonb_array_length(payload) from posiciones_dimayor_payload),
  'Actualiza de forma atómica todas las filas autorizadas de la temporada activa');
select is((select pg_catalog.count(*)::integer
  from public.colombian_league_standings
  where competition_slug in ('liga-betplay', 'torneo-betplay')
    and season = (
      select pg_catalog.to_char(fecha, 'YYYY')
        || case when pg_catalog.to_char(fecha, 'MM') <= '06' then '-I' else '-II' end
      from (select (pg_catalog.now() at time zone 'America/Bogota')::date as fecha) as reloj
    )
    and is_public is true and publication_rights_confirmed is true and source_name = 'DIMAYOR'),
  (select pg_catalog.jsonb_array_length(payload) from posiciones_dimayor_payload),
  'La escritura conserva todas las filas y marca la fuente oficial');
select is(public.claim_dimayor_standings_sync(), null::uuid, 'Una publicación reciente bloquea otro ciclo durante quince minutos');

update private.dimayor_standings_sync_state
set claim_token = '00000000-0000-4000-8000-000000000001'::uuid,
    claimed_at = pg_catalog.now() - interval '3 minutes', completed_at = null
where singleton is true;
create temporary table dimayor_reclaim_fixture on commit drop as
select public.claim_dimayor_standings_sync() as token;
select ok((select token is not null and token is distinct from (select token from dimayor_claim_fixture)
  from dimayor_reclaim_fixture), 'Una nueva activación recupera una lease vencida con token distinto');
select throws_ok(
  $$select public.actualizar_posiciones_liga_dimayor(
    (select token from dimayor_claim_fixture), payload
  ) from posiciones_dimayor_payload$$,
  '40001', 'La reserva de actualización DIMAYOR no es válida o venció.',
  'Un worker antiguo no puede sobrescribir la tabla después del vencimiento');
select is(public.release_dimayor_standings_sync((select token from dimayor_reclaim_fixture)),
  true, 'Solo libera la reserva que conserva el token vigente');

select * from finish();
rollback;
