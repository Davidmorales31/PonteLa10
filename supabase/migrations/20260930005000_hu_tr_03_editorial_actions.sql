begin;

create table if not exists public.editorial_opportunity_action_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.editorial_codex_agenda_candidates(id) on delete restrict,
  event_name text not null check (event_name in (
    'editorial_action_recommended',
    'editorial_action_confirmed',
    'editorial_action_overridden'
  )),
  recommended_action text not null check (recommended_action in (
    'create_article', 'update_article', 'update_hub', 'create_data_story',
    'create_game_candidate', 'manual_review', 'discard'
  )),
  action text not null check (action in (
    'create_article', 'update_article', 'update_hub', 'create_data_story',
    'create_game_candidate', 'manual_review', 'discard'
  )),
  target_resource_id uuid,
  target_resource_type text check (target_resource_type in ('article', 'hub')),
  reason text not null check (char_length(trim(reason)) between 20 and 600),
  strategic_score smallint not null check (strategic_score between 0 and 100),
  actor_id uuid references auth.users(id),
  occurred_at timestamptz not null default now(),
  constraint editorial_opportunity_action_target_consistent check (
    (action = 'update_article' and target_resource_type = 'article' and target_resource_id is not null)
    or (action = 'update_hub' and target_resource_type = 'hub' and target_resource_id is not null)
    or (action not in ('update_article', 'update_hub') and target_resource_id is null and target_resource_type is null)
  ),
  constraint editorial_opportunity_action_actor_consistent check (
    (event_name = 'editorial_action_recommended' and actor_id is null)
    or (event_name in ('editorial_action_confirmed', 'editorial_action_overridden') and actor_id is not null)
  )
);

create index if not exists idx_editorial_opportunity_action_events_candidate_recent
  on public.editorial_opportunity_action_events (candidate_id, occurred_at desc);

alter table public.editorial_opportunity_action_events enable row level security;
revoke all on public.editorial_opportunity_action_events from public, anon, authenticated;
revoke all on public.editorial_opportunity_action_events from service_role;
grant select, insert on public.editorial_opportunity_action_events to service_role;

-- La HU de hubs puede crear public_hubs después de esta migración. Esta
-- función devuelve solo su catálogo público mínimo y sigue siendo válida antes.
create or replace function public.get_codex_editorial_hub_targets()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_targets jsonb := '[]'::jsonb;
begin
  if pg_catalog.to_regclass('public.public_hubs') is null then
    return v_targets;
  end if;

  execute $query$
    select coalesce(jsonb_agg(target order by target ->> 'titulo'), '[]'::jsonb)
    from (
      select jsonb_strip_nulls(jsonb_build_object(
        'id', resource.payload ->> 'id',
        'titulo', coalesce(resource.payload ->> 'title', resource.payload ->> 'name', 'Hub editorial'),
        'slug', resource.payload ->> 'slug'
      )) as target
      from (
        select to_jsonb(hub) as payload
        from public.public_hubs hub
      ) resource
      where coalesce(resource.payload ->> 'status', resource.payload ->> 'state', 'published')
          not in ('draft', 'archived', 'deleted', 'inactive', 'unpublished')
        and coalesce(resource.payload ->> 'is_active', 'true') not in ('false', '0')
      order by coalesce(resource.payload ->> 'title', resource.payload ->> 'name', '')
      limit 100
    ) catalogo
  $query$ into v_targets;

  return coalesce(v_targets, '[]'::jsonb);
end;
$$;

-- Los candidatos anteriores a HU-TR-03 conservan sus puntajes, pero no se
-- infiere una acción: pasan a revisión manual con una explicación explícita.
update public.editorial_codex_agenda_candidates
set candidate = candidate || jsonb_build_object(
  'recommendedAction', 'manual_review',
  'targetResourceId', null,
  'targetResourceType', null,
  'actionReason', 'Esta oportunidad es anterior a la decisión editorial estructurada y requiere evaluación humana.'
)
where not (candidate ? 'recommendedAction');

create or replace function public.validate_editorial_opportunity_action()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_action text := new.candidate ->> 'recommendedAction';
  v_target_id uuid;
  v_target_type text := new.candidate ->> 'targetResourceType';
  v_reason text := new.candidate ->> 'actionReason';
  v_exists boolean := false;
