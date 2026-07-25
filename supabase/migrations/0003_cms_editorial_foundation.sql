alter type public.article_status add value if not exists 'changes_requested';
alter type public.article_status add value if not exists 'approved';

alter table public.user_roles
  drop constraint if exists user_roles_role_check;

update public.user_roles
set role = case role
  when 'admin' then 'administrador'
  when 'author' then 'autor'
  when 'viewer' then 'colaborador'
  else role
end;

alter table public.user_roles
  add column if not exists is_active boolean not null default true,
  add column if not exists assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('propietario', 'administrador', 'editorJefe', 'editor', 'autor', 'colaborador'));

create table if not exists public.editorial_permissions (
  permission text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.editorial_role_permissions (
  role text not null
    check (role in ('propietario', 'administrador', 'editorJefe', 'editor', 'autor', 'colaborador')),
  permission text not null references public.editorial_permissions(permission) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role, permission)
);

create table if not exists public.editorial_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.articles
  add column if not exists content_type text not null default 'noticia'
    check (content_type in ('noticia', 'blog', 'informe', 'opinion', 'especial')),
  add column if not exists source_origin text not null default 'manual'
    check (source_origin in ('manual', 'ingesta', 'importacion')),
  add column if not exists source_url text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

create table if not exists public.article_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status public.article_status not null,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (article_id, version_number)
);

create index if not exists idx_user_roles_active_user
  on public.user_roles (user_id)
  where is_active = true;

create index if not exists idx_editorial_audit_created_at
  on public.editorial_audit_log (created_at desc);

create index if not exists idx_editorial_audit_actor
  on public.editorial_audit_log (actor_id, created_at desc);

create index if not exists idx_article_versions_article
  on public.article_versions (article_id, version_number desc);

insert into public.editorial_permissions (permission, description) values
  ('panel.acceder', 'Acceder al panel editorial'),
  ('contenido.verBorradores', 'Consultar contenido no publicado'),
  ('contenido.crear', 'Crear borradores'),
  ('contenido.editarPropio', 'Editar contenido propio'),
  ('contenido.editarTodos', 'Editar contenido de cualquier autor'),
  ('contenido.enviarRevision', 'Enviar contenido a revisión'),
  ('contenido.revisar', 'Revisar y solicitar cambios'),
  ('contenido.aprobar', 'Aprobar contenido'),
  ('contenido.programar', 'Programar publicaciones'),
  ('contenido.publicar', 'Publicar contenido'),
  ('contenido.archivar', 'Archivar contenido'),
  ('media.ver', 'Consultar la biblioteca de medios'),
  ('media.subir', 'Subir archivos a la biblioteca'),
  ('media.editar', 'Editar metadatos de medios'),
  ('media.eliminar', 'Eliminar medios sin referencias'),
  ('taxonomia.ver', 'Consultar taxonomías'),
  ('taxonomia.gestionar', 'Gestionar taxonomías'),
  ('ingestas.ver', 'Consultar ingestas'),
  ('ingestas.gestionar', 'Gestionar fuentes e ingestas'),
  ('equipo.ver', 'Consultar integrantes y roles'),
  ('equipo.gestionar', 'Asignar o retirar roles'),
  ('configuracion.ver', 'Consultar configuración editorial'),
  ('configuracion.gestionar', 'Modificar configuración editorial'),
  ('auditoria.ver', 'Consultar auditoría de acciones')
on conflict (permission) do update
set description = excluded.description;

insert into public.editorial_role_permissions (role, permission)
select rol.role, permiso.permission
from (
  values ('propietario'), ('administrador')
) as rol(role)
cross join public.editorial_permissions as permiso
on conflict do nothing;

