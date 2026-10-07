-- Conserva clasificaciones finales como snapshots de solo inserción. La tabla
-- operativa sigue siendo la fuente de posiciones actuales; los cierres no se
-- reemplazan cuando el proveedor actualiza temporadas posteriores.
create table public.colombian_league_standings_snapshots (
  competition_slug text not null check (competition_slug in ('liga-betplay', 'torneo-betplay')),
  season text not null check (season ~ '^20[0-9]{2}-(I|II)$'),
  phase text not null check (phase in ('Todos contra todos', 'Fase todos contra todos')),
  team_count smallint not null check (team_count in (16, 20)),
  matches_per_team smallint not null check (matches_per_team between 1 and 80),
  standings jsonb not null check (
    pg_catalog.jsonb_typeof(standings) = 'array'
    and pg_catalog.jsonb_array_length(standings) = team_count
  ),
  source_name text not null check (pg_catalog.length(pg_catalog.btrim(source_name)) between 1 and 120),
  source_urls text[] not null check (
    pg_catalog.cardinality(source_urls) between 1 and 8
    and pg_catalog.array_position(source_urls, null) is null
  ),
  checked_at timestamptz not null,
  finalized_at timestamptz not null,
  is_public boolean not null default false,
  publication_rights_confirmed boolean not null default false,
  primary key (competition_slug, season, phase),
  check ((competition_slug = 'liga-betplay' and team_count = 20 and phase = 'Todos contra todos')
    or (competition_slug = 'torneo-betplay' and team_count = 16 and phase = 'Fase todos contra todos'))
);

comment on table public.colombian_league_standings_snapshots is
  'Clasificaciones finales inmutables por temporada. El proveedor actualiza public.colombian_league_standings, nunca estos cierres.';

alter table public.colombian_league_standings_snapshots enable row level security;
revoke all privileges on public.colombian_league_standings_snapshots from public, anon, authenticated, service_role;
grant select on public.colombian_league_standings_snapshots to anon, authenticated, service_role;

create policy "Public can read authorized final standings snapshots"
  on public.colombian_league_standings_snapshots
  for select to anon, authenticated
  using (is_public is true and publication_rights_confirmed is true);

create or replace function private.guardar_snapshot_final_tabla_dimayor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  grupo record;
  cantidad_esperada integer;
  partidos_esperados integer;
