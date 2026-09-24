begin;

-- Una única pieza editorial gobierna la tarjeta principal de la portada. No se
-- guarda en articles ni en sus versiones: es una decisión de portada vigente.
create table public.editorial_home_feature (
  slot text primary key check (slot = 'noticia_del_dia'),
  article_id uuid not null references public.articles(id) on delete cascade,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.editorial_home_feature enable row level security;
revoke all on public.editorial_home_feature from public, anon, authenticated;

create or replace function public.set_editorial_home_feature(target_article_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_article_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión.' using errcode = '28000';
  end if;

  if not public.has_editorial_permission('contenido.publicar') or not public.has_aal2() then
    raise exception 'Destacar una noticia requiere permiso de publicación y MFA.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.articles
    where id = target_article_id
      and status = 'published'
      and published_version_id is not null
  ) then
    raise exception 'Solo puedes destacar una noticia publicada.' using errcode = '22023';
  end if;

  -- Serializa la primera selección también, cuando aún no existe la fila del
  -- slot y por tanto FOR UPDATE no tendría nada que bloquear.
  perform pg_advisory_xact_lock(hashtext('editorial_home_feature:noticia_del_dia'));

  select article_id into v_previous_article_id
  from public.editorial_home_feature
  where slot = 'noticia_del_dia'
  for update;

  insert into public.editorial_home_feature (slot, article_id, updated_by, updated_at)
  values ('noticia_del_dia', target_article_id, (select auth.uid()), now())
  on conflict (slot) do update
    set article_id = excluded.article_id,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;

  insert into public.editorial_audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    'contenido.destacado_portada',
    'article',
    target_article_id,
    jsonb_build_object('anteriorArticuloId', v_previous_article_id, 'slot', 'noticia_del_dia')
  );

  return jsonb_build_object('articleId', target_article_id, 'activo', true);
end;
$$;

create or replace function public.clear_editorial_home_feature(target_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_article_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión.' using errcode = '28000';
  end if;

  if not public.has_editorial_permission('contenido.publicar') or not public.has_aal2() then
    raise exception 'Quitar la destacada requiere permiso de publicación y MFA.' using errcode = '42501';
  end if;

  delete from public.editorial_home_feature
  where slot = 'noticia_del_dia' and article_id = target_article_id
  returning article_id into v_previous_article_id;

  if v_previous_article_id is not null then
    insert into public.editorial_audit_log (actor_id, action, entity_type, entity_id, metadata)
    values (
      (select auth.uid()),
      'contenido.retirado_destacado_portada',
      'article',
      v_previous_article_id,
      jsonb_build_object('slot', 'noticia_del_dia')
    );
  end if;
end;
$$;

create or replace function public.get_public_editorial_home_feature()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', article.id,
    'slug', version.snapshot ->> 'slug',
    'titulo', version.snapshot ->> 'title',
    'resumen', version.snapshot ->> 'summary',
    'tipo', version.snapshot ->> 'content_type',
    'publicadoEn', version.snapshot ->> 'published_at',
    'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
    'categoria', coalesce(category.name, 'Actualidad'),
    'imagenBucket', coalesce(media.bucket, ''),
    'imagenPath', coalesce(media.path, '')
  )
  from public.editorial_home_feature as feature
  inner join public.articles as article on article.id = feature.article_id
  inner join public.article_versions as version on version.id = article.published_version_id
  left join public.categories as category on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
  left join public.media_files as media on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
  left join public.user_profiles as profile on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
  where feature.slot = 'noticia_del_dia'
    and article.status = 'published'
    and article.published_version_id is not null
  limit 1;
$$;

create or replace function public.clear_home_feature_when_article_leaves_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'published' and new.status <> 'published' then
    delete from public.editorial_home_feature
    where slot = 'noticia_del_dia' and article_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_home_feature_when_article_leaves_published on public.articles;
create trigger clear_home_feature_when_article_leaves_published
  after update of status on public.articles
  for each row execute function public.clear_home_feature_when_article_leaves_published();

-- Trazabilidad e idempotencia para cambios solicitados que se delegan a IA.
-- El resultado nunca modifica el estado: permanece en changes_requested para
-- que una persona lo revise y apruebe de forma explícita.
create table public.editorial_ai_article_rewrites (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  request_id uuid not null,
  requested_by uuid not null references auth.users(id),
  instruction text not null check (char_length(trim(instruction)) between 10 and 2000),
  prompt_hash text not null check (char_length(prompt_hash) = 64),
  status text not null check (status in ('running', 'completed', 'failed')),
  expected_lock_version integer not null check (expected_lock_version > 0),
  provider text,
  model text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_code text,
  proposal_json jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (article_id, request_id)
);

create unique index editorial_ai_article_rewrites_one_running
  on public.editorial_ai_article_rewrites(article_id)
  where status = 'running';

