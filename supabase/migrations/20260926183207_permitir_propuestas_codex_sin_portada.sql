-- Permite entregar borradores editoriales sin portada cuando no hay una foto
-- pertinente con licencia comprobable. No modifica estados ni permisos.
begin;

do $migration$
declare
  v_definition text;
  v_is_security_definer boolean;
  v_media_start text := $original$    or not exists (
      select 1 from public.media_files
      where id = v_media_id$original$;
  v_media_start_replacement text := $replacement$    or (v_media_id is not null and not exists (
      select 1 from public.media_files
      where id = v_media_id$replacement$;
  v_media_end text := $original$    )
    or not ((p_input -> 'editorialFlags') @> '["licensed_photo_cover"]'::jsonb$original$;
  v_media_end_replacement text := $replacement$    ))
    or (v_media_id is not null and not ((p_input -> 'editorialFlags') @> '["licensed_photo_cover"]'::jsonb))
    or (v_media_id is null and ((p_input -> 'editorialFlags') @> '["licensed_photo_cover"]'::jsonb)$replacement$;
  v_optional_media_start text := $replacement$    or (v_media_id is not null and not exists (
      select 1 from public.media_files
      where id = v_media_id$replacement$;
  v_optional_media_end text := $replacement$    ))
    or (v_media_id is not null and not ((p_input -> 'editorialFlags') @> '["licensed_photo_cover"]'::jsonb))
    or (v_media_id is null and ((p_input -> 'editorialFlags') @> '["licensed_photo_cover"]'::jsonb)$replacement$;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'articles'
      and column_name = 'cover_media_id'
      and is_nullable = 'YES'
  ) then
    raise exception 'public.articles.cover_media_id no admite NULL; no se modificó la función.';
  end if;

  select pg_catalog.pg_get_functiondef(
    'public.submit_codex_editorial_proposal(jsonb)'::regprocedure
  ) into v_definition;
  select prosecdef into v_is_security_definer
  from pg_catalog.pg_proc
  where oid = 'public.submit_codex_editorial_proposal(jsonb)'::regprocedure;

  if position(v_media_start in v_definition) = 0
    or position(v_media_end in v_definition) = 0
    or position('and bucket = ''editorial-media''' in v_definition) = 0
    or position('licensed_photo_cover' in v_definition) = 0
    or v_is_security_definer then
    raise exception 'La función Codex no coincide con la versión esperada; no se modificó.';
  end if;

  v_definition := replace(v_definition, v_media_start, v_media_start_replacement);
  v_definition := replace(v_definition, v_media_end, v_media_end_replacement);

  if position(v_media_start in v_definition) > 0
    or position(v_media_end in v_definition) > 0
    or position(v_optional_media_start in v_definition) = 0
    or position(v_optional_media_end in v_definition) = 0
    or v_is_security_definer then
    raise exception 'No se pudo validar el contrato de portada opcional.';
  end if;

  execute v_definition;

  select pg_catalog.pg_get_functiondef(
    'public.submit_codex_editorial_proposal(jsonb)'::regprocedure
  ) into v_definition;
  select prosecdef into v_is_security_definer
  from pg_catalog.pg_proc
  where oid = 'public.submit_codex_editorial_proposal(jsonb)'::regprocedure;

  if position('v_media_id is null' in v_definition) = 0
    or position('licensed_photo_cover' in v_definition) = 0
    or v_is_security_definer then
    raise exception 'La función no conservó el contrato seguro tras actualizarse.';
  end if;
end;
$migration$;

commit;
