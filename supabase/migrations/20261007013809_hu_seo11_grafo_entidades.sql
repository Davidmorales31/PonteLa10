begin;

create table public.editorial_article_entity_relations (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  entity_type text not null check (entity_type in ('article', 'match', 'team', 'player', 'competition')),
  entity_slug text not null check (
    char_length(entity_slug) between 1 and 120
    and entity_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  entity_name text not null check (char_length(btrim(entity_name)) between 1 and 160),
  relation_type text not null default 'related'
    check (relation_type in ('about', 'mentions', 'related')),
  status text not null default 'confirmed'
    check (status in ('confirmed', 'rejected')),
  source text not null default 'editorial'
    check (source in ('automatic', 'editorial')),
  confidence numeric(4, 3) check (confidence is null or confidence between 0 and 1),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_article_entity_relations_unique
    unique (article_id, entity_type, entity_slug)
);

create index editorial_article_entity_relations_public_idx
  on public.editorial_article_entity_relations (article_id, entity_type, entity_slug)
  where status = 'confirmed';

create index editorial_article_entity_relations_target_idx
  on public.editorial_article_entity_relations (entity_type, entity_slug, article_id)
  where status = 'confirmed';

create or replace function public.audit_editorial_article_entity_relation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  elsif old.status is distinct from new.status
    or old.entity_name is distinct from new.entity_name
    or old.relation_type is distinct from new.relation_type then
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  end if;

  if new.entity_type = 'article'
    and exists (
      select 1
      from public.articles as source_article
      left join public.article_versions as published_version
        on published_version.id = source_article.published_version_id
      where source_article.id = new.article_id
        and (
          source_article.slug = new.entity_slug
          or published_version.snapshot ->> 'slug' = new.entity_slug
        )
    ) then
    raise exception using
      errcode = '23514',
      message = 'Una publicación no puede relacionarse consigo misma.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger editorial_article_entity_relations_audit
  before insert or update on public.editorial_article_entity_relations
  for each row execute function public.audit_editorial_article_entity_relation();

revoke all on function public.audit_editorial_article_entity_relation()
  from public, anon, authenticated, service_role;

alter table public.editorial_article_entity_relations enable row level security;

revoke all privileges on table public.editorial_article_entity_relations
  from public, anon, authenticated, service_role;

grant select (
  article_id, entity_type, entity_slug, entity_name, relation_type, status, source, confidence, updated_at
) on public.editorial_article_entity_relations to authenticated;

drop policy if exists "public can read confirmed relations for published articles"
  on public.editorial_article_entity_relations;

drop policy if exists "editorial team can read article entity relations"
  on public.editorial_article_entity_relations;
create policy "editorial team can read article entity relations"
  on public.editorial_article_entity_relations for select to authenticated
  using (
    public.has_editorial_permission('contenido.verBorradores')
    or public.can_edit_article(article_id)
  );

drop policy if exists "article editors can add entity relations"
  on public.editorial_article_entity_relations;

drop policy if exists "article editors can correct entity relations"
  on public.editorial_article_entity_relations;

create or replace function public.editorial_entity_slug(input_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.regexp_replace(
        pg_catalog.translate(pg_catalog.lower(coalesce(input_value, '')), 'áéíóúüñ', 'aeiouun'),
        '[^a-z0-9]+', '-', 'g'
      ),
      '(^-+|-+$)', '', 'g'
    ),
    '-'
  );
$$;

