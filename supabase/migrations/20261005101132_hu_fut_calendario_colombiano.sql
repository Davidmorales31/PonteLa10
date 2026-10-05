-- Base reproducible del calendario público colombiano y sincronización diaria
-- desde el worker local. En Production, las tablas ya existen por migraciones
-- aplicadas fuera del historial Git; las operaciones siguientes son aditivas.

create table if not exists public.colombian_league_fixtures (
  competition_slug text not null check (competition_slug in ('liga-betplay', 'torneo-betplay', 'copa-colombia')),
  season text not null check (season ~ '^20[0-9]{2}-(I|II)$'),
  provider text not null check (provider in ('api-football', 'goal-api', 'dimayor')),
  provider_fixture_id text not null check (provider_fixture_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(provider_fixture_id) <= 120),
  round_name text not null check (char_length(round_name) between 1 and 120),
  scheduled_at timestamptz not null,
  home_team text not null check (char_length(home_team) between 2 and 120),
  away_team text not null check (char_length(away_team) between 2 and 120),
  status text not null check (status in ('scheduled', 'pre-match', 'live', 'halftime', 'finished', 'postponed', 'suspended', 'abandoned', 'cancelled', 'unknown')),
  goals_home smallint check (goals_home between 0 and 99),
  goals_away smallint check (goals_away between 0 and 99),
  venue text check (venue is null or char_length(venue) <= 160),
  city text check (city is null or char_length(city) <= 120),
  source_name text not null default 'Goal API',
  source_url text not null default 'https://goal-api.com/documentation',
  official_source_url text,
  checked_at timestamptz not null default now(),
  is_public boolean not null default false,
  publication_rights_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint colombian_league_fixture_distinct_teams check (home_team <> away_team),
  primary key (competition_slug, season, provider, provider_fixture_id)
);

alter table public.colombian_league_fixtures
  add column if not exists official_source_url text;
alter table public.colombian_league_fixtures
  drop constraint if exists colombian_league_fixtures_competition_slug_check;
alter table public.colombian_league_fixtures
  add constraint colombian_league_fixtures_competition_slug_check
  check (competition_slug in ('liga-betplay', 'torneo-betplay', 'copa-colombia'));
alter table public.colombian_league_fixtures
  drop constraint if exists colombian_league_fixtures_provider_check;
alter table public.colombian_league_fixtures
  add constraint colombian_league_fixtures_provider_check
  check (provider in ('api-football', 'goal-api', 'dimayor'));
alter table public.colombian_league_fixtures
  drop constraint if exists colombian_league_fixtures_official_source_url_check;
alter table public.colombian_league_fixtures
  add constraint colombian_league_fixtures_official_source_url_check
  check (official_source_url is null or official_source_url like 'https://dimayor.com.co/%');

create index if not exists colombian_league_fixtures_public_schedule_idx
  on public.colombian_league_fixtures (scheduled_at, competition_slug)
  where is_public and publication_rights_confirmed;

alter table public.colombian_league_fixtures enable row level security;
revoke all privileges on public.colombian_league_fixtures from public, anon, authenticated;
grant select on public.colombian_league_fixtures to anon, authenticated;
grant select, insert, update, delete on public.colombian_league_fixtures to service_role;
drop policy if exists "public can read published Colombian league fixtures" on public.colombian_league_fixtures;
create policy "public can read published Colombian league fixtures"
  on public.colombian_league_fixtures for select to anon, authenticated
  using (is_public and publication_rights_confirmed);

