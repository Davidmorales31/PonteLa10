-- Publica una fase completa de la tabla oficial y solo toca filas con derechos
-- expresamente confirmados. La función es la única escritura expuesta al worker.
create table private.dimayor_standings_sync_state (
  singleton boolean primary key default true check (singleton),
  claim_token uuid,
  claimed_at timestamptz,
  completed_at timestamptz,
  check ((claim_token is null) = (claimed_at is null))
);

insert into private.dimayor_standings_sync_state (singleton) values (true);
alter table private.dimayor_standings_sync_state enable row level security;
revoke all privileges on private.dimayor_standings_sync_state from public, anon, authenticated, service_role;

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
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('dimayor_standings_sync', 0)
  );
  select state.claim_token, state.claimed_at, state.completed_at
    into token, reclamado, completado
  from private.dimayor_standings_sync_state as state
  where state.singleton is true
  for update;

  if completado > ahora - interval '15 minutes'
    or (token is not null and reclamado > ahora - interval '2 minutes') then
    return null;
  end if;

  token := pg_catalog.gen_random_uuid();
  update private.dimayor_standings_sync_state
  set claim_token = token, claimed_at = ahora
  where singleton is true;
  return token;
end;
$$;

create or replace function public.release_dimayor_standings_sync(p_claim_token uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_claim_token is null then return false; end if;
  update private.dimayor_standings_sync_state
  set claim_token = null, claimed_at = null
  where singleton is true and claim_token = p_claim_token;
  return found;
end;
$$;

create or replace function public.actualizar_posiciones_liga_dimayor(
  p_claim_token uuid,
  p_actualizaciones jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  cantidad_solicitada integer;
  cantidad_actualizada integer;
  cantidad_competencias integer;
  filas_distintas integer;
  token_actual uuid;
  reclamada timestamptz;
  fecha_bogota date := (pg_catalog.now() at time zone 'America/Bogota')::date;
  temporada_activa text := pg_catalog.to_char(fecha_bogota, 'YYYY')
    || case when pg_catalog.to_char(fecha_bogota, 'MM') <= '06' then '-I' else '-II' end;
begin
  if p_claim_token is null then
    raise exception using errcode = '40001', message = 'La reserva de actualización DIMAYOR no es válida o venció.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('dimayor_standings_sync', 0)
  );
  select state.claim_token, state.claimed_at into token_actual, reclamada
  from private.dimayor_standings_sync_state as state
  where state.singleton is true
  for update;
  if token_actual is distinct from p_claim_token
    or reclamada is null
    or reclamada <= pg_catalog.now() - interval '2 minutes' then
    raise exception using errcode = '40001', message = 'La reserva de actualización DIMAYOR no es válida o venció.';
  end if;

  if p_actualizaciones is null
    or pg_catalog.jsonb_typeof(p_actualizaciones) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'La actualización de posiciones no es válida.';
  end if;
  cantidad_solicitada := pg_catalog.jsonb_array_length(p_actualizaciones);
  if cantidad_solicitada < 2 or cantidad_solicitada > 128 then
    raise exception using errcode = '22023', message = 'La actualización de posiciones no es válida.';
  end if;

  select pg_catalog.count(*), pg_catalog.count(distinct (x.competition_slug, x.season, x.phase, x.team_key)),
      pg_catalog.count(distinct x.competition_slug)
    into cantidad_solicitada, filas_distintas, cantidad_competencias
  from pg_catalog.jsonb_to_recordset(p_actualizaciones) as x(
    competition_slug text, season text, phase text, team_key text,
    position integer, played integer, won integer, drawn integer, lost integer,
    goals_for integer, goals_against integer, goal_difference integer, points integer,
    source_name text, source_url text
  );

  if cantidad_solicitada is distinct from filas_distintas
    or cantidad_competencias <> 2
    or exists (
      select 1
      from pg_catalog.jsonb_to_recordset(p_actualizaciones) as x(
        competition_slug text, season text, phase text, team_key text,
        position integer, played integer, won integer, drawn integer, lost integer,
        goals_for integer, goals_against integer, goal_difference integer, points integer,
        source_name text, source_url text
      )
      where x.competition_slug not in ('liga-betplay', 'torneo-betplay')
        or x.season is distinct from temporada_activa
        or x.phase not in ('Todos contra todos', 'Fase todos contra todos', 'Cuadrangulares',
          'Cuadrangulares · Grupo A', 'Cuadrangulares · Grupo B', 'Cuadrangulares · Grupo C',
          'Cuadrangulares · Grupo D', 'Final')
        or x.team_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        or x.position is null or x.position < 1 or x.position > 64
        or x.played is null or x.played < 0 or x.played > 80
        or x.won is null or x.won < 0 or x.won > 80
        or x.drawn is null or x.drawn < 0 or x.drawn > 80
        or x.lost is null or x.lost < 0 or x.lost > 80
        or x.won + x.drawn + x.lost <> x.played
        or x.goals_for is null or x.goals_for < 0 or x.goals_for > 999
        or x.goals_against is null or x.goals_against < 0 or x.goals_against > 999
        or x.goal_difference is null or x.goals_for - x.goals_against <> x.goal_difference
        or x.points is null or x.points < 0 or x.points > 999
        or x.source_name is distinct from 'DIMAYOR'
        or x.source_url is distinct from case x.competition_slug
          when 'liga-betplay' then 'https://dimayor.com.co/liga-betplay-dimayor/'
          when 'torneo-betplay' then 'https://dimayor.com.co/torneo-betplay-dimayor/'
          else null end
        or not exists (
          select 1 from public.colombian_league_standings as base
          where base.competition_slug = x.competition_slug
            and base.season = x.season and base.phase = x.phase and base.team_key = x.team_key
            and base.is_public is true and base.publication_rights_confirmed is true
        )
    )
    or exists (
      select 1
      from pg_catalog.jsonb_to_recordset(p_actualizaciones) as x(
        competition_slug text, season text, phase text, team_key text,
        position integer, played integer, won integer, drawn integer, lost integer,
        goals_for integer, goals_against integer, goal_difference integer, points integer,
        source_name text, source_url text
      )
      group by x.competition_slug, x.season, x.phase
      having pg_catalog.count(*) <> (
        select pg_catalog.count(*)
        from public.colombian_league_standings as base
        where base.competition_slug = x.competition_slug
          and base.season = x.season and base.phase = x.phase
          and base.is_public is true and base.publication_rights_confirmed is true
      )
        or pg_catalog.count(distinct x.position) <> pg_catalog.count(*)
        or pg_catalog.min(x.position) <> 1
        or pg_catalog.max(x.position) <> pg_catalog.count(*)
    )
    or exists (
      select 1
      from public.colombian_league_standings as base
      where base.competition_slug in ('liga-betplay', 'torneo-betplay')
        and base.season = temporada_activa
        and base.is_public is true
        and base.publication_rights_confirmed is true
        and not exists (
          select 1
          from pg_catalog.jsonb_to_recordset(p_actualizaciones) as x(
            competition_slug text, season text, phase text, team_key text,
            position integer, played integer, won integer, drawn integer, lost integer,
            goals_for integer, goals_against integer, goal_difference integer, points integer,
            source_name text, source_url text
          )
          where x.competition_slug = base.competition_slug
            and x.season = base.season
            and x.phase = base.phase
            and x.team_key = base.team_key
        )
    ) then
    raise exception using errcode = '22023', message = 'La tabla DIMAYOR debe cubrir todas las filas autorizadas de cada fase.';
  end if;

  update public.colombian_league_standings as base
  set position = x.position,
      played = x.played,
      won = x.won,
      drawn = x.drawn,
      lost = x.lost,
      goals_for = x.goals_for,
      goals_against = x.goals_against,
      goal_difference = x.goal_difference,
      points = x.points,
      source_name = 'DIMAYOR',
      source_url = x.source_url,
      checked_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  from pg_catalog.jsonb_to_recordset(p_actualizaciones) as x(
    competition_slug text, season text, phase text, team_key text,
    position integer, played integer, won integer, drawn integer, lost integer,
    goals_for integer, goals_against integer, goal_difference integer, points integer,
    source_name text, source_url text
  )
  where base.competition_slug = x.competition_slug
    and base.season = x.season and base.phase = x.phase and base.team_key = x.team_key
    and base.is_public is true and base.publication_rights_confirmed is true;
  get diagnostics cantidad_actualizada = row_count;

  if cantidad_actualizada <> cantidad_solicitada then
    raise exception using errcode = '40001', message = 'La autorización cambió durante la actualización; no se guardaron posiciones.';
  end if;

  update private.dimayor_standings_sync_state
  set claim_token = null, claimed_at = null, completed_at = pg_catalog.now()
  where singleton is true and claim_token = p_claim_token;
  if not found then
    raise exception using errcode = '40001', message = 'La reserva de actualización DIMAYOR no es válida o venció.';
  end if;
  return cantidad_actualizada;
end;
$$;

revoke all on function public.claim_dimayor_standings_sync() from public, anon, authenticated;
revoke all on function public.release_dimayor_standings_sync(uuid) from public, anon, authenticated;
revoke all on function public.actualizar_posiciones_liga_dimayor(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.claim_dimayor_standings_sync() to service_role;
grant execute on function public.release_dimayor_standings_sync(uuid) to service_role;
grant execute on function public.actualizar_posiciones_liga_dimayor(uuid, jsonb) to service_role;
comment on function public.claim_dimayor_standings_sync() is
  'Reserva DIMAYOR con token cercado, lease de dos minutos e intervalo mínimo exitoso de quince minutos. Solo service_role.';
comment on function public.release_dimayor_standings_sync(uuid) is
  'Libera exclusivamente la reserva DIMAYOR que coincide con el token entregado. Solo service_role.';
comment on function public.actualizar_posiciones_liga_dimayor(uuid, jsonb) is
  'Actualiza atómicamente fases completas desde DIMAYOR en filas existentes, públicas y con derechos confirmados, con token de lease vigente. Solo service_role.';
