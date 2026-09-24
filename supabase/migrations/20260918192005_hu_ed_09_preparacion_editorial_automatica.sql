begin;

insert into public.editorial_permissions (permission, description)
values ('ingestas.worker.prepararRevision', 'Preparar un borrador automático para revisión editorial')
on conflict (permission) do update set description = excluded.description;
insert into public.editorial_role_permissions (role, permission)
values ('workerIngesta', 'ingestas.worker.prepararRevision') on conflict do nothing;

alter table public.editorial_ingestions
  add column if not exists prepared_for_review_at timestamptz,
  add column if not exists preparation_error_code text;
alter table public.editorial_ingestions
  drop constraint if exists editorial_ingestions_preparation_error_code_length,
  add constraint editorial_ingestions_preparation_error_code_length check (preparation_error_code is null or char_length(preparation_error_code) <= 120);

create or replace function public.get_automatic_editorial_preparation_catalog(p_ingestion_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.ensure_ingestion_worker('ingestas.worker.redactar');
  if not exists (select 1 from public.editorial_ingestions where id = p_ingestion_id and status = 'evidence_ready') then raise exception 'La ingesta no está disponible para preparación editorial.' using errcode = '55000'; end if;
  return jsonb_build_object(
    'categorias', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nombre', name, 'descripcion', description) order by display_order, name) from public.categories where is_active), '[]'::jsonb),
    'temas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nombre', name, 'descripcion', description) order by name) from public.editorial_tags where is_active), '[]'::jsonb),
    'articulosPublicados', coalesce((select jsonb_agg(jsonb_build_object('id', articulo.id, 'titulo', articulo.title, 'resumen', articulo.summary, 'categoria', coalesce(categoria.name, '')) order by articulo.published_at desc nulls last, articulo.updated_at desc) from (select id, title, summary, category_id, published_at, updated_at from public.articles where status = 'published' and published_version_id is not null order by published_at desc nulls last, updated_at desc limit 24) articulo left join public.categories categoria on categoria.id = articulo.category_id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.prepare_editorial_article_from_ingestion(p_ingestion_id uuid, p_article_id uuid, p_expected_lock_version integer, p_category_id uuid, p_tag_ids uuid[], p_related_article_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_ingestion public.editorial_ingestions%rowtype; v_article public.articles%rowtype;
  v_category_id uuid := p_category_id; v_tag_ids uuid[] := '{}'::uuid[]; v_related_ids uuid[] := '{}'::uuid[]; v_related_blocks jsonb := '[]'::jsonb;
begin
  perform private.ensure_ingestion_worker('ingestas.worker.prepararRevision');
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
  delete from public.article_tags where article_id = v_article.id;
  insert into public.article_tags (article_id, tag_id, created_by) select v_article.id, tag_id, (select auth.uid()) from unnest(v_tag_ids) tag_id;
  perform set_config('app.ingestion_auto_review', 'on', true);
  -- Las tarjetas relacionadas son metadatos del documento, no texto indexable;
  -- por eso body conserva el cuerpo periodístico y body_json agrega las tarjetas.
  update public.articles set category_id = v_category_id, body_json = jsonb_set(v_article.body_json, '{content}', coalesce(v_article.body_json -> 'content', '[]'::jsonb) || v_related_blocks), status = 'review', last_saved_by = (select auth.uid()) where id = v_article.id and status = 'draft' and lock_version = p_expected_lock_version;
  if not found then raise exception 'El borrador cambió durante la preparación.' using errcode = '40001'; end if;
  update public.article_versions set snapshot = jsonb_set(snapshot, '{tagIds}', to_jsonb(v_tag_ids)) where id = (select id from public.article_versions where article_id = v_article.id order by version_number desc limit 1);
  update public.editorial_ingestions set prepared_for_review_at = now(), preparation_error_code = null, updated_at = now() where id = v_ingestion.id;
  insert into public.editorial_audit_log (actor_id, action, entity_type, entity_id, metadata) values ((select auth.uid()), 'ingesta.preparacion_para_revision', 'editorial_ingestion', v_ingestion.id, jsonb_build_object('articleId', v_article.id, 'categoryId', v_category_id, 'temas', cardinality(v_tag_ids), 'relacionados', cardinality(v_related_ids)));
  return jsonb_build_object('articleId', v_article.id, 'estado', 'review', 'yaPreparado', false);
end;
$$;

create or replace function public.report_editorial_preparation_failure(p_ingestion_id uuid, p_article_id uuid, p_error_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ingestion public.editorial_ingestions%rowtype;
begin
  perform private.ensure_ingestion_worker('ingestas.worker.prepararRevision');
  select * into v_ingestion from public.editorial_ingestions where id = p_ingestion_id for update;
  if not found or v_ingestion.article_id is distinct from p_article_id or v_ingestion.prepared_for_review_at is not null then return; end if;
  update public.editorial_ingestions set preparation_error_code = left(coalesce(nullif(trim(p_error_code), ''), 'EDITORIAL_PREPARATION_FAILED'), 120), updated_at = now() where id = p_ingestion_id;
  insert into public.editorial_audit_log (actor_id, action, entity_type, entity_id, metadata) values ((select auth.uid()), 'ingesta.preparacion_revision_fallida', 'editorial_ingestion', p_ingestion_id, jsonb_build_object('articleId', p_article_id));
end;
$$;

create or replace function public.validate_article_status_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
declare previous_status text := case when tg_op = 'UPDATE' then old.status::text else null end; target_status text := new.status::text; transition_allowed boolean := false; automatic_review boolean := false;
begin
  if (select auth.role()) = 'service_role' or (select auth.uid()) is null then return new; end if;
  if tg_op = 'INSERT' then if target_status <> 'draft' then raise exception 'Los contenidos nuevos deben iniciar como borrador.'; end if; return new; end if;
  if old.status = new.status then return new; end if;
  automatic_review := previous_status = 'draft' and target_status = 'review' and new.source_origin = 'ingesta' and private.is_exclusive_ingestion_worker() and public.has_editorial_permission('ingestas.worker.prepararRevision') and current_setting('app.ingestion_auto_review', true) = 'on';
  transition_allowed := case previous_status when 'draft' then target_status in ('review', 'archived') when 'changes_requested' then target_status in ('review', 'archived') when 'review' then target_status in ('changes_requested', 'approved', 'archived') when 'approved' then target_status in ('changes_requested', 'scheduled', 'published', 'archived') when 'scheduled' then target_status in ('changes_requested', 'approved', 'published', 'archived') when 'published' then target_status in ('draft', 'archived') when 'archived' then target_status = 'draft' else false end;
  if not transition_allowed then raise exception 'La transición editorial de % a % no está permitida.', previous_status, target_status; end if;
  if target_status = 'draft' and not public.has_editorial_permission('contenido.editarTodos') then raise exception 'Reabrir una publicación requiere permiso de edición global.';
  elsif target_status = 'review' and not automatic_review and not public.has_editorial_permission('contenido.enviarRevision') then raise exception 'No tienes permiso para enviar contenido a revisión.';
  elsif target_status = 'changes_requested' and not public.has_editorial_permission('contenido.revisar') then raise exception 'No tienes permiso para solicitar cambios.';
  elsif target_status = 'approved' and not public.has_editorial_permission('contenido.aprobar') then raise exception 'No tienes permiso para aprobar contenido.';
  elsif target_status = 'scheduled' and (not public.has_editorial_permission('contenido.programar') or not public.has_aal2()) then raise exception 'Programar contenido requiere permiso y MFA.';
  elsif target_status = 'published' and (not public.has_editorial_permission('contenido.publicar') or not public.has_aal2()) then raise exception 'Publicar contenido requiere permiso y MFA.';
  elsif target_status = 'archived' and not public.has_editorial_permission('contenido.archivar') then raise exception 'No tienes permiso para archivar contenido.'; end if;
  if target_status in ('review', 'approved', 'scheduled', 'published') then if char_length(trim(new.title)) < 8 then raise exception 'El contenido necesita un título editorial válido.'; end if; if char_length(trim(new.summary)) < 20 then raise exception 'El contenido necesita un resumen de al menos 20 caracteres.'; end if; if new.category_id is null then raise exception 'Selecciona una sección antes de continuar.'; end if; if jsonb_array_length(coalesce(new.body_json -> 'content', '[]'::jsonb)) = 0 then raise exception 'El contenido necesita cuerpo editorial antes de continuar.'; end if; if new.source_origin::text <> 'manual' and coalesce(trim(new.source_url), '') = '' then raise exception 'Los contenidos importados necesitan una URL de origen.'; end if; end if;
  if target_status = 'scheduled' and (new.scheduled_at is null or new.scheduled_at <= now() + interval '4 minutes' or new.scheduled_at > now() + interval '1 year') then raise exception 'La programación debe quedar entre cinco minutos y un año en el futuro.'; end if;
  if target_status = 'published' and new.published_at is null then raise exception 'La publicación requiere fecha de publicación.'; end if;
  return new;
end;
$$;

revoke all on function public.get_automatic_editorial_preparation_catalog(uuid) from public, anon, authenticated;
revoke all on function public.prepare_editorial_article_from_ingestion(uuid, uuid, integer, uuid, uuid[], uuid[]) from public, anon, authenticated;
revoke all on function public.report_editorial_preparation_failure(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.get_automatic_editorial_preparation_catalog(uuid) to authenticated;
grant execute on function public.prepare_editorial_article_from_ingestion(uuid, uuid, integer, uuid, uuid[], uuid[]) to authenticated;
grant execute on function public.report_editorial_preparation_failure(uuid, uuid, text) to authenticated;
commit;
