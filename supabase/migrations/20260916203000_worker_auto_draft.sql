begin;

insert into public.editorial_permissions (permission, description)
values ('ingestas.worker.redactar', 'Generar borradores automáticos desde evidencia validada')
on conflict (permission) do update set description = excluded.description;

insert into public.editorial_role_permissions (role, permission)
values ('workerIngesta', 'ingestas.worker.redactar')
on conflict do nothing;

create or replace function private.ensure_automated_draft_actor()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.is_exclusive_ingestion_worker() then
    perform private.ensure_ingestion_worker('ingestas.worker.redactar');
    return true;
  end if;
  perform private.ensure_human_permission('ingestas.redactar');
  return false;
end;
$$;

create or replace function public.reserve_editorial_ai_draft(
  p_ingestion_id uuid,
  p_request_id uuid,
  p_prompt_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingestion public.editorial_ingestions%rowtype;
  v_running uuid;
  v_worker boolean := private.ensure_automated_draft_actor();
begin
  select * into v_ingestion from public.editorial_ingestions where id = p_ingestion_id for update;
  if not found then raise exception 'La ingesta no existe.' using errcode = 'P0002'; end if;
  if not v_worker and not public.has_editorial_permission('ingestas.ver') and v_ingestion.requested_by <> (select auth.uid()) then
    raise exception 'No tienes permiso para redactar esta ingesta.' using errcode = '42501';
  end if;
  if v_ingestion.article_id is not null then return jsonb_build_object('estado', 'completed', 'articleId', v_ingestion.article_id); end if;
  select id into v_running from public.editorial_ai_generations where ingestion_id = p_ingestion_id and status = 'running' order by created_at desc limit 1;
  if v_running is not null then return jsonb_build_object('estado', 'running', 'generationId', v_running); end if;
  if v_ingestion.status <> 'evidence_ready' or v_ingestion.result_version <> 1 then
    raise exception 'La ingesta todavía no tiene evidencia lista.' using errcode = '55000';
  end if;
  insert into public.editorial_ai_generations (ingestion_id, operation, request_id, provider, model, instruction_version, prompt_hash, status, duration_ms, created_by)
  values (p_ingestion_id, 'draft', p_request_id, 'deepseek', 'pendiente', 'redaccion-v1', p_prompt_hash, 'running', 0, (select auth.uid()));
  return jsonb_build_object(
    'estado', 'reserved', 'requestId', p_request_id,
    'entrada', jsonb_build_object('tituloSugerido', coalesce(v_ingestion.title_hint, ''), 'instrucciones', coalesce(v_ingestion.editorial_instructions, ''), 'urlFuente', v_ingestion.source_url, 'categoriaId', v_ingestion.category_id)
  );
end;
$$;

create or replace function public.create_draft_from_editorial_ingestion(
  p_ingestion_id uuid, p_request_id uuid, p_provider text, p_model text, p_instruction_version text, p_prompt_hash text, p_proposal jsonb,
  p_input_tokens integer, p_output_tokens integer, p_reasoning_tokens integer, p_cost_usd numeric, p_pricing_version text, p_duration_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingestion public.editorial_ingestions%rowtype;
  v_article public.articles%rowtype;
  v_slug_base text; v_slug text; v_body text;
  v_worker boolean := private.ensure_automated_draft_actor();
begin
  if not v_worker and not public.has_editorial_permission('contenido.crear') then raise exception 'No tienes permiso para crear borradores.' using errcode = '42501'; end if;
  if jsonb_typeof(p_proposal) <> 'object' or p_proposal ->> 'versionContrato' <> '1' or coalesce(char_length(trim(p_proposal ->> 'titulo')), 0) not between 8 and 160 or coalesce(char_length(trim(p_proposal ->> 'resumen')), 0) not between 1 and 320 or jsonb_typeof(p_proposal -> 'documento') <> 'object' or p_proposal #>> '{documento,type}' <> 'doc' or jsonb_typeof(p_proposal #> '{documento,content}') <> 'array' or jsonb_array_length(p_proposal #> '{documento,content}') = 0 or p_proposal ->> 'tipo' not in ('breve','noticia','analisis','blog','informe','opinion','especial') then raise exception 'La propuesta editorial no cumple el contrato.' using errcode = '22023'; end if;
  select * into v_ingestion from public.editorial_ingestions where id = p_ingestion_id for update;
  if not found then raise exception 'La ingesta no existe.' using errcode = 'P0002'; end if;
  if not v_worker and not public.has_editorial_permission('ingestas.ver') and v_ingestion.requested_by <> (select auth.uid()) then raise exception 'No tienes permiso para redactar esta ingesta.' using errcode = '42501'; end if;
  if v_ingestion.article_id is not null then return jsonb_build_object('id', v_ingestion.article_id, 'yaExistia', true); end if;
  if v_ingestion.status <> 'evidence_ready' or v_ingestion.result_version <> 1 then raise exception 'La ingesta todavía no tiene evidencia lista.' using errcode = '55000'; end if;
  if nullif(p_proposal ->> 'categoriaId', '')::uuid is distinct from v_ingestion.category_id then raise exception 'La propuesta no puede cambiar la categoría seleccionada para la ingesta.' using errcode = '22023'; end if;
  v_slug_base := trim(both '-' from regexp_replace(lower(p_proposal ->> 'titulo'), '[^a-z0-9]+', '-', 'g'));
  v_slug := left(coalesce(nullif(v_slug_base, ''), 'borrador'), 108) || '-' || left(gen_random_uuid()::text, 8);
  v_body := left(regexp_replace(p_proposal #>> '{documento,content}', '[{}\\[\\]"]', ' ', 'g'), 100000);
  insert into public.articles (slug, title, summary, body, body_json, status, category_id, author_id, content_type, source_origin, source_url, source_name, source_author, credits, seo_title, seo_description, social_brief, last_saved_by)
  values (v_slug, trim(p_proposal ->> 'titulo'), trim(p_proposal ->> 'resumen'), v_body, p_proposal -> 'documento', 'draft', nullif(p_proposal ->> 'categoriaId', '')::uuid, case when v_worker then v_ingestion.requested_by else (select auth.uid()) end, p_proposal ->> 'tipo', 'ingesta', p_proposal #>> '{fuente,url}', p_proposal #>> '{fuente,nombre}', p_proposal #>> '{fuente,autor}', p_proposal #>> '{fuente,creditos}', nullif(p_proposal #>> '{seo,titulo}', ''), nullif(p_proposal #>> '{seo,descripcion}', ''), nullif(p_proposal #>> '{seo,textoSocial}', ''), (select auth.uid())) returning * into v_article;
  update public.editorial_ai_generations set article_id = v_article.id, provider = p_provider, model = p_model, instruction_version = p_instruction_version, prompt_hash = p_prompt_hash, status = 'completed', input_tokens = p_input_tokens, output_tokens = p_output_tokens, reasoning_tokens = p_reasoning_tokens, cost_usd = p_cost_usd, pricing_version = p_pricing_version, duration_ms = p_duration_ms, proposal_json = p_proposal, completed_at = clock_timestamp() where ingestion_id = p_ingestion_id and request_id = p_request_id and status = 'running' and created_by = (select auth.uid());
  if not found then raise exception 'No existe una reserva activa para esta generación.' using errcode = '55000'; end if;
  update public.editorial_ingestions set article_id = v_article.id, status = 'draft_created', updated_at = now() where id = p_ingestion_id;
  insert into public.editorial_audit_log (actor_id, action, entity_type, entity_id, metadata) values ((select auth.uid()), 'ingesta.borrador_creado', 'editorial_ingestion', p_ingestion_id, jsonb_build_object('articleId', v_article.id, 'automatico', v_worker, 'provider', p_provider, 'model', p_model));
  return jsonb_build_object('id', v_article.id, 'slug', v_article.slug, 'yaExistia', false);
end;
$$;

create or replace function public.fail_editorial_ai_draft(p_ingestion_id uuid, p_request_id uuid, p_error_code text, p_duration_ms integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.ensure_automated_draft_actor();
  update public.editorial_ai_generations set status = 'failed', error_code = left(coalesce(p_error_code, 'IA_REDACCION_FALLIDA'), 120), duration_ms = greatest(coalesce(p_duration_ms, 0), 0), completed_at = clock_timestamp() where ingestion_id = p_ingestion_id and request_id = p_request_id and status = 'running' and created_by = (select auth.uid());
end;
$$;

revoke all on function private.ensure_automated_draft_actor() from public;
revoke all on function public.reserve_editorial_ai_draft(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.create_draft_from_editorial_ingestion(uuid, uuid, text, text, text, text, jsonb, integer, integer, integer, numeric, text, integer) from public, anon, authenticated;
revoke all on function public.fail_editorial_ai_draft(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_editorial_ai_draft(uuid, uuid, text) to authenticated;
grant execute on function public.create_draft_from_editorial_ingestion(uuid, uuid, text, text, text, text, jsonb, integer, integer, integer, numeric, text, integer) to authenticated;
grant execute on function public.fail_editorial_ai_draft(uuid, uuid, text, integer) to authenticated;

commit;
