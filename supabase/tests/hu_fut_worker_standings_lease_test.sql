begin;
select plan(8);

select has_table('public', 'football_sync_leases', 'La reserva de cuota existe');
select rls_enabled('public.football_sync_leases', 'La reserva tiene RLS activo');
select table_privs_are('anon', 'public.football_sync_leases', array[]::text[], 'anon no accede a reservas');
select table_privs_are('authenticated', 'public.football_sync_leases', array[]::text[], 'authenticated no accede a reservas');
select function_privs_are('anon', 'public', 'claim_football_sync_lease', array['text', 'text', 'integer'], array[]::text[], 'anon no ejecuta el claim');
select function_privs_are('authenticated', 'public', 'claim_football_sync_lease', array['text', 'text', 'integer'], array[]::text[], 'authenticated no ejecuta el claim');

delete from public.football_sync_leases
where provider = 'goal-api' and operation = 'standings';
select is(public.claim_football_sync_lease('goal-api', 'standings', 900), true, 'La primera reserva se concede');
select is(public.claim_football_sync_lease('goal-api', 'standings', 900), false, 'La segunda reserva se rechaza');

select * from finish();
rollback;
