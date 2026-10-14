begin;

-- Solo los RPC privados de Codex exigen esta portada; no altera ingestas/CMS manual.
create or replace function public.validar_portada_codex(p_media_id uuid, p_flags jsonb)
returns boolean language sql stable security invoker set search_path = '' as $$
  select coalesce(
    p_media_id is not null and jsonb_typeof(p_flags) = 'array'
    and ((p_flags @> '["licensed_photo_cover"]')::integer
      + (p_flags @> '["credited_photo_cover"]')::integer
      + (p_flags @> '["ai_generated_cover"]')::integer) = 1
    and exists (
      select 1 from public.media_files media
      where media.id = p_media_id and media.bucket = 'editorial-media'
        and media.mime_type in ('image/jpeg', 'image/png', 'image/webp')
        and media.width > 0 and media.height > 0
        and (
          ((p_flags @> '["licensed_photo_cover"]')
            and media.source_url ~ '^https://commons[.]wikimedia[.]org/wiki/File:'
            and media.credit ~* '(CC0 1[.]0|CC BY 4[.]0|dominio público)')
          or ((p_flags @> '["credited_photo_cover"]')
            and media.source_url ~ '^https://'
            and char_length(btrim(coalesce(media.credit, ''))) between 2 and 300)
          or ((p_flags @> '["ai_generated_cover"]')
            and media.source_url is null
            and media.credit = 'Imagen generada con IA'
            and media.caption = 'Ilustración editorial generada con IA. No es una fotografía documental del evento.')
        )
    ), false
  );
$$;
revoke all on function public.validar_portada_codex(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.validar_portada_codex(uuid,jsonb) to service_role;

-- Reemplazo acotado sobre la definición vigente: conserva dedupe, fuentes, tags,
-- idempotencia, auditoría y el cuerpo completo del RPC sin copiar versiones viejas.
do $$
declare
  v_definicion text := pg_get_functiondef('public.submit_codex_editorial_proposal(jsonb)'::regprocedure);
  v_inicio integer;
  v_fin integer;
  v_fragmento text;
begin
  v_inicio := strpos(v_definicion, '    or (v_media_id is not null and not exists (');
  v_fin := strpos(v_definicion, E' then\n    raise exception ''La propuesta editorial está incompleta');
  if v_inicio = 0 or v_fin <= v_inicio then
    raise exception 'La definición de propuestas Codex cambió; revisar la migración antes de aplicarla.';
  end if;
  v_fragmento := substring(v_definicion from v_inicio for v_fin-v_inicio);
  execute replace(v_definicion, v_fragmento,
    E'    or not public.validar_portada_codex(v_media_id, p_input -> ''editorialFlags'')');
end;
$$;

-- Reparación de portadas faltantes de borradores propios; nunca reemplaza una
-- portada existente, una edición humana o contenido aprobado/publicado.
create or replace function public.asignar_portada_borrador_codex(
  p_article_id uuid, p_media_id uuid, p_expected_lock_version integer, p_cover_flag text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_articulo public.articles%rowtype;
  v_propuesta public.editorial_codex_proposals%rowtype;
  v_flags jsonb;
begin
  if p_article_id is null or p_expected_lock_version is null or p_expected_lock_version < 1
    or p_cover_flag is null
    or p_cover_flag not in ('licensed_photo_cover','credited_photo_cover','ai_generated_cover')
    or not public.validar_portada_codex(p_media_id, jsonb_build_array(p_cover_flag)) then
    raise exception 'La portada persistida y su atribución no son válidas.' using errcode='22023';
  end if;
  select * into v_articulo from public.articles where id=p_article_id for update;
  if not found or v_articulo.status <> 'review'
    or v_articulo.approved_by is not null or v_articulo.scheduled_at is not null
    or v_articulo.published_version_id is not null or v_articulo.last_saved_by is not null then
    raise exception 'Solo se puede completar un borrador Codex sin intervención humana.' using errcode='22023';
  end if;
  select * into v_propuesta from public.editorial_codex_proposals where article_id=p_article_id for update;
  if not found then
    raise exception 'El artículo no pertenece a una propuesta Codex.' using errcode='22023';
  end if;
  if v_articulo.cover_media_id = p_media_id and v_propuesta.editorial_flags @> jsonb_build_array(p_cover_flag) then
    return jsonb_build_object('articleId',p_article_id,'estado','review','coverMediaId',p_media_id,'duplicado',true);
  end if;
  if v_articulo.cover_media_id is not null or v_articulo.lock_version <> p_expected_lock_version then
    raise exception 'La portada o versión del borrador cambió.' using errcode='23505';
  end if;
  select coalesce(jsonb_agg(flag), '[]'::jsonb) into v_flags
  from jsonb_array_elements(v_propuesta.editorial_flags) as flags(flag)
  where flag #>> '{}' not in ('licensed_photo_cover','credited_photo_cover','ai_generated_cover');
  v_flags := v_flags || jsonb_build_array(p_cover_flag);
  update public.articles set cover_media_id=p_media_id, lock_version=lock_version+1, updated_at=now()
  where id=p_article_id;
  update public.editorial_codex_proposals set editorial_flags=v_flags where id=v_propuesta.id;
  insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
  values(null,'codex.portada_asignada_revision','article',p_article_id,
    jsonb_build_object('mediaId',p_media_id,'coverFlag',p_cover_flag,'runId',v_propuesta.run_id));
  return jsonb_build_object('articleId',p_article_id,'estado','review','coverMediaId',p_media_id,'duplicado',false);
end;
$$;
revoke all on function public.asignar_portada_borrador_codex(uuid,uuid,integer,text) from public, anon, authenticated;
grant execute on function public.asignar_portada_borrador_codex(uuid,uuid,integer,text) to service_role;

commit;
