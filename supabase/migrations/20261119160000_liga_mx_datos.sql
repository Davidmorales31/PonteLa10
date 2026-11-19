begin;

-- Calendario y tabla de posiciones de las ligas de los sitios distintos de Colombia.
-- Colombia conserva sus tablas (colombian_league_*), con reglas de DIMAYOR; estas son
-- genéricas y llevan el sitio. Solo el servidor privado (service_role) escribe; el público
-- lee filas marcadas como públicas con derechos de publicación confirmados.

create table if not exists public.league_fixtures (
  site text not null references public.sites(id),
  competition_slug text not null check (competition_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(competition_slug) <= 80),
  season text not null check (season ~ '^20[0-9]{2}-20[0-9]{2}$'),
  provider text not null check (provider in ('goal-api', 'api-football')),
  provider_fixture_id text not null check (provider_fixture_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(provider_fixture_id) <= 120),
  tournament text not null check (char_length(tournament) between 2 and 40),
  round_name text not null check (char_length(round_name) between 1 and 120),
  scheduled_at timestamptz not null,
  home_team text not null check (char_length(home_team) between 2 and 120),
  away_team text not null check (char_length(away_team) between 2 and 120),
  status text not null check (status in ('scheduled', 'pre-match', 'live', 'halftime', 'finished', 'postponed', 'suspended', 'abandoned', 'cancelled', 'unknown')),
  goals_home smallint check (goals_home between 0 and 99),
  goals_away smallint check (goals_away between 0 and 99),
  venue text check (venue is null or char_length(venue) <= 160),
  city text check (city is null or char_length(city) <= 120),
  source_name text not null default 'Goal API' check (char_length(source_name) between 2 and 80),
  source_url text not null default 'https://goal-api.com/documentation' check (source_url like 'https://%'),
  checked_at timestamptz not null default now(),
  is_public boolean not null default false,
  publication_rights_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint league_fixtures_distinct_teams check (home_team <> away_team),
  primary key (site, competition_slug, season, provider, provider_fixture_id)
);

create index if not exists league_fixtures_public_schedule_idx
  on public.league_fixtures (site, scheduled_at, competition_slug)
  where is_public and publication_rights_confirmed;

create table if not exists public.league_standings (
  site text not null references public.sites(id),
  competition_slug text not null check (competition_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(competition_slug) <= 80),
  season text not null check (season ~ '^20[0-9]{2}-20[0-9]{2}$'),
  phase text not null check (char_length(phase) between 2 and 80),
  team_key text not null check (team_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(team_key) <= 120),
  team_name text not null check (char_length(team_name) between 2 and 120),
  position smallint not null check (position between 1 and 64),
  played smallint not null check (played between 0 and 80),
  won smallint not null check (won between 0 and 80),
  drawn smallint not null check (drawn between 0 and 80),
  lost smallint not null check (lost between 0 and 80),
  goals_for smallint not null check (goals_for between 0 and 999),
  goals_against smallint not null check (goals_against between 0 and 999),
  goal_difference smallint not null check (goal_difference between -999 and 999),
  points smallint not null check (points between -99 and 999),
  source_name text not null default 'Goal API' check (char_length(source_name) between 2 and 80),
  source_url text not null default 'https://goal-api.com/documentation' check (source_url like 'https://%'),
  checked_at timestamptz not null default now(),
  is_public boolean not null default false,
  publication_rights_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (site, competition_slug, season, phase, team_key)
);

create index if not exists league_standings_public_idx
  on public.league_standings (site, competition_slug, season, phase, position)
  where is_public and publication_rights_confirmed;

alter table public.league_fixtures enable row level security;
alter table public.league_standings enable row level security;

revoke all privileges on public.league_fixtures, public.league_standings from public, anon, authenticated;
grant select on public.league_fixtures, public.league_standings to anon, authenticated;
grant select, insert, update, delete on public.league_fixtures, public.league_standings to service_role;

drop policy if exists "public can read published league fixtures" on public.league_fixtures;
create policy "public can read published league fixtures"
  on public.league_fixtures for select to anon, authenticated
  using (is_public and publication_rights_confirmed);

drop policy if exists "public can read published league standings" on public.league_standings;
create policy "public can read published league standings"
  on public.league_standings for select to anon, authenticated
  using (is_public and publication_rights_confirmed);

commit;
