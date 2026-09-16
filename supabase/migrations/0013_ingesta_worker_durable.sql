begin;

alter table public.user_roles
  drop constraint if exists user_roles_role_check;

alter table public.user_roles
  add constraint user_roles_role_check
  check (role in ('propietario', 'administrador', 'editorJefe', 'editor', 'autor', 'colaborador', 'workerIngesta'));

alter table public.editorial_role_permissions
  drop constraint if exists editorial_role_permissions_role_check;

alter table public.editorial_role_permissions
  add constraint editorial_role_permissions_role_check
  check (role in ('propietario', 'administrador', 'editorJefe', 'editor', 'autor', 'colaborador', 'workerIngesta'));

insert into public.editorial_permissions (permission, description) values
  ('ingestas.registrar', 'Registrar fuentes editoriales propias'),
  ('ingestas.worker.reclamar', 'Reclamar una ingesta desde el worker técnico'),
  ('ingestas.worker.reportar', 'Reportar progreso de una ingesta desde el worker técnico'),
  ('ingestas.worker.finalizar', 'Finalizar evidencia de una ingesta desde el worker técnico')
on conflict (permission) do update
set description = excluded.description;

insert into public.editorial_role_permissions (role, permission) values
  ('propietario', 'ingestas.registrar'),
  ('administrador', 'ingestas.registrar'),
  ('editorJefe', 'ingestas.registrar'),
  ('editor', 'ingestas.registrar'),
  ('autor', 'ingestas.registrar'),
  ('colaborador', 'ingestas.registrar'),
  ('workerIngesta', 'ingestas.worker.reclamar'),
  ('workerIngesta', 'ingestas.worker.reportar'),
  ('workerIngesta', 'ingestas.worker.finalizar')
on conflict do nothing;

create schema if not exists private;

alter table public.editorial_ingestions
  drop constraint if exists editorial_ingestions_status_check;

alter table public.editorial_ingestions
  add constraint editorial_ingestions_status_check
  check (status in ('pending', 'queued', 'processing', 'evidence_ready', 'draft_created', 'failed', 'cancelled'));

alter table public.editorial_ingestions
  add column if not exists execution_protocol smallint not null default 1,
  add column if not exists processing_stage text,
  add column if not exists progress_percent integer not null default 0,
  add column if not exists current_attempt_id uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists source_language text,
  add column if not exists retryable boolean not null default false,
  add column if not exists queued_at timestamptz,
  add column if not exists result_version integer not null default 0,
  add column if not exists retry_cycle_attempts integer not null default 0;

alter table public.editorial_ingestions
  drop constraint if exists editorial_ingestions_execution_protocol_check,
  drop constraint if exists editorial_ingestions_progress_percent_check,
  drop constraint if exists editorial_ingestions_source_language_check,
  drop constraint if exists editorial_ingestions_retry_cycle_attempts_check,
  drop constraint if exists editorial_ingestions_result_version_check,
  drop constraint if exists editorial_ingestions_processing_stage_check,
  drop constraint if exists editorial_ingestions_protocol_two_no_article_check,
  drop constraint if exists editorial_ingestions_protocol_two_result_check,
  drop constraint if exists editorial_ingestions_protocol_two_processing_check,
  drop constraint if exists editorial_ingestions_protocol_two_terminal_check,
  drop constraint if exists editorial_ingestions_protocol_two_failed_cancelled_check;

alter table public.editorial_ingestions
  add constraint editorial_ingestions_execution_protocol_check check (execution_protocol in (1, 2)),
  add constraint editorial_ingestions_progress_percent_check check (progress_percent between 0 and 100),
  add constraint editorial_ingestions_source_language_check check (source_language is null or source_language in ('es', 'en')),
  add constraint editorial_ingestions_retry_cycle_attempts_check check (retry_cycle_attempts between 0 and 3),
  add constraint editorial_ingestions_result_version_check check (result_version >= 0),
  add constraint editorial_ingestions_processing_stage_check check (
    processing_stage is null or processing_stage in (
      'validating_source',
      'reading_metadata',
      'downloading_audio',
      'transcribing',
      'translating',
      'persisting_evidence',
      'completed'
    )
  ),
  add constraint editorial_ingestions_protocol_two_no_article_check check (
    execution_protocol = 1
    or (article_id is null and status <> 'draft_created' and result_version in (0, 1))
  ),
  add constraint editorial_ingestions_protocol_two_result_check check (
    execution_protocol = 1 or ((status = 'evidence_ready') = (result_version = 1))
  ),
  add constraint editorial_ingestions_protocol_two_processing_check check (
    execution_protocol = 1
    or (
      (
        status = 'processing'
        and current_attempt_id is not null
        and lease_expires_at is not null
        and heartbeat_at is not null
        and started_at is not null
        and finished_at is null
        and processing_stage is not null
        and processing_stage <> 'completed'
        and progress_percent < 100
      )
      or (
        status <> 'processing'
        and current_attempt_id is null
        and lease_expires_at is null
      )
    )
  ),
  add constraint editorial_ingestions_protocol_two_terminal_check check (
    execution_protocol = 1
    or status <> 'evidence_ready'
    or (
      result_version = 1
      and processing_stage = 'completed'
      and progress_percent = 100
      and source_language is not null
      and finished_at is not null
      and article_id is null
    )
  ),
  add constraint editorial_ingestions_protocol_two_failed_cancelled_check check (
    execution_protocol = 1
    or status not in ('failed', 'cancelled')
    or finished_at is not null
  );

