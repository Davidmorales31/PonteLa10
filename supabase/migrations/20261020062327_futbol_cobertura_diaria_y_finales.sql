-- Reserva el presupuesto diario de Goal API para la cobertura de las tres
-- competencias colombianas y conserva los topes operativos y sus márgenes.
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

  -- 80 de 90 para API-Football; 900 de 950 para Goal API.
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

-- Un final elegible marca la tabla oficial pendiente, incluso si se habilita su
-- publicación o se corrige su competencia después. La generación preserva finales
-- que lleguen mientras DIMAYOR se está leyendo.
alter table private.dimayor_standings_sync_state
  add column refresh_pending boolean not null default false,
  add column refresh_generation bigint not null default 0,
  add column claimed_generation bigint not null default 0;

create or replace function private.marcar_tabla_dimayor_pendiente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'finished'
    and new.competition_slug in ('liga-betplay', 'torneo-betplay')
    and new.is_public is true
    and new.publication_rights_confirmed is true then
    if tg_op = 'INSERT' then
      update private.dimayor_standings_sync_state
      set refresh_pending = true,
          refresh_generation = refresh_generation + 1
      where singleton is true;
    elsif old.status is distinct from 'finished'
      or old.is_public is distinct from true
      or old.publication_rights_confirmed is distinct from true
      or old.competition_slug is distinct from new.competition_slug then
      update private.dimayor_standings_sync_state
      set refresh_pending = true,
          refresh_generation = refresh_generation + 1
      where singleton is true;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.marcar_tabla_dimayor_pendiente()
  from public, anon, authenticated, service_role;

drop trigger if exists colombian_fixture_finished_dimayor_insert on public.colombian_league_fixtures;
drop trigger if exists colombian_fixture_finished_dimayor_update on public.colombian_league_fixtures;
drop trigger if exists colombian_fixture_refresh_dimayor_pending on public.colombian_league_fixtures;
create trigger colombian_fixture_refresh_dimayor_pending
  after insert or update of status, is_public, publication_rights_confirmed, competition_slug
  on public.colombian_league_fixtures
  for each row
  execute function private.marcar_tabla_dimayor_pendiente();

create or replace function private.limpiar_pendiente_dimayor_confirmado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.completed_at is distinct from old.completed_at
    and new.refresh_generation = new.claimed_generation then
    update private.dimayor_standings_sync_state
    set refresh_pending = false
    where singleton is true;
  end if;
  return new;
end;
$$;

revoke all on function private.limpiar_pendiente_dimayor_confirmado()
  from public, anon, authenticated, service_role;

drop trigger if exists dimayor_refresh_completed_pending on private.dimayor_standings_sync_state;
create trigger dimayor_refresh_completed_pending
  after update of completed_at on private.dimayor_standings_sync_state
  for each row execute function private.limpiar_pendiente_dimayor_confirmado();

create or replace function public.claim_dimayor_standings_sync()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ahora timestamptz := pg_catalog.now();
  token uuid;
  reclamado timestamptz;
  completado timestamptz;
  pendiente boolean;
  generacion bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('dimayor_standings_sync', 0)
  );
  select state.claim_token, state.claimed_at, state.completed_at,
      state.refresh_pending, state.refresh_generation
    into token, reclamado, completado, pendiente, generacion
  from private.dimayor_standings_sync_state as state
  where state.singleton is true
  for update;

  if (token is not null and reclamado > ahora - interval '2 minutes')
    or (not coalesce(pendiente, false) and completado > ahora - interval '15 minutes') then
    return null;
  end if;

  token := pg_catalog.gen_random_uuid();
  update private.dimayor_standings_sync_state
  set claim_token = token,
      claimed_at = ahora,
      claimed_generation = generacion
  where singleton is true;
  return token;
end;
$$;

revoke all on function public.claim_dimayor_standings_sync() from public, anon, authenticated;
grant execute on function public.claim_dimayor_standings_sync() to service_role;

create or replace function public.dimayor_standings_refresh_pending()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select coalesce(state.refresh_pending, false)
  from private.dimayor_standings_sync_state as state
  where state.singleton is true;
$$;

revoke all on function public.dimayor_standings_refresh_pending() from public, anon, authenticated;
grant execute on function public.dimayor_standings_refresh_pending() to service_role;
