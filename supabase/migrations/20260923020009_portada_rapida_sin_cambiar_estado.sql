begin;

-- Ajuste visual acotado: no cambia el estado, cuerpo, SEO ni taxonomías.
-- La versión pública se actualiza únicamente si la noticia ya está publicada.
create or replace function public.update_editorial_article_cover_fast(
  target_article_id uuid,
  expected_lock_version integer,
  next_cover_media_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article public.articles%rowtype;
  v_updated public.articles%rowtype;
  v_latest_version_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión.' using errcode = '28000';
  end if;

  select * into v_article
  from public.articles
  where id = target_article_id
  for update;

  if not found then
    raise exception 'El contenido no existe.' using errcode = 'P0002';
  end if;

  if v_article.lock_version <> expected_lock_version then
    raise exception 'El contenido cambió en otra sesión. Recarga antes de cambiar la portada.' using errcode = '40001';
  end if;

  if next_cover_media_id is null or not exists (
    select 1 from public.media_files where id = next_cover_media_id
  ) then
    raise exception 'La portada seleccionada no está disponible.' using errcode = '22023';
  end if;

  if v_article.status = 'review' and not public.has_editorial_permission('contenido.revisar') then
    raise exception 'No tienes permiso para cambiar la portada en revisión.' using errcode = '42501';
  elsif v_article.status = 'approved' and not public.has_editorial_permission('contenido.aprobar') then
    raise exception 'No tienes permiso para cambiar la portada aprobada.' using errcode = '42501';
  elsif v_article.status = 'scheduled' and (
    not public.has_editorial_permission('contenido.programar') or not public.has_aal2()
  ) then
    raise exception 'Cambiar la portada programada requiere permiso y MFA.' using errcode = '42501';
  elsif v_article.status = 'published' and (
    not public.has_editorial_permission('contenido.publicar') or not public.has_aal2()
  ) then
    raise exception 'Cambiar la portada publicada requiere permiso y MFA.' using errcode = '42501';
  elsif v_article.status not in ('review', 'approved', 'scheduled', 'published') then
    raise exception 'La portada rápida solo está disponible desde revisión en adelante.' using errcode = '22023';
  end if;

  update public.articles
  set cover_media_id = next_cover_media_id,
      last_saved_by = (select auth.uid())
  where id = target_article_id
    and lock_version = expected_lock_version
  returning * into v_updated;

  select id into v_latest_version_id
  from public.article_versions
  where article_id = target_article_id
  order by version_number desc
  limit 1;

  if v_article.status = 'published' then
    update public.articles
    set published_version_id = v_latest_version_id
    where id = target_article_id;
  end if;

  insert into public.editorial_audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    'contenido.portada_rapida_actualizada',
    'article',
    target_article_id,
    jsonb_build_object(
      'anteriorPortadaId', v_article.cover_media_id,
      'nuevaPortadaId', next_cover_media_id,
      'estado', v_article.status::text,
      'versionId', v_latest_version_id
    )
  );

  return jsonb_build_object(
    'id', v_updated.id,
    'lockVersion', v_updated.lock_version,
    'updatedAt', v_updated.updated_at,
    'estado', v_updated.status::text
  );
end;
$$;

revoke all on function public.update_editorial_article_cover_fast(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.update_editorial_article_cover_fast(uuid, integer, uuid) to authenticated;

commit;
