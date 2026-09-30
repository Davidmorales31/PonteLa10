-- HU-TR-01: separa la intención estratégica del tipo editorial.
-- Los históricos quedan NULL deliberadamente: no se infiere una intención sin evidencia.
begin;

alter table public.articles
  add column if not exists content_intent text;

alter table public.articles
  drop constraint if exists articles_content_intent_check,
  add constraint articles_content_intent_check check (
    content_intent is null or content_intent in (
      'search_utility', 'breaking', 'explainer', 'evergreen', 'data_story',
      'special', 'opinion', 'game_support', 'social_first', 'update'
    )
  );

create index if not exists idx_articles_content_intent
  on public.articles (content_intent, updated_at desc)
  where content_intent is not null;

-- La versión y el bloqueo deben registrar también cambios de intención.
drop trigger if exists increment_article_lock_version_trigger on public.articles;
create trigger increment_article_lock_version_trigger
  before update of slug, title, summary, body, body_json, status, category_id,
  cover_media_id, author_id, seo_title, seo_description, social_brief,
  source_name, source_author, credits,
  content_type, content_intent, source_origin, source_url, scheduled_at
  on public.articles for each row execute function public.increment_article_lock_version();

drop trigger if exists create_article_version_trigger on public.articles;
create trigger create_article_version_trigger
  after insert or update of slug, title, summary, body, body_json, status,
  category_id, cover_media_id, author_id, seo_title, seo_description,
  social_brief, source_name, source_author, credits, content_type, content_intent, source_origin, source_url,
  scheduled_at
  on public.articles for each row execute function public.create_article_version();

