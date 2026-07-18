create extension if not exists pgcrypto;

create type public.article_status as enum ('draft', 'review', 'scheduled', 'published', 'archived');
create type public.social_status as enum ('draft', 'ready', 'scheduled', 'published', 'failed');

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'author', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  alt text,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  body text not null,
  status public.article_status not null default 'draft',
  category_id uuid references public.categories(id) on delete set null,
  cover_media_id uuid references public.media_files(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  seo_title text,
  seo_description text,
  social_brief text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_requires_date check (status <> 'published' or published_at is not null)
);

create table public.social_publications (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  network text not null check (network in ('instagram', 'facebook', 'x', 'tiktok', 'youtube', 'threads', 'whatsapp')),
  format text not null check (format in ('feed', 'story', 'reel', 'preview', 'thumbnail')),
  copy text not null,
  asset_path text,
  status public.social_status not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.special_modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text not null,
  status text not null check (status in ('planned', 'active', 'paused', 'archived')) default 'planned',
  created_at timestamptz not null default now()
);

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

create or replace function public.can_edit_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin') or public.has_role('editor') or public.has_role('author');
$$;

alter table public.user_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.media_files enable row level security;
alter table public.articles enable row level security;
alter table public.social_publications enable row level security;
alter table public.special_modules enable row level security;

create policy "profiles read own"
  on public.user_profiles for select
  using (id = auth.uid() or public.has_role('admin'));

create policy "profiles update own"
  on public.user_profiles for update
  using (id = auth.uid() or public.has_role('admin'))
  with check (id = auth.uid() or public.has_role('admin'));

create policy "roles admin read"
  on public.user_roles for select
  using (public.has_role('admin'));

create policy "roles admin write"
  on public.user_roles for all
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "categories public active read"
  on public.categories for select
  using (is_active = true or public.can_edit_content());

create policy "categories editors write"
  on public.categories for all
  using (public.has_role('admin') or public.has_role('editor'))
  with check (public.has_role('admin') or public.has_role('editor'));

create policy "media public read"
  on public.media_files for select
  using (true);

create policy "media editors write"
  on public.media_files for all
  using (public.can_edit_content())
  with check (public.can_edit_content());

create policy "articles public published read"
  on public.articles for select
  using (status = 'published' or public.can_edit_content());

create policy "articles editors write"
  on public.articles for all
  using (public.can_edit_content())
  with check (public.can_edit_content());

create policy "social publications internal read"
  on public.social_publications for select
  using (public.can_edit_content());

create policy "social publications internal write"
  on public.social_publications for all
  using (public.can_edit_content())
  with check (public.can_edit_content());

create policy "special modules public active read"
  on public.special_modules for select
  using (status = 'active' or public.can_edit_content());

create policy "special modules editors write"
  on public.special_modules for all
  using (public.has_role('admin') or public.has_role('editor'))
  with check (public.has_role('admin') or public.has_role('editor'));

insert into public.categories (slug, name, description) values
  ('futbol-mundial', 'Futbol mundial', 'Noticias y analisis del futbol internacional.'),
  ('futbol-colombiano', 'Futbol colombiano', 'La conversacion local con contexto y criterio.'),
  ('tecnologia-deportiva', 'Tecnologia deportiva', 'Datos, herramientas y tendencias aplicadas al deporte.'),
  ('gaming-deportivo', 'Gaming deportivo', 'Videojuegos, cultura digital y deporte.'),
  ('especiales', 'Especiales', 'Experiencias interactivas y formatos propios.');

insert into public.special_modules (slug, name, summary, status) values
  ('simulador-mundial', 'Simulador Mundial', 'Arma predicciones y comparte resultados.', 'planned'),
  ('album-panini', 'Control de album', 'Gestiona obtenidas, repetidas y faltantes.', 'planned'),
  ('polla-mundialista', 'Polla mundialista', 'Predicciones, grupos y rankings.', 'planned');