-- Recupera el esquema de tabla que ya existe en Production si este historial
-- se aplica a una base nueva sin las tres migraciones ausentes de octubre.
create table if not exists public.colombian_league_standings (
  competition_slug text not null check (competition_slug in ('liga-betplay', 'torneo-betplay')),
  season text not null check (season ~ '^20[0-9]{2}-(I|II)$'),
  phase text not null check (char_length(phase) between 2 and 80),
  team_key text not null check (team_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  team_name text not null check (char_length(team_name) between 2 and 120),
  position smallint not null check (position between 1 and 64),
  played smallint not null check (played between 0 and 80),
  won smallint not null check (won between 0 and 80),
  drawn smallint not null check (drawn between 0 and 80),
  lost smallint not null check (lost between 0 and 80),
  goals_for smallint not null check (goals_for between 0 and 999),
  goals_against smallint not null check (goals_against between 0 and 999),
  goal_difference smallint not null check (goal_difference between -999 and 999),
  points smallint not null check (points between 0 and 999),
  source_name text not null check (char_length(source_name) between 2 and 80),
  source_url text not null check (source_url like 'https://%'),
  checked_at timestamptz not null default now(),
  is_public boolean not null default false,
  publication_rights_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  team_logo_url text check (team_logo_url is null or team_logo_url ~ '^/images/escudos/liga-colombiana/[a-z0-9-]+\.png$'),
  constraint colombian_league_standings_record_consistent check (
    won + drawn + lost = played and goals_for - goals_against = goal_difference
  ),
  primary key (competition_slug, season, phase, team_key)
);

alter table public.colombian_league_standings enable row level security;
revoke all privileges on public.colombian_league_standings from public, anon, authenticated;
grant select on public.colombian_league_standings to anon, authenticated;
grant select, insert, update, delete on public.colombian_league_standings to service_role;
drop policy if exists "public can read published Colombian league standings" on public.colombian_league_standings;
create policy "public can read published Colombian league standings"
  on public.colombian_league_standings for select to anon, authenticated
  using (is_public and publication_rights_confirmed);

create table if not exists public.football_league_calendar_sync_runs (
  business_date date primary key,
  provider text not null check (provider = 'goal-api'),
  claimed_at timestamptz not null default now(),
  claim_token uuid,
  completed_at timestamptz,
  attempt_count smallint not null default 0 check (attempt_count between 0 and 2),
  fixture_count integer not null default 0 check (fixture_count >= 0 and fixture_count <= 10000),
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_]{1,48}$'),
  updated_at timestamptz not null default now()
);

alter table public.football_league_calendar_sync_runs enable row level security;
alter table public.football_league_calendar_sync_runs
  add column if not exists claim_token uuid;
alter table public.football_league_calendar_sync_runs
  add column if not exists attempt_count smallint not null default 0;
alter table public.football_league_calendar_sync_runs
  drop constraint if exists football_league_calendar_sync_runs_attempt_count_check;
alter table public.football_league_calendar_sync_runs
  add constraint football_league_calendar_sync_runs_attempt_count_check check (attempt_count between 0 and 2);
revoke all privileges on public.football_league_calendar_sync_runs from public, anon, authenticated;
grant select, insert, update, delete on public.football_league_calendar_sync_runs to service_role;

do $$
begin
  if pg_catalog.to_regclass('public.football_sync_leases') is null then
    raise exception 'La migración requiere la lease de fútbol de 2026-10-01.';
  end if;
end;
$$;

-- Ventana móvil atómica: una ventana fija de date_bin dejaba pasar dos ciclos
-- pegados cuando un worker antiguo coincidía con el borde del cubo.
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
  ahora timestamptz := pg_catalog.now();
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('football_sync:' || p_provider || ':' || p_operation, 0)
  );

  if exists (
    select 1 from public.football_sync_leases
    where provider = p_provider and operation = p_operation
      and acquired_at > ahora - pg_catalog.make_interval(secs => p_window_seconds)
  ) then
    return false;
  end if;

  delete from public.football_sync_leases
  where provider = p_provider and operation = p_operation
    and acquired_at < ahora - interval '7 days';

  insert into public.football_sync_leases (provider, operation, window_started_at, acquired_at)
  values (p_provider, p_operation, ahora, ahora)
  on conflict do nothing;
  return found;
end;
$$;

