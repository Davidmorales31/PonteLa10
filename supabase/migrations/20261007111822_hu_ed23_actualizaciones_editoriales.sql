begin;

alter table public.articles
  add column modified_at timestamptz,
  add column correction_note text,
  add constraint articles_correction_note_length_check
    check (
      correction_note is null
      or pg_catalog.char_length(pg_catalog.btrim(correction_note)) between 1 and 500
    );

comment on column public.articles.published_at is
  'Fecha de la primera publicación pública del artículo; no cambia al republicar.';
comment on column public.articles.modified_at is
  'Fecha de la última actualización publicada; NULL cuando la pieza no se ha actualizado desde su publicación inicial.';
comment on column public.articles.correction_note is
  'Nota opcional para la próxima versión publicada; no se expone desde borradores.';

-- Los snapshots ya contienen la fecha de publicación de cada versión. Usa la
-- primera como fecha original y la versión pública vigente para detectar
-- revisiones republicadas, incluso si published_at no cambió.
with first_publication as (
  select distinct on (version.article_id)
    version.article_id,
    version.id as version_id,
    nullif(version.snapshot ->> 'published_at', '')::timestamptz as published_at
  from public.article_versions as version
  where version.status::text = 'published'
    and nullif(version.snapshot ->> 'published_at', '') is not null
  order by version.article_id, version.version_number, version.created_at, version.id
), current_publication as (
  select
    article.id as article_id,
    version.id as version_id,
    version.created_at as version_created_at,
    nullif(version.snapshot ->> 'published_at', '')::timestamptz as published_at
  from public.articles as article
  inner join public.article_versions as version
    on version.id = article.published_version_id
   and version.article_id = article.id
   and version.status::text = 'published'
)
update public.articles as article
set
  published_at = initial_publication.published_at,
  modified_at = case
    when current_publication.version_id is distinct from initial_publication.version_id
      then current_publication.version_created_at
    else null
  end
from first_publication as initial_publication
left join current_publication
  on current_publication.article_id = initial_publication.article_id
where article.id = initial_publication.article_id
  and (
    article.published_at is distinct from initial_publication.published_at
    or article.modified_at is distinct from case
      when current_publication.version_id is distinct from initial_publication.version_id
        then current_publication.version_created_at
      else null
    end
  );

create or replace function public.preserve_article_publication_dates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  public_content_changed boolean;
begin
  if tg_op = 'INSERT' then
    if new.status::text = 'published' then
      new.published_at := coalesce(new.published_at, pg_catalog.now());
    else
      new.published_at := null;
    end if;
    new.modified_at := null;
    return new;
  end if;

  public_content_changed := row(
    new.slug,
    new.title,
    new.summary,
    new.body,
    new.body_json,
    new.category_id,
    new.cover_media_id,
    new.author_id,
    new.source_origin,
    new.seo_title,
    new.seo_description,
    new.social_brief,
    new.content_type,
    new.source_url,
    new.source_name,
    new.source_author,
    new.credits,
    new.correction_note
  ) is distinct from row(
    old.slug,
    old.title,
    old.summary,
    old.body,
    old.body_json,
    old.category_id,
    old.cover_media_id,
    old.author_id,
    old.source_origin,
    old.seo_title,
    old.seo_description,
    old.social_brief,
    old.content_type,
    old.source_url,
    old.source_name,
    old.source_author,
    old.credits,
    old.correction_note
  );

  if new.status::text = 'published' then
    if old.published_at is not null then
      new.published_at := old.published_at;
    else
      new.published_at := pg_catalog.now();
    end if;

    if old.status::text = 'published' then
      new.modified_at := case
        when public_content_changed then pg_catalog.now()
        else old.modified_at
      end;
    elsif old.published_at is not null or old.published_version_id is not null then
      new.modified_at := pg_catalog.now();
    else
      new.modified_at := null;
    end if;
  else
    new.published_at := old.published_at;
    new.modified_at := old.modified_at;
  end if;

  return new;
end;
$$;

revoke all on function public.preserve_article_publication_dates()
  from public, anon, authenticated, service_role;

