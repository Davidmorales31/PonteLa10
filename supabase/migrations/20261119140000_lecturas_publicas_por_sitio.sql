begin;

-- Las lecturas públicas de artículos reciben el sitio (co | mx). El valor predeterminado
-- es 'co': una llamada antigua, sin el parámetro, devuelve exactamente lo de siempre.
-- Cada función se parchea a partir de su definición vigente con anclas exactas (aborta
-- si el contrato cambió), se reemplaza su firma y se conservan sus permisos.

create or replace function pg_temp.contar_anclas(texto text, ancla text)
returns integer language sql immutable as $f$
  select (pg_catalog.length(texto) - pg_catalog.length(pg_catalog.replace(texto, ancla, ''))) / pg_catalog.length(ancla)
$f$;

create or replace function pg_temp.parchear_sitio(
  firma text, cabecera_antes text, cabecera_despues text, ancla text, reemplazo text
) returns void language plpgsql as $f$
declare
  v_viejo regprocedure := pg_catalog.to_regprocedure(firma);
  v_def text;
  v_nombre name;
  v_args smallint;
  v_nuevo regprocedure;
  v_roles text[];
  v_rol text;
begin
  if v_viejo is null then
    return; -- ya migrada
  end if;
  v_def := pg_catalog.pg_get_functiondef(v_viejo);
  if pg_temp.contar_anclas(v_def, cabecera_antes) <> 1 then
    raise exception 'Cabecera no encontrada o repetida en %', firma;
  end if;
  if pg_temp.contar_anclas(v_def, ancla) <> 1 then
    raise exception 'Ancla no encontrada o repetida en %', firma;
  end if;
  v_def := pg_catalog.replace(pg_catalog.replace(v_def, cabecera_antes, cabecera_despues), ancla, reemplazo);

  select proc.proname, proc.pronargs into v_nombre, v_args
    from pg_catalog.pg_proc as proc where proc.oid = v_viejo;
  select pg_catalog.array_agg(distinct pg_catalog.pg_get_userbyid(acl.grantee)) into v_roles
    from pg_catalog.pg_proc as proc
    cross join lateral pg_catalog.aclexplode(proc.proacl) as acl
   where proc.oid = v_viejo and acl.grantee <> 0 and acl.privilege_type = 'EXECUTE';

  execute pg_catalog.format('drop function %s', v_viejo::text);
  execute v_def;

  select proc.oid::regprocedure into v_nuevo
    from pg_catalog.pg_proc as proc
   where proc.pronamespace = 'public'::regnamespace
     and proc.proname = v_nombre and proc.pronargs = v_args + 1;
  if v_nuevo is null then
    raise exception 'No se creó la nueva firma de %', firma;
  end if;

  -- Mismos permisos que la función anterior (Supabase concede a anon/authenticated/service_role por defecto).
  execute pg_catalog.format('revoke all on function %s from public, anon, authenticated, service_role', v_nuevo::text);
  foreach v_rol in array coalesce(v_roles, '{}'::text[]) loop
    if v_rol <> 'postgres' then
      execute pg_catalog.format('grant execute on function %s to %I', v_nuevo::text, v_rol);
    end if;
  end loop;
end;
$f$;

select pg_temp.parchear_sitio(
  'public.get_public_editorial_article(text)',
  '(requested_slug text)' || chr(10) || ' RETURNS jsonb',
  '(requested_slug text, requested_site text DEFAULT ''co''::text)' || chr(10) || ' RETURNS jsonb',
  'where version.snapshot ->> ''slug'' = requested_slug',
  'where article.site = requested_site and version.snapshot ->> ''slug'' = requested_slug');

select pg_temp.parchear_sitio(
  'public.get_public_editorial_home_feature()',
  '()' || chr(10) || ' RETURNS jsonb',
  '(requested_site text DEFAULT ''co''::text)' || chr(10) || ' RETURNS jsonb',
  'where feature.slot = ''noticia_del_dia''',
  'where article.site = requested_site and feature.slot = ''noticia_del_dia''');

select pg_temp.parchear_sitio(
  'public.get_public_editorial_latest_article_with_cover()',
  '()' || chr(10) || ' RETURNS jsonb',
  '(requested_site text DEFAULT ''co''::text)' || chr(10) || ' RETURNS jsonb',
  'where article.status = ''published''',
  'where article.site = requested_site and article.status = ''published''');

select pg_temp.parchear_sitio(
  'public.list_public_editorial_articles(integer,integer)',
  'result_offset integer DEFAULT 0)' || chr(10) || ' RETURNS jsonb',
  'result_offset integer DEFAULT 0, requested_site text DEFAULT ''co''::text)' || chr(10) || ' RETURNS jsonb',
  'where article.status = ''published''',
  'where article.site = requested_site and article.status = ''published''');

select pg_temp.parchear_sitio(
  'public.list_public_editorial_articles_filtered(integer,integer,text,text[],text,text)',
  'filter_search text)' || chr(10) || ' RETURNS jsonb',
  'filter_search text, requested_site text DEFAULT ''co''::text)' || chr(10) || ' RETURNS jsonb',
  'where article.status = ''published''',
  'where article.site = requested_site and article.status = ''published''');

select pg_temp.parchear_sitio(
  'public.list_public_editorial_articles_for_entity(text,text,integer,integer)',
  'result_offset integer DEFAULT 0)' || chr(10) || ' RETURNS jsonb',
  'result_offset integer DEFAULT 0, requested_site text DEFAULT ''co''::text)' || chr(10) || ' RETURNS jsonb',
  'where entity_relation.entity_type = requested_entity_type',
  'where article.site = requested_site and entity_relation.entity_type = requested_entity_type');

commit;