create or replace function public.editorial_normalizar_clave_equipo(input_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  with normalized as (
    select pg_catalog.btrim(pg_catalog.regexp_replace(
      pg_catalog.translate(pg_catalog.lower(coalesce(input_value, '')), 'áéíóúüñ', 'aeiouun'),
      '[^a-z0-9]+', ' ', 'g'
    )) as value
  )
  select case normalized.value
    when 'bogota' then 'bogota fc'
    when 'bogota f c' then 'bogota fc'
    when 'bogota fc' then 'bogota fc'
    when 'envigado f c' then 'envigado'
    when 'envigado fc' then 'envigado'
    when 'envigado' then 'envigado'
    when 'fortaleza ceif' then 'fortaleza'
    when 'fortaleza' then 'fortaleza'
    when 'deportivo pereira fc' then 'deportivo pereira'
    when 'deportivo pereira' then 'deportivo pereira'
    when 'jaguares de cordoba fc' then 'jaguares de cordoba'
    when 'jaguares f c' then 'jaguares de cordoba'
    when 'jaguares' then 'jaguares de cordoba'
    when 'jaguares de cordoba' then 'jaguares de cordoba'
    when 'independiente medellin' then 'independiente medellin'
    when 'ind medellin' then 'independiente medellin'
    when 'independiente santa fe' then 'independiente santa fe'
    when 'santa fe' then 'independiente santa fe'
    when 'patriotas boyaca' then 'patriotas boyaca'
    when 'patriotas f c' then 'patriotas boyaca'
    when 'patriotas' then 'patriotas boyaca'
    when 'barranquilla' then 'barranquilla fc'
    when 'barranquilla f c' then 'barranquilla fc'
    when 'barranquilla fc' then 'barranquilla fc'
    when 'internacional palmira' then 'internacional fc de palmira'
    when 'internacional fc palmira' then 'internacional fc de palmira'
    when 'internacional f c de palmira' then 'internacional fc de palmira'
    when 'internacional fc de palmira' then 'internacional fc de palmira'
    when 'llaneros f c' then 'llaneros'
    when 'llaneros fc' then 'llaneros'
    when 'llaneros' then 'llaneros'
    when 'ind yumbo' then 'independiente valle del cauca'
    when 'independiente yumbo' then 'independiente valle del cauca'
    when 'independiente valle del cauca' then 'independiente valle del cauca'
    when 'tigres fc' then 'tigres'
    when 'tigres' then 'tigres'
    when 'alianza' then 'alianza valledupar'
    when 'alianza valledupar f c' then 'alianza valledupar'
    when 'alianza valledupar' then 'alianza valledupar'
    when 'atletico f c' then 'atletico fc'
    when 'atletico fc' then 'atletico fc'
    when 'boyaca chico f c' then 'boyaca chico'
    when 'boyaca chico' then 'boyaca chico'
    when 'junior f c' then 'junior'
    when 'junior' then 'junior'
    when 'leones f c' then 'leones'
    when 'leones fc' then 'leones'
    when 'leones' then 'leones'
    when 'millonarios f c' then 'millonarios'
    when 'millonarios fc' then 'millonarios'
    when 'millonarios' then 'millonarios'
    when 'once caldas daf' then 'once caldas'
    when 'once caldas' then 'once caldas'
    when 'orsomarso s c' then 'orsomarso'
    when 'orsomarso' then 'orsomarso'
    when 'real santander s a' then 'real santander'
    when 'real santander' then 'real santander'
    when 'tigres f c' then 'tigres'
    else normalized.value
  end
  from normalized;
$$;

create or replace function public.editorial_entity_hash(input_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  hash_value bigint := 2166136261;
  index_value integer;
  alphabet text := '0123456789abcdefghijklmnopqrstuvwxyz';
  result_value text := '';
  remainder_value integer;
begin
  for index_value in 1..pg_catalog.char_length(coalesce(input_value, '')) loop
    hash_value := pg_catalog.mod(
      (hash_value # pg_catalog.ascii(pg_catalog.substr(input_value, index_value, 1))) * 16777619,
      4294967296
    );
  end loop;

  if hash_value = 0 then
    return '0';
  end if;

  while hash_value > 0 loop
    remainder_value := pg_catalog.mod(hash_value, 36)::integer;
    result_value := pg_catalog.substr(alphabet, remainder_value + 1, 1) || result_value;
    hash_value := hash_value / 36;
  end loop;

  return result_value;
end;
$$;

revoke all on function public.editorial_entity_slug(text)
  from public, anon, authenticated, service_role;
revoke all on function public.editorial_normalizar_clave_equipo(text)
  from public, anon, authenticated, service_role;
revoke all on function public.editorial_entity_hash(text)
  from public, anon, authenticated, service_role;

create or replace function public.editorial_jornada_key(input_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when pg_catalog.substring(coalesce(input_value, ''), '[0-9]+') is null then ''
    else 'jornada:' || coalesce(
      nullif(pg_catalog.ltrim(
        pg_catalog.substring(coalesce(input_value, ''), '[0-9]+'), '0'
      ), ''),
      '0'
    )
  end;
$$;

create or replace function public.editorial_public_fixtures_deduplicated()
returns setof public.colombian_league_fixtures
language plpgsql
stable
set search_path = ''
as $$
declare
  fixture public.colombian_league_fixtures%rowtype;
  existente public.colombian_league_fixtures%rowtype;
  seleccionada public.colombian_league_fixtures%rowtype;
  fixtures public.colombian_league_fixtures[] := array[]::public.colombian_league_fixtures[];
  posicion integer;
  posicionCoincidente integer;
  jornadaActual text;
  fechaActual text;
  jornadaExistente text;
  fechaExistente text;
  prioridadActual integer;
  prioridadExistente integer;
begin
  for fixture in
    select source_fixture.*
    from (
      select public_fixture.*
      from public.colombian_league_fixtures as public_fixture
      where public_fixture.is_public is true
        and public_fixture.publication_rights_confirmed is true
      order by public_fixture.scheduled_at asc
      limit 1000
    ) as source_fixture
    where nullif(pg_catalog.btrim(source_fixture.provider_fixture_id), '') is not null
      and nullif(pg_catalog.btrim(source_fixture.home_team), '') is not null
      and nullif(pg_catalog.btrim(source_fixture.away_team), '') is not null
  loop
    posicionCoincidente := null;
    jornadaActual := public.editorial_jornada_key(fixture.round_name);
    fechaActual := pg_catalog.to_char(
      fixture.scheduled_at at time zone 'America/Bogota', 'YYYY-MM-DD'
    );

    for posicion in 1..coalesce(pg_catalog.cardinality(fixtures), 0) loop
      existente := fixtures[posicion];
      if existente.competition_slug <> fixture.competition_slug
        or existente.season <> fixture.season
        or public.editorial_normalizar_clave_equipo(existente.home_team)
          <> public.editorial_normalizar_clave_equipo(fixture.home_team)
        or public.editorial_normalizar_clave_equipo(existente.away_team)
          <> public.editorial_normalizar_clave_equipo(fixture.away_team) then
        continue;
      end if;

      jornadaExistente := public.editorial_jornada_key(existente.round_name);
      fechaExistente := pg_catalog.to_char(
        existente.scheduled_at at time zone 'America/Bogota', 'YYYY-MM-DD'
      );
      if (
        existente.provider = fixture.provider
        and existente.provider_fixture_id = fixture.provider_fixture_id
      ) or (
        existente.provider <> fixture.provider
        and (
          (jornadaActual <> '' and jornadaActual = jornadaExistente)
          or fechaActual = fechaExistente
        )
      ) then
        posicionCoincidente := posicion;
        exit;
      end if;
    end loop;

    if posicionCoincidente is null then
      fixtures := pg_catalog.array_append(fixtures, fixture);
      continue;
    end if;

    existente := fixtures[posicionCoincidente];
    prioridadActual := case fixture.provider when 'dimayor' then 3 when 'goal-api' then 2 else 1 end;
    prioridadExistente := case existente.provider when 'dimayor' then 3 when 'goal-api' then 2 else 1 end;
    if fixture.checked_at > existente.checked_at
      or (fixture.checked_at = existente.checked_at and prioridadActual > prioridadExistente) then
      seleccionada := fixture;
    else
      seleccionada := existente;
    end if;
    seleccionada.created_at := least(existente.created_at, fixture.created_at);
    fixtures[posicionCoincidente] := seleccionada;
  end loop;

  return query
    select fila.*
    from pg_catalog.unnest(fixtures) as fila
    order by fila.scheduled_at asc;
end;
$$;

revoke all on function public.editorial_jornada_key(text)
  from public, anon, authenticated, service_role;
revoke all on function public.editorial_public_fixtures_deduplicated()
  from public, anon, authenticated, service_role;

create or replace function public.resolve_public_entity_name(
  requested_entity_type text,
  requested_entity_slug text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resolved_name text;
begin
  if requested_entity_type not in ('article', 'match', 'team', 'player', 'competition')
    or requested_entity_slug is null
    or requested_entity_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or pg_catalog.char_length(requested_entity_slug) > 120 then
    return null;
  end if;

  if requested_entity_type = 'article' then
    select version.snapshot ->> 'title'
      into resolved_name
    from public.articles as article
    inner join public.article_versions as version
      on version.id = article.published_version_id
    where version.snapshot ->> 'slug' = requested_entity_slug
      and article.status::text = 'published'
    limit 1;
  elsif requested_entity_type = 'match' then
    with public_fixtures as (
      select fixture.*,
        public.editorial_entity_slug(fixture.home_team)
          || '-vs-' || public.editorial_entity_slug(fixture.away_team) as slug_base,
        fixture.provider || ':' || fixture.provider_fixture_id as fixture_identity,
        fixture.created_at as canonical_created_at
      from public.editorial_public_fixtures_deduplicated() as fixture
    ), grouped_fixtures as (
      select fixture.*,
        pg_catalog.count(*) over (partition by fixture.slug_base) as base_count,
        pg_catalog.row_number() over (
          partition by fixture.slug_base
          order by fixture.canonical_created_at asc, fixture.fixture_identity asc
        ) as base_position
      from public_fixtures as fixture
    ), named_fixtures as (
      select fixture.*,
        case
          when fixture.base_count = 1 or fixture.base_position = 1 then fixture.slug_base
          else pg_catalog.concat_ws(
            '-', fixture.slug_base,
            public.editorial_entity_slug(fixture.competition_slug),
            public.editorial_entity_slug(fixture.season)
          )
        end as candidate_slug
      from grouped_fixtures as fixture
    ), resolved_fixtures as (
      select fixture.*,
        pg_catalog.count(*) over (partition by fixture.candidate_slug) as collision_count,
        pg_catalog.row_number() over (
          partition by fixture.candidate_slug
          order by fixture.canonical_created_at asc, fixture.fixture_identity asc
        ) as collision_position
      from named_fixtures as fixture
    ), canonical_fixtures as (
      select fixture.*,
        case
          when fixture.collision_count = 1 or fixture.collision_position = 1
            then fixture.candidate_slug
          else fixture.candidate_slug || '-' || pg_catalog.lpad(
            public.editorial_entity_hash(fixture.fixture_identity), 7, '0'
          )
        end as public_slug
      from resolved_fixtures as fixture
    )
    select fixture.home_team || ' vs. ' || fixture.away_team
      into resolved_name
    from canonical_fixtures as fixture
    where fixture.public_slug = requested_entity_slug
      and fixture.status <> 'unknown'
      and not (
        pg_catalog.lower(pg_catalog.replace(fixture.status, '-', '_'))
          in ('scheduled', 'not_started', 'not_started_yet', 'fixture', 'ns', 'pending')
        and fixture.scheduled_at < pg_catalog.now()
      )
      and not (
        fixture.status ~* '(live|progress|halftime|in_play|inplay|1h|2h|extra_time|penalt|playing|en_vivo)'
        and (
          fixture.checked_at > pg_catalog.now() + interval '30 seconds'
          or fixture.checked_at < pg_catalog.now() - interval '3 minutes'
        )
      )
      and (
        fixture.official_source_url ~* '^https://dimayor\.com\.co/[a-z0-9/_-]+/?$'
        or exists (
          select 1
          from public.colombian_match_broadcast_options as broadcast
          where broadcast.match_slug = fixture.public_slug
            and broadcast.fixture_competition_slug = fixture.competition_slug
            and broadcast.fixture_season = fixture.season
            and broadcast.fixture_provider = fixture.provider
            and broadcast.provider_fixture_id = fixture.provider_fixture_id
            and broadcast.status = 'confirmed'
            and broadcast.verified_at is not null
            and broadcast.source_url is not null
        )
      )
      and (
        (fixture.goals_home is not null and fixture.goals_home >= 0
          and fixture.goals_away is not null and fixture.goals_away >= 0)
        or nullif(pg_catalog.btrim(fixture.venue), '') is not null
        or exists (
          select 1
          from public.colombian_match_broadcast_options as broadcast
          where broadcast.match_slug = fixture.public_slug
            and broadcast.fixture_competition_slug = fixture.competition_slug
            and broadcast.fixture_season = fixture.season
            and broadcast.fixture_provider = fixture.provider
            and broadcast.provider_fixture_id = fixture.provider_fixture_id
            and broadcast.status = 'confirmed'
            and broadcast.verified_at is not null
            and broadcast.source_url is not null
        )
      )
    limit 1;
  elsif requested_entity_type = 'team' then
    with public_standings as (
      select standings.*,
        pg_catalog.row_number() over (
          partition by standings.team_key
          order by standings.checked_at desc, standings.competition_slug asc, standings.phase asc
        ) as team_position
      from public.colombian_league_standings as standings
      where standings.is_public is true
        and standings.publication_rights_confirmed is true
        and standings.competition_slug in ('liga-betplay', 'torneo-betplay')
        and standings.season ~ '^20[0-9]{2}(-[A-Za-z0-9]+)?$'
        and nullif(pg_catalog.btrim(standings.phase), '') is not null
        and standings.team_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        and pg_catalog.char_length(pg_catalog.btrim(standings.team_name)) >= 2
    ), partidos_equipo as (
      select fixture.competition_slug,
        fixture.season,
        public.editorial_normalizar_clave_equipo(fixture.home_team) as home_key,
        public.editorial_normalizar_clave_equipo(fixture.away_team) as away_key
      from public.editorial_public_fixtures_deduplicated() as fixture
    )
    select standings.team_name
      into resolved_name
    from public_standings as standings
    where standings.team_key = requested_entity_slug
      and standings.team_position = 1
      and standings.team_logo_url ~ '^/images/escudos/liga-colombiana/[a-z0-9-]+[.]png$'
      and (
        select pg_catalog.count(*)
        from partidos_equipo as partido
        where partido.home_key = public.editorial_normalizar_clave_equipo(standings.team_name)
          or partido.away_key = public.editorial_normalizar_clave_equipo(standings.team_name)
      ) >= 3
    limit 1;
  elsif requested_entity_type = 'competition' then
    with public_standings as (
      select standings.*
      from public.colombian_league_standings as standings
      where standings.is_public is true
        and standings.publication_rights_confirmed is true
        and standings.competition_slug = requested_entity_slug
        and standings.season ~ '^20[0-9]{2}(-[A-Za-z0-9]+)?$'
        and nullif(pg_catalog.btrim(standings.phase), '') is not null
        and standings.team_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
        and pg_catalog.char_length(pg_catalog.btrim(standings.team_name)) >= 2
    ), public_fixtures as (
      select fixture.*,
        public.editorial_normalizar_clave_equipo(fixture.home_team) as home_key,
        public.editorial_normalizar_clave_equipo(fixture.away_team) as away_key,
        pg_catalog.to_char(
          fixture.scheduled_at at time zone 'America/Bogota', 'YYYY-MM-DD'
        ) as fecha_partido
      from public.editorial_public_fixtures_deduplicated() as fixture
      where fixture.competition_slug = requested_entity_slug
    ), temporada_actual as (
      select coalesce(
        (
          select standings.season
          from public_standings as standings
          order by standings.checked_at desc, standings.team_name asc,
            standings.competition_slug asc, standings.phase asc
          limit 1
        ),
        (
          select fixture.season
          from public_fixtures as fixture
          where fixture.scheduled_at >= pg_catalog.now()
            and fixture.status in ('scheduled', 'pre-match')
          order by fixture.scheduled_at asc
          limit 1
        ),
        (
          select fixture.season
          from public_fixtures as fixture
          order by fixture.scheduled_at desc
          limit 1
        )
      ) as season
    ), partidos_actuales as (
      select fixture.competition_slug, fixture.season,
        fixture.home_key, fixture.away_key, fixture.fecha_partido
      from public_fixtures as fixture
      inner join temporada_actual as current_season
        on current_season.season = fixture.season
    ), equipos_actuales as (
      select partido.home_key as team_key from partidos_actuales as partido
      union
      select partido.away_key as team_key from partidos_actuales as partido
    )
    select case requested_entity_slug
        when 'liga-betplay' then 'Liga BetPlay'
        when 'torneo-betplay' then 'Torneo BetPlay'
        when 'copa-colombia' then 'Copa Colombia'
        else null
      end
      into resolved_name
    where requested_entity_slug in ('liga-betplay', 'torneo-betplay', 'copa-colombia')
      and (
        select pg_catalog.count(*)
        from public_fixtures as fixture
        inner join temporada_actual as current_season
          on current_season.season = fixture.season
      ) >= 8
      and (select pg_catalog.count(*) from equipos_actuales) >= 6;
  elsif requested_entity_type = 'player' then
    select profile.display_name
      into resolved_name
    from (values
      ('luis-diaz', 'Luis Díaz', timestamptz '2026-10-06 17:00:00+00'),
      ('jhon-lucumi', 'Jhon Lucumí', timestamptz '2026-10-06 17:00:00+00'),
      ('davinson-sanchez', 'Dávinson Sánchez', timestamptz '2026-10-06 17:00:00+00')
    ) as profile(slug, display_name, verified_at)
    where profile.slug = requested_entity_slug
      and profile.verified_at <= pg_catalog.now()
      and profile.verified_at >= pg_catalog.now() - interval '90 days';
  end if;

  return nullif(pg_catalog.btrim(resolved_name), '');
end;
$$;

revoke all on function public.resolve_public_entity_name(text, text)
  from public, anon, authenticated, service_role;

create or replace function public.list_public_article_entity_relations(requested_article_id uuid)
returns table (
  entity_type text,
  entity_slug text,
  entity_name text,
  relation_type text
)
language sql
stable
security definer
set search_path = ''
as $$
  select relation.entity_type,
    relation.entity_slug,
    public.resolve_public_entity_name(relation.entity_type, relation.entity_slug),
    relation.relation_type
  from public.editorial_article_entity_relations as relation
  inner join public.articles as source_article
    on source_article.id = relation.article_id
  inner join public.article_versions as published_version
    on published_version.id = source_article.published_version_id
  where relation.article_id = requested_article_id
    and relation.status = 'confirmed'
    and source_article.status::text = 'published'
    and public.resolve_public_entity_name(relation.entity_type, relation.entity_slug) is not null
  order by case relation.relation_type when 'about' then 0 when 'mentions' then 1 else 2 end,
    relation.entity_type,
    relation.entity_name;
$$;

revoke all on function public.list_public_article_entity_relations(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.list_public_article_entity_relations(uuid)
  to anon, authenticated;

create or replace function public.save_editorial_article_entity_relations(
  p_article_id uuid,
  p_relations jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  relation jsonb;
  entity_type text;
  entity_slug text;
  entity_name text;
  relation_type text;
  relation_status text;
  relation_source text;
  relation_confidence numeric;
  article_status text;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesión.';
  end if;
  if p_relations is null
    or pg_catalog.jsonb_typeof(p_relations) <> 'array'
    or pg_catalog.jsonb_array_length(p_relations) > 40 then
    raise exception using errcode = '22023', message = 'La lista de relaciones no es válida.';
  end if;
  if not public.can_edit_article(p_article_id) then
    raise exception using errcode = '42501', message = 'No tienes permiso para editar este contenido.';
  end if;

  select article.status::text
    into article_status
  from public.articles as article
  where article.id = p_article_id;
  if article_status not in ('draft', 'changes_requested') then
    raise exception using errcode = '42501', message = 'Este contenido no está disponible para edición.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_relations) as item(value)
    where pg_catalog.jsonb_typeof(item.value) <> 'object'
      or not (item.value ?& array[
        'entity_type', 'entity_slug', 'relation_type', 'status', 'source', 'confidence'
      ])
      or exists (
        select 1
        from pg_catalog.jsonb_object_keys(item.value) as key_name(value)
        where key_name.value not in (
          'entity_type', 'entity_slug', 'relation_type', 'status', 'source', 'confidence'
        )
      )
      or coalesce(item.value ->> 'entity_type', '') not in ('article', 'match', 'team', 'player', 'competition')
      or coalesce(item.value ->> 'entity_slug', '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or pg_catalog.char_length(coalesce(item.value ->> 'entity_slug', '')) > 120
      or coalesce(item.value ->> 'relation_type', '') not in ('about', 'mentions', 'related')
      or coalesce(item.value ->> 'status', '') not in ('confirmed', 'rejected')
      or coalesce(item.value ->> 'source', '') not in ('automatic', 'editorial')
      or (
        item.value -> 'confidence' <> 'null'::jsonb
        and (
          pg_catalog.jsonb_typeof(item.value -> 'confidence') <> 'number'
          or (item.value ->> 'confidence')::numeric < 0
          or (item.value ->> 'confidence')::numeric > 1
        )
      )
  ) then
    raise exception using errcode = '22023', message = 'Una de las relaciones no cumple el formato permitido.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_relations) as item(value)
    group by item.value ->> 'entity_type', item.value ->> 'entity_slug'
    having pg_catalog.count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'No repitas la misma entidad en una decisión.';
  end if;

  for relation in select value from pg_catalog.jsonb_array_elements(p_relations) as items(value) loop
    entity_type := relation ->> 'entity_type';
    entity_slug := relation ->> 'entity_slug';
    relation_type := relation ->> 'relation_type';
    relation_status := relation ->> 'status';
    relation_source := relation ->> 'source';
    relation_confidence := case
      when relation -> 'confidence' = 'null'::jsonb then null
      else (relation ->> 'confidence')::numeric
    end;

    if entity_type = 'article' and exists (
      select 1
      from public.articles as current_article
      left join public.article_versions as published_version
        on published_version.id = current_article.published_version_id
      where current_article.id = p_article_id
        and (
          current_article.slug = entity_slug
          or published_version.snapshot ->> 'slug' = entity_slug
        )
    ) then
      raise exception using errcode = '23514', message = 'Una publicación no puede relacionarse consigo misma.';
    end if;

    entity_name := public.resolve_public_entity_name(entity_type, entity_slug);
    if entity_name is null then
      if relation_status <> 'rejected' then
        raise exception using errcode = '22023', message = 'Una de las entidades ya no está disponible para enlazar.';
      end if;

      select existing_relation.entity_name
        into entity_name
      from public.editorial_article_entity_relations as existing_relation
      where existing_relation.article_id = p_article_id
        and existing_relation.entity_type = entity_type
        and existing_relation.entity_slug = entity_slug;
      if entity_name is null then
        raise exception using errcode = '22023', message = 'No se puede descartar una entidad que no estaba vinculada.';
      end if;
    end if;

    insert into public.editorial_article_entity_relations (
      article_id, entity_type, entity_slug, entity_name, relation_type,
      status, source, confidence
    ) values (
      p_article_id, entity_type, entity_slug, entity_name, relation_type,
      relation_status, relation_source, relation_confidence
    )
    on conflict (article_id, entity_type, entity_slug) do update set
      entity_name = excluded.entity_name,
      relation_type = excluded.relation_type,
      status = excluded.status,
      source = excluded.source,
      confidence = excluded.confidence;
  end loop;
end;
$$;

revoke all on function public.save_editorial_article_entity_relations(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.save_editorial_article_entity_relations(uuid, jsonb)
  to authenticated;

comment on table public.editorial_article_entity_relations is
  'Relaciones editoriales tipadas. La tabla solo admite lectura editorial autenticada; el RPC de escritura valida permisos y destinos públicos, y el RPC público oculta relaciones con destinos no disponibles.';

create or replace function public.list_public_editorial_article_links()
returns table (source_article_id uuid, target_article_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with article_links as (
    select
      source_article.id as source_id,
      case
        when linked.target_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then linked.target_id_text::uuid
        else null
      end as target_id
    from public.articles as source_article
    inner join public.article_versions as published_version
      on published_version.id = source_article.published_version_id
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(published_version.snapshot #> '{body_json,content}') = 'array'
          then published_version.snapshot #> '{body_json,content}'
        else '[]'::jsonb
      end
    ) as block(value)
    cross join lateral (
      select case
        when block.value ->> 'type' = 'articuloRelacionado'
          then block.value #>> '{attrs,articuloId}'
        else null
      end as target_id_text
    ) as linked
    where source_article.status::text = 'published'
      and source_article.published_version_id is not null
  )
  select source.source_id, target.id
  from article_links as source
  inner join public.articles as target on target.id = source.target_id
  where target.status::text = 'published'
    and target.published_version_id is not null;
$$;

revoke all on function public.list_public_editorial_article_links()
  from public, anon, authenticated, service_role;
grant execute on function public.list_public_editorial_article_links()
  to authenticated;

commit;
