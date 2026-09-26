begin;

create table if not exists public.editorial_codex_runs (
  run_id uuid primary key,
  run_date date not null unique,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'partial', 'failed')),
  summary jsonb not null default '{}'::jsonb
    check (jsonb_typeof(summary) = 'object'),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.editorial_codex_run_categories (
  run_id uuid not null references public.editorial_codex_runs(run_id) on delete cascade,
  category_id uuid not null references public.categories(id),
  status text not null check (status in ('completed', 'needs_attention')),
  opportunity_count integer not null default 0 check (opportunity_count between 0 and 7),
  omitted_reason text check (omitted_reason is null or char_length(trim(omitted_reason)) between 20 and 600),
  checkpoint_at timestamptz not null default now(),
  primary key (run_id, category_id)
);

create table if not exists public.editorial_codex_agenda_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.editorial_codex_runs(run_id) on delete cascade,
  category_id uuid not null references public.categories(id),
  story_fingerprint text not null check (story_fingerprint ~ '^[a-fA-F0-9]{64}$'),
  candidate jsonb not null check (jsonb_typeof(candidate) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, category_id, story_fingerprint)
);

create index if not exists idx_codex_agenda_recent_fingerprint
  on public.editorial_codex_agenda_candidates (category_id, story_fingerprint, created_at desc);

alter table public.editorial_codex_runs enable row level security;
alter table public.editorial_codex_run_categories enable row level security;
alter table public.editorial_codex_agenda_candidates enable row level security;
revoke all on public.editorial_codex_runs from public, anon, authenticated;
revoke all on public.editorial_codex_run_categories from public, anon, authenticated;
revoke all on public.editorial_codex_agenda_candidates from public, anon, authenticated;
grant all on public.editorial_codex_runs to service_role;
grant all on public.editorial_codex_run_categories to service_role;
grant all on public.editorial_codex_agenda_candidates to service_role;

create or replace function public.get_codex_editorial_context(p_run_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_date date := (now() at time zone 'America/Bogota')::date;
  v_run public.editorial_codex_runs%rowtype;
  v_result jsonb;
begin
  -- SECURITY INVOKER y EXECUTE solo para service_role son la barrera de acceso.
  if p_run_id is null then
    raise exception 'Acceso no autorizado al contexto Codex.' using errcode = '42501';
  end if;

  insert into public.editorial_codex_runs (run_id, run_date)
  values (p_run_id, v_date)
  on conflict (run_date) do nothing;

  select * into v_run
  from public.editorial_codex_runs
  where run_date = v_date
  for update;

  if v_run.status = 'failed' then
    update public.editorial_codex_runs
    set status = 'in_progress', completed_at = null, updated_at = now()
    where run_id = v_run.run_id;
    v_run.status := 'in_progress';
  end if;

  select jsonb_build_object(
    'runId', v_run.run_id,
    'runDate', v_run.run_date,
    'status', v_run.status,
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', category.id,
        'name', category.name,
        'slug', category.slug,
        'description', category.description,
        'checkpoint', jsonb_build_object(
          'status', progress.status,
          'opportunityCount', progress.opportunity_count,
          'omittedReason', progress.omitted_reason,
          'checkpointAt', progress.checkpoint_at
        )
      ) order by category.display_order, category.name)
      from public.categories category
      left join public.editorial_codex_run_categories progress
        on progress.run_id = v_run.run_id and progress.category_id = category.id
      where category.is_active
    ), '[]'::jsonb),
    'topics', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', tag.id,
        'name', tag.name,
        'description', tag.description
      ) order by tag.name)
      from public.editorial_tags tag
      where tag.is_active
    ), '[]'::jsonb),
    'recentPublished', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id, 'title', recent.title, 'summary', recent.summary,
        'categoryId', recent.category_id, 'categoryName', recent.category_name,
        'publishedAt', recent.published_at
      ) order by recent.published_at desc nulls last)
      from (
        select article.id, article.title, article.summary, article.category_id,
          category.name as category_name, article.published_at
        from public.articles article
        left join public.categories category on category.id = article.category_id
        where article.status = 'published' and article.published_version_id is not null
          and article.published_at >= now() - interval '90 days'
        order by article.published_at desc nulls last
        limit 100
      ) recent
    ), '[]'::jsonb),
    'recentFingerprints', coalesce((
      select jsonb_agg(jsonb_build_object(
        'categoryId', candidate.category_id,
        'fingerprint', candidate.story_fingerprint,
        'candidate', candidate.candidate,
        'createdAt', candidate.created_at
      ) order by candidate.created_at desc)
      from (
        select agenda.category_id, agenda.story_fingerprint, agenda.candidate, agenda.created_at
        from public.editorial_codex_agenda_candidates agenda
        where agenda.created_at >= now() - interval '30 days'
        order by agenda.created_at desc
        limit 300
      ) candidate
    ), '[]'::jsonb),
    'agenda', coalesce((
      select jsonb_agg(jsonb_build_object(
        'categoryId', agenda.category_id,
        'fingerprint', agenda.story_fingerprint,
        'candidate', agenda.candidate
      ) order by agenda.category_id, agenda.created_at)
      from public.editorial_codex_agenda_candidates agenda
      where agenda.run_id = v_run.run_id
    ), '[]'::jsonb),
    'proposals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'categoryId', proposal.category_id,
        'fingerprint', proposal.story_fingerprint,
        'articleId', proposal.article_id,
        'title', article.title,
        'status', article.status,
        'createdAt', proposal.created_at
      ) order by proposal.created_at)
      from public.editorial_codex_proposals proposal
      join public.articles article on article.id = proposal.article_id
      where proposal.run_id = v_run.run_id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_codex_editorial_context(uuid)
  from public, anon, authenticated;
grant execute on function public.get_codex_editorial_context(uuid)
  to service_role;

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
  -- SECURITY INVOKER y EXECUTE solo para service_role son la barrera de acceso.
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
        or jsonb_object_length(v_opportunity) <> 8
        or coalesce(v_opportunity ->> 'trendUrl', '') !~ '^https://'
        or char_length(trim(coalesce(v_opportunity ->> 'trendTitle', ''))) not between 3 and 240
        or char_length(trim(coalesce(v_opportunity ->> 'term', ''))) not between 2 and 160
        or char_length(trim(coalesce(v_opportunity ->> 'titleHint', ''))) not between 8 and 220
        or char_length(trim(coalesce(v_opportunity ->> 'relevanceReason', ''))) not between 30 and 600
        or coalesce((v_opportunity ->> 'observedAt')::timestamptz, '-infinity'::timestamptz) < now() - interval '14 days'
        or coalesce((v_opportunity ->> 'observedAt')::timestamptz, 'infinity'::timestamptz) > now() + interval '5 minutes'
        or jsonb_typeof(v_opportunity -> 'scores') <> 'object'
        or jsonb_object_length(v_opportunity -> 'scores') <> 4
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

    -- El checkpoint es acumulativo: los lotes sucesivos completan la categoría
    -- y no reemplazan el conteo de oportunidades que ya quedaron persistidas.
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
