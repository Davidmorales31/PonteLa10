-- Registrada en Supabase con la versión 20260926174021.
begin;

do $migration$
declare
  v_definition text;
  v_public_definition text;
  v_credit_fragment text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.submit_codex_editorial_proposal(jsonb)'::regprocedure
  ) into v_definition;

  if position($needle$caption ilike '%ilustración editorial%'$needle$ in v_definition) = 0
    or position($needle$credit ~* '(generad[ao].{0,15}ia|ia.{0,15}generad[ao])'$needle$ in v_definition) = 0
    or position('illustrative_cover' in v_definition) = 0 then
    raise exception 'La función de propuestas Codex no coincide con la versión esperada; no se modificó.';
  end if;

  v_definition := replace(
    v_definition,
    $needle$caption ilike '%ilustración editorial%'$needle$,
    $replacement$source_url ~ '^https://commons\.wikimedia\.org/wiki/File:'$replacement$
  );
  v_definition := replace(
    v_definition,
    $needle$credit ~* '(generad[ao].{0,15}ia|ia.{0,15}generad[ao])'$needle$,
    $replacement$credit ~* '(CC0 1[.]0|CC BY 4[.]0|dominio público)'$replacement$
  );
  v_definition := replace(v_definition, 'illustrative_cover', 'licensed_photo_cover');

  if position($needle$caption ilike '%ilustración editorial%'$needle$ in v_definition) > 0
    or position($needle$credit ~* '(generad[ao].{0,15}ia|ia.{0,15}generad[ao])'$needle$ in v_definition) > 0
    or position('illustrative_cover' in v_definition) > 0
    or position($needle$credit ~* '(CC0 1[.]0|CC BY 4[.]0|dominio público)'$needle$ in v_definition) = 0
    or position($needle$source_url ~ '^https://commons\.wikimedia\.org/wiki/File:'$needle$ in v_definition) = 0
    or position('licensed_photo_cover' in v_definition) = 0 then
    raise exception 'No se pudo aplicar el contrato de foto con atribución de forma íntegra.';
  end if;

  execute v_definition;

  select pg_catalog.pg_get_functiondef(
    'public.get_public_editorial_article(text)'::regprocedure
  ) into v_public_definition;

  if position($needle$'credito', coalesce(media.credit, ''),$needle$ in v_public_definition) > 0 then
    v_credit_fragment := $needle$'credito', coalesce(media.credit, ''),$needle$;
  elsif position($needle$'credito',coalesce(media.credit,''),$needle$ in v_public_definition) > 0 then
    v_credit_fragment := $needle$'credito',coalesce(media.credit,''),$needle$;
  else
    raise exception 'La consulta pública de artículos no coincide con la versión esperada; la atribución no se actualizó.';
  end if;

  v_public_definition := replace(
    v_public_definition,
    v_credit_fragment,
    $replacement$'credito', coalesce(media.credit, ''), 'fuenteFotoUrl', coalesce(media.source_url, ''),$replacement$
  );

  if position($needle$'fuenteFotoUrl', coalesce(media.source_url, '')$needle$ in v_public_definition) = 0 then
    raise exception 'No se pudo exponer el enlace público de atribución de la foto.';
  end if;

  execute v_public_definition;
end;
$migration$;

commit;