create table if not exists private.editorial_ingestion_attempts (
  id uuid primary key default gen_random_uuid(),
  ingestion_id uuid not null references public.editorial_ingestions(id) on delete restrict,
  attempt_number integer not null check (attempt_number between 1 and 20),
  attempt_token uuid not null unique default gen_random_uuid(),
  worker_user_id uuid not null references auth.users(id) on delete restrict,
  worker_instance_id uuid not null,
  claim_request_id uuid not null,
  status text not null check (status in ('active', 'completed', 'failed', 'expired')),
  started_at timestamptz not null,
  heartbeat_at timestamptz not null,
  lease_expires_at timestamptz not null,
  deadline_at timestamptz not null,
  finished_at timestamptz,
  error_code text check (char_length(error_code) <= 80),
  error_stage text check (
    error_stage is null or error_stage in (
      'validating_source',
      'reading_metadata',
      'downloading_audio',
      'transcribing',
      'translating',
      'persisting_evidence',
      'completed'
    )
  ),
  final_payload jsonb,
  final_receipt jsonb,
  last_sequence bigint not null default 0 check (last_sequence >= 0),
  last_heartbeat_payload jsonb,
  last_heartbeat_receipt jsonb,
  created_at timestamptz not null default now(),
  check (deadline_at > started_at),
  check (lease_expires_at > started_at and lease_expires_at <= deadline_at),
  check (
    (status = 'active' and finished_at is null)
    or (status <> 'active' and finished_at is not null)
  ),
  check (final_payload is null or jsonb_typeof(final_payload) = 'object'),
  check (final_receipt is null or jsonb_typeof(final_receipt) = 'object'),
  check (last_heartbeat_payload is null or jsonb_typeof(last_heartbeat_payload) = 'object'),
  check (last_heartbeat_receipt is null or jsonb_typeof(last_heartbeat_receipt) = 'object'),
  unique (ingestion_id, attempt_number),
  unique (worker_user_id, worker_instance_id, claim_request_id)
);

create table if not exists private.editorial_ingestion_slot (
  id smallint primary key check (id = 1),
  attempt_id uuid references private.editorial_ingestion_attempts(id) on delete restrict
);

insert into private.editorial_ingestion_slot (id, attempt_id)
values (1, null)
on conflict (id) do nothing;

create table if not exists private.editorial_ingestion_requeue_receipts (
  actor_id uuid not null references auth.users(id) on delete restrict,
  request_id uuid not null,
  ingestion_id uuid not null references public.editorial_ingestions(id) on delete restrict,
  receipt jsonb not null check (jsonb_typeof(receipt) = 'object'),
  created_at timestamptz not null default now(),
  primary key (actor_id, request_id)
);

alter table public.editorial_ingestions
  drop constraint if exists editorial_ingestions_current_attempt_id_fkey;

alter table public.editorial_ingestions
  add constraint editorial_ingestions_current_attempt_id_fkey
  foreign key (current_attempt_id)
  references private.editorial_ingestion_attempts(id)
  on delete restrict;

create index if not exists idx_editorial_ingestions_protocol_two_queue
  on public.editorial_ingestions (queued_at, id)
  where status = 'queued'
    and execution_protocol = 2
    and source_platform = 'tiktok';

create index if not exists idx_editorial_ingestions_protocol_two_lease
  on public.editorial_ingestions (lease_expires_at, id)
  where status = 'processing'
    and execution_protocol = 2;

create index if not exists idx_editorial_ingestion_attempts_ingestion
  on private.editorial_ingestion_attempts (ingestion_id, started_at desc);

alter table private.editorial_ingestion_attempts enable row level security;
alter table private.editorial_ingestion_slot enable row level security;
alter table private.editorial_ingestion_requeue_receipts enable row level security;

revoke all on schema private from public;
revoke all on all tables in schema private from public, anon, authenticated;

create or replace function private.is_exclusive_ingestion_worker()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'workerIngesta'
      and is_active = true
  )
  and not exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role <> 'workerIngesta'
      and is_active = true
  );
$$;

create or replace function private.is_human_editorial_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role in ('propietario', 'administrador', 'editorJefe', 'editor', 'autor', 'colaborador')
      and is_active = true
  )
  and not exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'workerIngesta'
      and is_active = true
  );
$$;

