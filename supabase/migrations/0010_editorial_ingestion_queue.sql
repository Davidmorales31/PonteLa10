create table if not exists public.editorial_ingestions (
  id uuid primary key default gen_random_uuid(),
  source_url text not null check (char_length(source_url) between 12 and 2048),
  normalized_url text not null check (char_length(normalized_url) between 12 and 2048),
  source_host text not null check (char_length(source_host) between 3 and 253),
  source_platform text not null
    check (source_platform in ('web', 'youtube', 'tiktok', 'instagram', 'x', 'facebook')),
  status text not null default 'pending'
    check (status in ('pending', 'queued', 'processing', 'draft_created', 'failed', 'cancelled')),
  title_hint text check (char_length(title_hint) <= 160),
  editorial_instructions text check (char_length(editorial_instructions) <= 1000),
  rules_snapshot jsonb not null default jsonb_build_object(
    'tipoContenido', 'auto',
    'conservarVideo', true,
    'exigirCreditos', true,
    'generarSeo', true,
    'idioma', 'es-CO'
  ),
  source_metadata jsonb not null default '{}'::jsonb,
  processing_result jsonb not null default '{}'::jsonb,
  category_id uuid references public.categories(id) on delete set null,
  requested_by uuid not null references auth.users(id) on delete restrict,
  assigned_to uuid references auth.users(id) on delete set null,
  article_id uuid references public.articles(id) on delete set null,
  attempts integer not null default 0 check (attempts between 0 and 20),
  error_code text check (char_length(error_code) <= 80),
  error_message text check (char_length(error_message) <= 1000),
  next_attempt_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(rules_snapshot) = 'object'),
  check (jsonb_typeof(source_metadata) = 'object'),
  check (jsonb_typeof(processing_result) = 'object')
);

create index if not exists idx_editorial_ingestions_queue
  on public.editorial_ingestions (status, created_at);

create index if not exists idx_editorial_ingestions_requested_by
  on public.editorial_ingestions (requested_by, created_at desc);

create index if not exists idx_editorial_ingestions_platform
  on public.editorial_ingestions (source_platform, created_at desc);

create unique index if not exists idx_editorial_ingestions_active_url
  on public.editorial_ingestions (normalized_url)
  where status in ('pending', 'queued', 'processing');

create or replace function public.set_editorial_ingestion_updated_at()
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

drop trigger if exists set_editorial_ingestion_updated_at_trigger
  on public.editorial_ingestions;
create trigger set_editorial_ingestion_updated_at_trigger
  before update on public.editorial_ingestions
  for each row execute function public.set_editorial_ingestion_updated_at();

drop trigger if exists audit_editorial_ingestion_change_trigger
  on public.editorial_ingestions;
create trigger audit_editorial_ingestion_change_trigger
  after insert or update or delete on public.editorial_ingestions
  for each row execute function public.audit_editorial_change();

alter table public.editorial_ingestions enable row level security;

drop policy if exists "editorial ingestions authorized read"
  on public.editorial_ingestions;
create policy "editorial ingestions authorized read"
  on public.editorial_ingestions for select
  to authenticated
  using (public.has_editorial_permission('ingestas.ver'));

drop policy if exists "editorial ingestions authorized insert"
  on public.editorial_ingestions;
create policy "editorial ingestions authorized insert"
  on public.editorial_ingestions for insert
  to authenticated
  with check (
    public.has_editorial_permission('ingestas.gestionar')
    and requested_by = (select auth.uid())
    and status = 'pending'
    and attempts = 0
    and article_id is null
  );

grant select, insert on public.editorial_ingestions to authenticated;

create or replace function public.cancel_editorial_ingestion(
  target_ingestion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_ingestion public.editorial_ingestions%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.has_editorial_permission('ingestas.gestionar') then
    raise exception 'No tienes permiso para cancelar ingestas.';
  end if;

  select *
    into current_ingestion
  from public.editorial_ingestions
  where id = target_ingestion_id
  for update;

  if not found then
    raise exception 'La ingesta no existe.';
  end if;

  if current_ingestion.status not in ('pending', 'queued') then
    raise exception 'La ingesta ya empezó o no puede cancelarse.';
  end if;

  update public.editorial_ingestions
  set
    status = 'cancelled',
    finished_at = now()
  where id = target_ingestion_id
  returning * into current_ingestion;

  return jsonb_build_object(
    'id', current_ingestion.id,
    'estado', current_ingestion.status,
    'actualizadoEn', current_ingestion.updated_at
  );
end;
$$;

revoke all on function public.set_editorial_ingestion_updated_at() from public;
revoke all on function public.cancel_editorial_ingestion(uuid) from public;
grant execute on function public.cancel_editorial_ingestion(uuid) to authenticated;

comment on table public.editorial_ingestions is
  'Cola auditable de fuentes editoriales; registrar una fuente nunca publica contenido automáticamente.';
