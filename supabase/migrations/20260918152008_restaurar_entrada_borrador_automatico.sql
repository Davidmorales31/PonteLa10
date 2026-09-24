begin;

-- El worker de HU-ED-08 necesita esta entrada para construir el prompt después
-- de que HU-ED-07 haya persistido la evidencia. Sin ella la reserva es válida,
-- pero la propuesta no puede conservar URL ni categoría y nunca se crea el
-- borrador automático.
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

  update public.editorial_ai_generations
    set status = 'failed', error_code = 'IA_REDACCION_INTERRUMPIDA', completed_at = clock_timestamp()
  where ingestion_id = p_ingestion_id
    and status = 'running'
    and created_at < clock_timestamp() - interval '2 minutes';

  select id into v_running from public.editorial_ai_generations
  where ingestion_id = p_ingestion_id and status = 'running'
  order by created_at desc limit 1;
  if v_running is not null then return jsonb_build_object('estado', 'running', 'generationId', v_running); end if;
  if v_ingestion.status <> 'evidence_ready' or v_ingestion.result_version <> 1 then
    raise exception 'La ingesta todavía no tiene evidencia lista.' using errcode = '55000';
  end if;

  insert into public.editorial_ai_generations (ingestion_id, operation, request_id, provider, model, instruction_version, prompt_hash, status, duration_ms, created_by)
  values (p_ingestion_id, 'draft', p_request_id, 'deepseek', 'pendiente', 'redaccion-v1', p_prompt_hash, 'running', 0, (select auth.uid()));

  return jsonb_build_object(
    'estado', 'reserved',
    'requestId', p_request_id,
    'entrada', jsonb_build_object(
      'tituloSugerido', coalesce(v_ingestion.title_hint, ''),
      'instrucciones', coalesce(v_ingestion.editorial_instructions, ''),
      'urlFuente', v_ingestion.source_url,
      'categoriaId', v_ingestion.category_id
    )
  );
end;
$$;

revoke all on function public.reserve_editorial_ai_draft(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_editorial_ai_draft(uuid, uuid, text) to authenticated;

commit;