insert into public.editorial_role_permissions (role, permission) values
  ('editorJefe', 'panel.acceder'),
  ('editorJefe', 'contenido.verBorradores'),
  ('editorJefe', 'contenido.crear'),
  ('editorJefe', 'contenido.editarPropio'),
  ('editorJefe', 'contenido.editarTodos'),
  ('editorJefe', 'contenido.enviarRevision'),
  ('editorJefe', 'contenido.revisar'),
  ('editorJefe', 'contenido.aprobar'),
  ('editorJefe', 'contenido.programar'),
  ('editorJefe', 'contenido.publicar'),
  ('editorJefe', 'contenido.archivar'),
  ('editorJefe', 'media.ver'),
  ('editorJefe', 'media.subir'),
  ('editorJefe', 'media.editar'),
  ('editorJefe', 'taxonomia.ver'),
  ('editorJefe', 'taxonomia.gestionar'),
  ('editorJefe', 'ingestas.ver'),
  ('editor', 'panel.acceder'),
  ('editor', 'contenido.verBorradores'),
  ('editor', 'contenido.crear'),
  ('editor', 'contenido.editarPropio'),
  ('editor', 'contenido.editarTodos'),
  ('editor', 'contenido.enviarRevision'),
  ('editor', 'contenido.revisar'),
  ('editor', 'media.ver'),
  ('editor', 'media.subir'),
  ('editor', 'media.editar'),
  ('editor', 'taxonomia.ver'),
  ('editor', 'ingestas.ver'),
  ('autor', 'panel.acceder'),
  ('autor', 'contenido.verBorradores'),
  ('autor', 'contenido.crear'),
  ('autor', 'contenido.editarPropio'),
  ('autor', 'contenido.enviarRevision'),
  ('autor', 'media.ver'),
  ('autor', 'media.subir'),
  ('autor', 'taxonomia.ver'),
  ('colaborador', 'panel.acceder'),
  ('colaborador', 'contenido.verBorradores'),
  ('colaborador', 'contenido.crear'),
  ('colaborador', 'contenido.editarPropio'),
  ('colaborador', 'contenido.enviarRevision'),
  ('colaborador', 'media.ver'),
  ('colaborador', 'media.subir'),
  ('colaborador', 'taxonomia.ver')
on conflict do nothing;

create or replace function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = required_role
      and is_active = true
  );
$$;

create or replace function public.has_editorial_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles as user_role
    inner join public.editorial_role_permissions as role_permission
      on role_permission.role = user_role.role
    where user_role.user_id = (select auth.uid())
      and user_role.is_active = true
      and role_permission.permission = required_permission
  );
$$;

create or replace function public.has_aal2()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.can_edit_content()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_editorial_permission('contenido.editarPropio')
    or public.has_editorial_permission('contenido.editarTodos');
$$;

