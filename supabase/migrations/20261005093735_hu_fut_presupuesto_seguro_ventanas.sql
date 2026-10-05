-- Protege las cuotas ante workers antiguos o duplicados: fixtures no puede
-- reservar ventanas por minuto y se deja una reserva diaria para contingencias.

create or replace function public.claim_football_sync_lease(
  p_provider text,
  p_operation text,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  ventana timestamptz;
begin
  if p_provider is null
    or p_provider not in ('goal-api', 'api-football')
    or p_operation is null
    or p_operation not in ('standings', 'fixtures_diarios')
    or p_window_seconds is null
    or p_window_seconds > 3600
    or (p_operation = 'fixtures_diarios' and p_window_seconds < 300)
    or (p_operation = 'standings' and p_window_seconds < 900) then
    raise exception using errcode = '22023', message = 'La reserva del worker de fútbol no es válida.';
  end if;

  ventana := pg_catalog.date_bin(
    pg_catalog.make_interval(secs => p_window_seconds),
    pg_catalog.now(),
    '2000-01-01T00:00:00Z'::timestamptz
  );
  insert into public.football_sync_leases (provider, operation, window_started_at)
  values (p_provider, p_operation, ventana)
  on conflict do nothing;
  return found;
end;
$$;

revoke all on function public.claim_football_sync_lease(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_football_sync_lease(text, text, integer) to service_role;

comment on function public.claim_football_sync_lease(text, text, integer) is
  'Reserva atómica de worker: fixtures requiere ventanas >=5 min; clasificaciones >=15 min.';

create or replace function public.reserve_football_provider_request(
  p_provider text,
  p_business_date date,
  p_fixture_list_date date default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  limite_diario integer;
  fecha_bogota date := (pg_catalog.now() at time zone 'America/Bogota')::date;
begin
  if p_provider is null
    or p_provider not in ('api-football', 'goal-api')
    or p_business_date is distinct from fecha_bogota then
    raise exception using errcode = '22023', message = 'La reserva diaria del proveedor de fútbol no es válida.';
  end if;
  if (p_provider = 'api-football' and p_fixture_list_date is not null and p_fixture_list_date <> p_business_date)
    or (p_provider = 'goal-api' and p_fixture_list_date is not null
      and p_fixture_list_date not in (p_business_date, p_business_date + 1)) then
    raise exception using errcode = '22023', message = 'La fecha consultada al proveedor de fútbol no es válida.';
  end if;

  -- Topes de trabajo por debajo de los máximos del plan: 10 y 50 llamadas
  -- quedan reservadas para diagnósticos/contingencias y no las consume el worker.
  limite_diario := case p_provider when 'api-football' then 80 else 900 end;

  insert into public.football_provider_daily_usage as uso (
    provider, business_date, requests_used, updated_at
  ) values (
    p_provider, p_business_date, 1, pg_catalog.now()
  )
  on conflict (provider, business_date) do update
    set requests_used = uso.requests_used + 1,
        updated_at = pg_catalog.now()
    where uso.requests_used < limite_diario;

  if not found then
    return false;
  end if;

  if p_fixture_list_date is not null then
    insert into public.football_provider_fixture_lists as lista (
      provider, business_date, fixture_date, claimed_at
    ) values (
      p_provider, p_business_date, p_fixture_list_date, pg_catalog.now()
    )
    on conflict (provider, business_date, fixture_date) do update
      set claimed_at = pg_catalog.now()
      where lista.loaded_at is null
        and lista.claimed_at < pg_catalog.now() - interval '15 minutes';

    if not found then
      -- El intento no llegará al proveedor; devolver su reserva de cuota.
      update public.football_provider_daily_usage
      set requests_used = case when requests_used > 0 then requests_used - 1 else 0 end,
          updated_at = pg_catalog.now()
      where provider = p_provider and business_date = p_business_date;
      return false;
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.reserve_football_provider_request(text, date, date)
  from public, anon, authenticated;
grant execute on function public.reserve_football_provider_request(text, date, date) to service_role;

comment on table public.football_provider_daily_usage is
  'Contador atómico con topes operativos conservadores de 80 API-Football y 900 Goal API por fecha de Bogotá; preserva reserva respecto de 90/950.';
