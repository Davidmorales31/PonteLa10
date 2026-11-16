-- API para agentes de IA del módulo de redes: llaves con alcances, límite de uso,
-- creación idempotente, solicitud de aprobación humana y programación con cuota.
-- Todo es privado: solo el servidor (service_role) lee y escribe; nada es visible para anon ni authenticated.
create table public.social_agent_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  key_prefix text not null check (key_prefix ~ '^p3l_[A-Za-z0-9_-]{6,12}$'),
  key_hash text not null unique check (key_hash ~ '^[a-f0-9]{64}$'),
  owner_id uuid not null references auth.users(id),
  scopes text[] not null default array['leer','borradores','medios']
    check (cardinality(scopes) between 1 and 4 and scopes <@ array['leer','borradores','medios','programar']),
  max_schedules_per_day integer not null default 5 check (max_schedules_per_day between 0 and 50),
  rate_limit_per_minute integer not null default 60 check (rate_limit_per_minute between 5 and 600),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index social_agent_keys_owner on public.social_agent_keys(owner_id);
alter table public.social_agent_keys enable row level security;
revoke all on public.social_agent_keys from public, anon, authenticated, service_role;
grant select, insert, update on public.social_agent_keys to service_role;

create table public.social_agent_rate (
  key_id uuid not null references public.social_agent_keys(id) on delete cascade,
  bucket timestamptz not null,
  calls integer not null default 0,
  primary key (key_id, bucket)
);
alter table public.social_agent_rate enable row level security;
revoke all on public.social_agent_rate from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.social_agent_rate to service_role;

alter table public.social_custom_posts
  add column agent_key_id uuid references public.social_agent_keys(id) on delete set null,
  add column agent_idempotency_key text check (agent_idempotency_key ~ '^[A-Za-z0-9_.:-]{8,100}$'),
  add column approval_requested_at timestamptz,
  add column approval_note text check (char_length(approval_note) <= 500),
  add column suggested_at timestamptz;
create unique index social_custom_posts_agent_idem on public.social_custom_posts(agent_key_id, agent_idempotency_key)
  where agent_key_id is not null and agent_idempotency_key is not null;
create index social_custom_posts_agent on public.social_custom_posts(agent_key_id) where agent_key_id is not null;

-- Valida una llave (por su huella) y devuelve sus datos si sigue vigente. La marca de uso se actualiza como máximo cada minuto.
create function public.authenticate_social_agent_key(p_hash text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v public.social_agent_keys;
begin
  if p_hash !~ '^[a-f0-9]{64}$' then return null; end if;
  select * into v from public.social_agent_keys where key_hash = p_hash and revoked_at is null and (expires_at is null or expires_at > now());
  if v.id is null then return null; end if;
  if v.last_used_at is null or v.last_used_at < now() - interval '1 minute' then
    update public.social_agent_keys set last_used_at = now() where id = v.id;
  end if;
  return jsonb_build_object('id', v.id, 'name', v.name, 'owner_id', v.owner_id, 'scopes', to_jsonb(v.scopes),
    'max_schedules_per_day', v.max_schedules_per_day, 'rate_limit_per_minute', v.rate_limit_per_minute);
end $$;

-- Ventana por minuto: devuelve falso cuando la llave superó su límite.
create function public.take_social_agent_rate(p_key uuid, p_limit integer) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare v_calls integer;
begin
  insert into public.social_agent_rate(key_id, bucket, calls) values (p_key, date_trunc('minute', now()), 1)
    on conflict (key_id, bucket) do update set calls = public.social_agent_rate.calls + 1 returning calls into v_calls;
  if random() < 0.02 then delete from public.social_agent_rate where bucket < now() - interval '1 hour'; end if;
  return v_calls <= p_limit;
end $$;

-- Crea una pieza a nombre del dueño de la llave. Con la misma clave de idempotencia devuelve la ya creada.
create function public.agent_create_social_custom_post(p_key uuid, p_actor uuid, p_title text, p_document jsonb, p_destinations text[], p_idem text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.social_custom_posts; v_replayed boolean := false;
begin
  if p_idem is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key::text || p_idem, 0));
    select * into v from public.social_custom_posts where agent_key_id = p_key and agent_idempotency_key = p_idem;
    if v.id is not null then return jsonb_build_object('id', v.id, 'replayed', true); end if;
  end if;
  insert into public.social_custom_posts(title, document, destinations, created_by, updated_by, agent_key_id, agent_idempotency_key)
    values (p_title, p_document, p_destinations, p_actor, p_actor, p_key, p_idem) returning * into v;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values (p_actor, 'social.agent.created', 'social_custom_post', v.id, jsonb_build_object('agentKeyId', p_key));
  return jsonb_build_object('id', v.id, 'replayed', v_replayed);
end $$;

create function public.agent_request_social_approval(p_key uuid, p_actor uuid, p_id uuid, p_revision integer, p_note text, p_suggested timestamptz)
returns setof public.social_custom_posts language plpgsql security invoker set search_path = '' as $$
declare v public.social_custom_posts;
begin
  update public.social_custom_posts set approval_requested_at = now(), approval_note = p_note, suggested_at = p_suggested, updated_at = now()
    where id = p_id and agent_key_id = p_key and revision = p_revision and status in ('draft','failed') returning * into v;
  if v.id is null then return; end if;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values (p_actor, 'social.agent.approval_requested', 'social_custom_post', p_id,
      jsonb_build_object('agentKeyId', p_key, 'revision', p_revision, 'suggestedAt', p_suggested));
  return next v;