begin
  for grupo in
    select distinct actualizadas.competition_slug, actualizadas.season, actualizadas.phase
    from new_rows as actualizadas
    where actualizadas.competition_slug in ('liga-betplay', 'torneo-betplay')
      and actualizadas.phase in ('Todos contra todos', 'Fase todos contra todos')
  loop
    cantidad_esperada := case grupo.competition_slug
      when 'liga-betplay' then 20
      when 'torneo-betplay' then 16
      else 0
    end;
    partidos_esperados := case grupo.competition_slug
      when 'liga-betplay' then 19
      when 'torneo-betplay' then 15
      else 0
    end;

    if (select pg_catalog.count(*) from new_rows as actualizadas
        where actualizadas.competition_slug = grupo.competition_slug
          and actualizadas.season = grupo.season
          and actualizadas.phase = grupo.phase) <> cantidad_esperada
      or (select pg_catalog.count(*) from public.colombian_league_standings as tabla
          where tabla.competition_slug = grupo.competition_slug
            and tabla.season = grupo.season
            and tabla.phase = grupo.phase
            and tabla.is_public is true
            and tabla.publication_rights_confirmed is true) <> cantidad_esperada
      or exists (
        select 1 from public.colombian_league_standings as tabla
        where tabla.competition_slug = grupo.competition_slug
          and tabla.season = grupo.season
          and tabla.phase = grupo.phase
          and (tabla.is_public is not true
            or tabla.publication_rights_confirmed is not true
            or tabla.source_name is distinct from 'DIMAYOR'
            or tabla.source_url is distinct from case grupo.competition_slug
              when 'liga-betplay' then 'https://dimayor.com.co/liga-betplay-dimayor/'
              when 'torneo-betplay' then 'https://dimayor.com.co/torneo-betplay-dimayor/'
              else null end
            or tabla.position < 1 or tabla.position > cantidad_esperada
            or tabla.checked_at > pg_catalog.now()
            or tabla.played <> partidos_esperados
            or tabla.won + tabla.drawn + tabla.lost <> tabla.played
            or tabla.goals_for - tabla.goals_against <> tabla.goal_difference
            or tabla.points <> tabla.won * 3 + tabla.drawn)
      )
      or (select pg_catalog.count(distinct tabla.position)
          from public.colombian_league_standings as tabla
          where tabla.competition_slug = grupo.competition_slug
            and tabla.season = grupo.season
            and tabla.phase = grupo.phase
            and tabla.is_public is true
            and tabla.publication_rights_confirmed is true) <> cantidad_esperada
      or (select pg_catalog.count(distinct tabla.team_key)
          from public.colombian_league_standings as tabla
          where tabla.competition_slug = grupo.competition_slug
            and tabla.season = grupo.season
            and tabla.phase = grupo.phase
            and tabla.is_public is true
            and tabla.publication_rights_confirmed is true) <> cantidad_esperada
      or (select pg_catalog.count(distinct public.editorial_normalizar_clave_equipo(tabla.team_name))
          from public.colombian_league_standings as tabla
          where tabla.competition_slug = grupo.competition_slug
            and tabla.season = grupo.season
            and tabla.phase = grupo.phase
            and tabla.is_public is true
            and tabla.publication_rights_confirmed is true) <> cantidad_esperada then
      continue;
    end if;

    insert into public.colombian_league_standings_snapshots (
      competition_slug, season, phase, team_count, matches_per_team,
      standings, source_name, source_urls, checked_at, finalized_at,
      is_public, publication_rights_confirmed
    )
    select
      grupo.competition_slug,
      grupo.season,
      grupo.phase,
      cantidad_esperada,
      partidos_esperados,
      pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'team_name', tabla.team_name,
        'position', tabla.position,
        'played', tabla.played,
        'won', tabla.won,
        'drawn', tabla.drawn,
        'lost', tabla.lost,
        'goals_for', tabla.goals_for,
        'goals_against', tabla.goals_against,
        'goal_difference', tabla.goal_difference,
        'points', tabla.points
      ) order by tabla.position),
      'DIMAYOR',
      pg_catalog.array_agg(distinct tabla.source_url),
      pg_catalog.max(tabla.checked_at),
      pg_catalog.max(tabla.checked_at),
      true,
      true
    from public.colombian_league_standings as tabla
    where tabla.competition_slug = grupo.competition_slug
      and tabla.season = grupo.season
      and tabla.phase = grupo.phase
      and tabla.is_public is true
      and tabla.publication_rights_confirmed is true
    on conflict (competition_slug, season, phase) do nothing;
  end loop;
  return null;
end;
$$;

revoke all on function private.guardar_snapshot_final_tabla_dimayor() from public, anon, authenticated, service_role;
create trigger guardar_snapshot_final_tabla_dimayor
  after update on public.colombian_league_standings
  referencing new table as new_rows
  for each statement
  execute function private.guardar_snapshot_final_tabla_dimayor();