create or replace function public.validate_article_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status text := new.status::text;
begin
  if (select auth.role()) = 'service_role' or (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' and target_status <> 'draft' then
    raise exception 'Los contenidos nuevos deben iniciar como borrador.';
  end if;

  if tg_op = 'UPDATE' and old.status = new.status then
    return new;
  end if;

  if target_status = 'review'
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

  return new;
end;
$$;

create or replace function public.create_article_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version integer;
begin
  select coalesce(max(version_number), 0) + 1
    into next_version
  from public.article_versions
  where article_id = new.id;

  insert into public.article_versions (
    article_id,
    version_number,
    status,
    snapshot,
    created_by
  ) values (
    new.id,
    next_version,
    new.status,
    to_jsonb(new),
    (select auth.uid())
  );

  return new;
end;
$$;

create or replace function public.audit_editorial_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_action text;
  target_id uuid;
  audit_metadata jsonb;
begin
  audit_action := lower(tg_op);

  if tg_table_name = 'user_roles' then
    target_id := coalesce(new.user_id, old.user_id);
    audit_metadata := jsonb_build_object(
      'role', coalesce(new.role, old.role),
      'active', coalesce(new.is_active, old.is_active)
    );
  else
    target_id := coalesce(new.id, old.id);
    audit_metadata := jsonb_build_object(
      'statusBefore', case when tg_op <> 'INSERT' then old.status::text else null end,
      'statusAfter', case when tg_op <> 'DELETE' then new.status::text else null end
    );
  end if;

  insert into public.editorial_audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    (select auth.uid()),
    audit_action,
    tg_table_name,
    target_id,
    audit_metadata
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists validate_article_status_transition_trigger on public.articles;
create trigger validate_article_status_transition_trigger
  before insert or update of status on public.articles
  for each row execute function public.validate_article_status_transition();

drop trigger if exists create_article_version_trigger on public.articles;
create trigger create_article_version_trigger
  after insert or update on public.articles
  for each row execute function public.create_article_version();

drop trigger if exists audit_article_change_trigger on public.articles;
create trigger audit_article_change_trigger
  after insert or update or delete on public.articles
  for each row execute function public.audit_editorial_change();

drop trigger if exists audit_user_role_change_trigger on public.user_roles;
create trigger audit_user_role_change_trigger
  after insert or update or delete on public.user_roles
  for each row execute function public.audit_editorial_change();

alter table public.editorial_permissions enable row level security;
alter table public.editorial_role_permissions enable row level security;
alter table public.editorial_audit_log enable row level security;
alter table public.article_versions enable row level security;

drop policy if exists "roles admin read" on public.user_roles;
drop policy if exists "roles admin write" on public.user_roles;
drop policy if exists "profiles read own" on public.user_profiles;
drop policy if exists "profiles update own" on public.user_profiles;
drop policy if exists "categories public active read" on public.categories;
drop policy if exists "categories editors write" on public.categories;
drop policy if exists "media editors write" on public.media_files;
drop policy if exists "articles public published read" on public.articles;
drop policy if exists "articles editors write" on public.articles;
drop policy if exists "social publications internal read" on public.social_publications;
drop policy if exists "social publications internal write" on public.social_publications;
drop policy if exists "special modules public active read" on public.special_modules;
drop policy if exists "special modules editors write" on public.special_modules;

create policy "roles read own or team"
  on public.user_roles for select
  using (
    user_id = (select auth.uid())
    or public.has_editorial_permission('equipo.ver')
  );

create policy "roles manage with mfa"
  on public.user_roles for all
  using (
    public.has_editorial_permission('equipo.gestionar')
    and public.has_aal2()
  )
  with check (
    public.has_editorial_permission('equipo.gestionar')
    and public.has_aal2()
  );

create policy "profiles read own or team"
  on public.user_profiles for select
  using (
    id = (select auth.uid())
    or public.has_editorial_permission('equipo.ver')
  );

create policy "profiles update own or team"
  on public.user_profiles for update
  using (
    id = (select auth.uid())
    or public.has_editorial_permission('equipo.gestionar')
  )
  with check (
    id = (select auth.uid())
    or public.has_editorial_permission('equipo.gestionar')
  );

create policy "permissions authenticated read"
  on public.editorial_permissions for select
  to authenticated
  using (true);

create policy "role permissions authenticated read"
  on public.editorial_role_permissions for select
  to authenticated
  using (true);

create policy "categories public active read"
  on public.categories for select
  using (
    is_active = true
    or public.has_editorial_permission('taxonomia.ver')
  );

create policy "categories editorial manage"
  on public.categories for all
  using (public.has_editorial_permission('taxonomia.gestionar'))
  with check (public.has_editorial_permission('taxonomia.gestionar'));

create policy "media editorial insert"
  on public.media_files for insert
  with check (
    public.has_editorial_permission('media.subir')
    and created_by = (select auth.uid())
  );

create policy "media editorial update"
  on public.media_files for update
  using (public.has_editorial_permission('media.editar'))
  with check (public.has_editorial_permission('media.editar'));

create policy "media editorial delete"
  on public.media_files for delete
  using (
    public.has_editorial_permission('media.eliminar')
    and public.has_aal2()
  );

create policy "articles public or editorial read"
  on public.articles for select
  using (
    status = 'published'
    or public.has_editorial_permission('contenido.verBorradores')
  );

create policy "articles editorial insert"
  on public.articles for insert
  with check (
    public.has_editorial_permission('contenido.crear')
    and (
      author_id = (select auth.uid())
      or public.has_editorial_permission('contenido.editarTodos')
    )
  );

create policy "articles editorial update"
  on public.articles for update
  using (
    public.has_editorial_permission('contenido.editarTodos')
    or (
      author_id = (select auth.uid())
      and public.has_editorial_permission('contenido.editarPropio')
    )
  )
  with check (
    public.has_editorial_permission('contenido.editarTodos')
    or (
      author_id = (select auth.uid())
      and public.has_editorial_permission('contenido.editarPropio')
    )
  );

create policy "social publications editorial read"
  on public.social_publications for select
  using (public.has_editorial_permission('contenido.verBorradores'));

create policy "social publications editorial write"
  on public.social_publications for all
  using (public.has_editorial_permission('contenido.editarTodos'))
  with check (public.has_editorial_permission('contenido.editarTodos'));

create policy "special modules public or editorial read"
  on public.special_modules for select
  using (
    status = 'active'
    or public.has_editorial_permission('configuracion.ver')
  );

create policy "special modules editorial manage"
  on public.special_modules for all
  using (public.has_editorial_permission('configuracion.gestionar'))
  with check (public.has_editorial_permission('configuracion.gestionar'));

create policy "article versions editorial read"
  on public.article_versions for select
  using (
    exists (
      select 1
      from public.articles
      where articles.id = article_versions.article_id
        and (
          articles.status = 'published'
          or public.has_editorial_permission('contenido.verBorradores')
        )
    )
  );

create policy "audit authorized read"
  on public.editorial_audit_log for select
  using (
    public.has_editorial_permission('auditoria.ver')
    and public.has_aal2()
  );

grant select on public.editorial_permissions to authenticated;
grant select on public.editorial_role_permissions to authenticated;
grant select on public.editorial_audit_log to authenticated;
grant select on public.article_versions to authenticated;

revoke all on function public.validate_article_status_transition() from public;
revoke all on function public.create_article_version() from public;
revoke all on function public.audit_editorial_change() from public;

grant execute on function public.has_role(text) to anon, authenticated;
grant execute on function public.has_editorial_permission(text) to anon, authenticated;
grant execute on function public.has_aal2() to authenticated;
grant execute on function public.can_edit_content() to anon, authenticated;