end $$;

-- Programación delegada: solo piezas de la propia llave, con cuota móvil de 24 horas.
create function public.agent_schedule_social_custom_post(p_key uuid, p_actor uuid, p_id uuid, p_revision integer, p_at timestamptz, p_max integer)
returns setof public.social_custom_posts language plpgsql security invoker set search_path = '' as $$
declare v public.social_custom_posts; v_usadas integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('agent-schedule:' || p_key::text, 0));
  select count(*) into v_usadas from public.editorial_audit_log
    where action = 'social.agent.scheduled' and metadata ->> 'agentKeyId' = p_key::text and created_at > now() - interval '24 hours';
  if v_usadas >= p_max then raise exception 'Cuota de programacion agotada'; end if;
  update public.social_custom_posts set status = 'scheduled', scheduled_at = p_at, updated_by = p_actor, updated_at = now()
    where id = p_id and agent_key_id = p_key and revision = p_revision and status in ('draft','failed') returning * into v;
  if v.id is null then return; end if;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values (p_actor, 'social.agent.scheduled', 'social_custom_post', p_id,
      jsonb_build_object('agentKeyId', p_key, 'revision', p_revision, 'scheduledAt', p_at, 'destinations', to_jsonb(v.destinations)));
  return next v;
end $$;

create function public.agent_cancel_social_custom_schedule(p_key uuid, p_actor uuid, p_id uuid)
returns setof public.social_custom_posts language plpgsql security invoker set search_path = '' as $$
declare v public.social_custom_posts;
begin
  update public.social_custom_posts set status = 'draft', scheduled_at = null, updated_by = p_actor, updated_at = now()
    where id = p_id and agent_key_id = p_key and status = 'scheduled' returning * into v;
  if v.id is null then return; end if;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values (p_actor, 'social.agent.schedule_cancelled', 'social_custom_post', p_id, jsonb_build_object('agentKeyId', p_key));
  return next v;
end $$;

create function public.agent_delete_social_custom_post(p_key uuid, p_actor uuid, p_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare v_borrados integer;
begin
  delete from public.social_custom_posts where id = p_id and agent_key_id = p_key and status in ('draft','failed')
    and not exists (select 1 from public.social_custom_publications where post_id = p_id and status in ('sending','published','uncertain'));
  get diagnostics v_borrados = row_count;
  if v_borrados = 0 then return false; end if;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values (p_actor, 'social.agent.deleted', 'social_custom_post', p_id, jsonb_build_object('agentKeyId', p_key));
  return true;
end $$;

-- Editar una pieza invalida cualquier solicitud de aprobación anterior: el humano debe aprobar lo que realmente ve.
create or replace function public.save_social_custom_post(p_actor_id uuid, p_id uuid, p_title text, p_document jsonb, p_destinations text[], p_revision integer)
returns setof public.social_custom_posts language plpgsql security invoker set search_path = '' as $$
declare v_anterior text; v public.social_custom_posts;
begin
  select status into v_anterior from public.social_custom_posts where id = p_id and revision = p_revision and status in ('draft','scheduled','failed') for update;
  if v_anterior is null then return; end if;
  update public.social_custom_posts set title = p_title, document = p_document, destinations = p_destinations, status = 'draft',
    scheduled_at = null, revision = p_revision + 1, updated_by = p_actor_id, updated_at = now(),
    approval_requested_at = null, approval_note = null, suggested_at = null where id = p_id returning * into v;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values(p_actor_id, case when v_anterior = 'scheduled' then 'social.custom.schedule_cancelled_by_edit' else 'social.custom.saved' end,
      'social_custom_post', p_id, jsonb_build_object('revision', v.revision, 'estado_anterior', v_anterior));
  return next v;
end $$;

revoke all on function public.authenticate_social_agent_key(text) from public, anon, authenticated;
revoke all on function public.take_social_agent_rate(uuid,integer) from public, anon, authenticated;
revoke all on function public.agent_create_social_custom_post(uuid,uuid,text,jsonb,text[],text) from public, anon, authenticated;
revoke all on function public.agent_request_social_approval(uuid,uuid,uuid,integer,text,timestamptz) from public, anon, authenticated;
revoke all on function public.agent_schedule_social_custom_post(uuid,uuid,uuid,integer,timestamptz,integer) from public, anon, authenticated;
revoke all on function public.agent_cancel_social_custom_schedule(uuid,uuid,uuid) from public, anon, authenticated;
revoke all on function public.agent_delete_social_custom_post(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.authenticate_social_agent_key(text) to service_role;
grant execute on function public.take_social_agent_rate(uuid,integer) to service_role;
grant execute on function public.agent_create_social_custom_post(uuid,uuid,text,jsonb,text[],text) to service_role;
grant execute on function public.agent_request_social_approval(uuid,uuid,uuid,integer,text,timestamptz) to service_role;
grant execute on function public.agent_schedule_social_custom_post(uuid,uuid,uuid,integer,timestamptz,integer) to service_role;
grant execute on function public.agent_cancel_social_custom_schedule(uuid,uuid,uuid) to service_role;
grant execute on function public.agent_delete_social_custom_post(uuid,uuid,uuid) to service_role;
