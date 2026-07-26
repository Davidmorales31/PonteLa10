alter table public.articles
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_at timestamptz;

create table if not exists public.article_review_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  comment_type text not null default 'comment'
    check (comment_type in ('comment', 'changes_requested', 'approval', 'transition')),
  body text not null check (char_length(trim(body)) between 3 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_article_review_comments_article
  on public.article_review_comments (article_id, created_at desc);

create index if not exists idx_articles_scheduled_publication
  on public.articles (scheduled_at)
  where status = 'scheduled';

create index if not exists idx_articles_published_version
  on public.articles (published_version_id)
  where published_version_id is not null;

alter table public.article_review_comments enable row level security;

drop policy if exists "review comments editorial read" on public.article_review_comments;
create policy "review comments editorial read"
  on public.article_review_comments for select
  to authenticated
  using (
    public.has_editorial_permission('contenido.verBorradores')
  );

drop policy if exists "review comments editorial insert" on public.article_review_comments;
create policy "review comments editorial insert"
  on public.article_review_comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      public.has_editorial_permission('contenido.revisar')
      or public.has_editorial_permission('contenido.aprobar')
      or exists (
        select 1
        from public.articles
        where articles.id = article_review_comments.article_id
          and articles.author_id = (select auth.uid())
          and public.has_editorial_permission('contenido.editarPropio')
      )
    )
  );

grant select, insert on public.article_review_comments to authenticated;

create or replace function public.validate_article_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_status text := case when tg_op = 'UPDATE' then old.status::text else null end;
  target_status text := new.status::text;
  transition_allowed boolean := false;
