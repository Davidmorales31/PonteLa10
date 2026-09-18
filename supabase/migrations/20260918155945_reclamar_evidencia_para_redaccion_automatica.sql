begin;

create or replace function public.claim_next_editorial_evidence_for_draft()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_ingestion public.editorial_ingestions%rowtype;
begin
  perform private.ensure_ingestion_worker('ingestas.worker.redactar');
  select * into v_ingestion from public.editorial_ingestions
  where status = 'evidence_ready' and article_id is null and result_version = 1
  order by finished_at nulls last, id for update skip locked limit 1;
  if not found then return jsonb_build_object('tipo', 'vacio'); end if;
  return jsonb_build_object('tipo', 'asignado', 'ingestaId', v_ingestion.id, 'evidencia', v_ingestion.processing_result);
end; $$;
revoke all on function public.claim_next_editorial_evidence_for_draft() from public, anon, authenticated;
grant execute on function public.claim_next_editorial_evidence_for_draft() to authenticated;
commit;
