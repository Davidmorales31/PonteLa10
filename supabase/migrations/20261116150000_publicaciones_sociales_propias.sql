begin;

-- Publicaciones propias: piezas de redes sin noticia (imágenes subidas por el
-- responsable). Solo el servidor las lee y escribe, tras autorizar y exigir MFA;
-- sin políticas para anon ni authenticated, igual que social_meta_publications.
create table public.social_custom_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  destinations text[] not null default array['facebook','instagram']
    check (cardinality(destinations) between 1 and 2 and destinations <@ array['facebook','instagram']),
  status text not null default 'draft' check (status in ('draft','scheduled','publishing','published','failed')),
  scheduled_at timestamptz,
  revision integer not null default 1 check (revision >= 1),
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'scheduled' or scheduled_at is not null)
);
create index social_custom_posts_due on public.social_custom_posts(scheduled_at) where status = 'scheduled';
create index social_custom_posts_recent on public.social_custom_posts(created_at desc);
alter table public.social_custom_posts enable row level security;
revoke all on public.social_custom_posts from public, anon, authenticated, service_role;
grant select, insert, update on public.social_custom_posts to service_role;

create table public.social_custom_publications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_custom_posts(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  destination text not null check (destination in ('facebook','instagram')),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  claim_id uuid not null default gen_random_uuid(),
  status text not null check (status in ('preparing','sending','published','failed','uncertain')),
  attempts integer not null default 1 check (attempts between 1 and 3),
  provider_post_id text check (provider_post_id ~ '^[0-9]{1,40}(_[0-9]{1,40})?$'),
  post_url text check (post_url ~ '^https://www\.(facebook\.com/[0-9_]+|instagram\.com/(p/[A-Za-z0-9_-]+/|pont3ladiez/))$'),
  media_paths text[] not null default '{}',
  container_id text check (container_id ~ '^[0-9]{1,40}$'),
  provider_media_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(post_id, destination, content_hash),
  unique(destination, provider_post_id),
  check ((status = 'published') = (provider_post_id is not null and post_url is not null))
);
alter table public.social_custom_publications enable row level security;
revoke all on public.social_custom_publications from public, anon, authenticated, service_role;
grant select, insert, update on public.social_custom_publications to service_role;

create function public.begin_social_custom_publication(p_actor_id uuid, p_post_id uuid, p_destination text, p_content_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v public.social_custom_publications; v_claimed boolean := false;
begin
  if p_destination not in ('facebook','instagram') or p_content_hash !~ '^[a-f0-9]{64}$' then raise exception 'Destino o huella invalida'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_post_id::text || p_destination || p_content_hash, 0));
  insert into public.social_custom_publications(post_id, actor_id, destination, content_hash, status)
    values(p_post_id, p_actor_id, p_destination, p_content_hash, 'preparing')
    on conflict(post_id, destination, content_hash) do nothing returning * into v;
  if found then v_claimed := true;
  else
    select * into v from public.social_custom_publications
      where post_id = p_post_id and destination = p_destination and content_hash = p_content_hash for update;
    if v.status = 'failed' and v.attempts < 3 then
      update public.social_custom_publications set status = 'preparing', attempts = attempts + 1, claim_id = gen_random_uuid(),
        actor_id = p_actor_id, updated_at = now(), media_paths = '{}', provider_media_ids = '{}', container_id = null
        where id = v.id returning * into v;
      v_claimed := true;
    elsif v.status in ('preparing','sending') and v.updated_at < now() - interval '10 minutes' then
      -- Nunca recuperar una reserva caducada: un proceso anterior aun puede estar enviando.
      update public.social_custom_publications set status = 'uncertain', updated_at = now() where id = v.id returning * into v;
    end if;
  end if;
  if v_claimed then
    insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
      values(p_actor_id, 'social.custom.reserved', 'social_custom_publication', v.id,
        jsonb_build_object('destination', p_destination, 'post_id', p_post_id, 'attempt', v.attempts));
  end if;
  return jsonb_build_object('id', v.id, 'claim_id', case when v_claimed then v.claim_id else null end,
    'claimed', v_claimed, 'status', v.status, 'post_url', v.post_url);
