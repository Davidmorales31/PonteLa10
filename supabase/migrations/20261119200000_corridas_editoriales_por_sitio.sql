begin;

-- Las corridas editoriales (Codex y Claude) pasan a tener sitio. Cada identidad de corrida
-- pertenece a un sitio (`co` por defecto), el tope de seis corridas por día se cuenta por
-- sitio, y lo que la corrida crea (artículos y temas nuevos) nace en el sitio de la corrida.
-- Se parchean las definiciones vigentes con anclas exactas (aborta si el contrato cambió).

alter table public.editorial_codex_runs
  add column if not exists site text not null default 'co' references public.sites(id);

create or replace function pg_temp.contar_anclas(texto text, ancla text)
returns integer language sql immutable as $f$
  select (pg_catalog.length(texto) - pg_catalog.length(pg_catalog.replace(texto, ancla, ''))) / pg_catalog.length(ancla)
$f$;

create or replace function pg_temp.parchear_funcion(
  firma text, pares text[], cambia_firma boolean, marca_ya_migrada text
) returns void language plpgsql as $f$
declare
  v_viejo regprocedure := pg_catalog.to_regprocedure(firma);
  v_def text;
  v_nombre name;
  v_args smallint;
  v_nuevo regprocedure;
  v_roles text[];
  v_rol text;
  i integer;
begin
  if v_viejo is null then
    return; -- ya migrada (la firma antigua no existe)
  end if;
  v_def := pg_catalog.pg_get_functiondef(v_viejo);
  if pg_catalog.strpos(v_def, marca_ya_migrada) > 0 then
    return;
  end if;
  for i in 1 .. pg_catalog.array_length(pares, 1) / 2 loop
    if pg_temp.contar_anclas(v_def, pares[2 * i - 1]) <> 1 then
      raise exception 'Ancla no encontrada o repetida en %: %', firma, pg_catalog.left(pares[2 * i - 1], 60);
    end if;
    v_def := pg_catalog.replace(v_def, pares[2 * i - 1], pares[2 * i]);
  end loop;

  select proc.proname, proc.pronargs into v_nombre, v_args from pg_catalog.pg_proc as proc where proc.oid = v_viejo;
  select pg_catalog.array_agg(distinct pg_catalog.pg_get_userbyid(acl.grantee)) into v_roles
    from pg_catalog.pg_proc as proc
    cross join lateral pg_catalog.aclexplode(proc.proacl) as acl
   where proc.oid = v_viejo and acl.grantee <> 0 and acl.privilege_type = 'EXECUTE';

  if cambia_firma then
    execute pg_catalog.format('drop function %s', v_viejo::text);
  end if;
  execute v_def;

  select proc.oid::regprocedure into v_nuevo from pg_catalog.pg_proc as proc
   where proc.pronamespace = 'public'::regnamespace and proc.proname = v_nombre
     and proc.pronargs = v_args + case when cambia_firma then 1 else 0 end;
  if v_nuevo is null then
    raise exception 'No se creó la nueva firma de %', firma;
  end if;
  execute pg_catalog.format('revoke all on function %s from public, anon, authenticated, service_role', v_nuevo::text);
  foreach v_rol in array coalesce(v_roles, '{}'::text[]) loop
    if v_rol <> 'postgres' then
      execute pg_catalog.format('grant execute on function %s to %I', v_nuevo::text, v_rol);
    end if;
  end loop;
end;
$f$;

-- Contexto de la corrida: recibe el sitio al crearla; una corrida existente conserva el suyo.
select pg_temp.parchear_funcion(
  'public.get_codex_editorial_context(uuid)',
  array[
    '(p_run_id uuid)' || chr(10) || ' RETURNS jsonb', '(p_run_id uuid, p_site text DEFAULT ''co''::text)' || chr(10) || ' RETURNS jsonb',
    'where run_date = v_date;', 'where run_date = v_date and site = p_site;',
    'insert into public.editorial_codex_runs (run_id, run_date)' || chr(10) || '    values (p_run_id, v_date);',
      'insert into public.editorial_codex_runs (run_id, run_date, site)' || chr(10) || '    values (p_run_id, v_date, p_site);',
    'where tag.is_active', 'where tag.is_active and tag.site = v_run.site',
    'and article.published_at >= now() - interval ''90 days''', 'and article.published_at >= now() - interval ''90 days'' and article.site = v_run.site',
    'where relation.status = ''confirmed''', 'where relation.status = ''confirmed'' and article.site = v_run.site'
  ],
  true, 'p_site text');

-- Propuesta: el artículo, los temas nuevos y los relacionados pertenecen al sitio de la corrida.
select pg_temp.parchear_funcion(
  'public.submit_codex_editorial_proposal(jsonb)',
  array[
    'v_article_body_json jsonb := p_input -> ''bodyJson'';',
      'v_article_body_json jsonb := p_input -> ''bodyJson'';' || chr(10) || '  v_site text := coalesce((select run.site from public.editorial_codex_runs run where run.run_id = (p_input ->> ''runId'')::uuid), ''co'');',
    'insert into public.editorial_tags (slug, name, description)', 'insert into public.editorial_tags (slug, name, description, site)',
    'values (v_topic_slug, v_topic_name, v_topic_description)', 'values (v_topic_slug, v_topic_name, v_topic_description, v_site)',
    'source_origin, source_url, source_name, last_saved_by', 'source_origin, source_url, source_name, last_saved_by, site',
    'v_source_url, v_source_name, null', 'v_source_url, v_source_name, null, v_site',
    'where article.id = any(v_related_ids)', 'where article.site = v_site and article.id = any(v_related_ids)'
  ],
  false, 'v_site text');

commit;
