-- Archivos temporales de redes: se suben desde el dispositivo directo a Storage privado,
-- se usan para publicar y se borran al terminar. Solo el servidor los lee y escribe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-temp-uploads', 'social-temp-uploads', false, 524288000,
  array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table public.social_temp_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  post_id uuid references public.social_custom_posts(id) on delete set null,
  kind text not null check (kind in ('imagen','video')),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/quicktime')),
  original_name text not null check (char_length(original_name) between 1 and 200),
  path text not null unique check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp|mp4|mov)$'),
  size_bytes bigint check (size_bytes > 0),
  width integer check (width > 0),
  height integer check (height > 0),
  status text not null default 'pending' check (status in ('pending','ready')),
  keep_until timestamptz,
  created_at timestamptz not null default now(),
  ready_at timestamptz
);
create index social_temp_media_post on public.social_temp_media(post_id);
create index social_temp_media_created on public.social_temp_media(created_at);
alter table public.social_temp_media enable row level security;
revoke all on public.social_temp_media from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.social_temp_media to service_role;