end $$;

create function public.set_social_custom_publication_status(p_actor_id uuid, p_id uuid, p_claim_id uuid, p_status text,
  p_post_id text default null, p_url text default null, p_paths text[] default null, p_container_id text default null, p_media_ids text[] default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare v public.social_custom_publications;
begin
  select * into v from public.social_custom_publications where id = p_id and actor_id = p_actor_id and claim_id = p_claim_id for update;
  if v.id is null or not (
    (v.status = 'preparing' and p_status in ('preparing','sending','failed')) or
    (v.status = 'sending' and p_status in ('published','uncertain'))
  ) then raise exception 'Reserva o transicion invalida'; end if;
  if p_paths is not null and (cardinality(p_paths) > 10 or exists(select 1 from unnest(p_paths) x where x !~ ('^' || p_id::text || '/[0-9a-f-]+/[0-9]\.jpg$'))) then raise exception 'Rutas invalidas'; end if;
  if p_media_ids is not null and (cardinality(p_media_ids) > 10 or exists(select 1 from unnest(p_media_ids) x where x !~ '^[0-9]{1,40}$')) then raise exception 'Medios invalidos'; end if;
  if p_status = 'published' and (p_post_id is null or p_url is null or
    (v.destination = 'facebook' and p_url <> 'https://www.facebook.com/' || p_post_id) or
    (v.destination = 'instagram' and p_url !~ '^https://www\.instagram\.com/(p/[A-Za-z0-9_-]+/|pont3ladiez/)$')) then raise exception 'Recibo invalido'; end if;
  update public.social_custom_publications set status = p_status,
    provider_post_id = case when p_status = 'published' then p_post_id else provider_post_id end,
    post_url = case when p_status = 'published' then p_url else post_url end,
    media_paths = coalesce(p_paths, media_paths), container_id = coalesce(p_container_id, container_id),
    provider_media_ids = coalesce(p_media_ids, provider_media_ids), updated_at = now() where id = v.id;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values(p_actor_id, 'social.custom.' || p_status, 'social_custom_publication', v.id,
      jsonb_build_object('destination', v.destination, 'post_id', v.post_id));
end $$;

-- Reclama una publicación propia vencida (una por ciclo) para el programador.
-- Antes cierra lo que ya no debe publicarse: envíos atascados más de 15 minutos y
-- programaciones vencidas hace más de 24 horas (contenido obsoleto, nunca se publica solo).
create function public.claim_due_social_custom_post() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v public.social_custom_posts; r record;
begin
  for r in update public.social_custom_posts set status = 'failed', updated_at = now()
    where (status = 'publishing' and updated_at < now() - interval '15 minutes')
       or (status = 'scheduled' and scheduled_at < now() - interval '24 hours')
    returning id, updated_by, status
  loop
    insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
      values(r.updated_by, 'social.custom.expired', 'social_custom_post', r.id, jsonb_build_object('motivo', 'envio atascado o programacion vencida'));
  end loop;
  select * into v from public.social_custom_posts
    where status = 'scheduled' and scheduled_at <= now() order by scheduled_at limit 1 for update skip locked;
  if v.id is null then return null; end if;
  update public.social_custom_posts set status = 'publishing', updated_at = now() where id = v.id;
  return jsonb_build_object('id', v.id, 'revision', v.revision, 'destinations', to_jsonb(v.destinations),
    'actor_id', v.updated_by, 'created_by', v.created_by);
end $$;

-- Cierra el envío programado. El estado final sale de los recibos reales: publicada solo si
-- todos los destinos tienen recibo publicado; un resultado incierto o parcial queda como fallido.
create function public.finish_social_custom_post(p_id uuid, p_status text) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_destinos text[]; v_todos boolean;
begin
  if p_status not in ('published','failed') then raise exception 'Estado invalido'; end if;
  select destinations into v_destinos from public.social_custom_posts where id = p_id;
  v_todos := v_destinos is not null and not exists (
    select 1 from unnest(v_destinos) d
    where not exists (select 1 from public.social_custom_publications pb where pb.post_id = p_id and pb.destination = d and pb.status = 'published'));
  update public.social_custom_posts set status = case when v_todos then 'published' else 'failed' end, updated_at = now()
    where id = p_id and status = 'publishing';
end $$;

-- Guardar, programar y cancelar pasan por RPC para dejar siempre auditoría con actor y revisión.
create function public.save_social_custom_post(p_actor_id uuid, p_id uuid, p_title text, p_document jsonb, p_destinations text[], p_revision integer)
returns setof public.social_custom_posts language plpgsql security invoker set search_path = '' as $$
declare v_anterior text; v public.social_custom_posts;
begin
  select status into v_anterior from public.social_custom_posts where id = p_id and revision = p_revision and status in ('draft','scheduled','failed') for update;
  if v_anterior is null then return; end if;
  update public.social_custom_posts set title = p_title, document = p_document, destinations = p_destinations, status = 'draft',
    scheduled_at = null, revision = p_revision + 1, updated_by = p_actor_id, updated_at = now() where id = p_id returning * into v;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values(p_actor_id, case when v_anterior = 'scheduled' then 'social.custom.schedule_cancelled_by_edit' else 'social.custom.saved' end,
      'social_custom_post', p_id, jsonb_build_object('revision', v.revision, 'estado_anterior', v_anterior));
  return next v;
end $$;

create function public.schedule_social_custom_post(p_actor_id uuid, p_id uuid, p_revision integer, p_at timestamptz)
returns setof public.social_custom_posts language plpgsql security invoker set search_path = '' as $$
declare v public.social_custom_posts;
begin
  update public.social_custom_posts set status = 'scheduled', scheduled_at = p_at, updated_by = p_actor_id, updated_at = now()
    where id = p_id and revision = p_revision and status in ('draft','failed') returning * into v;
  if v.id is null then return; end if;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values(p_actor_id, 'social.custom.schedule_approved', 'social_custom_post', p_id,
      jsonb_build_object('revision', p_revision, 'scheduled_at', p_at, 'destinations', to_jsonb(v.destinations)));
  return next v;
end $$;

create function public.cancel_social_custom_schedule(p_actor_id uuid, p_id uuid)
returns setof public.social_custom_posts language plpgsql security invoker set search_path = '' as $$
declare v public.social_custom_posts;
begin
  update public.social_custom_posts set status = 'draft', scheduled_at = null, updated_by = p_actor_id, updated_at = now()
    where id = p_id and status = 'scheduled' returning * into v;
  if v.id is null then return; end if;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values(p_actor_id, 'social.custom.schedule_cancelled', 'social_custom_post', p_id, jsonb_build_object('revision', v.revision));
  return next v;
end $$;

revoke all on function public.begin_social_custom_publication(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.set_social_custom_publication_status(uuid,uuid,uuid,text,text,text,text[],text,text[]) from public, anon, authenticated;
revoke all on function public.claim_due_social_custom_post() from public, anon, authenticated;
revoke all on function public.finish_social_custom_post(uuid,text) from public, anon, authenticated;
revoke all on function public.save_social_custom_post(uuid,uuid,text,jsonb,text[],integer) from public, anon, authenticated;
revoke all on function public.schedule_social_custom_post(uuid,uuid,integer,timestamptz) from public, anon, authenticated;
revoke all on function public.cancel_social_custom_schedule(uuid,uuid) from public, anon, authenticated;
grant execute on function public.begin_social_custom_publication(uuid,uuid,text,text) to service_role;
grant execute on function public.set_social_custom_publication_status(uuid,uuid,uuid,text,text,text,text[],text,text[]) to service_role;
grant execute on function public.claim_due_social_custom_post() to service_role;
grant execute on function public.finish_social_custom_post(uuid,text) to service_role;
grant execute on function public.save_social_custom_post(uuid,uuid,text,jsonb,text[],integer) to service_role;
grant execute on function public.schedule_social_custom_post(uuid,uuid,integer,timestamptz) to service_role;
grant execute on function public.cancel_social_custom_schedule(uuid,uuid) to service_role;

commit;
