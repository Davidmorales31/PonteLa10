-- Credenciales permanecen en el entorno privado; esta tabla solo guarda recibos.
create table public.social_meta_publications (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
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
  retired_media_paths text[] not null default '{}',
  retired_provider_media_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(article_id,destination,content_hash),
  unique(destination,provider_post_id),
  check ((status='published') = (provider_post_id is not null and post_url is not null))
);
alter table public.social_meta_publications enable row level security;
revoke all on public.social_meta_publications from public,anon,authenticated,service_role;
grant select,insert,update on public.social_meta_publications to service_role;

create function public.begin_social_meta_publication(p_actor_id uuid,p_article_id uuid,p_destination text,p_content_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.social_meta_publications; v_claimed boolean := false;
begin
  if p_destination not in ('facebook','instagram') or p_content_hash !~ '^[a-f0-9]{64}$' then raise exception 'Destino o huella invalida'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_article_id::text||p_destination||p_content_hash,0));
  insert into public.social_meta_publications(article_id,actor_id,destination,content_hash,status)
    values(p_article_id,p_actor_id,p_destination,p_content_hash,'preparing') on conflict(article_id,destination,content_hash) do nothing returning * into v;
  if found then v_claimed := true;
  else
    select * into v from public.social_meta_publications where article_id=p_article_id and destination=p_destination and content_hash=p_content_hash for update;
    if v.status='failed' and v.attempts<3 then
      update public.social_meta_publications set status='preparing',attempts=attempts+1,claim_id=gen_random_uuid(),actor_id=p_actor_id,updated_at=now(),
        retired_media_paths=retired_media_paths||media_paths,retired_provider_media_ids=retired_provider_media_ids||provider_media_ids,
        media_paths='{}',provider_media_ids='{}',container_id=null
        where id=v.id returning * into v;
      v_claimed := true;
    elsif v.status in ('preparing','sending') and v.updated_at < now()-interval '10 minutes' then
      -- Nunca recuperar una reserva caducada: un proceso anterior aun puede estar enviando.
      update public.social_meta_publications set status='uncertain',updated_at=now() where id=v.id returning * into v;
    end if;
  end if;
  if v_claimed then
    insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
      values(p_actor_id,'social.meta.reserved','social_meta_publication',v.id,jsonb_build_object('destination',p_destination,'article_id',p_article_id,'attempt',v.attempts));
  end if;
  return jsonb_build_object('id',v.id,'claim_id',case when v_claimed then v.claim_id else null end,'claimed',v_claimed,'status',v.status,'post_url',v.post_url);
end $$;

create function public.set_social_meta_publication_status(p_actor_id uuid,p_id uuid,p_claim_id uuid,p_status text,p_post_id text default null,p_url text default null,p_paths text[] default null,p_container_id text default null,p_media_ids text[] default null)
returns void language plpgsql security invoker set search_path='' as $$
declare v public.social_meta_publications;
begin
  select * into v from public.social_meta_publications where id=p_id and actor_id=p_actor_id and claim_id=p_claim_id for update;
  if v.id is null or not (
    (v.status='preparing' and p_status in ('preparing','sending','failed')) or
    (v.status='sending' and p_status in ('published','uncertain'))
  ) then raise exception 'Reserva o transicion invalida'; end if;
  if p_paths is not null and (cardinality(p_paths)>8 or exists(select 1 from unnest(p_paths) x where x !~ ('^'||p_id::text||'/[0-9a-f-]+/[0-7]\.jpg$'))) then raise exception 'Rutas invalidas'; end if;
  if p_media_ids is not null and (cardinality(p_media_ids)>8 or exists(select 1 from unnest(p_media_ids) x where x !~ '^[0-9]{1,40}$')) then raise exception 'Medios invalidos'; end if;
  if p_status='published' and (p_post_id is null or p_url is null or
    (v.destination='facebook' and p_url <> 'https://www.facebook.com/'||p_post_id) or
    (v.destination='instagram' and p_url !~ '^https://www\.instagram\.com/(p/[A-Za-z0-9_-]+/|pont3ladiez/)$')) then raise exception 'Recibo invalido'; end if;
  update public.social_meta_publications set status=p_status,
    provider_post_id=case when p_status='published' then p_post_id else provider_post_id end,
    post_url=case when p_status='published' then p_url else post_url end,
    media_paths=coalesce(p_paths,media_paths),container_id=coalesce(p_container_id,container_id),
    provider_media_ids=coalesce(p_media_ids,provider_media_ids),updated_at=now() where id=v.id;
  insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
    values(p_actor_id,'social.meta.'||p_status,'social_meta_publication',v.id,jsonb_build_object('destination',v.destination,'article_id',v.article_id));
end $$;
revoke all on function public.begin_social_meta_publication(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.set_social_meta_publication_status(uuid,uuid,uuid,text,text,text,text[],text,text[]) from public,anon,authenticated;
grant execute on function public.begin_social_meta_publication(uuid,uuid,text,text) to service_role;
grant execute on function public.set_social_meta_publication_status(uuid,uuid,uuid,text,text,text,text[],text,text[]) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('social-meta-private','social-meta-private',false,5242880,array['image/jpeg']);
-- Sin policies para usuarios: solo el servidor sube y firma URLs temporales de lectura.
