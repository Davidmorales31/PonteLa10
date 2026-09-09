-- Evitar ambiguedad entre parametros y columnas y renovar la reserva en cada intento.
create or replace function public.claim_editorial_ingestion(target_ingestion_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_editorial_permission('ingestas.gestionar') then
    raise exception 'No autorizado.';
  end if;
  update public.editorial_ingestions
  set status = 'processing', attempts = attempts + 1, started_at = now(),
      finished_at = null, error_code = null, error_message = null
  where id = target_ingestion_id and article_id is null
    and (status in ('pending', 'failed')
      or (status = 'processing' and started_at < now() - interval '15 minutes'));
  if not found then raise exception 'La ingesta no esta disponible para procesar.'; end if;
  return true;
end;
$$;

create or replace function public.complete_editorial_ingestion(
  target_ingestion_id uuid, target_article_id uuid, source_metadata jsonb, processing_result jsonb
)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_editorial_permission('ingestas.gestionar') then raise exception 'No autorizado.'; end if;
  update public.editorial_ingestions set status = 'draft_created', article_id = target_article_id,
    source_metadata = coalesce(complete_editorial_ingestion.source_metadata, '{}'::jsonb),
    processing_result = coalesce(complete_editorial_ingestion.processing_result, '{}'::jsonb),
    finished_at = now(), error_code = null, error_message = null
  where id = target_ingestion_id and status = 'processing';
  if not found then raise exception 'La ingesta no esta procesandose.'; end if;
  return true;
end;
$$;

create or replace function public.fail_editorial_ingestion(target_ingestion_id uuid, error_code text, error_message text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_editorial_permission('ingestas.gestionar') then raise exception 'No autorizado.'; end if;
  update public.editorial_ingestions set status = 'failed',
    error_code = left(fail_editorial_ingestion.error_code, 80),
    error_message = left(fail_editorial_ingestion.error_message, 1000), finished_at = now()
  where id = target_ingestion_id and status = 'processing';
  return found;
end;
$$;

revoke all on function public.claim_editorial_ingestion(uuid) from public;
revoke all on function public.complete_editorial_ingestion(uuid, uuid, jsonb, jsonb) from public;
revoke all on function public.fail_editorial_ingestion(uuid, text, text) from public;
grant execute on function public.claim_editorial_ingestion(uuid) to authenticated;
grant execute on function public.complete_editorial_ingestion(uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.fail_editorial_ingestion(uuid, text, text) to authenticated;
