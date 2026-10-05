begin;
select plan(28);

select has_function('public', 'claim_football_sync_lease', array['text', 'text', 'integer'], 'La RPC de ventanas existe');
select has_function('public', 'reserve_football_provider_request', array['text', 'date', 'date'], 'La RPC de presupuesto existe');
select function_privs_are('anon', 'public', 'claim_football_sync_lease', array['text', 'text', 'integer'], array[]::text[], 'anon no ejecuta el claim');
select function_privs_are('authenticated', 'public', 'claim_football_sync_lease', array['text', 'text', 'integer'], array[]::text[], 'authenticated no ejecuta el claim');
select function_privs_are('service_role', 'public', 'claim_football_sync_lease', array['text', 'text', 'integer'], array['EXECUTE'], 'service_role puede ejecutar el claim');
select function_privs_are('anon', 'public', 'reserve_football_provider_request', array['text', 'date', 'date'], array[]::text[], 'anon no reserva cuota');
select function_privs_are('authenticated', 'public', 'reserve_football_provider_request', array['text', 'date', 'date'], array[]::text[], 'authenticated no reserva cuota');
select function_privs_are('service_role', 'public', 'reserve_football_provider_request', array['text', 'date', 'date'], array['EXECUTE'], 'service_role puede reservar cuota');
select ok((select p.prosecdef from pg_catalog.pg_proc as p where p.oid = 'public.claim_football_sync_lease(text,text,integer)'::regprocedure), 'El claim conserva SECURITY DEFINER');
select ok((select p.proconfig @> array['search_path=""'] from pg_catalog.pg_proc as p where p.oid = 'public.claim_football_sync_lease(text,text,integer)'::regprocedure), 'El claim fija search_path vacío');
select ok((select p.prosecdef from pg_catalog.pg_proc as p where p.oid = 'public.reserve_football_provider_request(text,date,date)'::regprocedure), 'La reserva conserva SECURITY DEFINER');
select ok((select p.proconfig @> array['search_path=""'] from pg_catalog.pg_proc as p where p.oid = 'public.reserve_football_provider_request(text,date,date)'::regprocedure), 'La reserva fija search_path vacío');
select rls_enabled('public.football_provider_daily_usage', 'El presupuesto diario mantiene RLS activo');

select throws_ok(
  $$select public.claim_football_sync_lease(null::text, 'fixtures_diarios', 300)$$,
  '22023', 'La reserva del worker de fútbol no es válida.',
  'El claim rechaza proveedor nulo'
);
select throws_ok(
  $$select public.claim_football_sync_lease('goal-api', null::text, 300)$$,
  '22023', 'La reserva del worker de fútbol no es válida.',
  'El claim rechaza operación nula'
);
select throws_ok(
  $$select public.claim_football_sync_lease('goal-api', 'fixtures_diarios', null::integer)$$,
  '22023', 'La reserva del worker de fútbol no es válida.',
  'El claim rechaza ventana nula'
);
select throws_ok(
  $$select public.reserve_football_provider_request(null::text, (now() at time zone 'America/Bogota')::date, null::date)$$,
  '22023', 'La reserva diaria del proveedor de fútbol no es válida.',
  'La reserva rechaza proveedor nulo'
);
select throws_ok(
  $$select public.reserve_football_provider_request('goal-api', null::date, null::date)$$,
  '22023', 'La reserva diaria del proveedor de fútbol no es válida.',
  'La reserva rechaza fecha de negocio nula'
);

delete from public.football_sync_leases
where provider = 'goal-api' and operation in ('fixtures_diarios', 'standings');
select throws_ok(
  $$select public.claim_football_sync_lease('goal-api', 'fixtures_diarios', 60)$$,
  '22023', 'La reserva del worker de fútbol no es válida.',
  'Una activación antigua no puede reservar fixtures cada minuto'
);
select is(public.claim_football_sync_lease('goal-api', 'fixtures_diarios', 300), true, 'La ventana mínima de cinco minutos se concede');
select is(public.claim_football_sync_lease('goal-api', 'fixtures_diarios', 300), false, 'Una segunda reserva en la ventana de cinco minutos se rechaza');
select throws_ok(
  $$select public.claim_football_sync_lease('goal-api', 'standings', 300)$$,
  '22023', 'La reserva del worker de fútbol no es válida.',
  'Las clasificaciones no admiten una ventana menor a quince minutos'
);
select is(public.claim_football_sync_lease('goal-api', 'standings', 900), true, 'La ventana mínima de quince minutos se concede');
select is(public.claim_football_sync_lease('goal-api', 'standings', 900), false, 'Una segunda reserva de standings en la misma ventana se rechaza');

insert into public.football_provider_daily_usage(provider, business_date, requests_used)
values ('api-football', (now() at time zone 'America/Bogota')::date, 80)
on conflict (provider, business_date) do update set requests_used = 80;
select is(public.reserve_football_provider_request('api-football', (now() at time zone 'America/Bogota')::date, null), false, 'API-Football se detiene en el tope operativo 80');
select is((select requests_used from public.football_provider_daily_usage where provider = 'api-football' and business_date = (now() at time zone 'America/Bogota')::date), 80, 'API-Football no supera el margen de 10 solicitudes');

insert into public.football_provider_daily_usage(provider, business_date, requests_used)
values ('goal-api', (now() at time zone 'America/Bogota')::date, 900)
on conflict (provider, business_date) do update set requests_used = 900;
select is(public.reserve_football_provider_request('goal-api', (now() at time zone 'America/Bogota')::date, null), false, 'Goal API se detiene en el tope operativo 900');
select is((select requests_used from public.football_provider_daily_usage where provider = 'goal-api' and business_date = (now() at time zone 'America/Bogota')::date), 900, 'Goal API no supera el margen de 50 solicitudes');

select * from finish();
rollback;