create or replace function private.ensure_ingestion_worker(required_permission text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesion.' using errcode = '42501';
  end if;

  if not private.is_exclusive_ingestion_worker()
    or not public.has_editorial_permission(required_permission) then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.ensure_human_permission(required_permission text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesion.' using errcode = '42501';
  end if;

  if not private.is_human_editorial_user()
    or not public.has_editorial_permission(required_permission) then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.safe_ingestion_error(
  error_code text,
  error_stage text default null
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'versionContrato', 1,
    'ok', false,
    'error', jsonb_build_object(
      'codigo', error_code,
      'etapa', error_stage,
      'recuperable', error_code in (
        'TIKTOK_DURATION_UNKNOWN',
        'TIKTOK_UNAVAILABLE',
        'INSUFFICIENT_RESOURCES',
        'MODEL_NOT_READY',
        'TRANSCRIPTION_TIMEOUT',
        'TRANSCRIPTION_FAILED',
        'TRANSCRIBER_INVALID_OUTPUT',
        'TEMP_CLEANUP_FAILED',
        'DEEPSEEK_RATE_LIMIT',
        'DEEPSEEK_TIMEOUT',
        'DEEPSEEK_UNAVAILABLE',
        'DEEPSEEK_INVALID_OUTPUT',
        'PROVIDER_CONFIGURATION_INVALID',
        'BUDGET_LIMIT_REACHED',
        'WORKER_STOPPED',
        'ATTEMPT_DEADLINE_EXCEEDED',
        'ATTEMPTS_EXHAUSTED'
      ),
      'mensaje', case error_code
        when 'LEASE_LOST' then 'Este intento perdio su reserva. El trabajador debe detenerlo.'
        when 'STALE_HEARTBEAT' then 'El reporte de progreso ya no corresponde al intento vigente.'
        when 'IDEMPOTENCY_CONFLICT' then 'La solicitud repetida no coincide con el resultado ya registrado.'
        when 'ACTIVE_URL_CONFLICT' then 'Esta fuente ya tiene una solicitud activa.'
        when 'RESULT_ALREADY_EXISTS' then 'La evidencia de esta ingesta ya fue registrada.'
        when 'LEGACY_PROCESSING_DISABLED' then 'El procesamiento anterior fue deshabilitado.'
        else 'La ingesta no pudo continuar con seguridad.'
      end
    )
  );
$$;

create or replace function private.build_ingestion_receipt(
  result jsonb
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'versionContrato', 1,
    'ok', true,
    'resultado', result
  );
$$;

create or replace function private.validate_evidence_payload(payload jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  duration_seconds numeric;
begin
  if jsonb_typeof(payload) <> 'object'
    or payload ->> 'versionContrato' <> '1'
    or jsonb_typeof(payload -> 'metadatos') <> 'object'
    or payload #>> '{metadatos,plataforma}' <> 'tiktok'
    or jsonb_typeof(payload -> 'original') <> 'object'
    or payload #>> '{original,motor}' <> 'faster-whisper'
    or payload #>> '{original,idioma}' not in ('es', 'en')
    or jsonb_typeof(payload #> '{original,segmentos}') <> 'array'
    or jsonb_typeof(payload #> '{verificacion,fuentesIndependientes}') <> 'array'
    or jsonb_typeof(payload -> 'advertencias') <> 'array' then
    return false;
  end if;

  duration_seconds := (payload #>> '{metadatos,duracionSegundos}')::numeric;

  return duration_seconds > 0
    and duration_seconds <= 180
    and jsonb_array_length(payload #> '{original,segmentos}') between 1 and 2000
    and (
      (payload #>> '{original,idioma}' = 'es' and payload -> 'traduccion' = 'null'::jsonb)
      or (
        payload #>> '{original,idioma}' = 'en'
        and jsonb_typeof(payload -> 'traduccion') = 'object'
        and payload #>> '{traduccion,idioma}' = 'es'
        and payload #>> '{traduccion,proveedor}' = 'deepseek'
        and jsonb_typeof(payload #> '{traduccion,segmentos}') = 'array'
        and jsonb_array_length(payload #> '{traduccion,segmentos}') =
            jsonb_array_length(payload #> '{original,segmentos}')
      )
    )
    and payload #>> '{verificacion,estado}' = 'pendiente'
    and jsonb_array_length(payload #> '{verificacion,fuentesIndependientes}') = 0
    and payload #>> '{limpieza,completada}' = 'true'
    and payload #>> '{limpieza,archivosTemporalesRestantes}' = '0';
exception
  when others then
    return false;
end;
$$;

create or replace function public.register_editorial_ingestion(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_inserted public.editorial_ingestions%rowtype;
begin
  perform private.ensure_human_permission('ingestas.registrar');

  if jsonb_typeof(p_payload) <> 'object' then
    return private.safe_ingestion_error('TIKTOK_URL_INVALID', 'validating_source');
  end if;

  if coalesce(p_payload ->> 'sourcePlatform', '') <> 'tiktok'
    or coalesce(p_payload ->> 'sourceHost', '') !~ '^(www\.)?tiktok\.com$'
    or coalesce(p_payload ->> 'sourceUrl', '') !~ '^https://(www\.)?tiktok\.com/'
    or coalesce(p_payload ->> 'normalizedUrl', '') !~ '^https://(www\.)?tiktok\.com/' then
    return private.safe_ingestion_error('TIKTOK_URL_INVALID', 'validating_source');
  end if;

  insert into public.editorial_ingestions (
    source_url,
    normalized_url,
    source_host,
    source_platform,
    status,
    title_hint,
    editorial_instructions,
    rules_snapshot,
    category_id,
    requested_by,
    execution_protocol,
    queued_at,
    next_attempt_at,
    progress_percent
  ) values (
    p_payload ->> 'sourceUrl',
    p_payload ->> 'normalizedUrl',
    p_payload ->> 'sourceHost',
    p_payload ->> 'sourcePlatform',
    'queued',
    nullif(p_payload ->> 'titleHint', ''),
    nullif(p_payload ->> 'editorialInstructions', ''),
    coalesce(p_payload -> 'rulesSnapshot', '{}'::jsonb),
    nullif(p_payload ->> 'categoryId', '')::uuid,
    v_actor,
    2,
    clock_timestamp(),
    clock_timestamp(),
    0
  )
  returning * into v_inserted;

  return private.build_ingestion_receipt(jsonb_build_object(
    'id', v_inserted.id,
    'plataforma', v_inserted.source_platform,
    'estado', v_inserted.status,
    'urlNormalizada', v_inserted.normalized_url,
    'creadoEn', v_inserted.created_at
  ));
exception
  when unique_violation then
    return private.safe_ingestion_error('ACTIVE_URL_CONFLICT', null);
end;
$$;

create or replace function private.release_expired_ingestion(v_now timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot private.editorial_ingestion_slot%rowtype;
  v_attempt private.editorial_ingestion_attempts%rowtype;
begin
  select * into v_slot
  from private.editorial_ingestion_slot
  where id = 1
  for update;

  if v_slot.attempt_id is null then
    return;
  end if;

  select * into v_attempt
  from private.editorial_ingestion_attempts
  where id = v_slot.attempt_id
  for update;

  if not found or v_attempt.status <> 'active' then
    update private.editorial_ingestion_slot set attempt_id = null where id = 1;
    return;
  end if;

  if v_attempt.lease_expires_at > v_now and v_attempt.deadline_at > v_now then
    return;
  end if;

  update private.editorial_ingestion_attempts
  set status = 'expired',
      finished_at = v_now,
      error_code = 'ATTEMPT_DEADLINE_EXCEEDED',
      error_stage = null
  where id = v_attempt.id;

  update public.editorial_ingestions
  set current_attempt_id = null,
      lease_expires_at = null,
      heartbeat_at = null,
      started_at = null,
      processing_stage = null,
      progress_percent = 0,
      status = case
        when retry_cycle_attempts < 3 and attempts < 20 then 'queued'
        else 'failed'
      end,
      retryable = case
        when retry_cycle_attempts < 3 and attempts < 20 then false
        else true
      end,
      error_code = case
        when retry_cycle_attempts < 3 and attempts < 20 then null
        else 'ATTEMPTS_EXHAUSTED'
      end,
      error_message = case
        when retry_cycle_attempts < 3 and attempts < 20 then null
        else 'La ingesta agoto el ciclo automatico de intentos.'
      end,
      next_attempt_at = case
        when retry_cycle_attempts < 3 and attempts < 20 then v_now + interval '60 seconds'
        else next_attempt_at
      end,
      finished_at = case
        when retry_cycle_attempts < 3 and attempts < 20 then null
        else v_now
      end
  where id = v_attempt.ingestion_id
    and current_attempt_id = v_attempt.id
    and status = 'processing'
    and execution_protocol = 2;

  update private.editorial_ingestion_slot set attempt_id = null where id = 1;
end;
$$;

create or replace function public.claim_next_editorial_ingestion(
  p_worker_instance_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_now timestamptz;
  v_existing private.editorial_ingestion_attempts%rowtype;
  v_slot private.editorial_ingestion_slot%rowtype;
  v_ingestion public.editorial_ingestions%rowtype;
  v_attempt private.editorial_ingestion_attempts%rowtype;
begin
  perform private.ensure_ingestion_worker('ingestas.worker.reclamar');

  select * into v_slot
  from private.editorial_ingestion_slot
  where id = 1
  for update skip locked;

  if not found then
    return private.build_ingestion_receipt(jsonb_build_object(
      'tipo', 'ocupado',
      'horaServidor', clock_timestamp(),
      'esperarMs', 5000
    ));
  end if;

  v_now := clock_timestamp();

  select * into v_existing
  from private.editorial_ingestion_attempts
  where worker_user_id = v_actor
    and worker_instance_id = p_worker_instance_id
    and claim_request_id = p_request_id;

  if found then
    if v_existing.status = 'active'
      and v_existing.lease_expires_at > v_now
      and v_existing.deadline_at > v_now then
      select * into v_ingestion
      from public.editorial_ingestions
      where id = v_existing.ingestion_id;

      return private.build_ingestion_receipt(jsonb_build_object(
        'tipo', 'asignado',
        'ingestaId', v_ingestion.id,
        'intentoId', v_existing.id,
        'tokenIntento', v_existing.attempt_token,
        'numeroIntento', v_existing.attempt_number,
        'leaseHasta', v_existing.lease_expires_at,
        'limiteIntentoHasta', v_existing.deadline_at,
        'horaServidor', v_now,
        'fuente', jsonb_build_object(
          'urlNormalizada', v_ingestion.normalized_url,
          'urlFuente', v_ingestion.source_url,
          'plataforma', v_ingestion.source_platform
        ),
        'checkpoint', case
          when jsonb_typeof(v_ingestion.processing_result -> 'original') = 'object' then jsonb_build_object(
            'versionContrato', 1,
            'tipo', 'transcripcion',
            'metadatos', v_ingestion.source_metadata,
            'original', v_ingestion.processing_result -> 'original',
            'limpieza', v_ingestion.processing_result -> 'limpieza'
          )
          else null
        end
      ));
    end if;

    return private.build_ingestion_receipt(jsonb_build_object(
      'tipo', 'solicitud_consumida',
      'intentoId', v_existing.id,
      'horaServidor', v_now,
      'esperarMs', 5000
    ));
  end if;

  perform private.release_expired_ingestion(v_now);

  select * into v_slot
  from private.editorial_ingestion_slot
  where id = 1
  for update;

  if v_slot.attempt_id is not null then
    return private.build_ingestion_receipt(jsonb_build_object(
      'tipo', 'ocupado',
      'horaServidor', v_now,
      'esperarMs', 5000
    ));
  end if;

  select * into v_ingestion
  from public.editorial_ingestions
  where status = 'queued'
    and execution_protocol = 2
    and source_platform = 'tiktok'
    and article_id is null
    and result_version = 0
    and attempts < 20
    and retry_cycle_attempts < 3
    and coalesce(next_attempt_at, queued_at, created_at) <= v_now
  order by queued_at nulls last, id
  for update skip locked
  limit 1;

  if not found then
    return private.build_ingestion_receipt(jsonb_build_object(
      'tipo', 'vacio',
      'horaServidor', v_now,
      'esperarMs', 10000
    ));
  end if;

  insert into private.editorial_ingestion_attempts (
    ingestion_id,
    attempt_number,
    worker_user_id,
    worker_instance_id,
    claim_request_id,
    status,
    started_at,
    heartbeat_at,
    lease_expires_at,
    deadline_at
  ) values (
    v_ingestion.id,
    v_ingestion.attempts + 1,
    v_actor,
    p_worker_instance_id,
    p_request_id,
    'active',
    v_now,
    v_now,
    v_now + interval '90 seconds',
    v_now + interval '15 minutes'
  )
  returning * into v_attempt;

  update private.editorial_ingestion_slot
  set attempt_id = v_attempt.id
  where id = 1;

  update public.editorial_ingestions
  set status = 'processing',
      attempts = attempts + 1,
      retry_cycle_attempts = retry_cycle_attempts + 1,
      current_attempt_id = v_attempt.id,
      started_at = v_now,
      finished_at = null,
      heartbeat_at = v_now,
      lease_expires_at = v_attempt.lease_expires_at,
      processing_stage = 'validating_source',
      progress_percent = 0,
      error_code = null,
      error_message = null,
      retryable = false
  where id = v_ingestion.id
  returning * into v_ingestion;

  return private.build_ingestion_receipt(jsonb_build_object(
    'tipo', 'asignado',
    'ingestaId', v_ingestion.id,
    'intentoId', v_attempt.id,
    'tokenIntento', v_attempt.attempt_token,
    'numeroIntento', v_attempt.attempt_number,
    'leaseHasta', v_attempt.lease_expires_at,
    'limiteIntentoHasta', v_attempt.deadline_at,
    'horaServidor', v_now,
    'fuente', jsonb_build_object(
      'urlNormalizada', v_ingestion.normalized_url,
      'urlFuente', v_ingestion.source_url,
      'plataforma', v_ingestion.source_platform
    ),
    'checkpoint', null
  ));
end;
$$;

create or replace function private.load_active_attempt(
  p_ingestion_id uuid,
  p_attempt_token uuid,
  p_worker_instance_id uuid
)
returns private.editorial_ingestion_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_slot private.editorial_ingestion_slot%rowtype;
  v_attempt private.editorial_ingestion_attempts%rowtype;
  v_ingestion public.editorial_ingestions%rowtype;
  v_now timestamptz;
begin
  select * into v_slot
  from private.editorial_ingestion_slot
  where id = 1
  for update;

  select * into v_ingestion
  from public.editorial_ingestions
  where id = p_ingestion_id
  for update;

  select * into v_attempt
  from private.editorial_ingestion_attempts
  where ingestion_id = p_ingestion_id
    and attempt_token = p_attempt_token
  for update;

  if not found
    or v_attempt.worker_user_id <> v_actor
    or v_attempt.worker_instance_id <> p_worker_instance_id
    or v_attempt.status <> 'active'
    or v_slot.attempt_id is distinct from v_attempt.id
    or v_ingestion.current_attempt_id is distinct from v_attempt.id
    or v_ingestion.status <> 'processing'
    or v_ingestion.execution_protocol <> 2 then
    raise exception 'LEASE_LOST';
  end if;

  v_now := clock_timestamp();
  if v_attempt.lease_expires_at <= v_now or v_attempt.deadline_at <= v_now then
    raise exception 'LEASE_LOST';
  end if;

  return v_attempt;
end;
$$;

create or replace function public.heartbeat_editorial_ingestion(
  p_ingestion_id uuid,
  p_attempt_token uuid,
  p_worker_instance_id uuid,
  p_sequence bigint,
  p_stage text,
  p_percent integer,
  p_checkpoint jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt private.editorial_ingestion_attempts%rowtype;
  v_now timestamptz;
  v_lease timestamptz;
  v_payload jsonb;
  v_receipt jsonb;
begin
  perform private.ensure_ingestion_worker('ingestas.worker.reportar');

  begin
    v_attempt := private.load_active_attempt(p_ingestion_id, p_attempt_token, p_worker_instance_id);
  exception when others then
    return private.safe_ingestion_error('LEASE_LOST', null);
  end;

  if p_sequence < 1
    or p_stage not in ('validating_source','reading_metadata','downloading_audio','transcribing','translating','persisting_evidence')
    or not (p_percent between 0 and 99) then
    return private.safe_ingestion_error('STALE_HEARTBEAT', null);
  end if;

  if p_checkpoint is not null and (
    jsonb_typeof(p_checkpoint) <> 'object'
    or pg_column_size(p_checkpoint) > 1048576
    or p_checkpoint ->> 'versionContrato' <> '1'
    or p_checkpoint ->> 'tipo' not in ('metadatos', 'transcripcion')
  ) then
    return private.safe_ingestion_error('TRANSCRIBER_INVALID_OUTPUT', 'persisting_evidence');
  end if;

  v_payload := jsonb_build_object(
    'sequence', p_sequence,
    'stage', p_stage,
    'percent', p_percent,
    'checkpoint', p_checkpoint
  );

  if p_sequence < v_attempt.last_sequence then
    return private.safe_ingestion_error('STALE_HEARTBEAT', null);
  end if;

  if p_sequence = v_attempt.last_sequence then
    if v_payload = v_attempt.last_heartbeat_payload then
      return v_attempt.last_heartbeat_receipt;
    end if;

    return private.safe_ingestion_error('IDEMPOTENCY_CONFLICT', null);
  end if;

  v_now := clock_timestamp();
  v_lease := least(v_now + interval '90 seconds', v_attempt.deadline_at);
  v_receipt := private.build_ingestion_receipt(jsonb_build_object(
    'ingestaId', p_ingestion_id,
    'secuencia', p_sequence,
    'leaseHasta', v_lease,
    'horaServidor', v_now
  ));

  update private.editorial_ingestion_attempts
  set heartbeat_at = v_now,
      lease_expires_at = v_lease,
      last_sequence = p_sequence,
      last_heartbeat_payload = v_payload,
      last_heartbeat_receipt = v_receipt
  where id = v_attempt.id;

  update public.editorial_ingestions
  set processing_stage = p_stage,
      progress_percent = greatest(progress_percent, p_percent),
      heartbeat_at = v_now,
      lease_expires_at = v_lease,
      source_metadata = case
        when p_checkpoint ->> 'tipo' in ('metadatos', 'transcripcion')
          and jsonb_typeof(p_checkpoint -> 'metadatos') = 'object'
        then p_checkpoint -> 'metadatos'
        else source_metadata
      end,
      processing_result = case
        when p_checkpoint ->> 'tipo' = 'transcripcion'
          and jsonb_typeof(p_checkpoint -> 'original') = 'object'
          and jsonb_typeof(p_checkpoint -> 'limpieza') = 'object'
        then jsonb_build_object(
          'versionContrato', 1,
          'original', p_checkpoint -> 'original',
          'limpieza', p_checkpoint -> 'limpieza'
        )
        else processing_result
      end,
      source_language = case
        when p_checkpoint ->> 'tipo' = 'transcripcion'
          and p_checkpoint #>> '{original,idioma}' in ('es', 'en')
        then p_checkpoint #>> '{original,idioma}'
        else source_language
      end
  where id = p_ingestion_id;

  return v_receipt;
end;
$$;

create or replace function public.complete_editorial_ingestion(
  p_ingestion_id uuid,
  p_attempt_token uuid,
  p_worker_instance_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt private.editorial_ingestion_attempts%rowtype;
  v_replay private.editorial_ingestion_attempts%rowtype;
  v_now timestamptz;
  v_receipt jsonb;
begin
  perform private.ensure_ingestion_worker('ingestas.worker.finalizar');

  select * into v_replay
  from private.editorial_ingestion_attempts
  where ingestion_id = p_ingestion_id
    and attempt_token = p_attempt_token
    and worker_user_id = (select auth.uid())
    and worker_instance_id = p_worker_instance_id
    and status = 'completed';

  if found then
    if v_replay.final_payload = p_payload then
      return v_replay.final_receipt;
    end if;

    return private.safe_ingestion_error('IDEMPOTENCY_CONFLICT', null);
  end if;

  begin
    v_attempt := private.load_active_attempt(p_ingestion_id, p_attempt_token, p_worker_instance_id);
  exception when others then
    return private.safe_ingestion_error('LEASE_LOST', null);
  end;

  if not private.validate_evidence_payload(p_payload) then
    return private.safe_ingestion_error('TRANSCRIBER_INVALID_OUTPUT', 'persisting_evidence');
  end if;

  v_now := clock_timestamp();
  v_receipt := private.build_ingestion_receipt(jsonb_build_object(
    'ingestaId', p_ingestion_id,
    'estado', 'evidence_ready',
    'versionResultado', 1,
    'finalizadoEn', v_now
  ));

  update public.editorial_ingestions
  set source_metadata = p_payload -> 'metadatos',
      processing_result = p_payload,
      source_language = p_payload #>> '{original,idioma}',
      result_version = 1,
      status = 'evidence_ready',
      processing_stage = 'completed',
      progress_percent = 100,
      finished_at = v_now,
      current_attempt_id = null,
      lease_expires_at = null,
      heartbeat_at = v_now,
      retryable = false,
      error_code = null,
      error_message = null
  where id = p_ingestion_id;

  update private.editorial_ingestion_attempts
  set status = 'completed',
      finished_at = v_now,
      final_payload = p_payload,
      final_receipt = v_receipt
  where id = v_attempt.id;

  update private.editorial_ingestion_slot
  set attempt_id = null
  where id = 1 and attempt_id = v_attempt.id;

  return v_receipt;
end;
$$;

create or replace function public.fail_editorial_ingestion(
  p_ingestion_id uuid,
  p_attempt_token uuid,
  p_worker_instance_id uuid,
  p_code text,
  p_stage text,
  p_retryable boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt private.editorial_ingestion_attempts%rowtype;
  v_replay private.editorial_ingestion_attempts%rowtype;
  v_now timestamptz;
  v_receipt jsonb;
begin
  perform private.ensure_ingestion_worker('ingestas.worker.finalizar');

  select * into v_replay
  from private.editorial_ingestion_attempts
  where ingestion_id = p_ingestion_id
    and attempt_token = p_attempt_token
    and worker_user_id = (select auth.uid())
    and worker_instance_id = p_worker_instance_id
    and status = 'failed';

  if found then
    return v_replay.final_receipt;
  end if;

  begin
    v_attempt := private.load_active_attempt(p_ingestion_id, p_attempt_token, p_worker_instance_id);
  exception when others then
    return private.safe_ingestion_error('LEASE_LOST', null);
  end;

  v_now := clock_timestamp();
  v_receipt := private.build_ingestion_receipt(jsonb_build_object(
    'ingestaId', p_ingestion_id,
    'estado', 'failed',
    'codigoError', left(p_code, 80),
    'recuperable', p_retryable,
    'finalizadoEn', v_now
  ));

  update public.editorial_ingestions
  set status = 'failed',
      finished_at = v_now,
      current_attempt_id = null,
      lease_expires_at = null,
      heartbeat_at = v_now,
      retryable = p_retryable,
      error_code = left(p_code, 80),
      error_message = 'La ingesta no pudo continuar con seguridad.'
  where id = p_ingestion_id;

  update private.editorial_ingestion_attempts
  set status = 'failed',
      finished_at = v_now,
      error_code = left(p_code, 80),
      error_stage = p_stage,
      final_payload = jsonb_build_object('codigo', p_code, 'etapa', p_stage, 'recuperable', p_retryable),
      final_receipt = v_receipt
  where id = v_attempt.id;

  update private.editorial_ingestion_slot
  set attempt_id = null
  where id = 1 and attempt_id = v_attempt.id;

  return v_receipt;
end;
$$;

create or replace function public.requeue_editorial_ingestion(
  p_ingestion_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_ingestion public.editorial_ingestions%rowtype;
  v_existing private.editorial_ingestion_requeue_receipts%rowtype;
  v_now timestamptz;
  v_receipt jsonb;
begin
  perform private.ensure_human_permission('ingestas.gestionar');

  select * into v_existing
  from private.editorial_ingestion_requeue_receipts
  where actor_id = v_actor
    and request_id = p_request_id;

  if found then
    if v_existing.ingestion_id = p_ingestion_id then
      return v_existing.receipt;
    end if;

    return private.safe_ingestion_error('IDEMPOTENCY_CONFLICT', null);
  end if;

  select * into v_ingestion
  from public.editorial_ingestions
  where id = p_ingestion_id
  for update;

  if not found then
    raise exception 'La ingesta no existe.';
  end if;

  if v_ingestion.status = 'evidence_ready' then
    return private.safe_ingestion_error('RESULT_ALREADY_EXISTS', null);
  end if;

  if not (
    v_ingestion.status = 'failed'
    and v_ingestion.retryable
    and v_ingestion.article_id is null
    and v_ingestion.result_version = 0
    and v_ingestion.attempts < 20
  ) then
    return private.safe_ingestion_error('LEGACY_REVIEW_REQUIRED', null);
  end if;

  v_now := clock_timestamp();
  update public.editorial_ingestions
  set status = 'queued',
      retry_cycle_attempts = 0,
      retryable = false,
      error_code = null,
      error_message = null,
      current_attempt_id = null,
      lease_expires_at = null,
      heartbeat_at = null,
      started_at = null,
      finished_at = null,
      processing_stage = null,
      progress_percent = 0,
      queued_at = v_now,
      next_attempt_at = v_now
  where id = p_ingestion_id
  returning * into v_ingestion;

  v_receipt := private.build_ingestion_receipt(jsonb_build_object(
    'ingestaId', v_ingestion.id,
    'estado', v_ingestion.status,
    'encoladoEn', v_now
  ));

  insert into private.editorial_ingestion_requeue_receipts (
    actor_id,
    request_id,
    ingestion_id,
    receipt
  ) values (
    v_actor,
    p_request_id,
    p_ingestion_id,
    v_receipt
  );

  return v_receipt;
exception
  when unique_violation then
    return private.safe_ingestion_error('ACTIVE_URL_CONFLICT', null);
end;
$$;

create or replace function public.cancel_editorial_ingestion(
  target_ingestion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_ingestion public.editorial_ingestions%rowtype;
begin
  perform private.ensure_human_permission('ingestas.gestionar');

  select *
    into current_ingestion
  from public.editorial_ingestions
  where id = target_ingestion_id
  for update;

  if not found then
    raise exception 'La ingesta no existe.';
  end if;

  if current_ingestion.status = 'cancelled' then
    return jsonb_build_object(
      'id', current_ingestion.id,
      'estado', current_ingestion.status,
      'actualizadoEn', current_ingestion.updated_at
    );
  end if;

  if current_ingestion.status not in ('pending', 'queued') then
    raise exception 'La ingesta ya empezo o no puede cancelarse.';
  end if;

  update public.editorial_ingestions
  set
    status = 'cancelled',
    finished_at = clock_timestamp(),
    current_attempt_id = null,
    lease_expires_at = null,
    retryable = false
  where id = target_ingestion_id
  returning * into current_ingestion;

  return jsonb_build_object(
    'id', current_ingestion.id,
    'estado', current_ingestion.status,
    'actualizadoEn', current_ingestion.updated_at
  );
end;
$$;

create or replace function public.claim_editorial_ingestion(target_ingestion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'LEGACY_PROCESSING_DISABLED';
end;
$$;

create or replace function public.complete_editorial_ingestion(
  target_ingestion_id uuid,
  target_article_id uuid,
  source_metadata jsonb,
  processing_result jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'LEGACY_PROCESSING_DISABLED';
end;
$$;

create or replace function public.fail_editorial_ingestion(
  target_ingestion_id uuid,
  error_code text,
  error_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'LEGACY_PROCESSING_DISABLED';
end;
$$;

drop policy if exists "editorial ingestions authorized read"
  on public.editorial_ingestions;

create policy "editorial ingestions authorized read"
  on public.editorial_ingestions for select
  to authenticated
  using (
    (
      public.has_editorial_permission('ingestas.ver')
      and not private.is_exclusive_ingestion_worker()
    )
    or (
      public.has_editorial_permission('ingestas.registrar')
      and requested_by = (select auth.uid())
      and not private.is_exclusive_ingestion_worker()
    )
  );

drop policy if exists "editorial ingestions authorized insert"
  on public.editorial_ingestions;

revoke insert on public.editorial_ingestions from authenticated;

revoke all on function public.register_editorial_ingestion(jsonb) from public, anon, authenticated;
revoke all on function public.claim_next_editorial_ingestion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.heartbeat_editorial_ingestion(uuid, uuid, uuid, bigint, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.complete_editorial_ingestion(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.fail_editorial_ingestion(uuid, uuid, uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.requeue_editorial_ingestion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancel_editorial_ingestion(uuid) from public, anon, authenticated;
revoke all on function public.claim_editorial_ingestion(uuid) from public, anon, authenticated;
revoke all on function public.complete_editorial_ingestion(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.fail_editorial_ingestion(uuid, text, text) from public, anon, authenticated;

grant execute on function public.register_editorial_ingestion(jsonb) to authenticated;
grant execute on function public.claim_next_editorial_ingestion(uuid, uuid) to authenticated;
grant execute on function public.heartbeat_editorial_ingestion(uuid, uuid, uuid, bigint, text, integer, jsonb) to authenticated;
grant execute on function public.complete_editorial_ingestion(uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function public.fail_editorial_ingestion(uuid, uuid, uuid, text, text, boolean) to authenticated;
grant execute on function public.requeue_editorial_ingestion(uuid, uuid) to authenticated;
grant execute on function public.cancel_editorial_ingestion(uuid) to authenticated;

comment on table private.editorial_ingestion_attempts is
  'Historial privado de intentos durables de HU-ED-07; contiene token de intento no expuesto al panel.';

comment on function public.register_editorial_ingestion(jsonb) is
  'Registra una fuente como protocolo 2 y la deja en cola durable sin crear borrador.';

comment on function public.complete_editorial_ingestion(uuid, uuid, uuid, jsonb) is
  'Finaliza HU-ED-07 en evidence_ready con evidencia validada, sin escribir articulos.';

commit;
