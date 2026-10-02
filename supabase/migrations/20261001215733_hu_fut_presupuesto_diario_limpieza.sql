-- Topes diarios duros y limpieza diaria de snapshots del worker
-- de Bogotá. La reserva ocurre antes de cada petición externa.

alter table public.football_fixtures_today
  add column details_fetched_at timestamptz;

create index football_fixtures_details_due_idx
  on public.football_fixtures_today (provider, business_date, status, kickoff_at, details_fetched_at);

create table public.football_provider_daily_usage (
  provider text not null check (provider in ('api-football', 'goal-api')),
  business_date date not null,
  requests_used integer not null default 0 check (requests_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (provider, business_date)
);

create table public.football_provider_fixture_lists (
  provider text not null check (provider in ('api-football', 'goal-api')),
  business_date date not null,
  fixture_date date not null,
  claimed_at timestamptz not null default now(),
  loaded_at timestamptz,
  primary key (provider, business_date, fixture_date)
);

create table public.football_daily_maintenance (
  business_date date primary key,
  cleaned_at timestamptz
);

alter table public.football_provider_daily_usage enable row level security;
alter table public.football_provider_fixture_lists enable row level security;
alter table public.football_daily_maintenance enable row level security;
revoke all privileges on public.football_provider_daily_usage from public, anon, authenticated;
revoke all privileges on public.football_provider_fixture_lists from public, anon, authenticated;
revoke all privileges on public.football_daily_maintenance from public, anon, authenticated;
grant select, insert, update, delete on public.football_provider_daily_usage to service_role;
grant select, insert, update, delete on public.football_provider_fixture_lists to service_role;
grant select, insert, update, delete on public.football_daily_maintenance to service_role;

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
  if p_provider not in ('api-football', 'goal-api') or p_business_date is distinct from fecha_bogota then
    raise exception using errcode = '22023', message = 'La reserva diaria del proveedor de fútbol no es válida.';
  end if;
  if (p_provider = 'api-football' and p_fixture_list_date is not null and p_fixture_list_date <> p_business_date)
    or (p_provider = 'goal-api' and p_fixture_list_date is not null
      and p_fixture_list_date not in (p_business_date, p_business_date + 1)) then
    raise exception using errcode = '22023', message = 'La fecha consultada al proveedor de fútbol no es válida.';
  end if;

  limite_diario := case p_provider when 'api-football' then 90 else 950 end;

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
        and lista.claimed_at < pg_catalog.now() - interval '15 minutes'
    ;

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

create or replace function public.mark_football_provider_fixture_list_loaded(
  p_provider text,
  p_business_date date,
  p_fixture_list_dates date[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_provider not in ('api-football', 'goal-api')
    or p_business_date is distinct from (pg_catalog.now() at time zone 'America/Bogota')::date
    or p_fixture_list_dates is null
    or pg_catalog.cardinality(p_fixture_list_dates) < 1
    or (p_provider = 'api-football' and (
      pg_catalog.cardinality(p_fixture_list_dates) <> 1
      or p_fixture_list_dates[1] <> p_business_date
    ))
    or (p_provider = 'goal-api' and (
      pg_catalog.cardinality(p_fixture_list_dates) <> 2
      or not (p_business_date = any(p_fixture_list_dates))
      or not (p_business_date + 1 = any(p_fixture_list_dates))
    )) then
    raise exception using errcode = '22023', message = 'El estado diario del proveedor de fútbol no es válido.';
  end if;

  update public.football_provider_fixture_lists
  set loaded_at = pg_catalog.now()
  where provider = p_provider and business_date = p_business_date
    and fixture_date = any(p_fixture_list_dates) and loaded_at is null;

  if (
    select count(*) <> pg_catalog.cardinality(p_fixture_list_dates)
    from public.football_provider_fixture_lists
    where provider = p_provider and business_date = p_business_date
      and fixture_date = any(p_fixture_list_dates) and loaded_at is not null
  ) then
    raise exception using errcode = '22023', message = 'No existe una reserva diaria de partidos para el proveedor.';
  end if;
end;
$$;

revoke all on function public.mark_football_provider_fixture_list_loaded(text, date, date[])
  from public, anon, authenticated;
grant execute on function public.mark_football_provider_fixture_list_loaded(text, date, date[]) to service_role;

create or replace function public.purge_old_football_daily_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  fecha_bogota date := (pg_catalog.now() at time zone 'America/Bogota')::date;
  inicio_hoy timestamptz := fecha_bogota::timestamp at time zone 'America/Bogota';
  snapshots_borrados integer;
  fixtures_borrados integer;
  ultima_limpieza timestamptz;
begin
  insert into public.football_daily_maintenance (business_date)
  values (fecha_bogota)
  on conflict (business_date) do nothing;

  select cleaned_at into ultima_limpieza
  from public.football_daily_maintenance
  where business_date = fecha_bogota
  for update;

  if ultima_limpieza is not null then
    return 0;
  end if;

  delete from public.football_fixtures_today
  where business_date <> fecha_bogota;
  get diagnostics snapshots_borrados = row_count;

  -- Solo se eliminan fixtures privados que creó este worker. Los registros
  -- canónicos públicos y los administrados por personas se conservan.
  delete from public.sports_provider_mappings
  where entity_type = 'fixture'
    and fixture_id in (
      select id from public.sports_fixtures
      where sport_code = 'futbol'
        and slug like 'worker-futbol-fixture-%'
        and not is_public
        and scheduled_at < inicio_hoy
    );

  delete from public.sports_fixtures
  where sport_code = 'futbol'
    and slug like 'worker-futbol-fixture-%'
    and not is_public
    and scheduled_at < inicio_hoy;
  get diagnostics fixtures_borrados = row_count;

  delete from public.football_provider_daily_usage
  where business_date < fecha_bogota - 30;

  delete from public.football_provider_fixture_lists
  where business_date < fecha_bogota - 30;

  update public.football_daily_maintenance
  set cleaned_at = pg_catalog.now()
  where business_date = fecha_bogota;

  return snapshots_borrados + fixtures_borrados;
end;
$$;

revoke all on function public.purge_old_football_daily_data() from public, anon, authenticated;
grant execute on function public.purge_old_football_daily_data() to service_role;

comment on table public.football_provider_daily_usage is
  'Contador atómico de peticiones reales: máximo 90 API-Football y 950 Goal API por fecha de Bogotá.';
comment on table public.football_provider_fixture_lists is
  'Lease recuperable por fecha de listado. Una fecha exitosa no se consulta otra vez ese día; un fallo permite reintento tras 15 minutos.';
comment on column public.football_fixtures_today.details_fetched_at is
  'Última actualización real de eventos, alineaciones y estadísticas para programar reconsultas por ventana horaria.';
comment on function public.purge_old_football_daily_data() is
  'Elimina snapshots fuera del día de Bogotá y fixtures privados creados por el worker que ya vencieron; conserva datos canónicos públicos.';