-- Backfill único 2026-I desde los resultados completos autorizados guardados en
-- la base. El feed omitió Boca Juniors 0-2 Barranquilla; se suma solo ese
-- marcador verificado en Win Sports y el fixture de DIMAYOR. No se edita el feed.
with partidos_base as (
  select fixture.competition_slug, fixture.home_team, fixture.away_team,
    fixture.goals_home, fixture.goals_away, fixture.scheduled_at
  from public.colombian_league_fixtures as fixture
  where fixture.season = '2026-I'
    and fixture.competition_slug in ('liga-betplay', 'torneo-betplay')
    and fixture.status = 'finished'
    and fixture.goals_home is not null
    and fixture.goals_away is not null
    and fixture.source_name = 'Goal API'
    and fixture.source_url = 'https://goal-api.com/documentation'
    and fixture.is_public is true
    and fixture.publication_rights_confirmed is true
    and fixture.checked_at <= pg_catalog.now()
    and ((fixture.competition_slug = 'liga-betplay'
      and fixture.round_name ~ '^[0-9]+$'
      and fixture.round_name::integer between 1 and 19)
      or (fixture.competition_slug = 'torneo-betplay'
        and fixture.round_name ~ '^[0-9]+$'
        and fixture.scheduled_at < timestamptz '2026-04-19 00:00:00-05'))
), partidos as (
  select * from partidos_base
  union all
  select 'torneo-betplay', 'Boca Juniors de Cali', 'Barranquilla', 0::smallint, 2::smallint,
    timestamptz '2026-02-27 00:30:00+00'
  where not exists (
    select 1 from partidos_base as partido
    where partido.competition_slug = 'torneo-betplay'
      and public.editorial_normalizar_clave_equipo(partido.home_team) = 'boca juniors de cali'
      and public.editorial_normalizar_clave_equipo(partido.away_team) = 'barranquilla fc'
  )
), partidos_con_nombres_oficiales as (
  select competition_slug,
    case when competition_slug = 'liga-betplay'
      and public.editorial_normalizar_clave_equipo(home_team) = 'la equidad'
      then 'Internacional de Bogotá' else home_team end as home_team,
    case when competition_slug = 'liga-betplay'
      and public.editorial_normalizar_clave_equipo(away_team) = 'la equidad'
      then 'Internacional de Bogotá' else away_team end as away_team,
    goals_home, goals_away, scheduled_at
  from partidos
), juegos_equipo as (
  select competition_slug, home_team as team_name, away_team as opponent,
    goals_home as goals_for, goals_away as goals_against, true as es_local
  from partidos_con_nombres_oficiales
  union all
  select competition_slug, away_team, home_team, goals_away, goals_home, false
  from partidos_con_nombres_oficiales
), estadisticas as (
  select competition_slug, team_name,
    pg_catalog.count(*)::smallint as played,
    pg_catalog.count(distinct opponent)::smallint as unique_opponents,
    pg_catalog.sum((goals_for > goals_against)::integer)::smallint as won,
    pg_catalog.sum((goals_for = goals_against)::integer)::smallint as drawn,
    pg_catalog.sum((goals_for < goals_against)::integer)::smallint as lost,
    pg_catalog.sum(goals_for)::smallint as goals_for,
    pg_catalog.sum(goals_against)::smallint as goals_against,
    pg_catalog.sum(goals_for - goals_against)::smallint as goal_difference,
    (3 * pg_catalog.sum((goals_for > goals_against)::integer)
      + pg_catalog.sum((goals_for = goals_against)::integer))::smallint as points,
    pg_catalog.sum(case when es_local then 0 else goals_for end)::smallint as away_goals_for,
    pg_catalog.sum(case when es_local then 0 else goals_against end)::smallint as away_goals_against
  from juegos_equipo
  group by competition_slug, team_name
), conteos_partidos as (
  select competition_slug, pg_catalog.count(*) as cantidad,
    pg_catalog.count(distinct row(
      least(public.editorial_normalizar_clave_equipo(home_team), public.editorial_normalizar_clave_equipo(away_team)),
      greatest(public.editorial_normalizar_clave_equipo(home_team), public.editorial_normalizar_clave_equipo(away_team))
    )) as parejas_unicas
  from partidos_con_nombres_oficiales
  group by competition_slug
), posiciones as (
  select estadisticas.*,
    pg_catalog.row_number() over (
      partition by estadisticas.competition_slug
      order by estadisticas.points desc, estadisticas.goal_difference desc,
        estadisticas.goals_for desc, estadisticas.away_goals_for desc,
        estadisticas.away_goals_against asc, estadisticas.team_name asc
    )::smallint as position
  from estadisticas
)
insert into public.colombian_league_standings_snapshots (
  competition_slug, season, phase, team_count, matches_per_team,
  standings, source_name, source_urls, checked_at, finalized_at,
  is_public, publication_rights_confirmed
)
select posicion.competition_slug,
  '2026-I',
  case posicion.competition_slug when 'liga-betplay' then 'Todos contra todos' else 'Fase todos contra todos' end,
  case posicion.competition_slug when 'liga-betplay' then 20 else 16 end,
  case posicion.competition_slug when 'liga-betplay' then 19 else 15 end,
  pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'team_name', posicion.team_name,
    'position', posicion.position,
    'played', posicion.played,
    'won', posicion.won,
    'drawn', posicion.drawn,
    'lost', posicion.lost,
    'goals_for', posicion.goals_for,
    'goals_against', posicion.goals_against,
    'goal_difference', posicion.goal_difference,
    'points', posicion.points
  ) order by posicion.position),
  case posicion.competition_slug when 'liga-betplay' then 'Goal API + DIMAYOR' else 'Goal API + DIMAYOR + Win Sports' end,
  case posicion.competition_slug
    when 'liga-betplay' then array[
      'https://goal-api.com/documentation',
      'https://dimayor.com.co/2026/05/03/definidos-los-clasificados-a-los-cuartos-de-final-de-la-liga-betplay-dimayor-l-2026/',
      'https://dimayor.com.co/wp-content/uploads/2026/01/REGLAMENTO-LIGA-2026-V12.pdf'
    ]::text[]
    else array[
      'https://goal-api.com/documentation',
      'https://dimayor.com.co/2026/04/19/definidos-los-clasificados-a-los-cuadrangulares-semifinales-del-torneo-betplay-dimayor-l-2026/',
      'https://dimayor.com.co/wp-content/uploads/2026/04/REGLAMENTO-TORNEO-2026-V3.pdf',
      'https://dimayor.com.co/2026/02/25/designaciones-arbitrales-fecha-7-torneo-betplay-dimayor-l-2026/',
      'https://www.winsports.co/futbol-colombiano/torneo-dimayor/partidos/2026-apertura-fecha-7-boca-juniors-de-cali-vs-barranquilla'
    ]::text[]
  end,
  pg_catalog.now(),
  case posicion.competition_slug
    when 'liga-betplay' then timestamptz '2026-05-03 23:59:59-05'
    else timestamptz '2026-04-19 23:59:59-05'
  end,
  true,
  true
