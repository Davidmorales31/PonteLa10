begin;
select plan(24);

select has_table('public', 'colombian_league_fixtures', 'Existe el calendario de Liga y Copa');
select has_column('public', 'colombian_league_fixtures', 'official_source_url', 'Se conserva el enlace oficial de DIMAYOR');
select rls_enabled('public.colombian_league_fixtures', 'El calendario expuesto mantiene RLS');
select has_table('public', 'football_league_calendar_sync_runs', 'Existe la lease diaria del calendario');
select has_column('public', 'football_league_calendar_sync_runs', 'attempt_count', 'La lease limita reintentos');
select rls_enabled('public.football_league_calendar_sync_runs', 'La lease mantiene RLS');
select has_function('public', 'claim_football_league_calendar_sync', array['date'], 'Existe el claim diario');
select has_function('public', 'finish_football_league_calendar_sync', array['date', 'uuid', 'integer', 'text'], 'Existe el cierre diario');
select function_privs_are('anon', 'public', 'claim_football_league_calendar_sync', array['date'], array[]::text[], 'anon no ejecuta el claim');
select function_privs_are('authenticated', 'public', 'claim_football_league_calendar_sync', array['date'], array[]::text[], 'authenticated no ejecuta el claim');
select function_privs_are('service_role', 'public', 'claim_football_league_calendar_sync', array['date'], array['EXECUTE'], 'service_role ejecuta el claim');
select function_privs_are('anon', 'public', 'finish_football_league_calendar_sync', array['date', 'uuid', 'integer', 'text'], array[]::text[], 'anon no ejecuta el cierre');
select function_privs_are('authenticated', 'public', 'finish_football_league_calendar_sync', array['date', 'uuid', 'integer', 'text'], array[]::text[], 'authenticated no ejecuta el cierre');
select function_privs_are('service_role', 'public', 'finish_football_league_calendar_sync', array['date', 'uuid', 'integer', 'text'], array['EXECUTE'], 'service_role ejecuta el cierre');
select ok((select p.prosecdef and p.proconfig @> array['search_path=""']
  from pg_catalog.pg_proc as p
  where p.oid = 'public.claim_football_league_calendar_sync(date)'::regprocedure),
  'El claim es privilegiado con search_path vacío');
select ok((select p.prosecdef and p.proconfig @> array['search_path=""']
  from pg_catalog.pg_proc as p
  where p.oid = 'public.finish_football_league_calendar_sync(date,uuid,integer,text)'::regprocedure),
  'El cierre es privilegiado con search_path vacío');

delete from public.football_league_calendar_sync_runs
where business_date = (pg_catalog.now() at time zone 'America/Bogota')::date;
create temporary table pruebas_tokens_calendario (
  primer_estado text,
  primer_token uuid,
  reintento_estado text,
  reintento_token uuid
);
insert into pruebas_tokens_calendario (primer_estado, primer_token)
select resultado->>'status', (resultado->>'claim_token')::uuid
from (select public.claim_football_league_calendar_sync(
  (pg_catalog.now() at time zone 'America/Bogota')::date
) as resultado) as primera;
select is((select primer_estado from pruebas_tokens_calendario),
  'claimed', 'Se concede el primer intento diario');
select is(public.claim_football_league_calendar_sync((pg_catalog.now() at time zone 'America/Bogota')::date)->>'status',
  'busy', 'Una lease fresca no permite una corrida paralela');
update public.football_league_calendar_sync_runs
set claimed_at = pg_catalog.now() - interval '31 minutes'
where business_date = (pg_catalog.now() at time zone 'America/Bogota')::date;
insert into pruebas_tokens_calendario (reintento_estado, reintento_token)
select resultado->>'status', (resultado->>'claim_token')::uuid
from (select public.claim_football_league_calendar_sync(
  (pg_catalog.now() at time zone 'America/Bogota')::date
) as resultado) as reintento;
select is((select reintento_estado from pruebas_tokens_calendario),
  'claimed', 'Una lease abandonada admite un único reintento');
select is((select attempt_count from public.football_league_calendar_sync_runs
  where business_date = (pg_catalog.now() at time zone 'America/Bogota')::date), 2,
  'El contador queda limitado a dos intentos');
select isnt((select primer_token from pruebas_tokens_calendario),
  (select reintento_token from pruebas_tokens_calendario), 'Cada intento recibe un token distinto');
select throws_ok(
  $$select public.finish_football_league_calendar_sync(
    (pg_catalog.now() at time zone 'America/Bogota')::date,
    (select primer_token from pruebas_tokens_calendario), 0, 'TEST_ERROR'
  )$$,
  '22023', 'No existe una reserva activa del calendario de fútbol.',
  'Un worker atrasado no puede finalizar sobre el lease nuevo'
);
select lives_ok(
  $$select public.finish_football_league_calendar_sync(
    (pg_catalog.now() at time zone 'America/Bogota')::date,
    (select reintento_token from pruebas_tokens_calendario), 0, 'TEST_ERROR'
  )$$,
  'El token vigente puede cerrar su propio intento'
);
select is(public.claim_football_league_calendar_sync((pg_catalog.now() at time zone 'America/Bogota')::date)->>'status',
  'exhausted', 'La lease no permite más reintentos que el límite diario');

select * from finish();
rollback;