alter table public.editorial_ai_article_rewrites enable row level security;
revoke all on public.editorial_ai_article_rewrites from public, anon, authenticated;

create or replace function public.reserve_editorial_ai_article_rewrite(
  p_article_id uuid,
  p_request_id uuid,
  p_instruction text,
  p_prompt_hash text,
  p_expected_lock_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.editorial_ai_article_rewrites%rowtype;
begin
  if (select auth.uid()) is null or not public.has_editorial_permission('contenido.revisar') then
    raise exception 'No tienes permiso para solicitar cambios con IA.' using errcode = '42501';
  end if;

  update public.editorial_ai_article_rewrites
  set status = 'failed', error_code = 'INTERRUMPIDA', completed_at = now()
  where article_id = p_article_id
    and status = 'running'
    -- La llamada HTTP del proveedor tiene timeout de 60 segundos. Dejamos un
    -- margen muy superior antes de recuperar una reserva: nunca se abre una
    -- segunda llamada mientras la primera aún pueda estar viva.
    and created_at < now() - interval '5 minutes';

  select * into v_existing
  from public.editorial_ai_article_rewrites
  where article_id = p_article_id and status = 'running'
  for update;

  if found then
    return jsonb_build_object('estado', 'running', 'requestId', v_existing.request_id);
  end if;

  if not exists (
    select 1 from public.articles
    where id = p_article_id
      and status = 'changes_requested'
      and lock_version = p_expected_lock_version
  ) then
    raise exception 'El contenido ya no está disponible para la reescritura solicitada.' using errcode = '40001';
  end if;

  insert into public.editorial_ai_article_rewrites (
    article_id, request_id, requested_by, instruction, prompt_hash, status, expected_lock_version
  ) values (
    p_article_id, p_request_id, (select auth.uid()), trim(p_instruction), p_prompt_hash, 'running', p_expected_lock_version
  );

  return jsonb_build_object('estado', 'reserved', 'requestId', p_request_id);
end;
$$;

create or replace function public.finish_editorial_ai_article_rewrite(
  p_article_id uuid,
  p_request_id uuid,
  p_provider text,
  p_model text,
  p_duration_ms integer,
  p_proposal jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.has_editorial_permission('contenido.revisar') then
    raise exception 'No tienes permiso para cerrar la reescritura con IA.' using errcode = '42501';
  end if;

  if p_proposal is null or octet_length(p_proposal::text) > 140000 then
    raise exception 'La trazabilidad de la propuesta es inválida.' using errcode = '22023';
  end if;

  update public.editorial_ai_article_rewrites
  set status = 'completed', provider = left(trim(p_provider), 80), model = left(trim(p_model), 120),
      duration_ms = greatest(coalesce(p_duration_ms, 0), 0), proposal_json = p_proposal,
      completed_at = now()
  where article_id = p_article_id
    and request_id = p_request_id
    and requested_by = (select auth.uid())
    and status = 'running';

  if not found then
    raise exception 'La reserva de reescritura ya no está disponible.' using errcode = '40001';
  end if;
end;
$$;

create or replace function public.fail_editorial_ai_article_rewrite(
  p_article_id uuid,
  p_request_id uuid,
  p_error_code text,
  p_duration_ms integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.has_editorial_permission('contenido.revisar') then
    raise exception 'No tienes permiso para cerrar la reescritura con IA.' using errcode = '42501';
  end if;

  update public.editorial_ai_article_rewrites
  set status = 'failed', error_code = left(coalesce(nullif(trim(p_error_code), ''), 'IA_REESCRITURA_FALLIDA'), 120),
      duration_ms = greatest(coalesce(p_duration_ms, 0), 0), completed_at = now()
  where article_id = p_article_id
    and request_id = p_request_id
    and requested_by = (select auth.uid())
    and status = 'running';
end;
$$;

revoke all on function public.set_editorial_home_feature(uuid) from public, anon, authenticated;
revoke all on function public.clear_editorial_home_feature(uuid) from public, anon, authenticated;
revoke all on function public.clear_home_feature_when_article_leaves_published() from public, anon, authenticated;
revoke all on function public.get_public_editorial_home_feature() from public, anon, authenticated;
revoke all on function public.reserve_editorial_ai_article_rewrite(uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.finish_editorial_ai_article_rewrite(uuid, uuid, text, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.fail_editorial_ai_article_rewrite(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.set_editorial_home_feature(uuid) to authenticated;
grant execute on function public.clear_editorial_home_feature(uuid) to authenticated;
grant execute on function public.get_public_editorial_home_feature() to anon, authenticated;
grant execute on function public.reserve_editorial_ai_article_rewrite(uuid, uuid, text, text, integer) to authenticated;
grant execute on function public.finish_editorial_ai_article_rewrite(uuid, uuid, text, text, integer, jsonb) to authenticated;
grant execute on function public.fail_editorial_ai_article_rewrite(uuid, uuid, text, integer) to authenticated;

commit;