begin
  if (select auth.role()) = 'service_role' or (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if target_status <> 'draft' then
      raise exception 'Los contenidos nuevos deben iniciar como borrador.';
    end if;
    return new;
  end if;

  if old.status = new.status then
    return new;
  end if;

  transition_allowed := case previous_status
    when 'draft' then target_status in ('review', 'archived')
    when 'changes_requested' then target_status in ('review', 'archived')
    when 'review' then target_status in ('changes_requested', 'approved', 'archived')
    when 'approved' then target_status in ('changes_requested', 'scheduled', 'published', 'archived')
    when 'scheduled' then target_status in ('changes_requested', 'approved', 'published', 'archived')
    when 'published' then target_status in ('draft', 'archived')
    when 'archived' then target_status = 'draft'
    else false
  end;

  if not transition_allowed then
    raise exception 'La transición editorial de % a % no está permitida.',
      previous_status,
      target_status;
  end if;

  if target_status = 'draft'
    and not public.has_editorial_permission('contenido.editarTodos') then
    raise exception 'Reabrir una publicación requiere permiso de edición global.';
  elsif target_status = 'review'
    and not public.has_editorial_permission('contenido.enviarRevision') then
    raise exception 'No tienes permiso para enviar contenido a revisión.';
  elsif target_status = 'changes_requested'
    and not public.has_editorial_permission('contenido.revisar') then
    raise exception 'No tienes permiso para solicitar cambios.';
  elsif target_status = 'approved'
    and not public.has_editorial_permission('contenido.aprobar') then
    raise exception 'No tienes permiso para aprobar contenido.';
  elsif target_status = 'scheduled'
    and (
      not public.has_editorial_permission('contenido.programar')
      or not public.has_aal2()
    ) then
    raise exception 'Programar contenido requiere permiso y MFA.';
  elsif target_status = 'published'
    and (
      not public.has_editorial_permission('contenido.publicar')
      or not public.has_aal2()
    ) then
    raise exception 'Publicar contenido requiere permiso y MFA.';
  elsif target_status = 'archived'
    and not public.has_editorial_permission('contenido.archivar') then
    raise exception 'No tienes permiso para archivar contenido.';
  end if;

  if target_status in ('review', 'approved', 'scheduled', 'published') then
    if char_length(trim(new.title)) < 8 then
      raise exception 'El contenido necesita un título editorial válido.';
    end if;

    if char_length(trim(new.summary)) < 20 then
      raise exception 'El contenido necesita un resumen de al menos 20 caracteres.';
    end if;

    if new.category_id is null then
      raise exception 'Selecciona una sección antes de continuar.';
    end if;

    if jsonb_array_length(coalesce(new.body_json -> 'content', '[]'::jsonb)) = 0 then
      raise exception 'El contenido necesita cuerpo editorial antes de continuar.';
    end if;

    if new.source_origin::text <> 'manual'
      and coalesce(trim(new.source_url), '') = '' then
      raise exception 'Los contenidos importados necesitan una URL de origen.';
    end if;
  end if;

  if target_status in ('approved', 'scheduled', 'published') then
    if new.cover_media_id is null then
      raise exception 'Selecciona una portada antes de aprobar o publicar.';
    end if;

    if char_length(trim(coalesce(new.seo_description, ''))) < 40 then
      raise exception 'Completa una descripción SEO de al menos 40 caracteres.';
    end if;
  end if;

  if target_status = 'scheduled' then
    if new.scheduled_at is null or new.scheduled_at <= now() + interval '4 minutes' then
      raise exception 'La programación debe quedar al menos cinco minutos en el futuro.';
    end if;

    if new.scheduled_at > now() + interval '1 year' then
      raise exception 'La programación no puede superar un año.';
    end if;
  end if;

  if target_status = 'published' and new.published_at is null then
    raise exception 'La publicación requiere fecha de publicación.';
  end if;

  return new;
end;
$$;

create or replace function public.transition_editorial_article(
  target_article_id uuid,
  expected_lock_version integer,
  target_status public.article_status,
  transition_note text default '',
  target_scheduled_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_article public.articles%rowtype;
  updated_article public.articles%rowtype;
  clean_note text := trim(coalesce(transition_note, ''));
  comment_kind text := 'transition';
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select *
    into current_article
  from public.articles
  where id = target_article_id
  for update;

  if not found then
    raise exception 'El contenido no existe.';
  end if;

  if current_article.lock_version <> expected_lock_version then
    raise exception 'El contenido cambió en otra sesión.';
  end if;

  if target_status::text = 'review'
    and not public.can_edit_article(target_article_id) then
    raise exception 'No tienes permiso para enviar este contenido a revisión.';
  end if;

  if target_status::text = 'changes_requested' and char_length(clean_note) < 10 then
    raise exception 'Explica los cambios solicitados con al menos 10 caracteres.';
  end if;

  if target_status::text = 'scheduled' and target_scheduled_at is null then
    raise exception 'Selecciona la fecha y hora de publicación.';
  end if;

  update public.articles
  set
    status = target_status,
    reviewed_by = case
      when target_status::text = 'changes_requested' then (select auth.uid())
      when target_status::text = 'draft' then null
      else reviewed_by
    end,
    reviewed_at = case
      when target_status::text = 'changes_requested' then now()
      when target_status::text = 'draft' then null
      else reviewed_at
    end,
    approved_by = case
      when target_status::text = 'approved' then (select auth.uid())
      when target_status::text in ('draft', 'changes_requested', 'review') then null
      else approved_by
    end,
    approved_at = case
      when target_status::text = 'approved' then now()
      when target_status::text in ('draft', 'changes_requested', 'review') then null
      else approved_at
    end,
    scheduled_at = case
      when target_status::text = 'scheduled' then target_scheduled_at
      when target_status::text in ('draft', 'changes_requested', 'review', 'approved', 'archived') then null
      else scheduled_at
    end,
    published_at = case
      when target_status::text = 'published' then now()
      else published_at
    end,
    published_version_id = case
      when target_status::text = 'archived' then null
      else published_version_id
    end,
    last_saved_by = (select auth.uid())
  where id = target_article_id
  returning * into updated_article;

  update public.article_versions
  set change_note = nullif(clean_note, '')
  where id = (
    select id
    from public.article_versions
    where article_id = target_article_id
    order by version_number desc
    limit 1
  );

  if clean_note <> '' then
    comment_kind := case target_status::text
      when 'changes_requested' then 'changes_requested'
      when 'approved' then 'approval'
      else 'transition'
    end;

    insert into public.article_review_comments (
      article_id,
      author_id,
      comment_type,
      body
    ) values (
      target_article_id,
      (select auth.uid()),
      comment_kind,
      clean_note
    );
  end if;

  return jsonb_build_object(
    'id', updated_article.id,
    'estado', updated_article.status::text,
    'versionBloqueo', updated_article.lock_version,
    'programadoPara', updated_article.scheduled_at,
    'publicadoEn', updated_article.published_at,
    'actualizadoEn', updated_article.updated_at
  );
end;
$$;

create or replace function public.publish_due_editorial_articles()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  published_count integer := 0;
begin
  update public.articles
  set
    status = 'published',
    published_at = now()
  where status = 'scheduled'
    and scheduled_at <= now();

  get diagnostics published_count = row_count;
  return published_count;
end;
$$;

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
    'publicadoEn', version.snapshot ->> 'published_at',
    'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
    'categoria', case
      when category.id is null then null
      else jsonb_build_object(
        'slug', category.slug,
        'nombre', category.name
      )
    end,
    'portada', case
      when media.id is null then null
      else jsonb_build_object(
        'bucket', media.bucket,
        'path', media.path,
        'textoAlternativo', coalesce(media.alt, ''),
        'pieDeFoto', coalesce(media.caption, ''),
        'credito', coalesce(media.credit, ''),
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
  left join public.categories as category
    on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
  left join public.media_files as media
    on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
  left join public.user_profiles as profile
    on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
  where version.snapshot ->> 'slug' = requested_slug
    and article.status::text <> 'archived'
  limit 1;
$$;

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
      'publicadoEn', version.snapshot ->> 'published_at',
      'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
      'categoria', coalesce(category.name, 'Actualidad'),
      'imagenBucket', coalesce(media.bucket, ''),
      'imagenPath', coalesce(media.path, '')
    ) as item
    from public.articles as article
    inner join public.article_versions as version
      on version.id = article.published_version_id
    left join public.categories as category
      on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
    left join public.media_files as media
      on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
    left join public.user_profiles as profile
      on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
    where article.status::text <> 'archived'
    order by (version.snapshot ->> 'published_at')::timestamptz desc
    limit least(greatest(result_limit, 1), 50)
    offset greatest(result_offset, 0)
  ) as published_items;
$$;

revoke all on function public.transition_editorial_article(
  uuid,
  integer,
  public.article_status,
  text,
  timestamptz
) from public;

revoke all on function public.publish_due_editorial_articles() from public;
revoke all on function public.get_public_editorial_article(text) from public;
revoke all on function public.list_public_editorial_articles(integer, integer) from public;

grant execute on function public.transition_editorial_article(
  uuid,
  integer,
  public.article_status,
  text,
  timestamptz
) to authenticated;

grant execute on function public.get_public_editorial_article(text) to anon, authenticated;
grant execute on function public.list_public_editorial_articles(integer, integer)
  to anon, authenticated;
