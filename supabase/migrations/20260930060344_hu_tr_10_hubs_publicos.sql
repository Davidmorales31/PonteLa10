insert into public.editorial_permissions (permission, description) values
  ('hub.ver', 'Consultar hubs editoriales'),
  ('hub.gestionar', 'Crear y editar hubs editoriales')
on conflict (permission) do update
set description = excluded.description;

insert into public.editorial_role_permissions (role, permission)
select rol.role, permiso.permission
from (values ('propietario'), ('administrador')) as rol(role)
cross join (values ('hub.ver'), ('hub.gestionar')) as permiso(permission)
on conflict do nothing;

insert into public.editorial_role_permissions (role, permission) values
  ('editorJefe', 'hub.ver'),
  ('editorJefe', 'hub.gestionar'),
  ('editor', 'hub.ver'),
  ('autor', 'hub.ver'),
  ('colaborador', 'hub.ver')
on conflict do nothing;

create table if not exists public.public_hubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  hub_type text not null
    check (hub_type in ('topic', 'competition', 'player_collection', 'technology', 'gaming')),
  title text not null,
  description text not null,
  body text not null default '',
  modules jsonb not null default '[]'::jsonb,
  seo_title text not null default '',
  seo_description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_hubs_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint public_hubs_modules_array check (jsonb_typeof(modules) = 'array')
);

create index if not exists idx_public_hubs_status_slug
  on public.public_hubs (status, slug);

create index if not exists idx_public_hubs_published_at
  on public.public_hubs (published_at desc)
  where status = 'published';

create or replace function public.validate_public_hub_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  has_nonempty_feed boolean;
begin
  if tg_op = 'INSERT' and new.status <> 'draft' then
    raise exception 'Los hubs nuevos deben iniciar como borrador.' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and old.status = new.status then
    return new;
  end if;

  if new.status = 'published' then
    if not public.has_editorial_permission('contenido.publicar') or not public.has_aal2() then
      raise exception 'Publicar un hub requiere permiso editorial y MFA.' using errcode = '42501';
    end if;

    if char_length(btrim(new.description)) < 80
      or char_length(btrim(new.body)) < 240
      or jsonb_array_length(new.modules) = 0 then
      raise exception 'El hub requiere descripción, cuerpo y módulos útiles antes de publicarse.' using errcode = '23514';
    end if;

    select exists (
      select 1
      from jsonb_array_elements(new.modules) as module
      where module ->> 'tipo' = 'articulos'
        and (
          (
            module #>> '{filtro,tipo}' = 'categoria'
            and exists (
              select 1
              from public.articles as article
              inner join public.categories as category on category.id = article.category_id
              where article.status = 'published'
                and category.is_active = true
                and category.slug = module #>> '{filtro,slug}'
            )
          )
          or (
            module #>> '{filtro,tipo}' = 'tema'
            and exists (
              select 1
              from public.article_tags as article_tag
              inner join public.editorial_tags as tag on tag.id = article_tag.tag_id
              inner join public.articles as article on article.id = article_tag.article_id
              where article.status = 'published'
                and tag.is_active = true
                and tag.slug = module #>> '{filtro,slug}'
            )
          )
        )
    ) into has_nonempty_feed;

    if not has_nonempty_feed then
      raise exception 'No se puede indexar un hub sin un módulo que muestre publicaciones.' using errcode = '23514';
    end if;

    new.published_at := coalesce(new.published_at, now());
  elsif new.status = 'draft' and tg_op = 'UPDATE' and old.status = 'published' then
    if not public.has_editorial_permission('contenido.publicar') or not public.has_aal2() then
      raise exception 'Retirar un hub público requiere permiso editorial y MFA.' using errcode = '42501';
    end if;
    new.published_at := null;
  elsif new.status = 'archived' then
    if not public.has_editorial_permission('contenido.archivar') or not public.has_aal2() then
      raise exception 'Archivar un hub requiere permiso editorial y MFA.' using errcode = '42501';
    end if;
    new.published_at := null;
  end if;

  return new;
end;
$$;

alter table public.public_hubs enable row level security;

create policy "public hubs published or editorial read"
  on public.public_hubs for select
  using (
    status = 'published'
    or public.has_editorial_permission('hub.ver')
  );

create policy "public hubs editorial create drafts"
  on public.public_hubs for insert
  with check (
    public.has_editorial_permission('hub.gestionar')
    and status = 'draft'
    and created_by = (select auth.uid())
  );

create policy "public hubs editorial update drafts"
  on public.public_hubs for update
  using (
    public.has_editorial_permission('hub.gestionar')
    and status = 'draft'
  )
  with check (
    public.has_editorial_permission('hub.gestionar')
    and (
      status in ('draft', 'published')
      or (
        status = 'archived'
        and public.has_editorial_permission('contenido.archivar')
        and public.has_aal2()
      )
    )
  );

create policy "public hubs editorial update published"
  on public.public_hubs for update
  using (
    public.has_editorial_permission('hub.gestionar')
    and public.has_editorial_permission('contenido.publicar')
    and public.has_aal2()
    and status = 'published'
  )
  with check (
    public.has_editorial_permission('hub.gestionar')
    and public.has_editorial_permission('contenido.publicar')
    and public.has_aal2()
    and (
      status in ('draft', 'published')
      or (
        status = 'archived'
        and public.has_editorial_permission('contenido.archivar')
        and public.has_aal2()
      )
    )
  );

create policy "public hubs delete unpublished"
  on public.public_hubs for delete
  using (
    public.has_editorial_permission('hub.gestionar')
    and status <> 'published'
  );

revoke all on public.public_hubs from anon, authenticated;
grant select (id, slug, hub_type, title, description, body, modules, seo_title, seo_description, status, published_at, updated_at)
  on public.public_hubs to anon, authenticated;
grant delete on public.public_hubs to authenticated;
grant insert (slug, hub_type, title, description, body, modules, seo_title, seo_description)
  on public.public_hubs to authenticated;
grant update (slug, hub_type, title, description, body, modules, seo_title, seo_description, status)
  on public.public_hubs to authenticated;
revoke all on function public.validate_public_hub_status_transition() from public;

drop trigger if exists validate_public_hub_status_transition_trigger on public.public_hubs;
create trigger validate_public_hub_status_transition_trigger
  before insert or update of status on public.public_hubs
  for each row execute function public.validate_public_hub_status_transition();

drop trigger if exists audit_public_hub_change_trigger on public.public_hubs;
create trigger audit_public_hub_change_trigger
  after insert or update or delete on public.public_hubs
  for each row execute function public.audit_editorial_change();

create or replace function public.update_public_hub_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := (select auth.uid());
    new.published_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.update_public_hub_timestamp() from public;
drop trigger if exists update_public_hub_timestamp_trigger on public.public_hubs;
create trigger update_public_hub_timestamp_trigger
  before insert or update on public.public_hubs
  for each row execute function public.update_public_hub_timestamp();
