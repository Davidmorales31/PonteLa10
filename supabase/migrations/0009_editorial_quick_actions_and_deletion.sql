insert into public.editorial_permissions (permission, description)
values ('contenido.eliminar', 'Eliminar contenido editorial de forma definitiva')
on conflict (permission) do update
set description = excluded.description;

insert into public.editorial_role_permissions (role, permission)
values
  ('propietario', 'contenido.eliminar'),
  ('administrador', 'contenido.eliminar')
on conflict do nothing;

drop policy if exists "articles editorial delete" on public.articles;
create policy "articles editorial delete"
  on public.articles for delete
  to authenticated
  using (
    public.has_editorial_permission('contenido.eliminar')
    and public.has_aal2()
  );

create or replace function public.delete_editorial_article(
  target_article_id uuid,
  confirmation_title text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_article public.articles%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.has_editorial_permission('contenido.eliminar') then
    raise exception 'No tienes permiso para eliminar contenido.';
  end if;

  if not public.has_aal2() then
    raise exception 'Eliminar contenido requiere verificación MFA.';
  end if;

  select *
    into current_article
  from public.articles
  where id = target_article_id
  for update;

  if not found then
    raise exception 'El contenido no existe.';
  end if;

  if confirmation_title is distinct from current_article.title then
    raise exception 'El título de confirmación no coincide.';
  end if;

  delete from public.articles
  where id = target_article_id;

  return jsonb_build_object(
    'id', current_article.id,
    'titulo', current_article.title,
    'portadaId', current_article.cover_media_id
  );
end;
$$;

revoke all on function public.delete_editorial_article(uuid, text) from public;
grant execute on function public.delete_editorial_article(uuid, text)
  to authenticated;

comment on function public.delete_editorial_article(uuid, text) is
  'Elimina un contenido y sus dependencias con permiso explícito, MFA y confirmación del título.';