drop trigger if exists zzzz_preserve_article_publication_dates on public.articles;
create trigger zzzz_preserve_article_publication_dates
  before insert or update of
    slug,
    title,
    summary,
    body,
    body_json,
    status,
    category_id,
    cover_media_id,
    author_id,
    source_origin,
    seo_title,
    seo_description,
    social_brief,
    content_type,
    source_url,
    source_name,
    source_author,
    credits,
    correction_note,
    published_at,
    modified_at
  on public.articles
  for each row execute function public.preserve_article_publication_dates();

-- El editor conserva lectura directa, pero las modificaciones pasan por los
-- RPC de guardado/transición. Así no se puede publicar un borrador o alterar
-- el puntero público mediante un PATCH autenticado.
revoke update on table public.articles from public, anon, authenticated;
grant update (
  slug,
  title,
  summary,
  body,
  body_json,
  category_id,
  cover_media_id,
  content_type,
  source_url,
  source_name,
  source_author,
  credits,
  seo_title,
  seo_description,
  social_brief,
  correction_note
) on table public.articles to authenticated;

drop policy if exists "articles editorial update" on public.articles;
create policy "articles editorial update"
  on public.articles
  for update
  to authenticated
  using (
    status::text in ('draft', 'changes_requested')
    and (
      public.has_editorial_permission('contenido.editarTodos')
      or (
        author_id = (select auth.uid())
        and public.has_editorial_permission('contenido.editarPropio')
      )
    )
  )
  with check (
    status::text in ('draft', 'changes_requested')
    and (
      public.has_editorial_permission('contenido.editarTodos')
      or (
        author_id = (select auth.uid())
        and public.has_editorial_permission('contenido.editarPropio')
      )
    )
  );

drop policy if exists "article autosaves owner delete" on public.article_autosaves;
create policy "article autosaves owner delete"
  on public.article_autosaves
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.can_edit_article(article_id)
  );

-- Un guardado con nota debe incrementar el control de concurrencia y quedar
-- registrado en el historial existente de versiones.
drop trigger if exists increment_article_lock_version_trigger on public.articles;
create trigger increment_article_lock_version_trigger
  before update of
    slug,
    title,
    summary,
    body,
    body_json,
    status,
    category_id,
    cover_media_id,
    author_id,
    seo_title,
    seo_description,
    social_brief,
    content_type,
    source_origin,
    source_url,
    source_name,
    source_author,
    credits,
    scheduled_at,
    correction_note
  on public.articles
  for each row execute function public.increment_article_lock_version();

drop trigger if exists create_article_version_trigger on public.articles;
create trigger create_article_version_trigger
  after insert or update of
    slug,
    title,
    summary,
    body,
    body_json,
    status,
    category_id,
    cover_media_id,
    author_id,
    seo_title,
    seo_description,
    social_brief,
    content_type,
    source_origin,
    source_url,
    source_name,
    source_author,
    credits,
    scheduled_at,
    correction_note
  on public.articles
  for each row execute function public.create_article_version();

revoke all on function public.increment_article_lock_version()
  from public, anon, authenticated, service_role;
revoke all on function public.create_article_version()
  from public, anon, authenticated, service_role;

