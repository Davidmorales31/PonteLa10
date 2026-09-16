begin;

insert into public.editorial_permissions (permission, description)
values ('ingestas.eliminar', 'Eliminar de forma definitiva ingestas editoriales fallidas')
on conflict (permission) do update
set description = excluded.description;

insert into public.editorial_role_permissions (role, permission)
values
  ('propietario', 'ingestas.eliminar'),
  ('administrador', 'ingestas.eliminar')
on conflict do nothing;

create or replace function public.delete_failed_editorial_ingestion(
  p_ingestion_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingestion public.editorial_ingestions%rowtype;
  v_deleted_at timestamptz := clock_timestamp();
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;

  if not private.is_human_editorial_user()
    or not public.has_editorial_permission('ingestas.eliminar') then
    raise exception 'No tienes permiso para eliminar ingestas.' using errcode = '42501';
  end if;

  if not public.has_aal2() then
    raise exception 'Eliminar una ingesta requiere verificación MFA.' using errcode = '42501';
  end if;

  if p_confirmation is distinct from 'ELIMINAR' then
    raise exception 'La confirmación de eliminación no coincide.' using errcode = '22023';
  end if;

  select * into v_ingestion
  from public.editorial_ingestions
  where id = p_ingestion_id
  for update;

  if not found then
    raise exception 'La ingesta no existe.' using errcode = 'P0002';
  end if;

  if v_ingestion.status <> 'failed'
    or v_ingestion.article_id is not null
    or v_ingestion.result_version <> 0
    or v_ingestion.current_attempt_id is not null then
    raise exception 'Solo puede eliminarse una ingesta fallida sin evidencia ni borrador.' using errcode = '55000';
  end if;

  update private.editorial_ingestion_slot
  set attempt_id = null
  where attempt_id in (
    select id from private.editorial_ingestion_attempts
    where ingestion_id = p_ingestion_id
  );

  delete from private.editorial_ingestion_requeue_receipts
  where ingestion_id = p_ingestion_id;

  delete from private.editorial_ingestion_attempts
  where ingestion_id = p_ingestion_id;

  delete from public.editorial_ingestions
  where id = p_ingestion_id;

  return jsonb_build_object('id', p_ingestion_id, 'eliminadoEn', v_deleted_at);
end;
$$;

revoke all on function public.delete_failed_editorial_ingestion(uuid, text)
  from public, anon, authenticated;
grant execute on function public.delete_failed_editorial_ingestion(uuid, text)
  to authenticated;

comment on function public.delete_failed_editorial_ingestion(uuid, text) is
  'Elimina únicamente una ingesta fallida sin evidencia ni borrador, tras MFA y confirmación explícita.';

commit;
