begin;

-- Resultado de redacción DeepSeek separado del artículo: la corrida Codex
-- puede reintentar el envío sin volver a pagar por una respuesta ya recibida.
create table public.editorial_codex_draft_generations (
  idempotency_key uuid primary key,
  run_id uuid not null references public.editorial_codex_runs(run_id) on delete cascade,
  category_id uuid not null references public.categories(id),
  story_fingerprint text not null check (story_fingerprint ~ '^[a-f0-9]{64}$'),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'uncertain')),
  retry_count integer not null default 0 check (retry_count between 0 and 1),
  result jsonb,
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_]{1,80}$'),
  lease_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (run_id, category_id, story_fingerprint),
  check ((status = 'completed') = (result is not null)),
  check ((status = 'completed') = (completed_at is not null))
);

create index editorial_codex_draft_generations_recent_idx
  on public.editorial_codex_draft_generations (updated_at desc);

alter table public.editorial_codex_draft_generations enable row level security;
revoke all on public.editorial_codex_draft_generations from public, anon, authenticated;
grant all on public.editorial_codex_draft_generations to service_role;

create or replace function public.reserve_codex_editorial_draft(
  p_idempotency_key uuid,
  p_run_id uuid,
  p_category_id uuid,
  p_story_fingerprint text,
  p_request_hash text,
  p_retry_uncertain boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing public.editorial_codex_draft_generations%rowtype;
  v_run_date date;
begin
  if p_idempotency_key is null or p_run_id is null or p_category_id is null
    or p_story_fingerprint is null or p_story_fingerprint !~ '^[a-fA-F0-9]{64}$'
    or p_request_hash is null or p_request_hash !~ '^[a-fA-F0-9]{64}$' then
    raise exception 'La reserva de borrador no cumple el contrato.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('codex-draft-key:' || p_idempotency_key::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('codex-draft-story:' || p_run_id::text || ':' || p_category_id::text || ':' || lower(p_story_fingerprint), 0)
  );

  select run.run_date into v_run_date
  from public.editorial_codex_runs run
  where run.run_id = p_run_id;
  if v_run_date is null or v_run_date <> (now() at time zone 'America/Bogota')::date then
    raise exception 'La corrida no existe o pertenece a otro día.' using errcode = '22023';
  end if;

  delete from public.editorial_codex_draft_generations
  where updated_at < now() - interval '90 days';

  select * into v_existing
  from public.editorial_codex_draft_generations generation
  where generation.idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing.run_id <> p_run_id or v_existing.category_id <> p_category_id
      or v_existing.story_fingerprint <> lower(p_story_fingerprint)
      or v_existing.request_hash <> lower(p_request_hash) then
      raise exception 'La historia o clave ya está ligada a otra solicitud.' using errcode = '23505';
    end if;
  else
    select * into v_existing
    from public.editorial_codex_draft_generations generation
    where generation.run_id = p_run_id
      and generation.category_id = p_category_id
      and generation.story_fingerprint = lower(p_story_fingerprint)
    for update;
    if found then
      raise exception 'La historia ya tiene otra clave de idempotencia.' using errcode = '23505';
    end if;
  end if;

  if v_existing.idempotency_key is not null then
    if v_existing.status = 'completed' then
      return jsonb_build_object('estado', 'completed', 'resultado', v_existing.result);
    end if;
    if v_existing.status = 'running' then
      if v_existing.lease_until > now() then
        return jsonb_build_object('estado', 'running');
      end if;
      update public.editorial_codex_draft_generations
      set status = 'uncertain', error_code = 'LEASE_EXPIRADA',
          lease_until = now(), updated_at = now()
      where idempotency_key = p_idempotency_key;
      return jsonb_build_object('estado', 'uncertain');
    end if;
    if v_existing.status = 'uncertain' and not coalesce(p_retry_uncertain, false) then
      return jsonb_build_object('estado', 'uncertain');
    end if;
    if v_existing.status = 'uncertain' and v_existing.retry_count >= 1 then
      return jsonb_build_object('estado', 'retry_exhausted');
    end if;

    update public.editorial_codex_draft_generations
    set status = 'running', result = null, error_code = null,
        retry_count = retry_count + case when status = 'uncertain' then 1 else 0 end,
        completed_at = null, lease_until = now() + interval '4 minutes', updated_at = now()
    where idempotency_key = p_idempotency_key;
    return jsonb_build_object('estado', 'reserved');
  end if;

  insert into public.editorial_codex_draft_generations (
    idempotency_key, run_id, category_id, story_fingerprint, request_hash,
    status, lease_until
  ) values (
    p_idempotency_key, p_run_id, p_category_id, lower(p_story_fingerprint), lower(p_request_hash),
    'running', now() + interval '4 minutes'
  );
  return jsonb_build_object('estado', 'reserved');
end;
$$;

create or replace function public.complete_codex_editorial_draft(
  p_idempotency_key uuid,
  p_resultado jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if p_idempotency_key is null or p_resultado is null
    or pg_catalog.jsonb_typeof(p_resultado) <> 'object'
    or pg_catalog.pg_column_size(p_resultado) > 500000 then
    raise exception 'El resultado DeepSeek no cumple el contrato.' using errcode = '22023';
  end if;

  update public.editorial_codex_draft_generations
  set status = 'completed', result = p_resultado, error_code = null,
      completed_at = now(), updated_at = now(), lease_until = now()
  where idempotency_key = p_idempotency_key and status = 'running'
  returning result into v_result;
  if not found then
    raise exception 'No existe una reserva activa para guardar el borrador.' using errcode = 'P0002';
  end if;
  return v_result;
end;
$$;

create or replace function public.fail_codex_editorial_draft(
  p_idempotency_key uuid,
  p_error_code text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_idempotency_key is null or p_error_code !~ '^[A-Z0-9_]{1,80}$' then
    raise exception 'El fallo DeepSeek no cumple el contrato.' using errcode = '22023';
  end if;
  update public.editorial_codex_draft_generations
  set status = 'failed', result = null, error_code = p_error_code,
      completed_at = null, lease_until = now(), updated_at = now()
  where idempotency_key = p_idempotency_key and status = 'running';
end;
$$;

create or replace function public.mark_codex_editorial_draft_uncertain(
  p_idempotency_key uuid,
  p_error_code text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_idempotency_key is null or p_error_code !~ '^[A-Z0-9_]{1,80}$' then
    raise exception 'El estado incierto DeepSeek no cumple el contrato.' using errcode = '22023';
  end if;
  update public.editorial_codex_draft_generations
  set status = 'uncertain', error_code = p_error_code,
      completed_at = null, lease_until = now(), updated_at = now()
  where idempotency_key = p_idempotency_key and status = 'running';
end;
$$;

revoke all on function public.reserve_codex_editorial_draft(uuid, uuid, uuid, text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.complete_codex_editorial_draft(uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.fail_codex_editorial_draft(uuid, text)
  from public, anon, authenticated;
revoke all on function public.mark_codex_editorial_draft_uncertain(uuid, text)
  from public, anon, authenticated;
grant execute on function public.reserve_codex_editorial_draft(uuid, uuid, uuid, text, text, boolean)
  to service_role;
grant execute on function public.complete_codex_editorial_draft(uuid, jsonb)
  to service_role;
grant execute on function public.fail_codex_editorial_draft(uuid, text)
  to service_role;
grant execute on function public.mark_codex_editorial_draft_uncertain(uuid, text)
  to service_role;

commit;
