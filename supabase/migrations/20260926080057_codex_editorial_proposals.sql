begin;

create table if not exists public.editorial_codex_request_nonces (
  request_id uuid primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at and expires_at <= created_at + interval '5 minutes 30 seconds')
);

alter table public.editorial_codex_request_nonces enable row level security;
revoke all on public.editorial_codex_request_nonces from public, anon, authenticated;
grant all on public.editorial_codex_request_nonces to service_role;

create or replace function public.claim_codex_request_nonce(
  p_request_id uuid,
  p_expires_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- La frontera de rol la aplica SECURITY INVOKER + EXECUTE solo para service_role.
  if p_request_id is null
    or p_expires_at <= now()
    or p_expires_at > now() + interval '5 minutes 30 seconds' then
    raise exception 'Nonce de solicitud no válido.' using errcode = '42501';
  end if;

  delete from public.editorial_codex_request_nonces
  where expires_at < now() - interval '1 day';
  insert into public.editorial_codex_request_nonces (request_id, expires_at)
  values (p_request_id, p_expires_at);
end;
$$;

revoke all on function public.claim_codex_request_nonce(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_codex_request_nonce(uuid, timestamptz)
  to service_role;

create table if not exists public.editorial_article_sources (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  url text not null check (url ~ '^https://'),
  title text not null check (char_length(trim(title)) between 5 and 240),
  publisher text not null check (char_length(trim(publisher)) between 2 and 160),
  published_at timestamptz,
  accessed_at timestamptz not null,
  source_type text not null check (source_type in ('primaria', 'secundaria')),
  supported_claims jsonb not null check (
    jsonb_typeof(supported_claims) = 'array'
    and jsonb_array_length(supported_claims) between 1 and 12
  ),
  created_at timestamptz not null default now(),
  unique (article_id, url)
);

create index if not exists idx_editorial_article_sources_article
  on public.editorial_article_sources (article_id, created_at);

alter table public.editorial_article_sources enable row level security;
revoke all on public.editorial_article_sources from anon;
revoke all on public.editorial_article_sources from authenticated;
grant select on public.editorial_article_sources to authenticated;
grant all on public.editorial_article_sources to service_role;

drop policy if exists "editorial article sources team read"
  on public.editorial_article_sources;
create policy "editorial article sources team read"
  on public.editorial_article_sources for select to authenticated
  using (public.has_editorial_permission('contenido.verBorradores'));

create table if not exists public.editorial_codex_proposals (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  run_id uuid not null,
  category_id uuid not null references public.categories(id),
  story_fingerprint text not null check (story_fingerprint ~ '^[a-fA-F0-9]{64}$'),
  request_hash text not null check (request_hash ~ '^[a-fA-F0-9]{64}$'),
  article_id uuid not null unique references public.articles(id) on delete cascade,
  editorial_flags jsonb not null default '[]'::jsonb
    check (jsonb_typeof(editorial_flags) = 'array'),
  created_at timestamptz not null default now(),
  unique (run_id, category_id, story_fingerprint)
);

create index if not exists idx_editorial_codex_proposals_recent_story
  on public.editorial_codex_proposals (category_id, story_fingerprint, created_at desc);

alter table public.editorial_codex_proposals enable row level security;
revoke all on public.editorial_codex_proposals from anon;
revoke all on public.editorial_codex_proposals from authenticated;
grant select on public.editorial_codex_proposals to authenticated;
grant all on public.editorial_codex_proposals to service_role;

drop policy if exists "editorial Codex proposals team read"
  on public.editorial_codex_proposals;
create policy "editorial Codex proposals team read"
  on public.editorial_codex_proposals for select to authenticated
  using (public.has_editorial_permission('contenido.verBorradores'));

create or replace function public.submit_codex_editorial_proposal(p_input jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_idempotency_key uuid := (p_input ->> 'idempotencyKey')::uuid;
  v_run_id uuid := (p_input ->> 'runId')::uuid;
  v_category_id uuid := (p_input ->> 'categoryId')::uuid;
  v_story_fingerprint text := lower(p_input ->> 'storyFingerprint');
  v_request_hash text := encode(public.digest(p_input::text, 'sha256'), 'hex');
  v_existing public.editorial_codex_proposals%rowtype;
  v_recent public.editorial_codex_proposals%rowtype;
  v_article_id uuid;
  v_media_id uuid := (p_input ->> 'coverMediaId')::uuid;
  v_title text := trim(p_input ->> 'title');
  v_slug text;
  v_slug_base text;
  v_source_url text := trim(p_input ->> 'sourceUrl');
  v_source_name text := trim(p_input ->> 'sourceName');
  v_tag_ids uuid[] := '{}'::uuid[];
  v_created_tag_ids uuid[] := '{}'::uuid[];
  v_related_ids uuid[] := '{}'::uuid[];
  v_related_blocks jsonb := '[]'::jsonb;
  v_candidate jsonb;
  v_topic_name text;
  v_topic_description text;
  v_topic_slug text;
  v_topic_id uuid;
  v_topic_active boolean;
  v_article_body_json jsonb := p_input -> 'bodyJson';
begin
  -- La función no eleva privilegios; su ACL concede EXECUTE solo a service_role.
  if jsonb_typeof(p_input) <> 'object'
    or jsonb_typeof(p_input -> 'sources') <> 'array'
    or jsonb_array_length(p_input -> 'sources') < 2
    or jsonb_array_length(p_input -> 'sources') > 10
    or jsonb_typeof(p_input -> 'tagIds') <> 'array'
    or jsonb_typeof(p_input -> 'newTopics') <> 'array'
    or jsonb_array_length(p_input -> 'newTopics') > 3
    or jsonb_typeof(p_input -> 'relatedArticleIds') <> 'array'
    or jsonb_array_length(p_input -> 'relatedArticleIds') > 3
    or jsonb_typeof(p_input -> 'editorialFlags') <> 'array'
    or jsonb_typeof(v_article_body_json) <> 'object'
    or v_article_body_json ->> 'type' <> 'doc'
    or jsonb_typeof(v_article_body_json -> 'content') <> 'array'
    or v_story_fingerprint !~ '^[a-fA-F0-9]{64}$'
    or char_length(coalesce(p_input ->> 'body', '')) < 500
    or char_length(coalesce(p_input ->> 'body', '')) > 30000
    or char_length(v_title) not between 8 and 160
    or char_length(coalesce(p_input ->> 'summary', '')) not between 20 and 320
    or v_source_url !~ '^https://'
    or not exists (
      select 1 from public.categories
      where id = v_category_id and is_active
    )
    or not exists (
      select 1 from public.media_files
      where id = v_media_id
        and bucket = 'editorial-media'
        and caption ilike '%ilustración editorial%'
        and credit ~* '(generad[ao].{0,15}ia|ia.{0,15}generad[ao])'
    )
    or not ((p_input -> 'editorialFlags') @> '["illustrative_cover"]'::jsonb
    ) then
    raise exception 'La propuesta editorial está incompleta o no cumple el contrato.'
      using errcode = '22023';
  end if;

  if (p_input ->> 'contentType') in ('opinion', 'especial')
    and not ((p_input -> 'editorialFlags') @> '["needs_angle_review"]'::jsonb) then
    raise exception 'Opinión y Especiales requieren revisión humana del enfoque.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_idempotency_key::text, 0));
  select * into v_existing
  from public.editorial_codex_proposals
  where idempotency_key = v_idempotency_key;
  if found then
    if v_existing.request_hash <> v_request_hash then
      raise exception 'La clave de idempotencia ya se usó con otro contenido.'
        using errcode = '23505';
    end if;
    return jsonb_build_object(
      'articleId', v_existing.article_id,
      'estado', 'review',
      'duplicado', true
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    v_category_id::text || ':' || v_story_fingerprint, 0
  ));
  select * into v_recent
  from public.editorial_codex_proposals
  where category_id = v_category_id
    and story_fingerprint = v_story_fingerprint
    and created_at > now() - interval '30 days'
  order by created_at desc limit 1;
  if found then
    return jsonb_build_object(
      'articleId', v_recent.article_id,
      'estado', 'review',
      'duplicado', true
    );
  end if;

  if not exists (
    select 1 from jsonb_array_elements(p_input -> 'sources') as sources(source)
    where source ->> 'url' = v_source_url
  ) then
    raise exception 'La fuente principal debe estar incluida en las referencias.'
      using errcode = '22023';
  end if;

  select array_agg(distinct value::uuid)
  into v_tag_ids
  from jsonb_array_elements_text(p_input -> 'tagIds');
  v_tag_ids := coalesce(v_tag_ids, '{}'::uuid[]);
  if cardinality(v_tag_ids) > 12
    or (select count(*) from public.editorial_tags
      where id = any(v_tag_ids) and is_active) <> cardinality(v_tag_ids) then
    raise exception 'La propuesta contiene temas públicos no disponibles.'
      using errcode = '22023';
  end if;

  for v_candidate in select candidate from jsonb_array_elements(p_input -> 'newTopics') as topics(candidate) loop
    v_topic_name := regexp_replace(trim(coalesce(v_candidate ->> 'name', '')), '\s+', ' ', 'g');
    v_topic_description := nullif(left(regexp_replace(
      trim(coalesce(v_candidate ->> 'description', '')), '\s+', ' ', 'g'
    ), 240), '');
    if char_length(v_topic_name) not between 2 and 80
      or v_topic_name ~ '[[:cntrl:]]'
      or coalesce(v_topic_description ~ '[[:cntrl:]]', false) then
      raise exception 'La propuesta de tema público no es válida.' using errcode = '22023';
    end if;
    v_topic_slug := trim(both '-' from regexp_replace(
      translate(lower(v_topic_name), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', '-', 'g'
    ));
    if char_length(v_topic_slug) not between 2 and 80 then
      raise exception 'No se pudo normalizar el tema público.' using errcode = '22023';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(v_topic_slug, 0));
    select id, is_active into v_topic_id, v_topic_active
    from public.editorial_tags
    where slug = v_topic_slug or lower(name) = lower(v_topic_name)
    order by id limit 1;
    if v_topic_id is not null and not v_topic_active then
      continue;
    elsif v_topic_id is null then
      insert into public.editorial_tags (slug, name, description)
      values (v_topic_slug, v_topic_name, v_topic_description)
      on conflict (slug) do nothing returning id into v_topic_id;
      if v_topic_id is null then
        select id, is_active into v_topic_id, v_topic_active
        from public.editorial_tags where slug = v_topic_slug;
        if not coalesce(v_topic_active, false) then continue; end if;
      else
        v_created_tag_ids := array_append(v_created_tag_ids, v_topic_id);
      end if;
    end if;
    if not (v_topic_id = any(v_tag_ids)) then
      v_tag_ids := array_append(v_tag_ids, v_topic_id);
    end if;
  end loop;
  if cardinality(v_tag_ids) > 12 then
    raise exception 'La propuesta supera el máximo de temas públicos.' using errcode = '22023';
  end if;

  select array_agg(distinct value::uuid)
  into v_related_ids
  from jsonb_array_elements_text(p_input -> 'relatedArticleIds');
  v_related_ids := coalesce(v_related_ids, '{}'::uuid[]);
  if cardinality(v_related_ids) > 3 then
    raise exception 'La propuesta supera el máximo de artículos relacionados.' using errcode = '22023';
  end if;
  if cardinality(v_related_ids) > 0 then
    select coalesce(jsonb_agg(jsonb_build_object(
      'type', 'articuloRelacionado',
      'attrs', jsonb_build_object(
        'articuloId', article.id,
        'slug', article.slug,
        'titulo', article.title,
        'resumen', article.summary,
        'categoria', coalesce(category.name, 'Sin categoría'),
        'imagen', ''
      )
    )), '[]'::jsonb)
    into v_related_blocks
    from public.articles article
    left join public.categories category on category.id = article.category_id
    where article.id = any(v_related_ids)
      and article.status = 'published'
      and article.published_version_id is not null;
    if jsonb_array_length(v_related_blocks) <> cardinality(v_related_ids) then
      raise exception 'Una noticia relacionada no está publicada.' using errcode = '22023';
    end if;
    v_article_body_json := jsonb_set(
      v_article_body_json,
      '{content}',
      (v_article_body_json -> 'content') || v_related_blocks
    );
  end if;

  select publisher into v_source_name
  from jsonb_to_recordset(p_input -> 'sources') as sources(url text, publisher text)
  where url = v_source_url limit 1;

  v_slug_base := trim(both '-' from regexp_replace(
    translate(lower(v_title), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', '-', 'g'
  ));
  if char_length(v_slug_base) not between 3 and 120 then
    raise exception 'El título no produce un slug válido.' using errcode = '22023';
  end if;
  v_slug := left(v_slug_base, 108) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  insert into public.articles (
    slug, title, summary, body, body_json, status, category_id, cover_media_id,
    author_id, seo_title, seo_description, social_brief, content_type,
    source_origin, source_url, source_name, last_saved_by
  ) values (
    v_slug, v_title, trim(p_input ->> 'summary'), trim(p_input ->> 'body'),
    v_article_body_json, 'review', v_category_id, v_media_id, null,
    trim(p_input ->> 'seoTitle'), trim(p_input ->> 'seoDescription'),
    trim(p_input ->> 'socialBrief'), p_input ->> 'contentType', 'asistenteIa',
    v_source_url, v_source_name, null
  ) returning id into v_article_id;

  insert into public.article_tags (article_id, tag_id, created_by)
  select v_article_id, tag_id, null from unnest(v_tag_ids) as tag_id;

  insert into public.editorial_article_sources (
    article_id, url, title, publisher, published_at, accessed_at,
    source_type, supported_claims
  )
  select
    v_article_id,
    source ->> 'url',
    source ->> 'title',
    source ->> 'publisher',
    nullif(source ->> 'publishedAt', '')::timestamptz,
    (source ->> 'accessedAt')::timestamptz,
    source ->> 'tipo',
    source -> 'claims'
  from jsonb_array_elements(p_input -> 'sources') as sources(source);

  insert into public.editorial_codex_proposals (
    idempotency_key, run_id, category_id, story_fingerprint,
    request_hash, article_id, editorial_flags
  ) values (
    v_idempotency_key, v_run_id, v_category_id, v_story_fingerprint,
    v_request_hash, v_article_id, p_input -> 'editorialFlags'
  );

  insert into public.editorial_audit_log (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    null, 'codex.propuesta_creada_revision', 'article', v_article_id,
    jsonb_build_object(
      'runId', v_run_id,
      'categoryId', v_category_id,
      'sourceCount', jsonb_array_length(p_input -> 'sources'),
      'editorialFlags', p_input -> 'editorialFlags'
    )
  );

  if cardinality(v_created_tag_ids) > 0 then
    insert into public.editorial_audit_log (
      actor_id, action, entity_type, entity_id, metadata
    ) values (
      null, 'codex.temas_publicos_creados', 'article', v_article_id,
      jsonb_build_object('temaIds', v_created_tag_ids, 'runId', v_run_id)
    );
  end if;

  return jsonb_build_object(
    'articleId', v_article_id,
    'estado', 'review',
    'duplicado', false
  );
end;
$$;

revoke all on function public.submit_codex_editorial_proposal(jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_codex_editorial_proposal(jsonb)
  to service_role;

commit;