revoke all on function public.claim_football_sync_lease(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_football_sync_lease(text, text, integer) to service_role;
comment on function public.claim_football_sync_lease(text, text, integer) is
  'Reserva atómica con ventana móvil: fixtures >=5 min y clasificaciones >=15 min, sin bypass en bordes de intervalo.';

create or replace function public.claim_football_league_calendar_sync(p_business_date date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  fecha_actual date := (pg_catalog.now() at time zone 'America/Bogota')::date;
  finalizado timestamptz;
  reclamado date;
  intentos smallint;
  token uuid := pg_catalog.gen_random_uuid();
begin
  if p_business_date is distinct from fecha_actual then
    raise exception using errcode = '22023', message = 'La fecha del calendario de fútbol no es válida.';
  end if;

  insert into public.football_league_calendar_sync_runs as corrida (
    business_date, provider, claimed_at, claim_token, completed_at, attempt_count, fixture_count, error_code, updated_at
  ) values (
    p_business_date, 'goal-api', pg_catalog.now(), token, null, 1, 0, null, pg_catalog.now()
  )
  on conflict (business_date) do update
    set claimed_at = pg_catalog.now(), completed_at = null,
        claim_token = pg_catalog.gen_random_uuid(),
        attempt_count = corrida.attempt_count + 1,
        fixture_count = 0, error_code = null, updated_at = pg_catalog.now()
    where corrida.completed_at is null
      and corrida.claimed_at < pg_catalog.now() - interval '30 minutes'
      and corrida.attempt_count < 2
  returning corrida.business_date, corrida.attempt_count, corrida.claim_token
    into reclamado, intentos, token;

  if reclamado is not null then
    return pg_catalog.jsonb_build_object(
      'status', 'claimed', 'attempt_count', intentos, 'claim_token', token
    );
  end if;

  select completed_at, attempt_count into finalizado, intentos
  from public.football_league_calendar_sync_runs
  where business_date = p_business_date;
  if finalizado is not null then
    return pg_catalog.jsonb_build_object('status', 'completed', 'attempt_count', intentos);
  end if;
  if intentos >= 2 then
    return pg_catalog.jsonb_build_object('status', 'exhausted', 'attempt_count', intentos);
  end if;
  return pg_catalog.jsonb_build_object('status', 'busy', 'attempt_count', intentos);
end;
$$;

revoke all on function public.claim_football_league_calendar_sync(date) from public, anon, authenticated;
grant execute on function public.claim_football_league_calendar_sync(date) to service_role;

create or replace function public.finish_football_league_calendar_sync(
  p_business_date date,
  p_claim_token uuid,
  p_fixture_count integer,
  p_error_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_business_date is distinct from (pg_catalog.now() at time zone 'America/Bogota')::date
    or p_claim_token is null
    or p_fixture_count is null or p_fixture_count < 0 or p_fixture_count > 10000
    or (p_error_code is not null and p_error_code !~ '^[A-Z0-9_]{1,48}$') then
    raise exception using errcode = '22023', message = 'El resultado del calendario de fútbol no es válido.';
  end if;

  update public.football_league_calendar_sync_runs
  set completed_at = case when p_error_code is null then pg_catalog.now() else null end,
      claim_token = null,
      fixture_count = p_fixture_count,
      error_code = p_error_code,
      updated_at = pg_catalog.now()
  where business_date = p_business_date
    and claim_token = p_claim_token
    and completed_at is null
    and claimed_at >= pg_catalog.now() - interval '30 minutes';

  if not found then
    raise exception using errcode = '22023', message = 'No existe una reserva activa del calendario de fútbol.';
  end if;
end;
$$;

revoke all on function public.finish_football_league_calendar_sync(date, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.finish_football_league_calendar_sync(date, uuid, integer, text) to service_role;

comment on table public.football_league_calendar_sync_runs is
  'Lease idempotente por día de Bogotá para que el worker local sincronice calendario Liga/Copa sin duplicar consumo.';
comment on function public.claim_football_league_calendar_sync(date) is
  'Reclama como máximo una sincronización diaria; una corrida interrumpida se puede retomar tras 30 minutos.';
