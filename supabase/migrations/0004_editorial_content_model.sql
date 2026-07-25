alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null,
  add column if not exists display_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.editorial_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_tags_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.editorial_labels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  color text not null default '#174EA6',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_labels_slug_format
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint editorial_labels_color_format
    check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.editorial_tags(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (article_id, tag_id)
);

create table if not exists public.article_labels (
  article_id uuid not null references public.articles(id) on delete cascade,
  label_id uuid not null references public.editorial_labels(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (article_id, label_id)
);

alter table public.articles
  add column if not exists body_json jsonb,
  add column if not exists lock_version integer not null default 1,
  add column if not exists published_version_id uuid,
  add column if not exists scheduled_at timestamptz,
  add column if not exists last_saved_by uuid references auth.users(id) on delete set null;

alter table public.articles
  drop constraint if exists articles_content_type_check,
  add constraint articles_content_type_check
    check (
      content_type in (
        'breve',
        'noticia',
        'analisis',
        'blog',
        'informe',
        'opinion',
        'especial'
      )
    ),
  drop constraint if exists articles_source_origin_check,
  add constraint articles_source_origin_check
    check (source_origin in ('manual', 'ingesta', 'importacion', 'asistenteIa'));

update public.articles
set body_json = case
  when length(trim(body)) > 0 then jsonb_build_object(
    'type', 'doc',
    'content', jsonb_build_array(
      jsonb_build_object(
        'type', 'paragraph',
        'content', jsonb_build_array(
          jsonb_build_object('type', 'text', 'text', body)
        )
      )
    )
  )
  else '{"type":"doc","content":[]}'::jsonb
end
where body_json is null;

alter table public.articles
  alter column body_json set default '{"type":"doc","content":[]}'::jsonb,
  alter column body_json set not null;

alter table public.articles
  drop constraint if exists articles_body_json_object_check,
  add constraint articles_body_json_object_check
    check (
      jsonb_typeof(body_json) = 'object'
      and body_json ->> 'type' = 'doc'
      and jsonb_typeof(coalesce(body_json -> 'content', '[]'::jsonb)) = 'array'
    ),
  drop constraint if exists articles_lock_version_positive_check,
  add constraint articles_lock_version_positive_check
    check (lock_version > 0);

alter table public.article_versions
  add column if not exists version_type text not null default 'manual',
  add column if not exists change_note text;

alter table public.article_versions
  drop constraint if exists article_versions_version_type_check,
  add constraint article_versions_version_type_check
    check (version_type in ('initial', 'manual', 'transition', 'publication', 'restore'));

alter table public.articles
  drop constraint if exists articles_published_version_id_fkey,
  add constraint articles_published_version_id_fkey
    foreign key (published_version_id)
    references public.article_versions(id)
    on delete set null;

create table if not exists public.article_autosaves (
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  base_lock_version integer not null check (base_lock_version > 0),
  snapshot jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (article_id, user_id),
  constraint article_autosaves_snapshot_object_check
    check (jsonb_typeof(snapshot) = 'object')
);

create index if not exists idx_categories_order
  on public.categories (display_order, name);

create index if not exists idx_editorial_tags_active_name
  on public.editorial_tags (is_active, name);

create index if not exists idx_editorial_labels_active_name
  on public.editorial_labels (is_active, name);

create index if not exists idx_article_tags_tag
  on public.article_tags (tag_id, article_id);

create index if not exists idx_article_labels_label
  on public.article_labels (label_id, article_id);

create index if not exists idx_articles_editorial_inbox
  on public.articles (status, updated_at desc);

create index if not exists idx_articles_content_type
  on public.articles (content_type, updated_at desc);

create index if not exists idx_articles_source_origin
  on public.articles (source_origin, updated_at desc);

insert into public.categories (
  slug,
  name,
  description,
  display_order
) values
  ('futbol-mundial', 'Fútbol mundial', 'Clubes, selecciones y torneos internacionales.', 10),
  ('futbol-colombiano', 'Fútbol colombiano', 'Liga, selección y protagonistas nacionales.', 20),
  ('tecnologia-deportiva', 'Tecnología deportiva', 'Innovación, datos y productos aplicados al deporte.', 30),
  ('gaming-deportivo', 'Gaming deportivo', 'Videojuegos, esports y cultura competitiva.', 40),
  ('tendencias', 'Tendencias', 'Historias y conversaciones que mueven el deporte.', 50),
  ('especiales', 'Especiales', 'Coberturas y experiencias editoriales de Pont3la10.', 60),
  ('opinion', 'Opinión', 'Columnas y puntos de vista del equipo editorial.', 70)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.editorial_labels (
  slug,
  name,
  color
) values
  ('urgente', 'Urgente', '#E30613'),
  ('revisar-fuente', 'Revisar fuente', '#174EA6'),
  ('requiere-creditos', 'Requiere créditos', '#815E00'),
  ('contiene-video', 'Contiene video', '#16803A')
on conflict (slug) do update
set
  name = excluded.name,
  color = excluded.color,
  updated_at = now();

create or replace function public.increment_article_lock_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.lock_version := old.lock_version + 1;
  new.updated_at := now();
  new.last_saved_by := coalesce((select auth.uid()), new.last_saved_by);
  return new;
end;
$$;

create or replace function public.can_edit_article(target_article_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_editorial_permission('contenido.editarTodos')
    or (
      public.has_editorial_permission('contenido.editarPropio')
      and exists (
        select 1
        from public.articles
        where id = target_article_id
          and author_id = (select auth.uid())
      )
    );
$$;

create or replace function public.create_article_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version integer;
  created_version_id uuid;
  current_version_type text;
begin
  select coalesce(max(version_number), 0) + 1
    into next_version
  from public.article_versions
  where article_id = new.id;

  current_version_type := case
    when tg_op = 'INSERT' then 'initial'
    when new.status::text = 'published' then 'publication'
    when old.status is distinct from new.status then 'transition'
    else 'manual'
  end;

  insert into public.article_versions (
    article_id,
    version_number,
    status,
    snapshot,
    created_by,
    version_type
  ) values (
    new.id,
    next_version,
    new.status,
    to_jsonb(new),
    (select auth.uid()),
    current_version_type
  )
  returning id into created_version_id;

  if new.status::text = 'published' then
    update public.articles
    set published_version_id = created_version_id
    where id = new.id;
  end if;

  return new;
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
    scheduled_at
  on public.articles
  for each row execute function public.create_article_version();

update public.articles as article
set published_version_id = (
  select version.id
  from public.article_versions as version
  where version.article_id = article.id
    and version.status::text = 'published'
  order by version.version_number desc
  limit 1
)
where article.status::text = 'published'
  and article.published_version_id is null
  and exists (
    select 1
    from public.article_versions as version
    where version.article_id = article.id
      and version.status::text = 'published'
  );

alter table public.editorial_tags enable row level security;
alter table public.editorial_labels enable row level security;
alter table public.article_tags enable row level security;
alter table public.article_labels enable row level security;
alter table public.article_autosaves enable row level security;

drop policy if exists "editorial tags team read" on public.editorial_tags;
create policy "editorial tags team read"
  on public.editorial_tags for select
  using (public.has_editorial_permission('taxonomia.ver'));

drop policy if exists "editorial tags manage" on public.editorial_tags;
create policy "editorial tags manage"
  on public.editorial_tags for all
  using (public.has_editorial_permission('taxonomia.gestionar'))
  with check (public.has_editorial_permission('taxonomia.gestionar'));

drop policy if exists "editorial labels team read" on public.editorial_labels;
create policy "editorial labels team read"
  on public.editorial_labels for select
  using (public.has_editorial_permission('taxonomia.ver'));

drop policy if exists "editorial labels manage" on public.editorial_labels;
create policy "editorial labels manage"
  on public.editorial_labels for all
  using (public.has_editorial_permission('taxonomia.gestionar'))
  with check (public.has_editorial_permission('taxonomia.gestionar'));

drop policy if exists "article tags team read" on public.article_tags;
create policy "article tags team read"
  on public.article_tags for select
  using (public.has_editorial_permission('contenido.verBorradores'));

drop policy if exists "article tags team write" on public.article_tags;
create policy "article tags team write"
  on public.article_tags for all
  using (public.can_edit_article(article_id))
  with check (public.can_edit_article(article_id));

drop policy if exists "article labels team read" on public.article_labels;
create policy "article labels team read"
  on public.article_labels for select
  using (public.has_editorial_permission('contenido.verBorradores'));

drop policy if exists "article labels team write" on public.article_labels;
create policy "article labels team write"
  on public.article_labels for all
  using (public.can_edit_article(article_id))
  with check (public.can_edit_article(article_id));

drop policy if exists "article autosaves own read" on public.article_autosaves;
create policy "article autosaves own read"
  on public.article_autosaves for select
  using (
    user_id = (select auth.uid())
    and public.has_editorial_permission('contenido.editarPropio')
    and public.can_edit_article(article_id)
  );

drop policy if exists "article autosaves own insert" on public.article_autosaves;
create policy "article autosaves own insert"
  on public.article_autosaves for insert
  with check (
    user_id = (select auth.uid())
    and public.has_editorial_permission('contenido.editarPropio')
    and public.can_edit_article(article_id)
  );

drop policy if exists "article autosaves own update" on public.article_autosaves;
create policy "article autosaves own update"
  on public.article_autosaves for update
  using (
    user_id = (select auth.uid())
    and public.has_editorial_permission('contenido.editarPropio')
    and public.can_edit_article(article_id)
  )
  with check (
    user_id = (select auth.uid())
    and public.has_editorial_permission('contenido.editarPropio')
    and public.can_edit_article(article_id)
  );

grant select, insert, update, delete on public.editorial_tags to authenticated;
grant select, insert, update, delete on public.editorial_labels to authenticated;
grant select, insert, delete on public.article_tags to authenticated;
grant select, insert, delete on public.article_labels to authenticated;
grant select, insert, update, delete on public.article_autosaves to authenticated;

revoke all on public.editorial_labels from anon;
revoke all on public.article_labels from anon;
revoke all on public.article_autosaves from anon;

revoke all on function public.increment_article_lock_version() from public;
revoke all on function public.can_edit_article(uuid) from public;
grant execute on function public.can_edit_article(uuid) to authenticated;
