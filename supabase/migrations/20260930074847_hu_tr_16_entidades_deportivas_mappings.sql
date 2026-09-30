-- HU-TR-16: identidad interna estable. No se persisten escudos ni payloads de
-- proveedor; ninguna entidad queda visible públicamente hasta su aprobación.

create table public.sports_competitions (
  id uuid primary key default gen_random_uuid(),
  sport_code text not null default 'futbol' check (sport_code = 'futbol'),
  slug text not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_competitions_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint sports_competitions_slug_unique unique (sport_code, slug)
);

create table public.sports_teams (
  id uuid primary key default gen_random_uuid(),
  sport_code text not null default 'futbol' check (sport_code = 'futbol'),
  slug text not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  short_name text check (short_name is null or char_length(btrim(short_name)) between 1 and 48),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_teams_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint sports_teams_slug_unique unique (sport_code, slug)
);

create table public.sports_players (
  id uuid primary key default gen_random_uuid(),
  sport_code text not null default 'futbol' check (sport_code = 'futbol'),
  slug text not null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_players_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint sports_players_slug_unique unique (sport_code, slug)
);

create table public.sports_player_memberships (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.sports_players(id) on delete restrict,
  team_id uuid not null references public.sports_teams(id) on delete restrict,
  position text check (position is null or char_length(btrim(position)) between 1 and 48),
  jersey_number smallint check (jersey_number is null or jersey_number between 1 and 99),
  valid_from date,
  valid_until date,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_player_memberships_valid_period check (
    valid_from is null or valid_until is null or valid_until >= valid_from
  )
);

create index sports_player_memberships_player_idx
  on public.sports_player_memberships (player_id, valid_from desc);
create index sports_player_memberships_team_idx
  on public.sports_player_memberships (team_id, valid_from desc);

create table public.sports_provider_mappings (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  entity_type text not null check (entity_type in ('competition', 'team', 'player')),
  external_id text not null check (
    external_id = btrim(external_id)
    and char_length(external_id) between 1 and 128
    and external_id !~ '[[:cntrl:]]'
  ),
  competition_id uuid references public.sports_competitions(id) on delete restrict,
  team_id uuid references public.sports_teams(id) on delete restrict,
  player_id uuid references public.sports_players(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_provider_mappings_target_matches_type check (
    (entity_type = 'competition' and competition_id is not null and team_id is null and player_id is null)
    or (entity_type = 'team' and competition_id is null and team_id is not null and player_id is null)
    or (entity_type = 'player' and competition_id is null and team_id is null and player_id is not null)
  ),
  constraint sports_provider_mappings_external_unique unique (provider, entity_type, external_id)
);

create index sports_provider_mappings_competition_idx
  on public.sports_provider_mappings (competition_id)
  where competition_id is not null;
create index sports_provider_mappings_team_idx
  on public.sports_provider_mappings (team_id)
  where team_id is not null;
create index sports_provider_mappings_player_idx
  on public.sports_provider_mappings (player_id)
  where player_id is not null;

create or replace function public.set_sports_entity_updated_at()
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

revoke all on function public.set_sports_entity_updated_at() from public, anon, authenticated;

create trigger sports_competitions_updated_at
  before update on public.sports_competitions
  for each row execute function public.set_sports_entity_updated_at();
create trigger sports_teams_updated_at
  before update on public.sports_teams
  for each row execute function public.set_sports_entity_updated_at();
create trigger sports_players_updated_at
  before update on public.sports_players
  for each row execute function public.set_sports_entity_updated_at();
create trigger sports_player_memberships_updated_at
  before update on public.sports_player_memberships
  for each row execute function public.set_sports_entity_updated_at();
create trigger sports_provider_mappings_updated_at
  before update on public.sports_provider_mappings
  for each row execute function public.set_sports_entity_updated_at();

comment on table public.sports_provider_mappings is
  'Vincula provider + entity_type + external_id de forma explícita; IDs de proveedores distintos nunca se fusionan por nombre.';
comment on table public.sports_teams is
  'Catálogo interno de fútbol; el UUID y slug se mantienen aunque cambie el nombre externo.';

alter table public.sports_competitions enable row level security;
alter table public.sports_teams enable row level security;
alter table public.sports_players enable row level security;
alter table public.sports_player_memberships enable row level security;
alter table public.sports_provider_mappings enable row level security;

create policy sports_competitions_approved_read
  on public.sports_competitions for select to anon, authenticated
  using (is_public);

create policy sports_teams_approved_read
  on public.sports_teams for select to anon, authenticated
  using (is_public);

create policy sports_players_approved_read
  on public.sports_players for select to anon, authenticated
  using (is_public);

create policy sports_player_memberships_approved_read
  on public.sports_player_memberships for select to anon, authenticated
  using (
    is_public
    and exists (
      select 1 from public.sports_players as player
      where player.id = player_id and player.is_public
    )
    and exists (
      select 1 from public.sports_teams as team
      where team.id = team_id and team.is_public
    )
  );

create policy sports_provider_mappings_approved_read
  on public.sports_provider_mappings for select to anon, authenticated
  using (
    case entity_type
      when 'competition' then exists (
        select 1 from public.sports_competitions as competition
        where competition.id = competition_id and competition.is_public
      )
      when 'team' then exists (
        select 1 from public.sports_teams as team
        where team.id = team_id and team.is_public
      )
      when 'player' then exists (
        select 1 from public.sports_players as player
        where player.id = player_id and player.is_public
      )
      else false
    end
  );

-- No public writes. service_role remains a server-only path and bypasses RLS;
-- no client bundle or public route receives that key in this change.
revoke all privileges on table public.sports_competitions,
  public.sports_teams,
  public.sports_players,
  public.sports_player_memberships,
  public.sports_provider_mappings
from public, anon, authenticated;

grant select (id, sport_code, slug, name, country_code, is_public)
  on public.sports_competitions to anon, authenticated;
grant select (id, sport_code, slug, name, short_name, country_code, is_public)
  on public.sports_teams to anon, authenticated;
grant select (id, sport_code, slug, display_name, country_code, is_public)
  on public.sports_players to anon, authenticated;
grant select (id, player_id, team_id, position, jersey_number, valid_from, valid_until, is_public)
  on public.sports_player_memberships to anon, authenticated;
grant select (provider, entity_type, external_id, competition_id, team_id, player_id)
  on public.sports_provider_mappings to anon, authenticated;

grant select, insert, update, delete on table public.sports_competitions,
  public.sports_teams,
  public.sports_players,
  public.sports_player_memberships,
  public.sports_provider_mappings
to service_role;
