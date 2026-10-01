-- HU-FUT-05/06/07: provider-neutral snapshots for the private football worker.
-- Public visibility is opt-in and additionally gated on documented publication rights.

create table public.football_fixtures_today (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.sports_fixtures(id) on delete cascade,
  provider text not null check (provider in ('goal-api', 'api-football')),
  provider_fixture_id text not null check (char_length(btrim(provider_fixture_id)) between 1 and 128),
  business_date date not null,
  kickoff_at timestamptz not null,
  league_id text not null check (char_length(btrim(league_id)) between 1 and 128),
  league_name text not null check (char_length(btrim(league_name)) between 1 and 160),
  league_country text check (league_country is null or char_length(league_country) <= 80),
  season text not null check (char_length(btrim(season)) between 1 and 32),
  round text check (round is null or char_length(round) <= 160),
  phase text check (phase is null or char_length(phase) <= 120),
  group_name text check (group_name is null or char_length(group_name) <= 120),
  home_team_provider_id text not null check (char_length(btrim(home_team_provider_id)) between 1 and 128),
  home_team_name text not null check (char_length(btrim(home_team_name)) between 1 and 160),
  home_team_logo text,
  away_team_provider_id text not null check (char_length(btrim(away_team_provider_id)) between 1 and 128),
  away_team_name text not null check (char_length(btrim(away_team_name)) between 1 and 160),
  away_team_logo text,
  status text not null check (status in (
    'scheduled', 'pre-match', 'live', 'halftime', 'finished', 'postponed',
    'suspended', 'abandoned', 'cancelled', 'unknown'
  )),
  status_external text check (status_external is null or char_length(status_external) <= 64),
  elapsed smallint check (elapsed is null or elapsed between 0 and 180),
  goals_home smallint check (goals_home is null or goals_home between 0 and 99),
  goals_away smallint check (goals_away is null or goals_away between 0 and 99),
  venue_name text check (venue_name is null or char_length(venue_name) <= 180),
  venue_city text check (venue_city is null or char_length(venue_city) <= 120),
  events jsonb not null default '[]'::jsonb check (jsonb_typeof(events) = 'array'),
  lineups jsonb not null default '[]'::jsonb check (jsonb_typeof(lineups) = 'array'),
  statistics jsonb not null default '[]'::jsonb check (jsonb_typeof(statistics) = 'array'),
  player_statistics jsonb not null default '[]'::jsonb check (jsonb_typeof(player_statistics) = 'array'),
  provider_fetched_at timestamptz not null,
  is_public boolean not null default false,
  publication_rights_confirmed boolean not null default false,
  publication_rights_source text check (
    publication_rights_source is null or char_length(btrim(publication_rights_source)) between 1 and 120
  ),
  publication_rights_reference text check (
    publication_rights_reference is null or char_length(btrim(publication_rights_reference)) between 1 and 512
  ),
  publication_rights_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint football_fixtures_provider_external_unique unique (provider, provider_fixture_id),
  constraint football_fixtures_rights_audited check (
    not publication_rights_confirmed
    or (
      publication_rights_source is not null
      and publication_rights_reference is not null
      and publication_rights_checked_at is not null
    )
  )
);

create index football_fixtures_business_date_idx
  on public.football_fixtures_today (business_date, kickoff_at);
create index football_fixtures_status_idx
  on public.football_fixtures_today (status);
create index football_fixtures_kickoff_idx
  on public.football_fixtures_today (kickoff_at);
create index football_fixtures_public_stale_idx
  on public.football_fixtures_today (provider_fetched_at)
  where is_public and publication_rights_confirmed;
create unique index football_fixtures_one_public_source_per_day_idx
  on public.football_fixtures_today (business_date, fixture_id)
  where is_public and publication_rights_confirmed;

