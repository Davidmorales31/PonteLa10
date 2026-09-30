-- HU-TR-17: identidad inmutable y explícita de partidos para sus URLs públicas.
-- El slug se asigna al aprobar el fixture; scheduled_at puede cambiar si se
-- reprograma el encuentro, pero el slug aprobado no.

create table public.sports_fixtures (
  id uuid primary key default gen_random_uuid(),
  sport_code text not null default 'futbol' check (sport_code = 'futbol'),
  slug text not null,
  competition_id uuid not null references public.sports_competitions(id) on delete restrict,
  home_team_id uuid not null references public.sports_teams(id) on delete restrict,
  away_team_id uuid not null references public.sports_teams(id) on delete restrict,
  scheduled_at timestamptz not null,
  is_public boolean not null default false,
  canonical_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sports_fixtures_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint sports_fixtures_slug_unique unique (slug),
  constraint sports_fixtures_distinct_teams check (home_team_id <> away_team_id)
);

create index sports_fixtures_competition_date_idx
  on public.sports_fixtures (competition_id, scheduled_at desc);
create index sports_fixtures_home_team_date_idx
  on public.sports_fixtures (home_team_id, scheduled_at desc);
create index sports_fixtures_away_team_date_idx
  on public.sports_fixtures (away_team_id, scheduled_at desc);

create or replace function public.protect_published_sports_fixture_slug()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.canonical_published_at is not null then
      if new.slug is distinct from old.slug then
        raise exception using
          errcode = '23514',
          message = 'El slug de un partido publicado es inmutable.';
      end if;
      new.canonical_published_at := old.canonical_published_at;
    end if;
  end if;

  if new.is_public and new.canonical_published_at is null then
    new.canonical_published_at := pg_catalog.now();
  end if;

  return new;
end;
$$;

revoke all on function public.protect_published_sports_fixture_slug() from public, anon, authenticated;

create trigger sports_fixtures_updated_at
  before update on public.sports_fixtures
  for each row execute function public.set_sports_entity_updated_at();
create trigger sports_fixtures_slug_immutable
  before insert or update on public.sports_fixtures
  for each row execute function public.protect_published_sports_fixture_slug();

comment on table public.sports_fixtures is
  'Identidad interna curada de fixture; su slug publicado no cambia si el partido se reprograma.';
comment on column public.sports_fixtures.slug is
  'Slug canónico asignado una sola vez al publicar, normalmente local-vs-visitante-fecha-inicial.';

alter table public.sports_fixtures enable row level security;

create policy sports_fixtures_approved_read
  on public.sports_fixtures for select to anon, authenticated
  using (
    is_public
    and exists (
      select 1 from public.sports_competitions as competition
      where competition.id = competition_id and competition.is_public
    )
    and exists (
      select 1 from public.sports_teams as home_team
      where home_team.id = home_team_id and home_team.is_public
    )
    and exists (
      select 1 from public.sports_teams as away_team
      where away_team.id = away_team_id and away_team.is_public
    )
  );

alter table public.sports_provider_mappings
  drop constraint sports_provider_mappings_target_matches_type;
alter table public.sports_provider_mappings
  add column fixture_id uuid references public.sports_fixtures(id) on delete restrict;
alter table public.sports_provider_mappings
  add constraint sports_provider_mappings_target_matches_type check (
    (entity_type = 'competition' and competition_id is not null and team_id is null and player_id is null and fixture_id is null)
    or (entity_type = 'team' and competition_id is null and team_id is not null and player_id is null and fixture_id is null)
    or (entity_type = 'player' and competition_id is null and team_id is null and player_id is not null and fixture_id is null)
    or (entity_type = 'fixture' and competition_id is null and team_id is null and player_id is null and fixture_id is not null)
  );
alter table public.sports_provider_mappings
  drop constraint sports_provider_mappings_entity_type_check;
alter table public.sports_provider_mappings
  add constraint sports_provider_mappings_entity_type_check
  check (entity_type in ('competition', 'team', 'player', 'fixture'));

create index sports_provider_mappings_fixture_idx
  on public.sports_provider_mappings (fixture_id)
  where fixture_id is not null;
create unique index sports_provider_mappings_fixture_provider_unique
  on public.sports_provider_mappings (provider, fixture_id)
  where entity_type = 'fixture' and fixture_id is not null;

drop policy sports_provider_mappings_approved_read on public.sports_provider_mappings;
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
      when 'fixture' then exists (
        select 1 from public.sports_fixtures as fixture
        where fixture.id = fixture_id and fixture.is_public
      )
      else false
    end
  );

revoke all privileges on table public.sports_fixtures from public, anon, authenticated;
grant select (id, sport_code, slug, competition_id, home_team_id, away_team_id, scheduled_at, is_public)
  on public.sports_fixtures to anon, authenticated;
grant select (provider, entity_type, external_id, competition_id, team_id, player_id, fixture_id)
  on public.sports_provider_mappings to anon, authenticated;
grant select, insert, update, delete on table public.sports_fixtures to service_role;
grant select, insert, update, delete on table public.sports_provider_mappings to service_role;