-- La RPC conserva permisos, taxonomías y concurrencia en una única escritura;
-- se retira la firma anterior para que ningún cliente omita la intención.
create or replace function public.save_editorial_article(
  target_article_id uuid, expected_lock_version integer, next_slug text,
  next_title text, next_summary text, next_body text, next_body_json jsonb,
  next_category_id uuid, next_cover_media_id uuid, next_content_type text,
  next_content_intent text, next_source_url text, next_source_name text,
  next_source_author text, next_credits text, next_seo_title text,
  next_seo_description text, next_social_brief text, next_tag_ids uuid[],
  next_label_ids uuid[], next_change_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_status public.article_status;
  saved_article public.articles%rowtype;
  normalized_tag_ids uuid[];
  normalized_label_ids uuid[];
  latest_version_id uuid;
begin
  if next_content_intent is null or next_content_intent not in (
    'search_utility', 'breaking', 'explainer', 'evergreen', 'data_story',
    'special', 'opinion', 'game_support', 'social_first', 'update'
  ) then
    raise exception 'La intención estratégica no es válida.' using errcode = '22023';
  end if;

  if not public.can_edit_article(target_article_id) then
    raise exception 'No tienes permiso para editar este contenido.';
  end if;

  select status into current_status
  from public.articles where id = target_article_id;
  if current_status is null then
    raise exception 'El contenido no existe.';
  end if;
  if current_status::text not in ('draft', 'changes_requested') then
    raise exception 'El contenido no se puede editar en su estado actual.';
  end if;

  if next_category_id is not null and not exists (
    select 1 from public.categories
    where id = next_category_id and is_active = true
  ) then
    raise exception 'La sección seleccionada no está disponible.';
  end if;
  if next_cover_media_id is not null and not exists (
    select 1 from public.media_files where id = next_cover_media_id
  ) then
    raise exception 'La portada seleccionada no está disponible.';
  end if;

  select coalesce(array_agg(distinct tag_id), '{}'::uuid[])
    into normalized_tag_ids
  from unnest(coalesce(next_tag_ids, '{}'::uuid[])) as tags(tag_id);
  select coalesce(array_agg(distinct label_id), '{}'::uuid[])
    into normalized_label_ids
  from unnest(coalesce(next_label_ids, '{}'::uuid[])) as labels(label_id);

  if (select count(*) from public.editorial_tags
      where id = any(normalized_tag_ids) and is_active = true)
    <> cardinality(normalized_tag_ids) then
    raise exception 'Uno o más temas no están disponibles.';
  end if;
  if (select count(*) from public.editorial_labels
      where id = any(normalized_label_ids) and is_active = true)
    <> cardinality(normalized_label_ids) then
    raise exception 'Una o más etiquetas internas no están disponibles.';
  end if;

  update public.articles
  set slug = next_slug,
    title = next_title,
    summary = next_summary,
    body = next_body,
    body_json = next_body_json,
    category_id = next_category_id,
    cover_media_id = next_cover_media_id,
    content_type = next_content_type,
    content_intent = next_content_intent,
    source_url = nullif(next_source_url, ''),
    source_name = nullif(next_source_name, ''),
    source_author = nullif(next_source_author, ''),
    credits = nullif(next_credits, ''),
    seo_title = nullif(next_seo_title, ''),
    seo_description = nullif(next_seo_description, ''),
    social_brief = nullif(next_social_brief, '')
  where id = target_article_id and lock_version = expected_lock_version
  returning * into saved_article;
  if saved_article.id is null then
    raise exception 'El contenido cambió en otra sesión. Recarga antes de guardar.';
  end if;

  delete from public.article_tags where article_id = target_article_id;
  insert into public.article_tags (article_id, tag_id, created_by)
  select target_article_id, tag_id, (select auth.uid())
  from unnest(normalized_tag_ids) as tags(tag_id);
  delete from public.article_labels where article_id = target_article_id;
  insert into public.article_labels (article_id, label_id, created_by)
  select target_article_id, label_id, (select auth.uid())
  from unnest(normalized_label_ids) as labels(label_id);

  select id into latest_version_id from public.article_versions
  where article_id = target_article_id order by version_number desc limit 1;
  update public.article_versions
  set snapshot = snapshot || jsonb_build_object(
      'tagIds', to_jsonb(normalized_tag_ids), 'labelIds', to_jsonb(normalized_label_ids)
    ), change_note = nullif(next_change_note, '')
  where id = latest_version_id;
  delete from public.article_autosaves
  where article_id = target_article_id and user_id = (select auth.uid());

  return jsonb_build_object(
    'id', saved_article.id, 'slug', saved_article.slug,
    'lockVersion', saved_article.lock_version, 'updatedAt', saved_article.updated_at
  );
end;
$$;

revoke execute on function public.save_editorial_article(
  uuid, integer, text, text, text, text, jsonb, uuid, uuid, text,
  text, text, text, text, text, text, text, uuid[], uuid[], text
) from authenticated;

revoke all on function public.save_editorial_article(
  uuid, integer, text, text, text, text, jsonb, uuid, uuid, text, text,
  text, text, text, text, text, text, text, uuid[], uuid[], text
) from public;
grant execute on function public.save_editorial_article(
  uuid, integer, text, text, text, text, jsonb, uuid, uuid, text, text,
  text, text, text, text, text, text, text, uuid[], uuid[], text
) to authenticated;

-- La función privada ya existe y conserva sus garantías de idempotencia. Se
-- modifica únicamente para rechazar intenciones ajenas al enum y persistirla.
do $migration$
declare
  definicion text;
  es_security_definer boolean;
  configuracion text[];
  funcion_oid oid := 'public.submit_codex_editorial_proposal(jsonb)'::regprocedure;
  ancla_declaracion text := 'v_article_body_json jsonb := p_input -> ''bodyJson'';';
  ancla_insert text := 'content_type,' || chr(10) || '    source_origin';
  ancla_validacion text := 'or char_length(v_title) not between 8 and 160';
  ancla_valor text := 'p_input ->> ''contentType'', ''asistenteIa'',';
begin
  select pg_catalog.pg_get_functiondef(funcion_oid), prosecdef, proconfig
  into definicion, es_security_definer, configuracion
  from pg_catalog.pg_proc where oid = funcion_oid;

  if definicion is null
    or es_security_definer
    or not coalesce('search_path=""' = any(configuracion), false)
    or has_function_privilege('anon', funcion_oid, 'EXECUTE')
    or has_function_privilege('authenticated', funcion_oid, 'EXECUTE')
    or not has_function_privilege('service_role', funcion_oid, 'EXECUTE') then
    raise exception 'La función Codex no conserva el contrato privado esperado.';
  end if;

  if position(ancla_declaracion in definicion) = 0
    or position(ancla_insert in definicion) = 0
    or position(ancla_validacion in definicion) = 0
    or position(ancla_valor in definicion) = 0 then
    raise exception 'No se pudo actualizar de forma segura el contrato Codex.';
  end if;

  definicion := replace(
    definicion,
    ancla_declaracion,
    ancla_declaracion || chr(10) || '  v_content_intent text := p_input ->> ''contentIntent'';'
  );
  definicion := replace(
    definicion,
    ancla_validacion,
    'or v_content_intent is null or v_content_intent not in (''search_utility'', ''breaking'', ''explainer'', ''evergreen'', ''data_story'', ''special'', ''opinion'', ''game_support'', ''social_first'', ''update'')' || chr(10) ||
    '    or (v_content_intent = ''update'' and case when jsonb_typeof(p_input -> ''relatedArticleIds'') = ''array'' then jsonb_array_length(p_input -> ''relatedArticleIds'') else 0 end = 0)' || chr(10) ||
    '    ' || ancla_validacion
  );
  definicion := replace(definicion, ancla_insert, 'content_type, content_intent,' || chr(10) || '    source_origin');
  definicion := replace(
    definicion,
    ancla_valor,
    'p_input ->> ''contentType'', v_content_intent, ''asistenteIa'', '
  );
  if position('v_content_intent text := p_input ->> ''contentIntent'';' in definicion) = 0
    or position('content_type, content_intent,' in definicion) = 0
    or position('v_content_intent, ''asistenteIa'',' in definicion) = 0 then
    raise exception 'El contrato Codex no quedó actualizado de forma segura.';
  end if;
  execute definicion;
  select prosecdef, proconfig into es_security_definer, configuracion
  from pg_catalog.pg_proc where oid = funcion_oid;
  if es_security_definer
    or not coalesce('search_path=""' = any(configuracion), false)
    or has_function_privilege('anon', funcion_oid, 'EXECUTE')
    or has_function_privilege('authenticated', funcion_oid, 'EXECUTE')
    or not has_function_privilege('service_role', funcion_oid, 'EXECUTE') then
    raise exception 'La migración alteró la seguridad de la función Codex.';
  end if;
end;
$migration$;

commit;
