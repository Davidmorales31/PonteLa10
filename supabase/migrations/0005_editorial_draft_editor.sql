alter table public.articles
  add column if not exists source_name text,
  add column if not exists source_author text,
  add column if not exists credits text;

alter table public.articles
  drop constraint if exists articles_title_length_check,
  add constraint articles_title_length_check
    check (char_length(trim(title)) between 8 and 160),
  drop constraint if exists articles_summary_length_check,
  add constraint articles_summary_length_check
    check (char_length(summary) <= 320),
  drop constraint if exists articles_slug_format_check,
  add constraint articles_slug_format_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  drop constraint if exists articles_seo_title_length_check,
  add constraint articles_seo_title_length_check
    check (seo_title is null or char_length(seo_title) <= 70),
  drop constraint if exists articles_seo_description_length_check,
  add constraint articles_seo_description_length_check
    check (seo_description is null or char_length(seo_description) <= 170),
  drop constraint if exists articles_source_url_length_check,
  add constraint articles_source_url_length_check
    check (source_url is null or char_length(source_url) <= 2048),
  drop constraint if exists articles_source_name_length_check,
  add constraint articles_source_name_length_check
    check (source_name is null or char_length(source_name) <= 160),
  drop constraint if exists articles_source_author_length_check,
  add constraint articles_source_author_length_check
    check (source_author is null or char_length(source_author) <= 160),
  drop constraint if exists articles_credits_length_check,
  add constraint articles_credits_length_check
    check (credits is null or char_length(credits) <= 500),
  drop constraint if exists articles_body_length_check,
  add constraint articles_body_length_check
    check (char_length(body) <= 100000);

create or replace function public.save_editorial_article(
  target_article_id uuid,
  expected_lock_version integer,
  next_slug text,
  next_title text,
  next_summary text,
  next_body text,
  next_body_json jsonb,
  next_category_id uuid,
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
  current_status public.article_status;
  saved_article public.articles%rowtype;
  normalized_tag_ids uuid[];
  normalized_label_ids uuid[];
  latest_version_id uuid;
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

  if next_category_id is not null and not exists (
    select 1
    from public.categories
    where id = next_category_id
      and is_active = true
  ) then
    raise exception 'La sección seleccionada no está disponible.';
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
    content_type = next_content_type,
    source_url = nullif(next_source_url, ''),
    source_name = nullif(next_source_name, ''),
    source_author = nullif(next_source_author, ''),
    credits = nullif(next_credits, ''),
    seo_title = nullif(next_seo_title, ''),
    seo_description = nullif(next_seo_description, ''),
    social_brief = nullif(next_social_brief, '')
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

  select id
    into latest_version_id
  from public.article_versions
  where article_id = target_article_id
  order by version_number desc
  limit 1;

  update public.article_versions
  set
    snapshot = snapshot || jsonb_build_object(
      'tagIds',
      to_jsonb(normalized_tag_ids),
      'labelIds',
      to_jsonb(normalized_label_ids)
    ),
    change_note = nullif(next_change_note, '')
  where id = latest_version_id;

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
    scheduled_at
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
    scheduled_at
  on public.articles
  for each row execute function public.create_article_version();

revoke all on function public.save_editorial_article(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  jsonb,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid[],
  uuid[],
  text
) from public;

grant execute on function public.save_editorial_article(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  jsonb,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid[],
  uuid[],
  text
) to authenticated;