create table public.football_standings_today (
  id uuid primary key default gen_random_uuid(),
  business_date date not null,
  provider text not null check (provider in ('goal-api', 'api-football')),
  competition_id uuid not null references public.sports_competitions(id) on delete cascade,
  league_id text not null check (char_length(btrim(league_id)) between 1 and 128),
  league_name text not null check (char_length(btrim(league_name)) between 1 and 160),
  season text not null check (char_length(btrim(season)) between 1 and 32),
  standings jsonb not null check (jsonb_typeof(standings) = 'object'),
  provider_fetched_at timestamptz not null,
  is_public boolean not null default false,
  publication_rights_confirmed boolean not null default false,
  publication_rights_source text check (
    publication_rights_source is null or char_length(btrim(publication_rights_source)) between 1 and 120
  ),
  publication_rights_reference text check (
    publication_rights_reference is null or char_length(btrim(publication_rights_reference)) between 1 and 512
  ),
  publication_rights_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint football_standings_snapshot_unique
    unique (business_date, provider, competition_id, league_id, season),
  constraint football_standings_rights_audited check (
    not publication_rights_confirmed
    or (
      publication_rights_source is not null
      and publication_rights_reference is not null
      and publication_rights_checked_at is not null
    )
  )
);

create index football_standings_lookup_idx
  on public.football_standings_today (league_id, season, business_date desc);

create table public.football_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('goal-api', 'api-football')),
  operation text not null check (char_length(btrim(operation)) between 1 and 80),
  started_at timestamptz not null,
  finished_at timestamptz,
  fixture_count integer not null default 0 check (fixture_count >= 0),
  requests_used integer not null default 0 check (requests_used >= 0),
  quota_limit integer check (quota_limit is null or quota_limit >= 0),
  quota_remaining integer check (quota_remaining is null or quota_remaining >= 0),
  success boolean not null default false,
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_-]{1,64}$'),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  reason text check (reason is null or char_length(reason) <= 120),
  created_at timestamptz not null default now(),
  constraint football_sync_runs_finished_after_started
    check (finished_at is null or finished_at >= started_at)
);

create index football_sync_runs_provider_started_idx
  on public.football_sync_runs (provider, started_at desc);
create index football_sync_runs_failures_idx
  on public.football_sync_runs (started_at desc)
  where not success;

create or replace function public.set_football_snapshot_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_football_snapshot_updated_at() from public, anon, authenticated;

create trigger football_fixtures_today_updated_at
  before update on public.football_fixtures_today
  for each row execute function public.set_football_snapshot_updated_at();
create trigger football_standings_today_updated_at
  before update on public.football_standings_today
  for each row execute function public.set_football_snapshot_updated_at();

comment on table public.football_fixtures_today is
  'Snapshot diario normalizado; una fila por provider + fixture externo. Las escrituras pertenecen al worker.';
comment on table public.football_standings_today is
  'Snapshot privado de clasificación con TTL independiente; standings agrupa etapas y cuadrangulares del proveedor.';
comment on table public.football_sync_runs is
  'Auditoría operativa sin tokens ni headers; solo accesible desde el backend privado con service_role.';
comment on column public.football_fixtures_today.business_date is
  'Fecha de negocio calculada por el worker en America/Bogota, no por el timezone del cliente.';

