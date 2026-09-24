begin;

insert into public.editorial_permissions (permission, description)
values ('ingestas.worker.crearTemas', 'Crear temas públicos deduplicados durante la preparación automática')
on conflict (permission) do update set description = excluded.description;

insert into public.editorial_role_permissions (role, permission)
values ('workerIngesta', 'ingestas.worker.crearTemas') on conflict do nothing;

-- Es una sobrecarga de la RPC existente: taxonomía y paso a revisión comparten
-- una transacción, por lo que no pueden quedar temas creados sin artículo.
create or replace function public.prepare_editorial_article_from_ingestion(
  p_ingestion_id uuid, p_article_id uuid, p_expected_lock_version integer,
  p_category_id uuid, p_tag_ids uuid[], p_related_article_ids uuid[], p_new_topics jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_ingestion public.editorial_ingestions%rowtype; v_article public.articles%rowtype;
  v_category_id uuid := p_category_id; v_tag_ids uuid[] := '{}'::uuid[];
  v_related_ids uuid[] := '{}'::uuid[]; v_related_blocks jsonb := '[]'::jsonb;
  v_candidate jsonb; v_name text; v_description text; v_slug text; v_tag_id uuid;
  v_tag_active boolean; v_created_tag_ids uuid[] := '{}'::uuid[];
begin
  perform private.ensure_ingestion_worker('ingestas.worker.prepararRevision');
  perform private.ensure_ingestion_worker('ingestas.worker.crearTemas');
  if coalesce(jsonb_typeof(p_new_topics), 'null') <> 'array' then
    raise exception 'La propuesta de temas automáticos no es válida.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_new_topics) > 3 then
    raise exception 'La propuesta de temas automáticos no es válida.' using errcode = '22023';
  end if;
  select * into v_ingestion from public.editorial_ingestions where id = p_ingestion_id for update;
  if not found or v_ingestion.article_id is distinct from p_article_id then raise exception 'La ingesta no corresponde al borrador.' using errcode = '42501'; end if;
  select * into v_article from public.articles where id = p_article_id for update;
  if not found then raise exception 'El borrador no existe.' using errcode = 'P0002'; end if;
  if v_ingestion.prepared_for_review_at is not null and v_article.status = 'review' then return jsonb_build_object('articleId', v_article.id, 'estado', 'review', 'yaPreparado', true); end if;
  if v_ingestion.status <> 'draft_created' or v_article.status <> 'draft' or v_article.lock_version <> p_expected_lock_version then raise exception 'El borrador ya no está disponible para preparación automática.' using errcode = '55000'; end if;
  if not exists (select 1 from public.editorial_ai_generations where ingestion_id = p_ingestion_id and article_id = p_article_id and status = 'completed') then raise exception 'No existe una generación editorial completada para el borrador.' using errcode = '55000'; end if;
  if v_category_id is null then v_category_id := v_ingestion.category_id; end if;
  if v_category_id is null or not exists (select 1 from public.categories where id = v_category_id and is_active) then raise exception 'No hay una sección editorial válida para preparar el borrador.' using errcode = '22023'; end if;
  select coalesce(array_agg(distinct tags.tag_id), '{}'::uuid[]) into v_tag_ids from unnest(coalesce(p_tag_ids, '{}'::uuid[])) as tags(tag_id);
  if cardinality(v_tag_ids) > 12 or (select count(*) from public.editorial_tags where id = any(v_tag_ids) and is_active) <> cardinality(v_tag_ids) then raise exception 'Uno o más temas no están disponibles.' using errcode = '22023'; end if;
  select coalesce(array_agg(distinct related.article_id), '{}'::uuid[]) into v_related_ids from unnest(coalesce(p_related_article_ids, '{}'::uuid[])) as related(article_id);
  if cardinality(v_related_ids) > 3 or cardinality(v_related_ids) <> cardinality(coalesce(p_related_article_ids, '{}'::uuid[])) or v_article.id = any(v_related_ids) then raise exception 'Las noticias relacionadas no son válidas.' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('type', 'articuloRelacionado', 'attrs', jsonb_build_object('articuloId', articulo.id, 'slug', articulo.slug, 'titulo', articulo.title, 'resumen', articulo.summary, 'categoria', coalesce(categoria.name, 'Sin categoría'), 'imagen', ''))), '[]'::jsonb) into v_related_blocks from public.articles articulo left join public.categories categoria on categoria.id = articulo.category_id where articulo.id = any(v_related_ids) and articulo.status = 'published' and articulo.published_version_id is not null;
  if jsonb_array_length(v_related_blocks) <> cardinality(v_related_ids) then raise exception 'Una noticia relacionada ya no está publicada.' using errcode = '22023'; end if;

  for v_candidate in select value from jsonb_array_elements(p_new_topics) loop
    if jsonb_typeof(v_candidate) <> 'object' then raise exception 'Cada tema automático debe ser un objeto.' using errcode = '22023'; end if;
    v_name := regexp_replace(trim(coalesce(v_candidate ->> 'nombre', '')), '\s+', ' ', 'g');
    v_description := nullif(left(regexp_replace(trim(coalesce(v_candidate ->> 'descripcion', '')), '\s+', ' ', 'g'), 240), '');
    if char_length(v_name) not between 2 and 80 or v_name ~ '[[:cntrl:]]' or v_description ~ '[[:cntrl:]]' then raise exception 'El nombre o descripción de un tema automático no es válido.' using errcode = '22023'; end if;
    v_slug := trim(both '-' from regexp_replace(translate(lower(v_name), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', '-', 'g'));
    if char_length(v_slug) not between 2 and 80 then raise exception 'El slug de un tema automático no es válido.' using errcode = '22023'; end if;
    perform pg_advisory_xact_lock(hashtextextended(v_slug, 0));
    select id, is_active into v_tag_id, v_tag_active from public.editorial_tags where slug = v_slug or lower(name) = lower(v_name) order by id limit 1;
    if v_tag_id is not null and not v_tag_active then continue; end if;
    if v_tag_id is null then
      insert into public.editorial_tags (slug, name, description) values (v_slug, v_name, v_description) on conflict (slug) do nothing returning id into v_tag_id;
      if v_tag_id is null then
        select id, is_active into v_tag_id, v_tag_active from public.editorial_tags where slug = v_slug;
        if not v_tag_active then continue; end if;
      else
        v_created_tag_ids := array_append(v_created_tag_ids, v_tag_id);
      end if;
    end if;
    if not (v_tag_id = any(v_tag_ids)) then v_tag_ids := array_append(v_tag_ids, v_tag_id); end if;
  end loop;
  if cardinality(v_tag_ids) > 12 then raise exception 'La preparación supera el máximo de temas.' using errcode = '22023'; end if;
  delete from public.article_tags where article_id = v_article.id;
  insert into public.article_tags (article_id, tag_id, created_by) select v_article.id, tag_id, (select auth.uid()) from unnest(v_tag_ids) tag_id;
  perform set_config('app.ingestion_auto_review', 'on', true);
  update public.articles set category_id = v_category_id, body_json = jsonb_set(v_article.body_json, '{content}', coalesce(v_article.body_json -> 'content', '[]'::jsonb) || v_related_blocks), status = 'review', last_saved_by = (select auth.uid()) where id = v_article.id and status = 'draft' and lock_version = p_expected_lock_version;
  if not found then raise exception 'El borrador cambió durante la preparación.' using errcode = '40001'; end if;
  update public.article_versions set snapshot = jsonb_set(snapshot, '{tagIds}', to_jsonb(v_tag_ids)) where id = (select id from public.article_versions where article_id = v_article.id order by version_number desc limit 1);
  update public.editorial_ingestions set prepared_for_review_at = now(), preparation_error_code = null, updated_at = now() where id = v_ingestion.id;
  if cardinality(v_created_tag_ids) > 0 then insert into public.editorial_audit_log (actor_id, action, entity_type, entity_id, metadata) values ((select auth.uid()), 'ingesta.temas_automaticos_creados', 'editorial_ingestion', v_ingestion.id, jsonb_build_object('articleId', v_article.id, 'temaIdsCreados', v_created_tag_ids)); end if;
  insert into public.editorial_audit_log (actor_id, action, entity_type, entity_id, metadata) values ((select auth.uid()), 'ingesta.preparacion_para_revision', 'editorial_ingestion', v_ingestion.id, jsonb_build_object('articleId', v_article.id, 'categoryId', v_category_id, 'temas', cardinality(v_tag_ids), 'relacionados', cardinality(v_related_ids)));
  return jsonb_build_object('articleId', v_article.id, 'estado', 'review', 'yaPreparado', false);
end;
$$;

revoke all on function public.prepare_editorial_article_from_ingestion(uuid, uuid, integer, uuid, uuid[], uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.prepare_editorial_article_from_ingestion(uuid, uuid, integer, uuid, uuid[], uuid[], jsonb) to authenticated;

commit;
