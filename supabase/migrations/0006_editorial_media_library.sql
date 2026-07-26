alter table public.media_files
  add column if not exists original_name text,
  add column if not exists title text,
  add column if not exists caption text,
  add column if not exists credit text,
  add column if not exists source_url text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists file_hash text,
  add column if not exists is_decorative boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

update public.media_files
set
  original_name = coalesce(nullif(original_name, ''), split_part(path, '/', -1)),
  title = coalesce(nullif(title, ''), split_part(path, '/', -1)),
  is_decorative = case
    when coalesce(trim(alt), '') = '' then true
    else is_decorative
  end
where original_name is null
  or title is null
  or (coalesce(trim(alt), '') = '' and not is_decorative);

alter table public.media_files
  alter column original_name set not null,
  alter column title set not null,
  drop constraint if exists media_files_title_length_check,
  add constraint media_files_title_length_check
    check (char_length(trim(title)) between 2 and 160),
  drop constraint if exists media_files_alt_accessibility_check,
  add constraint media_files_alt_accessibility_check
    check (
      is_decorative
      or char_length(trim(coalesce(alt, ''))) between 5 and 240
    ),
  drop constraint if exists media_files_caption_length_check,
  add constraint media_files_caption_length_check
    check (caption is null or char_length(caption) <= 500),
  drop constraint if exists media_files_credit_length_check,
  add constraint media_files_credit_length_check
    check (credit is null or char_length(credit) <= 300),
  drop constraint if exists media_files_source_url_length_check,
  add constraint media_files_source_url_length_check
    check (source_url is null or char_length(source_url) <= 2048),
  drop constraint if exists media_files_dimensions_check,
  add constraint media_files_dimensions_check
    check (
      (width is null and height is null)
      or (width > 0 and height > 0)
    ),
  drop constraint if exists media_files_size_positive_check,
  add constraint media_files_size_positive_check
    check (size_bytes is null or size_bytes > 0);

create unique index if not exists idx_media_files_hash
  on public.media_files (file_hash)
  where file_hash is not null;

create index if not exists idx_media_files_library
  on public.media_files (created_at desc, id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'editorial-media',
  'editorial-media',
  true,
  12582912,
  array['image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "editorial media public read" on storage.objects;
create policy "editorial media public read"
  on storage.objects for select
  using (bucket_id = 'editorial-media');

drop policy if exists "editorial media authorized insert" on storage.objects;
create policy "editorial media authorized insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'editorial-media'
    and public.has_editorial_permission('media.subir')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "editorial media authorized update" on storage.objects;
create policy "editorial media authorized update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'editorial-media'
    and public.has_editorial_permission('media.editar')
  )
  with check (
    bucket_id = 'editorial-media'
    and public.has_editorial_permission('media.editar')
  );

drop policy if exists "editorial media protected delete" on storage.objects;
create policy "editorial media protected delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'editorial-media'
    and (
      (
        public.has_editorial_permission('media.eliminar')
        and public.has_aal2()
      )
      or (
        public.has_editorial_permission('media.subir')
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and not exists (
          select 1
          from public.media_files
          where bucket = bucket_id
            and path = name
        )
      )
    )
  );

create or replace function public.set_media_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_media_updated_at_trigger on public.media_files;
create trigger set_media_updated_at_trigger
  before update on public.media_files
  for each row execute function public.set_media_updated_at();

create or replace function public.prevent_referenced_media_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.articles
    where cover_media_id = old.id
  ) then
    raise exception 'No puedes eliminar una imagen usada como portada.';
  end if;

  return old;
end;
$$;

drop trigger if exists prevent_referenced_media_delete_trigger on public.media_files;
create trigger prevent_referenced_media_delete_trigger
  before delete on public.media_files
  for each row execute function public.prevent_referenced_media_delete();

create or replace function public.audit_media_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.editorial_audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    (select auth.uid()),
    lower(tg_op),
    'media_files',
    coalesce(new.id, old.id),
    jsonb_build_object(
      'path', coalesce(new.path, old.path),
      'title', coalesce(new.title, old.title),
      'mimeType', coalesce(new.mime_type, old.mime_type)
    )
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_media_change_trigger on public.media_files;
create trigger audit_media_change_trigger
  after insert or update or delete on public.media_files
  for each row execute function public.audit_media_change();

drop function if exists public.save_editorial_article(
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
);

create function public.save_editorial_article(
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

revoke all on function public.save_editorial_article(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  jsonb,
  uuid,
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
