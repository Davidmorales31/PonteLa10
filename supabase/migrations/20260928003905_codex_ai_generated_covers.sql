-- Permite portadas editoriales IA sin confundirlas con fotografías licenciadas.
-- Solo cambia la validación de medios de la propuesta privada; conserva review,
-- SECURITY INVOKER, search_path vacío e idempotencia.
begin;

do $migration$
declare
  v_definition text;
  v_old_condition text := $old$
    or (v_media_id is not null and not exists (
      select 1 from public.media_files
      where id = v_media_id
        and bucket = 'editorial-media'
        and source_url ~ '^https://commons\.wikimedia\.org/wiki/File:'
        and credit ~* '(CC0 1[.]0|CC BY 4[.]0|dominio público)'
    ))
    or (v_media_id is not null and not ((p_input -> 'editorialFlags') @> '["licensed_photo_cover"]'::jsonb))
    or (v_media_id is null and ((p_input -> 'editorialFlags') @> '["licensed_photo_cover"]'::jsonb)
$old$;
  v_new_condition text := $new$
    or (v_media_id is not null and not exists (
      select 1 from public.media_files media
      where media.id = v_media_id
        and media.bucket = 'editorial-media'
        and (
          (
            media.source_url ~ '^https://commons\.wikimedia\.org/wiki/File:'
            and media.credit ~* '(CC0 1[.]0|CC BY 4[.]0|dominio público)'
            and (p_input -> 'editorialFlags') @> '["licensed_photo_cover"]'::jsonb
            and not ((p_input -> 'editorialFlags') @> '["ai_generated_cover"]'::jsonb)
          )
          or (
            media.source_url is null
            and media.credit = 'Imagen generada con IA'
            and media.caption = 'Ilustración editorial generada con IA. No es una fotografía documental del evento.'
            and (p_input -> 'editorialFlags') @> '["ai_generated_cover"]'::jsonb
            and not ((p_input -> 'editorialFlags') @> '["licensed_photo_cover"]'::jsonb)
          )
        )
    ))
    or (v_media_id is null and (
      (p_input -> 'editorialFlags') @> '["licensed_photo_cover"]'::jsonb
      or (p_input -> 'editorialFlags') @> '["ai_generated_cover"]'::jsonb
    )
$new$;
  v_is_security_definer boolean;
  v_config text[];
  v_function_oid oid := 'public.submit_codex_editorial_proposal(jsonb)'::regprocedure;
begin
  select pg_catalog.pg_get_functiondef(v_function_oid), prosecdef, proconfig
  into v_definition, v_is_security_definer, v_config
  from pg_catalog.pg_proc
  where oid = v_function_oid;

  if v_definition is null
    or position(v_old_condition in v_definition) = 0
    or position('licensed_photo_cover' in v_definition) = 0
    or position('ai_generated_cover' in v_definition) > 0
    or v_is_security_definer
    or not coalesce('search_path=""' = any(v_config), false)
    or has_function_privilege('anon', v_function_oid, 'EXECUTE')
    or has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
    or not has_function_privilege('service_role', v_function_oid, 'EXECUTE') then
    raise exception 'La función Codex no coincide con la versión privada esperada; no se modificó.';
  end if;

  v_definition := replace(v_definition, v_old_condition, v_new_condition);
  if position(v_old_condition in v_definition) > 0
    or position('ai_generated_cover' in v_definition) = 0
    or position('media.source_url is null' in v_definition) = 0
    or position('media.credit = ''Imagen generada con IA''' in v_definition) = 0
    or position('media.caption = ''Ilustración editorial generada con IA. No es una fotografía documental del evento.''' in v_definition) = 0 then
    raise exception 'No se pudo construir el contrato seguro de portada IA.';
  end if;

  execute v_definition;

  select prosecdef, proconfig into v_is_security_definer, v_config
  from pg_catalog.pg_proc where oid = v_function_oid;
  if v_is_security_definer
    or not coalesce('search_path=""' = any(v_config), false)
    or has_function_privilege('anon', v_function_oid, 'EXECUTE')
    or has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
    or not has_function_privilege('service_role', v_function_oid, 'EXECUTE') then
    raise exception 'La migración alteró la seguridad o los permisos de la función Codex.';
  end if;
end;
$migration$;

commit;