-- SECURITY DEFINER estrecho para sincronizar solo metadatos del snapshot
-- recién creado. No concede UPDATE directo sobre article_versions.
create or replace function editorial_private.sync_latest_article_version_metadata(
  target_article_id uuid,
  expected_lock_version integer,
  next_change_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status public.article_status;
  current_lock_version integer;
  latest_version_id uuid;
  normalized_tag_ids uuid[];
  normalized_label_ids uuid[];
  affected_versions integer;
begin
  if (select auth.uid()) is null
    or not public.can_edit_article(target_article_id) then
    raise exception 'No tienes permiso para editar este contenido.';
  end if;

  select article.status, article.lock_version
    into current_status, current_lock_version
  from public.articles as article
  where article.id = target_article_id
  for update;

  if current_status is null
    or current_status::text not in ('draft', 'changes_requested')
    or current_lock_version is distinct from expected_lock_version then
    raise exception 'El contenido cambió o no se puede editar en su estado actual.';
  end if;

  select coalesce(pg_catalog.array_agg(article_tag.tag_id order by article_tag.tag_id), '{}'::uuid[])
    into normalized_tag_ids
  from public.article_tags as article_tag
  where article_tag.article_id = target_article_id;

  select coalesce(pg_catalog.array_agg(article_label.label_id order by article_label.label_id), '{}'::uuid[])
    into normalized_label_ids
  from public.article_labels as article_label
  where article_label.article_id = target_article_id;

  select version.id
    into latest_version_id
  from public.article_versions as version
  where version.article_id = target_article_id
  order by version.version_number desc
  limit 1
  for update;

  if latest_version_id is null then
    raise exception 'No se encontró una versión editorial para este contenido.';
  end if;

  update public.article_versions as version
  set
    snapshot = version.snapshot || pg_catalog.jsonb_build_object(
      'tagIds', pg_catalog.to_jsonb(normalized_tag_ids),
      'labelIds', pg_catalog.to_jsonb(normalized_label_ids)
    ),
    change_note = nullif(pg_catalog.btrim(next_change_note), '')
  where version.id = latest_version_id
    and version.article_id = target_article_id;

  get diagnostics affected_versions = row_count;
  if affected_versions <> 1 then
    raise exception 'No se pudo registrar la versión editorial.';
  end if;
end;
$$;

revoke all on function editorial_private.sync_latest_article_version_metadata(uuid, integer, text)
  from public, anon, authenticated, service_role;
grant usage on schema editorial_private to authenticated;
grant execute on function editorial_private.sync_latest_article_version_metadata(uuid, integer, text)
  to authenticated;

create function public.save_editorial_article_with_correction(
  target_article_id uuid,
  expected_lock_version integer,
  next_slug text,
  next_title text,
  next_summary text,
  next_body text,
  next_body_json jsonb,
  next_category_id uuid,
  next_cover_media_id uuid,
  next_content_type text,
  next_source_url text,
  next_source_name text,
  next_source_author text,
  next_credits text,
  next_seo_title text,
  next_seo_description text,
  next_social_brief text,
  next_tag_ids uuid[],
  next_label_ids uuid[],
  next_change_note text,
  next_correction_note text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_status public.article_status;
  saved_article public.articles%rowtype;
  normalized_tag_ids uuid[];
  normalized_label_ids uuid[];
  normalized_correction_note text;
begin
  if not public.can_edit_article(target_article_id) then
    raise exception 'No tienes permiso para editar este contenido.';
  end if;

  select status
    into current_status
  from public.articles
  where id = target_article_id;

  if current_status is null then
    raise exception 'El contenido no existe.';
  end if;

  if current_status::text not in ('draft', 'changes_requested') then
    raise exception 'El contenido no se puede editar en su estado actual.';
  end if;

  normalized_correction_note := nullif(pg_catalog.btrim(coalesce(next_correction_note, '')), '');
  if pg_catalog.char_length(coalesce(normalized_correction_note, '')) > 500 then
    raise exception 'La nota de corrección no puede superar 500 caracteres.';
  end if;

  if normalized_correction_note is not null and not exists (
    select 1
    from public.articles
    where id = target_article_id
      and (published_version_id is not null or published_at is not null)
  ) then
    raise exception 'La nota de corrección requiere una publicación anterior.';
  end if;

  if next_category_id is not null and not exists (
    select 1
    from public.categories
    where id = next_category_id
      and is_active = true
  ) then
    raise exception 'La sección seleccionada no está disponible.';
  end if;

  if next_cover_media_id is not null and not exists (
    select 1
    from public.media_files
    where id = next_cover_media_id
  ) then
    raise exception 'La portada seleccionada no está disponible.';
  end if;

  select coalesce(array_agg(distinct tag_id), '{}'::uuid[])
    into normalized_tag_ids
  from unnest(coalesce(next_tag_ids, '{}'::uuid[])) as tags(tag_id);

  select coalesce(array_agg(distinct label_id), '{}'::uuid[])
    into normalized_label_ids
  from unnest(coalesce(next_label_ids, '{}'::uuid[])) as labels(label_id);

  if (
    select count(*)
    from public.editorial_tags
    where id = any(normalized_tag_ids)
      and is_active = true
  ) <> cardinality(normalized_tag_ids) then
    raise exception 'Uno o más temas no están disponibles.';
  end if;

  if (
    select count(*)
    from public.editorial_labels
    where id = any(normalized_label_ids)
      and is_active = true
  ) <> cardinality(normalized_label_ids) then
    raise exception 'Una o más etiquetas internas no están disponibles.';
  end if;

  update public.articles
  set
    slug = next_slug,
    title = next_title,
    summary = next_summary,
    body = next_body,
    body_json = next_body_json,
    category_id = next_category_id,
    cover_media_id = next_cover_media_id,
    content_type = next_content_type,
    source_url = nullif(next_source_url, ''),
    source_name = nullif(next_source_name, ''),
    source_author = nullif(next_source_author, ''),
    credits = nullif(next_credits, ''),
    seo_title = nullif(next_seo_title, ''),
    seo_description = nullif(next_seo_description, ''),
    social_brief = nullif(next_social_brief, ''),
    correction_note = normalized_correction_note
  where id = target_article_id
    and lock_version = expected_lock_version
  returning * into saved_article;

  if saved_article.id is null then
    raise exception 'El contenido cambió en otra sesión. Recarga antes de guardar.';
  end if;

  delete from public.article_tags
  where article_id = target_article_id;

  insert into public.article_tags (article_id, tag_id, created_by)
  select target_article_id, tag_id, (select auth.uid())
  from unnest(normalized_tag_ids) as tags(tag_id);

  delete from public.article_labels
  where article_id = target_article_id;

  insert into public.article_labels (article_id, label_id, created_by)
  select target_article_id, label_id, (select auth.uid())
  from unnest(normalized_label_ids) as labels(label_id);

  perform editorial_private.sync_latest_article_version_metadata(
    target_article_id,
    saved_article.lock_version,
    next_change_note
  );

  delete from public.article_autosaves
  where article_id = target_article_id
    and user_id = (select auth.uid());

  return jsonb_build_object(
    'id', saved_article.id,
    'slug', saved_article.slug,
    'lockVersion', saved_article.lock_version,
    'updatedAt', saved_article.updated_at
  );
end;
$$;

revoke all on function public.save_editorial_article_with_correction(
  uuid, integer, text, text, text, text, jsonb, uuid, uuid, text,
  text, text, text, text, text, text, text, uuid[], uuid[], text, text
) from public, anon, authenticated, service_role;
grant execute on function public.save_editorial_article_with_correction(
  uuid, integer, text, text, text, text, jsonb, uuid, uuid, text,
  text, text, text, text, text, text, text, uuid[], uuid[], text, text
) to authenticated;

-- Conserva la firma RPC anterior durante el despliegue gradual del frontend.
create or replace function public.save_editorial_article(
  target_article_id uuid,
  expected_lock_version integer,
  next_slug text,
  next_title text,
  next_summary text,
  next_body text,
  next_body_json jsonb,
  next_category_id uuid,
  next_cover_media_id uuid,
  next_content_type text,
  next_source_url text,
  next_source_name text,
  next_source_author text,
  next_credits text,
  next_seo_title text,
  next_seo_description text,
  next_social_brief text,
  next_tag_ids uuid[],
  next_label_ids uuid[],
  next_change_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_correction_note text;
begin
  select article.correction_note
    into current_correction_note
  from public.articles as article
  where article.id = target_article_id;

  return public.save_editorial_article_with_correction(
    target_article_id,
    expected_lock_version,
    next_slug,
    next_title,
    next_summary,
    next_body,
    next_body_json,
    next_category_id,
    next_cover_media_id,
    next_content_type,
    next_source_url,
    next_source_name,
    next_source_author,
    next_credits,
    next_seo_title,
    next_seo_description,
    next_social_brief,
    next_tag_ids,
    next_label_ids,
    next_change_note,
    current_correction_note
  );
end;
$$;

revoke all on function public.save_editorial_article(
  uuid, integer, text, text, text, text, jsonb, uuid, uuid, text,
  text, text, text, text, text, text, text, uuid[], uuid[], text
) from public, anon, service_role;
grant execute on function public.save_editorial_article(
  uuid, integer, text, text, text, text, jsonb, uuid, uuid, text,
  text, text, text, text, text, text, text, uuid[], uuid[], text
) to authenticated;

create or replace function public.get_public_editorial_article(requested_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', article.id,
    'versionId', version.id,
    'slug', version.snapshot ->> 'slug',
    'titulo', version.snapshot ->> 'title',
    'resumen', version.snapshot ->> 'summary',
    'tipo', version.snapshot ->> 'content_type',
    'documento', coalesce(
      version.snapshot -> 'body_json',
      '{"type":"doc","content":[]}'::jsonb
    ),
    'seoTitulo', coalesce(version.snapshot ->> 'seo_title', ''),
    'seoDescripcion', coalesce(version.snapshot ->> 'seo_description', ''),
    'textoSocial', coalesce(version.snapshot ->> 'social_brief', ''),
    'publicadoEn', article.published_at,
    'modificadoEn', article.modified_at,
    'notaCorreccion', coalesce(nullif(pg_catalog.btrim(version.snapshot ->> 'correction_note'), ''), ''),
    'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
    'categoria', case
      when category.id is null then null
      else jsonb_build_object('slug', category.slug, 'nombre', category.name)
    end,
    'portada', case
      when media.id is null then null
      else jsonb_build_object(
        'bucket', media.bucket,
        'path', media.path,
        'textoAlternativo', coalesce(media.alt, ''),
        'pieDeFoto', coalesce(media.caption, ''),
        'credito', coalesce(media.credit, ''),
        'fuenteFotoUrl', coalesce(media.source_url, ''),
        'ancho', media.width,
        'alto', media.height
      )
    end,
    'fuente', jsonb_build_object(
      'url', coalesce(version.snapshot ->> 'source_url', ''),
      'nombre', coalesce(version.snapshot ->> 'source_name', ''),
      'autor', coalesce(version.snapshot ->> 'source_author', ''),
      'creditos', coalesce(version.snapshot ->> 'credits', '')
    )
  )
  from public.articles as article
  inner join public.article_versions as version
    on version.id = article.published_version_id
   and version.article_id = article.id
   and version.status::text = 'published'
  left join public.categories as category
    on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
  left join public.media_files as media
    on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
  left join public.user_profiles as profile
    on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
  where version.snapshot ->> 'slug' = requested_slug
    and article.status = 'published'
  limit 1;
$$;

revoke all on function public.get_public_editorial_article(text)
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_editorial_article(text)
  to anon, authenticated;

create or replace function public.list_public_editorial_articles(
  result_limit integer default 20,
  result_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(item order by item ->> 'publicadoEn' desc),
    '[]'::jsonb
  )
  from (
    select jsonb_build_object(
      'id', article.id,
      'slug', version.snapshot ->> 'slug',
      'titulo', version.snapshot ->> 'title',
      'resumen', version.snapshot ->> 'summary',
      'tipo', version.snapshot ->> 'content_type',
      'publicadoEn', article.published_at,
      'modificadoEn', article.modified_at,
      'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
      'categoria', coalesce(category.name, 'Actualidad'),
      'imagenBucket', coalesce(media.bucket, ''),
      'imagenPath', coalesce(media.path, ''),
      'lecturaMinutos', public.editorial_reading_minutes(version.snapshot -> 'body_json')
    ) as item
    from public.articles as article
    inner join public.article_versions as version
      on version.id = article.published_version_id
     and version.article_id = article.id
     and version.status::text = 'published'
    left join public.categories as category
      on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
    left join public.media_files as media
      on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
    left join public.user_profiles as profile
      on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
    where article.status = 'published'
      and article.published_version_id is not null
    order by article.published_at desc nulls last, article.id
    limit least(greatest(result_limit, 1), 50)
    offset greatest(result_offset, 0)
  ) as published_items;
$$;

revoke all on function public.list_public_editorial_articles(integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_public_editorial_articles(integer, integer)
  to anon, authenticated;

create or replace function public.list_public_editorial_articles_filtered(
  result_limit integer,
  result_offset integer,
  filter_category_slug text,
  filter_category_terms text[],
  filter_topic_slug text,
  filter_search text
)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  select coalesce(
    pg_catalog.jsonb_agg(
      published_item.item
      order by published_item.publication_date desc nulls last, published_item.article_id
    ),
    '[]'::jsonb
  )
  from (
    select
      article.id as article_id,
      article.published_at as publication_date,
      pg_catalog.jsonb_build_object(
        'id', article.id,
        'slug', version.snapshot ->> 'slug',
        'titulo', version.snapshot ->> 'title',
        'resumen', version.snapshot ->> 'summary',
        'tipo', version.snapshot ->> 'content_type',
        'publicadoEn', article.published_at,
        'modificadoEn', article.modified_at,
        'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
        'categoria', coalesce(category.name, 'Actualidad'),
        'imagenBucket', coalesce(media.bucket, ''),
        'imagenPath', coalesce(media.path, ''),
        'lecturaMinutos', public.editorial_reading_minutes(version.snapshot -> 'body_json')
      ) as item
    from public.articles as article
    inner join public.article_versions as version
      on version.id = article.published_version_id
     and version.article_id = article.id
     and version.status::text = 'published'
    left join public.categories as category
      on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
    left join public.media_files as media
      on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
    left join public.user_profiles as profile
      on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
    where article.status = 'published'
      and article.published_version_id is not null
      and case
        when filter_category_slug is not null
          and pg_catalog.char_length(filter_category_slug) > 80 then false
        when filter_category_slug is not null
          and filter_category_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then false
        when filter_topic_slug is not null
          and pg_catalog.char_length(filter_topic_slug) > 80 then false
        when filter_topic_slug is not null
          and filter_topic_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then false
        when filter_search is not null and pg_catalog.char_length(filter_search) > 120 then false
        when pg_catalog.cardinality(coalesce(filter_category_terms, '{}'::text[])) > 4 then false
        when filter_category_slug is null
          and pg_catalog.cardinality(coalesce(filter_category_terms, '{}'::text[])) > 0 then false
        when exists (
          select 1
          from pg_catalog.unnest(coalesce(filter_category_terms, '{}'::text[])) as category_term(value)
          where category_term.value is null
        ) then false
        when exists (
          select 1
          from pg_catalog.unnest(coalesce(filter_category_terms, '{}'::text[])) as category_term(value)
          where pg_catalog.char_length(category_term.value) > 120
        ) then false
        when exists (
          select 1
          from pg_catalog.unnest(coalesce(filter_category_terms, '{}'::text[])) as category_term(value)
          where pg_catalog.btrim(category_term.value) = ''
        ) then false
        else
          (
            filter_category_slug is null
            or category.slug = filter_category_slug
            or (
              filter_category_slug is distinct from 'futbol-colombiano'
              and exists (
                select 1
                from pg_catalog.unnest(coalesce(filter_category_terms, '{}'::text[])) as category_term(value)
                where pg_catalog.strpos(
                  public.normalize_public_article_filter_text(
                    pg_catalog.concat_ws(
                      ' ',
                      version.snapshot ->> 'title',
                      version.snapshot ->> 'summary',
                      category.name
                    )
                  ),
                  public.normalize_public_article_filter_text(category_term.value)
                ) > 0
              )
            )
          )
          and (
            filter_topic_slug is null
            or exists (
              select 1
              from public.editorial_tags as topic
              inner join public.article_tags as article_topic
                on article_topic.tag_id = topic.id
              where topic.slug = filter_topic_slug
                and topic.is_active
                and article_topic.article_id = article.id
            )
          )
          and (
            filter_search is null
            or pg_catalog.strpos(
              public.normalize_public_article_filter_text(
                pg_catalog.concat_ws(
                  ' ',
                  version.snapshot ->> 'title',
                  version.snapshot ->> 'summary',
                  category.name
                )
              ),
              public.normalize_public_article_filter_text(filter_search)
            ) > 0
          )
      end
    order by publication_date desc nulls last, article.id
    limit least(greatest(coalesce(result_limit, 20), 1), 50)
    offset least(greatest(coalesce(result_offset, 0), 0), 100_000)
  ) as published_item;
$function$;

revoke all on function public.list_public_editorial_articles_filtered(integer, integer, text, text[], text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.list_public_editorial_articles_filtered(integer, integer, text, text[], text, text)
  to anon, authenticated;

create or replace function public.list_public_editorial_articles_for_entity(
  requested_entity_type text,
  requested_entity_slug text,
  result_limit integer default 6,
  result_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if requested_entity_type is null
    or requested_entity_type not in ('article', 'match', 'team', 'player', 'competition')
    or requested_entity_slug is null
    or requested_entity_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or pg_catalog.char_length(requested_entity_slug) > 120 then
    return '[]'::jsonb;
  end if;

  return (
    select coalesce(
      pg_catalog.jsonb_agg(
        selected.item
        order by selected.published_at desc nulls last, selected.relation_priority
      ),
      '[]'::jsonb
    )
    from (
      select
        pg_catalog.jsonb_build_object(
          'id', article.id,
          'slug', version.snapshot ->> 'slug',
          'titulo', version.snapshot ->> 'title',
          'resumen', version.snapshot ->> 'summary',
          'tipo', version.snapshot ->> 'content_type',
          'publicadoEn', article.published_at,
          'modificadoEn', article.modified_at,
          'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
          'categoria', coalesce(category.name, 'Actualidad'),
          'imagenBucket', coalesce(media.bucket, ''),
          'imagenPath', coalesce(media.path, ''),
          'lecturaMinutos', public.editorial_reading_minutes(version.snapshot -> 'body_json')
        ) as item,
        article.published_at as published_at,
        case entity_relation.relation_type
          when 'about' then 0
          when 'mentions' then 1
          else 2
        end as relation_priority
      from public.editorial_article_entity_relations as entity_relation
      inner join public.articles as article
        on article.id = entity_relation.article_id
      inner join public.article_versions as version
        on version.id = article.published_version_id
       and version.article_id = article.id
       and version.status::text = 'published'
      left join public.categories as category
        on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
      left join public.media_files as media
        on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
      left join public.user_profiles as profile
        on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
      where entity_relation.entity_type = requested_entity_type
        and entity_relation.entity_slug = requested_entity_slug
        and entity_relation.status = 'confirmed'
        and article.status = 'published'
        and article.published_version_id is not null
      order by published_at desc nulls last, relation_priority
      limit least(greatest(coalesce(result_limit, 6), 1), 50)
      offset least(greatest(coalesce(result_offset, 0), 0), 5000)
    ) as selected
  );
end;
$$;

revoke all on function public.list_public_editorial_articles_for_entity(text, text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_public_editorial_articles_for_entity(text, text, integer, integer)
  to anon, authenticated;

create or replace function public.get_public_editorial_latest_article_with_cover()
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
    'publicadoEn', article.published_at,
    'modificadoEn', article.modified_at,
    'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
    'categoria', coalesce(category.name, 'Actualidad'),
    'imagenBucket', media.bucket,
    'imagenPath', media.path,
    'lecturaMinutos', public.editorial_reading_minutes(version.snapshot -> 'body_json')
  )
  from public.articles as article
  inner join public.article_versions as version
    on version.id = article.published_version_id
   and version.article_id = article.id
   and version.status::text = 'published'
  inner join public.media_files as media
    on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
  inner join storage.buckets as bucket
    on bucket.id = media.bucket
    and bucket.public is true
  inner join storage.objects as stored_object
    on stored_object.bucket_id = media.bucket
    and stored_object.name = media.path
  left join public.categories as category
    on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
  left join public.user_profiles as profile
    on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
  where article.status = 'published'
    and article.published_version_id is not null
    and nullif(pg_catalog.btrim(media.bucket), '') is not null
    and nullif(pg_catalog.btrim(media.path), '') is not null
    and media.mime_type like 'image/%'
  order by article.published_at desc nulls last, article.id
  limit 1;
$$;

revoke all on function public.get_public_editorial_latest_article_with_cover()
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_editorial_latest_article_with_cover()
  to anon, authenticated;

commit;
