begin;

create or replace function public.get_codex_editorial_health()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_worker record;
  v_codex jsonb;
  v_ingestas jsonb;
  v_programacion jsonb;
  v_cron jsonb := jsonb_build_object('estado', 'desconocido', 'disponible', false);
begin
  select heartbeat.worker_instance_id, heartbeat.state, heartbeat.started_at,
    heartbeat.last_seen_at
  into v_worker
  from public.editorial_worker_heartbeats heartbeat
  order by heartbeat.last_seen_at desc
  limit 1;

  select jsonb_build_object(
    'ultimaCorrida', (select jsonb_build_object(
      'id', run.run_id, 'estado', run.status, 'iniciadaEn', run.started_at,
      'actualizadaEn', run.updated_at, 'terminadaEn', run.completed_at
    ) from public.editorial_codex_runs run order by run.started_at desc limit 1),
    'corridasFallidas', count(*) filter (where run.status = 'failed'),
    'corridasParciales', count(*) filter (where run.status = 'partial'),
    'propuestasEnRevision', (select count(*) from public.editorial_codex_proposals proposal
      join public.articles article on article.id = proposal.article_id
      where article.status = 'review')
  ) into v_codex
  from public.editorial_codex_runs run;

  select jsonb_build_object(
    'enCola', count(*) filter (where ingestion.status = 'queued'),
    'edadColaMasAntiguaSegundos', floor(extract(epoch from (
      v_now - (min(coalesce(ingestion.queued_at, ingestion.created_at))
        filter (where ingestion.status = 'queued'))
    )))::integer,
    'procesando', count(*) filter (where ingestion.status = 'processing'),
    'procesamientoConLeaseVencido', count(*) filter (
      where ingestion.status = 'processing'
        and (ingestion.lease_expires_at is null or ingestion.lease_expires_at <= v_now)
    ),
    'evidenciaLista', count(*) filter (where ingestion.status = 'evidence_ready'),
    'edadEvidenciaMasAntiguaSegundos', floor(extract(epoch from (
      v_now - (min(coalesce(ingestion.finished_at, ingestion.updated_at))
        filter (where ingestion.status = 'evidence_ready'))
    )))::integer,
    'ultimoFalloEn', max(ingestion.updated_at) filter (
      where ingestion.status = 'failed'
    ),
    'fallidas', count(*) filter (where ingestion.status = 'failed')
  ) into v_ingestas
  from public.editorial_ingestions ingestion
  where ingestion.execution_protocol = 2;

  select jsonb_build_object(
    'programadasVencidas', count(*),
    'atrasoMasAntiguoSegundos', floor(extract(epoch from (
      v_now - (min(article.scheduled_at)
        filter (where article.scheduled_at <= v_now))
    )))::integer
  ) into v_programacion
  from public.articles article
  where article.status = 'scheduled' and article.scheduled_at <= v_now;

  if not pg_catalog.has_schema_privilege(current_user, 'cron', 'USAGE') then
    v_cron := jsonb_build_object('estado', 'desconocido', 'disponible', false);
  elsif pg_catalog.to_regclass('cron.job_run_details') is not null
    and pg_catalog.to_regclass('cron.job') is not null then
    begin
      execute $query$
        select jsonb_build_object(
          'estado', coalesce(latest.status, 'sin_ejecuciones'),
          'disponible', true,
          'iniciadaEn', latest.start_time,
          'terminadaEn', latest.end_time
        )
        from (select jobid from cron.job where jobname = 'pont3la10-publicar-programadas' limit 1) job
        left join lateral (
          select detail.status, detail.start_time, detail.end_time
          from cron.job_run_details detail
          where detail.jobid = job.jobid
          order by detail.start_time desc
          limit 1
        ) latest on true
      $query$ into v_cron;
    exception when others then
      v_cron := jsonb_build_object('estado', 'desconocido', 'disponible', false);
    end;
    if v_cron is null then
      v_cron := jsonb_build_object(
        'estado', 'job_no_configurado', 'disponible', true, 'configurado', false
      );
    else
      v_cron := v_cron || jsonb_build_object('configurado', true);
    end if;
  else
    v_cron := jsonb_build_object(
      'estado', 'extension_no_disponible', 'disponible', false, 'configurado', false
    );
  end if;

  return jsonb_build_object(
    'consultadoEn', v_now,
    'worker', case when v_worker.worker_instance_id is null then
      jsonb_build_object('estado', 'desconocido', 'ultimaSenalEn', null)
    else jsonb_build_object(
      'estado', case
        when v_worker.last_seen_at < v_now - interval '120 seconds' then 'desconectado'
        when v_worker.state = 'stopped' then 'detenido'
        when v_worker.state = 'stopping' then 'deteniendose'
        else 'activo'
      end,
      'instancia', v_worker.worker_instance_id,
      'iniciadaEn', v_worker.started_at,
      'ultimaSenalEn', v_worker.last_seen_at,
      'antiguedadSegundos', floor(extract(epoch from (v_now - v_worker.last_seen_at)))::integer
    ) end,
    'ingestas', v_ingestas,
    'codex', v_codex,
    'publicacion', v_programacion,
    'cron', v_cron
  );
end;
$$;

revoke all on function public.get_codex_editorial_health()
  from public, anon, authenticated;
grant execute on function public.get_codex_editorial_health()
  to service_role;

commit;
