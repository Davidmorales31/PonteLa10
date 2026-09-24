begin;

-- La portada y la descripción SEO mejoran la distribución, pero la decisión
-- editorial del usuario autorizado no debe quedar bloqueada por ellas.
-- Se preservan las validaciones de contenido mínimo, permisos y MFA.
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

comment on function public.validate_article_status_transition() is
  'Valida transiciones, permisos, MFA y contenido editorial mínimo; portada y SEO son recomendaciones.';

commit;
