-- Corresponds to remote migration 20260926155026.
begin;

create or replace function public.save_codex_editorial_agenda(
  p_run_id uuid,
  p_categories jsonb,
  p_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category jsonb;
  v_opportunity jsonb;
  v_category_id uuid;
  v_fingerprint text;
  v_saved integer := 0;
  v_deduped integer := 0;
  v_completed integer := 0;
  v_saved_category integer;
  v_previous_omitted_reason text;
  v_checkpointed_total integer;
  v_run_status text;
  v_status text;
  v_omitted_reason text;
begin
  if p_run_id is null
    or jsonb_typeof(p_categories) <> 'array'
    or jsonb_array_length(p_categories) not between 1 and 50
    or p_status not in ('in_progress', 'completed', 'partial', 'failed') then
    raise exception 'El checkpoint de agenda no es válido.' using errcode = '22023';
  end if;

  select status into v_run_status from public.editorial_codex_runs
  where run_id = p_run_id and run_date = (now() at time zone 'America/Bogota')::date
  for update;
  if not found or v_run_status in ('completed', 'partial') then
    raise exception 'La corrida editorial no existe o ya venció.' using errcode = '22023';
  end if;

  for v_category in select value from jsonb_array_elements(p_categories) loop
    v_category_id := (v_category ->> 'categoryId')::uuid;
    if not exists (select 1 from public.categories where id = v_category_id and is_active) then
      raise exception 'La categoría ya no está activa.' using errcode = '22023';
    end if;
    if jsonb_typeof(v_category -> 'opportunities') <> 'array'
      or jsonb_array_length(v_category -> 'opportunities') > 7 then
      raise exception 'Cada categoría admite máximo siete oportunidades.' using errcode = '22023';
    end if;

    v_omitted_reason := nullif(trim(v_category ->> 'omittedReason'), '');
    select progress.omitted_reason into v_previous_omitted_reason
    from public.editorial_codex_run_categories progress
    where progress.run_id = p_run_id and progress.category_id = v_category_id;

    for v_opportunity in select value from jsonb_array_elements(v_category -> 'opportunities') loop
      v_fingerprint := lower(v_opportunity ->> 'fingerprint');
      if v_fingerprint !~ '^[a-f0-9]{64}$'
        or (select count(*) from jsonb_object_keys(v_opportunity)) <> 8
        or coalesce(v_opportunity ->> 'trendUrl', '') !~ '^https://'
        or char_length(trim(coalesce(v_opportunity ->> 'trendTitle', ''))) not between 3 and 240
        or char_length(trim(coalesce(v_opportunity ->> 'term', ''))) not between 2 and 160
        or char_length(trim(coalesce(v_opportunity ->> 'titleHint', ''))) not between 8 and 220
        or char_length(trim(coalesce(v_opportunity ->> 'relevanceReason', ''))) not between 30 and 600
        or coalesce((v_opportunity ->> 'observedAt')::timestamptz, '-infinity'::timestamptz) < now() - interval '14 days'
        or coalesce((v_opportunity ->> 'observedAt')::timestamptz, 'infinity'::timestamptz) > now() + interval '5 minutes'
        or jsonb_typeof(v_opportunity -> 'scores') <> 'object'
        or (select count(*) from jsonb_object_keys(v_opportunity -> 'scores')) <> 4
        or coalesce(v_opportunity -> 'scores' ->> 'recency', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity -> 'scores' ->> 'recency')::integer not between 0 and 100
        or coalesce(v_opportunity -> 'scores' ->> 'relevance', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity -> 'scores' ->> 'relevance')::integer not between 0 and 100
        or coalesce(v_opportunity -> 'scores' ->> 'novelty', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity -> 'scores' ->> 'novelty')::integer not between 0 and 100
        or coalesce(v_opportunity -> 'scores' ->> 'editorialFit', '') !~ '^(100|0|[1-9][0-9]?)$'
        or (v_opportunity -> 'scores' ->> 'editorialFit')::integer not between 0 and 100 then
        raise exception 'Una oportunidad no cumple el contrato de tendencias.' using errcode = '22023';
      end if;

      perform pg_advisory_xact_lock(hashtextextended(v_category_id::text || ':' || v_fingerprint, 0));
      if exists (
        select 1 from public.editorial_codex_agenda_candidates previous
        where previous.category_id = v_category_id
          and previous.story_fingerprint = v_fingerprint
          and previous.created_at >= now() - interval '30 days'
          and previous.run_id <> p_run_id
      ) then
        v_deduped := v_deduped + 1;
        continue;
      end if;

      insert into public.editorial_codex_agenda_candidates (
        run_id, category_id, story_fingerprint, candidate
      ) values (p_run_id, v_category_id, v_fingerprint, v_opportunity)
      on conflict (run_id, category_id, story_fingerprint)
      do update set candidate = excluded.candidate, updated_at = now();
      v_saved := v_saved + 1;
    end loop;

    select count(*) into v_saved_category
    from public.editorial_codex_agenda_candidates agenda
    where agenda.run_id = p_run_id and agenda.category_id = v_category_id;
    if v_saved_category > 7 then
      raise exception 'La categoría excede el máximo acumulado de siete oportunidades.' using errcode = '22023';
    end if;
    if v_saved_category < 5 then
      v_omitted_reason := coalesce(
        v_omitted_reason,
        v_previous_omitted_reason,
        'No se alcanzaron cinco oportunidades verificables tras combinar los lotes recibidos.'
      );
    else
      v_omitted_reason := null;
    end if;
    v_status := case when v_saved_category < 5 then 'needs_attention' else 'completed' end;
    insert into public.editorial_codex_run_categories (
      run_id, category_id, status, opportunity_count, omitted_reason, checkpoint_at
    ) values (p_run_id, v_category_id, v_status, v_saved_category, v_omitted_reason, now())
    on conflict (run_id, category_id)
    do update set status = excluded.status,
      opportunity_count = excluded.opportunity_count,
      omitted_reason = excluded.omitted_reason,
      checkpoint_at = now();
    v_completed := v_completed + 1;
  end loop;

  select count(*) into v_checkpointed_total
  from public.editorial_codex_run_categories progress
  where progress.run_id = p_run_id;

  if p_status in ('completed', 'partial') and exists (
    select 1 from public.categories category
    where category.is_active and not exists (
      select 1 from public.editorial_codex_run_categories progress
      where progress.run_id = p_run_id and progress.category_id = category.id
    )
  ) then
    raise exception 'No se puede cerrar la corrida: faltan checkpoints de categorías activas.' using errcode = '22023';
  end if;
  if p_status = 'completed' and exists (
    select 1 from public.editorial_codex_run_categories progress
    join public.categories category on category.id = progress.category_id
    where progress.run_id = p_run_id and category.is_active and progress.status <> 'completed'
  ) then
    raise exception 'La corrida completa tiene categorías que requieren atención.' using errcode = '22023';
  end if;

  update public.editorial_codex_runs
  set status = p_status,
    summary = jsonb_build_object(
      'categoriesCheckpointed', v_checkpointed_total,
      'opportunitiesSaved', (select count(*) from public.editorial_codex_agenda_candidates agenda where agenda.run_id = p_run_id),
      'opportunitiesDeduplicated', v_deduped
    ),
    completed_at = case when p_status in ('completed', 'partial', 'failed') then now() else null end,
    updated_at = now()
  where run_id = p_run_id;

  return jsonb_build_object(
    'runId', p_run_id,
    'status', p_status,
    'categoriesCheckpointed', v_completed,
    'opportunitiesSaved', v_saved,
    'opportunitiesDeduplicated', v_deduped
  );
end;
$$;

revoke all on function public.save_codex_editorial_agenda(uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.save_codex_editorial_agenda(uuid, jsonb, text)
  to service_role;

commit;