from posiciones as posicion
join conteos_partidos as conteo using (competition_slug)
group by posicion.competition_slug, conteo.cantidad, conteo.parejas_unicas
having pg_catalog.count(*) = case posicion.competition_slug when 'liga-betplay' then 20 else 16 end
  and conteo.cantidad = case posicion.competition_slug when 'liga-betplay' then 190 else 120 end
  and conteo.parejas_unicas = conteo.cantidad
  and pg_catalog.bool_and(posicion.unique_opponents = case posicion.competition_slug when 'liga-betplay' then 19 else 15 end)
  and pg_catalog.bool_and(posicion.played = case posicion.competition_slug when 'liga-betplay' then 19 else 15 end)
  and pg_catalog.count(distinct (posicion.points, posicion.goal_difference, posicion.goals_for,
    posicion.away_goals_for, posicion.away_goals_against)) = pg_catalog.count(*)
  and pg_catalog.count(distinct posicion.position) = pg_catalog.count(*)
on conflict (competition_slug, season, phase) do nothing;

do $$
begin
  if (select pg_catalog.count(*) from public.colombian_league_standings_snapshots
      where season = '2026-I' and competition_slug in ('liga-betplay', 'torneo-betplay')
        and is_public is true and publication_rights_confirmed is true) <> 2 then
    raise exception 'No se pudieron validar los dos snapshots completos de 2026-I; no publicar esta migración sin reconciliar la fuente.';
  end if;
end;
$$;
