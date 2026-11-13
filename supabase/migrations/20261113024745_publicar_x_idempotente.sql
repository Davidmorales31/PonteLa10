create table public.social_x_publications (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('reserved', 'uploading', 'sending', 'published', 'failed', 'uncertain')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 3),
  provider_post_id text unique check (provider_post_id is null or provider_post_id ~ '^[0-9]{1,30}$'),
  post_url text check (post_url is null or post_url ~ '^https://x\.com/Pont3la10/status/[0-9]{1,30}$'),
  error_code text check (error_code is null or error_code in ('token_invalido', 'media_rechazada', 'post_rechazado', 'proveedor_no_disponible')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (article_id, content_hash),
  check ((status = 'published') = (provider_post_id is not null and post_url is not null)),
  check (post_url is null or post_url = 'https://x.com/Pont3la10/status/' || provider_post_id)
);

alter table public.social_x_publications enable row level security;
revoke all on public.social_x_publications from public, anon, authenticated, service_role;
grant select, insert, update on public.social_x_publications to service_role;

create function public.begin_social_x_publication(p_actor_id uuid, p_article_id uuid, p_content_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_publication public.social_x_publications;
begin
  if p_content_hash !~ '^[a-f0-9]{64}$' then raise exception 'Huella de publicación inválida'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_article_id::text || ':' || p_content_hash, 0));
  insert into public.social_x_publications(article_id, actor_id, content_hash, status)
    values (p_article_id, p_actor_id, p_content_hash, 'reserved')
    on conflict (article_id, content_hash) do nothing;
  if found then
    select * into v_publication from public.social_x_publications
      where article_id = p_article_id and content_hash = p_content_hash;
    insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
      values (p_actor_id, 'social.x.reserved', 'social_x_publication', v_publication.id,
        jsonb_build_object('provider', 'x', 'article_id', p_article_id));
    return jsonb_build_object('id', v_publication.id, 'status', v_publication.status, 'claimed', true,
      'post_id', v_publication.provider_post_id, 'post_url', v_publication.post_url);
  end if;

  select * into v_publication from public.social_x_publications
    where article_id = p_article_id and content_hash = p_content_hash for update;
  if v_publication.status = 'published' or v_publication.status = 'uncertain' then
    return jsonb_build_object('id', v_publication.id, 'status', v_publication.status, 'claimed', false,
      'post_id', v_publication.provider_post_id, 'post_url', v_publication.post_url);
  end if;
  if v_publication.status = 'sending' then
    if v_publication.updated_at > now() - interval '10 minutes' then
      return jsonb_build_object('id', v_publication.id, 'status', 'sending', 'claimed', false,
        'post_id', null, 'post_url', null);
    end if;
    update public.social_x_publications set status = 'uncertain', updated_at = now(), error_code = 'proveedor_no_disponible'
      where id = v_publication.id returning * into v_publication;
    insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
      values (v_publication.actor_id, 'social.x.uncertain', 'social_x_publication', v_publication.id,
        jsonb_build_object('provider', 'x', 'article_id', p_article_id, 'reason', 'stale_sending'));
    return jsonb_build_object('id', v_publication.id, 'status', v_publication.status, 'claimed', false,
      'post_id', null, 'post_url', null);
  end if;
  if v_publication.status in ('reserved', 'uploading') and v_publication.updated_at > now() - interval '10 minutes' then
    return jsonb_build_object('id', v_publication.id, 'status', v_publication.status, 'claimed', false,
      'post_id', null, 'post_url', null);
  end if;
  if v_publication.attempt_count >= 3 then
    return jsonb_build_object('id', v_publication.id, 'status', 'failed', 'claimed', false,
      'post_id', null, 'post_url', null);
  end if;
  update public.social_x_publications set status = 'reserved', attempt_count = attempt_count + 1,
    updated_at = now(), error_code = null
    where id = v_publication.id returning * into v_publication;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values (p_actor_id, 'social.x.reserved', 'social_x_publication', v_publication.id,
      jsonb_build_object('provider', 'x', 'article_id', p_article_id, 'attempt', v_publication.attempt_count));
  return jsonb_build_object('id', v_publication.id, 'status', v_publication.status, 'claimed', true,
    'post_id', null, 'post_url', null);
end $$;

create function public.set_social_x_publication_status(
  p_actor_id uuid, p_publication_id uuid, p_status text,
  p_provider_post_id text default null, p_post_url text default null, p_error_code text default null
)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_publication public.social_x_publications;
begin
  if p_status not in ('uploading', 'sending', 'published', 'failed', 'uncertain')
    or (p_error_code is not null and p_error_code not in ('token_invalido', 'media_rechazada', 'post_rechazado', 'proveedor_no_disponible')) then
    raise exception 'Estado de publicación inválido';
  end if;
  select * into v_publication from public.social_x_publications
    where id = p_publication_id and actor_id = p_actor_id for update;
  if v_publication.id is null or v_publication.status in ('published', 'uncertain') then
    raise exception 'La publicación no puede cambiar de estado';
  end if;
  if not ((p_status = 'uploading' and v_publication.status in ('reserved', 'uploading'))
    or (p_status = 'sending' and v_publication.status in ('uploading', 'sending'))
    or (p_status = 'published' and v_publication.status = 'sending')
    or (p_status = 'failed' and v_publication.status in ('reserved', 'uploading', 'sending'))
    or (p_status = 'uncertain' and v_publication.status = 'sending')) then
    raise exception 'Transición de publicación inválida';
  end if;
  if p_status = 'published' and (p_provider_post_id !~ '^[0-9]{1,30}$'
    or p_post_url !~ '^https://x\.com/Pont3la10/status/[0-9]{1,30}$') then
    raise exception 'Recibo de X inválido';
  end if;
  update public.social_x_publications set status = p_status,
    provider_post_id = case when p_status = 'published' then p_provider_post_id else provider_post_id end,
    post_url = case when p_status = 'published' then p_post_url else post_url end,
    error_code = p_error_code, updated_at = now()
    where id = p_publication_id returning * into v_publication;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values (p_actor_id, 'social.x.' || p_status, 'social_x_publication', p_publication_id,
      jsonb_build_object('provider', 'x', 'article_id', v_publication.article_id, 'status', p_status,
        'post_id', v_publication.provider_post_id, 'error_code', p_error_code));
end $$;

revoke all on function public.begin_social_x_publication(uuid, uuid, text),
  public.set_social_x_publication_status(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.begin_social_x_publication(uuid, uuid, text),
  public.set_social_x_publication_status(uuid, uuid, text, text, text, text) to service_role;