begin
  if v_action is null or v_action not in (
    'create_article', 'update_article', 'update_hub', 'create_data_story',
    'create_game_candidate', 'manual_review', 'discard'
  ) then
    raise exception 'La acción editorial recomendada no es válida.' using errcode = '22023';
  end if;

  if v_reason is null or char_length(trim(v_reason)) not between 20 and 600 then
    raise exception 'La razón de la acción editorial no es válida.' using errcode = '22023';
  end if;

  if v_action in ('update_article', 'update_hub') then
    if coalesce(new.candidate ->> 'targetResourceId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or (v_action = 'update_article' and v_target_type is distinct from 'article')
      or (v_action = 'update_hub' and v_target_type is distinct from 'hub') then
      raise exception 'La actualización requiere un target válido del tipo indicado.' using errcode = '22023';
    end if;
    v_target_id := (new.candidate ->> 'targetResourceId')::uuid;

    if v_action = 'update_article' then
      select exists (
        select 1 from public.articles article
        where article.id = v_target_id
          and article.status = 'published'
          and article.published_version_id is not null
      ) into v_exists;
    elsif pg_catalog.to_regclass('public.public_hubs') is not null then
      execute 'select exists (select 1 from public.public_hubs hub where hub.id = $1)'
        into v_exists using v_target_id;
    end if;

    if not v_exists then
      raise exception 'El recurso objetivo no existe o no está disponible.' using errcode = '22023';
    end if;
  elsif new.candidate ->> 'targetResourceId' is not null
    or v_target_type is not null then
    raise exception 'Solo una actualización admite recurso objetivo.' using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_editorial_opportunity_action
  on public.editorial_codex_agenda_candidates;
create trigger validate_editorial_opportunity_action
before insert or update of candidate on public.editorial_codex_agenda_candidates
for each row execute function public.validate_editorial_opportunity_action();

create or replace function public.log_editorial_opportunity_recommendation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_score smallint;
begin
  if tg_op = 'UPDATE' and new.candidate is not distinct from old.candidate then
    return new;
  end if;

  if coalesce(new.candidate ->> 'strategicScore', '') ~ '^(100|[0-9]{1,2})$' then
    v_score := (new.candidate ->> 'strategicScore')::smallint;
  else
    v_score := 0;
  end if;

  -- p_actor_id llega solo desde un endpoint privado que deriva el ID de la
  -- sesión autenticada y ya autorizada; nunca se toma del cuerpo del usuario.
  insert into public.editorial_opportunity_action_events (
    candidate_id, event_name, recommended_action, action,
    target_resource_id, target_resource_type, reason, strategic_score
  ) values (
    new.id,
    'editorial_action_recommended',
    new.candidate ->> 'recommendedAction',
    new.candidate ->> 'recommendedAction',
    nullif(new.candidate ->> 'targetResourceId', '')::uuid,
    nullif(new.candidate ->> 'targetResourceType', ''),
    new.candidate ->> 'actionReason',
    v_score
  );

  return new;
end;
$$;

drop trigger if exists log_editorial_opportunity_recommendation
  on public.editorial_codex_agenda_candidates;
create trigger log_editorial_opportunity_recommendation
after insert or update of candidate on public.editorial_codex_agenda_candidates
for each row execute function public.log_editorial_opportunity_recommendation();

create or replace function public.record_editorial_opportunity_decision(
  p_candidate_id uuid,
  p_action text,
  p_target_resource_id uuid,
  p_target_resource_type text,
  p_reason text,
  p_actor_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_candidate jsonb;
  v_recommended_action text;
  v_recommended_target_id uuid;
  v_recommended_target_type text;
  v_score smallint;
  v_event_name text;
  v_exists boolean := false;
  v_event_id uuid;
begin
  if p_candidate_id is null or p_actor_id is null or p_action is null or p_reason is null
    or char_length(trim(p_reason)) not between 20 and 600
    or p_action not in (
      'create_article', 'update_article', 'update_hub', 'create_data_story',
      'create_game_candidate', 'manual_review', 'discard'
    ) then
    raise exception 'La decisión editorial no es válida.' using errcode = '22023';
  end if;

  select candidate into v_candidate
  from public.editorial_codex_agenda_candidates
  where id = p_candidate_id
  for update;
  if not found then
    raise exception 'La oportunidad ya no existe.' using errcode = '22023';
  end if;

  v_recommended_action := v_candidate ->> 'recommendedAction';
  v_recommended_target_id := nullif(v_candidate ->> 'targetResourceId', '')::uuid;
  v_recommended_target_type := nullif(v_candidate ->> 'targetResourceType', '');
  if coalesce(v_candidate ->> 'strategicScore', '') ~ '^(100|[0-9]{1,2})$' then
    v_score := (v_candidate ->> 'strategicScore')::smallint;
  else
    v_score := 0;
  end if;

  if p_action in ('update_article', 'update_hub') then
    if p_target_resource_id is null
      or (p_action = 'update_article' and p_target_resource_type is distinct from 'article')
      or (p_action = 'update_hub' and p_target_resource_type is distinct from 'hub') then
      raise exception 'La actualización requiere un target válido del tipo indicado.' using errcode = '22023';
    end if;

    if p_action = 'update_article' then
      select exists (
        select 1 from public.articles article
        where article.id = p_target_resource_id
          and article.status = 'published'
          and article.published_version_id is not null
      ) into v_exists;
    elsif pg_catalog.to_regclass('public.public_hubs') is not null then
      execute 'select exists (select 1 from public.public_hubs hub where hub.id = $1)'
        into v_exists using p_target_resource_id;
    end if;

    if not v_exists then
      raise exception 'El recurso objetivo no existe o no está disponible.' using errcode = '22023';
    end if;
  elsif p_target_resource_id is not null or p_target_resource_type is not null then
    raise exception 'Solo una actualización admite recurso objetivo.' using errcode = '22023';
  end if;

  if p_action = v_recommended_action
    and p_target_resource_id is not distinct from v_recommended_target_id
    and p_target_resource_type is not distinct from v_recommended_target_type then
    v_event_name := 'editorial_action_confirmed';
  else
    v_event_name := 'editorial_action_overridden';
  end if;

  insert into public.editorial_opportunity_action_events (
    candidate_id, event_name, recommended_action, action,
    target_resource_id, target_resource_type, reason, strategic_score, actor_id
  ) values (
    p_candidate_id, v_event_name, v_recommended_action, p_action,
    p_target_resource_id, p_target_resource_type, trim(p_reason), v_score, p_actor_id
  ) returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.validate_editorial_opportunity_action()
  from public, anon, authenticated;
revoke all on function public.log_editorial_opportunity_recommendation()
  from public, anon, authenticated;
revoke all on function public.get_codex_editorial_hub_targets()
  from public, anon, authenticated;
revoke all on function public.record_editorial_opportunity_decision(uuid, text, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.get_codex_editorial_hub_targets()
  to service_role;
grant execute on function public.record_editorial_opportunity_decision(uuid, text, uuid, text, text, uuid)
  to service_role;

commit;
