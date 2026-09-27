begin;

-- HU-ED-10: admite hasta cinco corridas editoriales independientes por día,
-- conservando el runId como llave idempotente para reintentos.
alter table public.editorial_codex_runs
  drop constraint if exists editorial_codex_runs_run_date_key;

create index if not exists idx_codex_editorial_runs_date
  on public.editorial_codex_runs (run_date, started_at);

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
  v_existing boolean := false;
  v_runs_today integer;
begin
  -- La firma HMAC y EXECUTE restringido a service_role son la frontera privada.
  if p_run_id is null then
    raise exception 'Acceso no autorizado al contexto Codex.' using errcode = '42501';
  end if;

  -- Serializa asignaciones simultáneas de IDs nuevos y evita exceder el límite.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('codex-editorial:' || v_date::text, 0)
  );

  select * into v_run
  from public.editorial_codex_runs
  where run_id = p_run_id
  for update;
  v_existing := found;

  if v_existing then
    if v_run.run_date <> v_date then
      raise exception 'La corrida editorial pertenece a otra fecha.' using errcode = '22023';
    end if;
  else
    select count(*)::integer into v_runs_today
    from public.editorial_codex_runs
    where run_date = v_date;

    if v_runs_today >= 5 then
      raise exception 'Se alcanzó el límite de cinco corridas editoriales para hoy.'
        using errcode = '54000';
    end if;

    insert into public.editorial_codex_runs (run_id, run_date)
    values (p_run_id, v_date);
    select * into v_run
    from public.editorial_codex_runs
    where run_id = p_run_id
    for update;
  end if;

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

commit;