create or replace function public.validar_mapping_snapshot_fixture_futbol()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.sports_provider_mappings as mapping
    where mapping.provider = new.provider
      and mapping.entity_type = 'fixture'
      and mapping.external_id = new.provider_fixture_id
      and mapping.fixture_id = new.fixture_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'El snapshot requiere un mapping de proveedor al fixture canónico.';
  end if;

  if not exists (
    select 1
    from public.sports_fixtures as fixture
    join public.sports_provider_mappings as competition_mapping
      on competition_mapping.provider = new.provider
      and competition_mapping.entity_type = 'competition'
      and competition_mapping.external_id = new.league_id
      and competition_mapping.competition_id = fixture.competition_id
    join public.sports_provider_mappings as home_mapping
      on home_mapping.provider = new.provider
      and home_mapping.entity_type = 'team'
      and home_mapping.external_id = new.home_team_provider_id
      and home_mapping.team_id = fixture.home_team_id
    join public.sports_provider_mappings as away_mapping
      on away_mapping.provider = new.provider
      and away_mapping.entity_type = 'team'
      and away_mapping.external_id = new.away_team_provider_id
      and away_mapping.team_id = fixture.away_team_id
    where fixture.id = new.fixture_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Los equipos o la competición del snapshot no coinciden con el fixture canónico.';
  end if;
  return new;
end;
$$;

revoke all on function public.validar_mapping_snapshot_fixture_futbol() from public, anon, authenticated, service_role;

create trigger football_fixture_mapping_guard
  before insert or update of provider, provider_fixture_id, fixture_id, league_id, home_team_provider_id, away_team_provider_id
  on public.football_fixtures_today
  for each row execute function public.validar_mapping_snapshot_fixture_futbol();

create or replace function public.validar_mapping_snapshot_standings_futbol()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.sports_provider_mappings as mapping
    where mapping.provider = new.provider
      and mapping.entity_type = 'competition'
      and mapping.external_id = new.league_id
      and mapping.competition_id = new.competition_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'El snapshot requiere un mapping de proveedor a la competencia canónica.';
  end if;
  return new;
end;
$$;

revoke all on function public.validar_mapping_snapshot_standings_futbol() from public, anon, authenticated, service_role;

create trigger football_standings_mapping_guard
  before insert or update of provider, league_id, competition_id
  on public.football_standings_today
  for each row execute function public.validar_mapping_snapshot_standings_futbol();

alter table public.football_fixtures_today enable row level security;
alter table public.football_standings_today enable row level security;
alter table public.football_sync_runs enable row level security;

create policy football_fixtures_approved_snapshot_read
  on public.football_fixtures_today for select to anon, authenticated
  using (
    is_public
    and publication_rights_confirmed
    and exists (
      select 1 from public.sports_fixtures as fixture
      join public.sports_competitions as competition on competition.id = fixture.competition_id
      join public.sports_teams as home_team on home_team.id = fixture.home_team_id
      join public.sports_teams as away_team on away_team.id = fixture.away_team_id
      where fixture.id = public.football_fixtures_today.fixture_id
        and fixture.is_public
        and competition.is_public
        and home_team.is_public
        and away_team.is_public
    )
    and exists (
      select 1 from public.sports_provider_mappings as mapping
      where mapping.provider = public.football_fixtures_today.provider
        and mapping.entity_type = 'fixture'
        and mapping.external_id = public.football_fixtures_today.provider_fixture_id
        and mapping.fixture_id = public.football_fixtures_today.fixture_id
    )
    and exists (
      select 1
      from public.sports_fixtures as fixture
      join public.sports_provider_mappings as competition_mapping
        on competition_mapping.provider = public.football_fixtures_today.provider
        and competition_mapping.entity_type = 'competition'
        and competition_mapping.external_id = public.football_fixtures_today.league_id
        and competition_mapping.competition_id = fixture.competition_id
      join public.sports_provider_mappings as home_mapping
        on home_mapping.provider = public.football_fixtures_today.provider
        and home_mapping.entity_type = 'team'
        and home_mapping.external_id = public.football_fixtures_today.home_team_provider_id
        and home_mapping.team_id = fixture.home_team_id
      join public.sports_provider_mappings as away_mapping
        on away_mapping.provider = public.football_fixtures_today.provider
        and away_mapping.entity_type = 'team'
        and away_mapping.external_id = public.football_fixtures_today.away_team_provider_id
        and away_mapping.team_id = fixture.away_team_id
      where fixture.id = public.football_fixtures_today.fixture_id
    )
  );
create policy football_standings_approved_snapshot_read
  on public.football_standings_today for select to anon, authenticated
  using (
    is_public
    and publication_rights_confirmed
    and exists (
      select 1 from public.sports_competitions as competition
      where competition.id = public.football_standings_today.competition_id
        and competition.is_public
    )
    and exists (
      select 1 from public.sports_provider_mappings as mapping
      where mapping.provider = public.football_standings_today.provider
        and mapping.entity_type = 'competition'
        and mapping.external_id = public.football_standings_today.league_id
        and mapping.competition_id = public.football_standings_today.competition_id
    )
  );

-- Public clients can read only scalar presentation fields. Raw nested provider
-- payloads, standings JSON, provider IDs/logos, rights evidence and operational
-- logs remain private; a server endpoint must project an allowlisted response.
revoke all privileges on table public.football_fixtures_today,
  public.football_standings_today,
  public.football_sync_runs
from public, anon, authenticated;

grant select (
  id, business_date, kickoff_at, league_name, league_country, season, round, phase, group_name,
  home_team_name, away_team_name, status, elapsed, goals_home, goals_away,
  venue_name, venue_city, provider_fetched_at,
  is_public, created_at, updated_at
) on public.football_fixtures_today to anon, authenticated;

grant select (
  id, business_date, league_name, season, provider_fetched_at, is_public, created_at, updated_at
) on public.football_standings_today to anon, authenticated;

grant select, insert, update, delete on public.football_fixtures_today,
  public.football_standings_today,
  public.football_sync_runs to service_role;
