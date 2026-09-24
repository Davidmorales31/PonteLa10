begin;

create or replace function public.get_editorial_ingestion_evidence_for_worker(
  p_ingestion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ingestion public.editorial_ingestions%rowtype;
begin
  perform private.ensure_ingestion_worker('ingestas.worker.redactar');

  select * into v_ingestion
  from public.editorial_ingestions
  where id = p_ingestion_id
  for update;

  if not found then
    raise exception 'La ingesta no existe.' using errcode = 'P0002';
  end if;

  if v_ingestion.status <> 'evidence_ready' or v_ingestion.result_version <> 1
    or jsonb_typeof(v_ingestion.processing_result) <> 'object' then
    raise exception 'La ingesta no tiene evidencia lista para reintentar.' using errcode = '55000';
  end if;

  return v_ingestion.processing_result;
end;
$$;

revoke all on function public.get_editorial_ingestion_evidence_for_worker(uuid)
  from public, anon, authenticated;
grant execute on function public.get_editorial_ingestion_evidence_for_worker(uuid)
  to authenticated;

comment on function public.get_editorial_ingestion_evidence_for_worker(uuid) is
  'Entrega evidencia validada solo al worker técnico para reintentar una redacción sin reprocesar la fuente.';

commit;
