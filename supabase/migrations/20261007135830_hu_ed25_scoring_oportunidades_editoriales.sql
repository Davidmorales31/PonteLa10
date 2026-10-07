begin;

-- HU-ED-25: amplía el contexto privado y valida el scoring estratégico nuevo.
-- SECURITY INVOKER + EXECUTE solo para service_role conserva la frontera HMAC
-- de la API; no se expone información Search Console en páginas públicas.
grant select (article_id, entity_type, entity_slug, entity_name, status)
  on public.editorial_article_entity_relations to service_role;
grant select (id, period_start, period_end, imported_at)
  on public.editorial_search_console_reports to service_role;
grant select (report_id, query, page_url, clicks, impressions, ctr, average_position)
  on public.editorial_search_console_metrics to service_role;
grant select (triage_key, action)
  on public.editorial_search_console_triage to service_role;

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
  if p_run_id is null then
    raise exception 'Acceso no autorizado al contexto Codex.' using errcode = '42501';
  end if;

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
        'id', recent.id,
        'title', recent.title,
        'summary', recent.summary,
        'categoryId', recent.category_id,
        'categoryName', recent.category_name,
        'publishedAt', recent.published_at,
        'url', '/articulos/' || recent.slug
      ) order by recent.published_at desc nulls last)
      from (
        select article.id, article.slug, article.title, article.summary,
          article.category_id, category.name as category_name, article.published_at
        from public.articles article
        left join public.categories category on category.id = article.category_id
        where article.status = 'published' and article.published_version_id is not null
          and article.published_at >= now() - interval '90 days'
        order by article.published_at desc nulls last
        limit 100
      ) recent
    ), '[]'::jsonb),
    'entities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', entity.entity_type,
        'slug', entity.entity_slug,
        'name', entity.entity_name,
        'publishedArticleCount', entity.published_article_count,
        'url', case entity.entity_type
          when 'player' then '/jugadores/' || entity.entity_slug
          when 'team' then '/equipos/' || entity.entity_slug
          when 'competition' then '/competiciones/' || entity.entity_slug
          when 'match' then '/partidos/' || entity.entity_slug
        end
      ) order by entity.published_article_count desc, entity.entity_name)
      from (
        select relation.entity_type, relation.entity_slug,
          max(relation.entity_name) as entity_name,
          count(distinct article.id)::integer as published_article_count
        from public.editorial_article_entity_relations relation
        join public.articles article on article.id = relation.article_id
        where relation.status = 'confirmed'
          and relation.entity_type in ('player', 'team', 'competition', 'match')
          and article.status = 'published'
          and article.published_version_id is not null
        group by relation.entity_type, relation.entity_slug
        order by count(distinct article.id) desc, max(relation.entity_name)
        limit 200
      ) entity
    ), '[]'::jsonb),
    'searchConsole', coalesce((
      select jsonb_build_object(
        'available', true,
        'periodStart', report.period_start,
        'periodEnd', report.period_end,
        'opportunities', coalesce((
          select jsonb_agg(jsonb_build_object(
            'query', metric.query,
            'pageUrl', metric.page_url,
            'clicks', metric.clicks,
            'impressions', metric.impressions,
            'ctr', metric.ctr,
            'averagePosition', metric.average_position,
            'triageAction', triage.action
          ) order by metric.impressions desc, metric.clicks desc, metric.query)
          from (
            select source_metric.*
            from public.editorial_search_console_metrics source_metric
            where source_metric.report_id = report.id
              and source_metric.impressions > 0
              and source_metric.average_position between 5 and 40
            order by source_metric.impressions desc, source_metric.clicks desc,
              source_metric.query
            limit 120
          ) metric
          left join public.editorial_search_console_triage triage
            on triage.triage_key = pg_catalog.md5(
              pg_catalog.lower(pg_catalog.btrim(metric.query))
              || pg_catalog.chr(31) || metric.page_url
            )
        ), '[]'::jsonb)
      )
      from (
        select id, period_start, period_end
        from public.editorial_search_console_reports
        order by period_end desc, imported_at desc
        limit 1
      ) report
    ), '{"available":false,"periodStart":null,"periodEnd":null,"opportunities":[]}'::jsonb),
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
  v_scores jsonb;
  v_assessment jsonb;
  v_evidence jsonb;
  v_entity jsonb;
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
  v_target_url text;
  v_recommendation text;
  v_priority_score integer;
  v_expected_priority integer;
  v_gsc_score integer;
  v_entity_score integer;
  v_article_id_text text;
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
      v_scores := v_opportunity -> 'scores';
      v_assessment := v_opportunity -> 'assessment';

      if v_fingerprint !~ '^[a-f0-9]{64}$'
        or coalesce(v_opportunity ->> 'trendUrl', '') !~ '^https://'
        or char_length(trim(coalesce(v_opportunity ->> 'trendTitle', ''))) not between 3 and 240
        or char_length(trim(coalesce(v_opportunity ->> 'term', ''))) not between 2 and 160
        or char_length(trim(coalesce(v_opportunity ->> 'titleHint', ''))) not between 8 and 220
        or char_length(trim(coalesce(v_opportunity ->> 'relevanceReason', ''))) not between 30 and 600
        or coalesce((v_opportunity ->> 'observedAt')::timestamptz, '-infinity'::timestamptz) < now() - interval '14 days'
        or coalesce((v_opportunity ->> 'observedAt')::timestamptz, 'infinity'::timestamptz) > now() + interval '5 minutes' then
        raise exception 'Una oportunidad no cumple el contrato base de tendencias.' using errcode = '22023';
      end if;

      -- Compatibilidad transitoria: los runs existentes pueden enviar el
      -- contrato v1; toda nueva investigación del skill usa v2.
      if jsonb_typeof(v_opportunity) <> 'object' then
        raise exception 'La oportunidad debe ser un objeto JSON.' using errcode = '22023';
      elsif (select count(*) from jsonb_object_keys(v_opportunity)) = 8 then
        if jsonb_typeof(v_scores) <> 'object'
          or (select count(*) from jsonb_object_keys(v_scores)) <> 4
          or coalesce(v_scores ->> 'recency', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'recency')::integer not between 0 and 100
          or coalesce(v_scores ->> 'relevance', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'relevance')::integer not between 0 and 100
          or coalesce(v_scores ->> 'novelty', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'novelty')::integer not between 0 and 100
          or coalesce(v_scores ->> 'editorialFit', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'editorialFit')::integer not between 0 and 100 then
          raise exception 'Los puntajes v1 de la oportunidad no son válidos.' using errcode = '22023';
        end if;
        if not exists (
          select 1 from public.editorial_codex_agenda_candidates previous
          where previous.run_id = p_run_id
            and previous.category_id = v_category_id
            and previous.story_fingerprint = v_fingerprint
            and not (previous.candidate ? 'assessment')
        ) then
          raise exception 'El formato v1 solo puede reanudar un checkpoint histórico sin evaluación.' using errcode = '22023';
        end if;
      elsif (select count(*) from jsonb_object_keys(v_opportunity)) = 9 then
        if jsonb_typeof(v_scores) <> 'object'
          or (select count(*) from jsonb_object_keys(v_scores)) <> 8
          or not (v_scores ?& array[
            'demandSignal', 'clusterProximity', 'existingEntity', 'novelty',
            'searchConsoleOpportunity', 'differentialValue', 'updateability', 'priorityScore'
          ])
          or jsonb_typeof(v_assessment) <> 'object'
          or (select count(*) from jsonb_object_keys(v_assessment)) <> 9
          or not (v_assessment ?& array[
            'recommendation', 'targetUrl', 'entityMatch', 'cannibalizationRisk',
            'similarArticleIds', 'addsNewValue', 'noveltyRationale', 'differentiator', 'searchConsoleEvidence'
          ])
          or coalesce(v_scores ->> 'demandSignal', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'demandSignal')::integer not between 0 and 100
          or coalesce(v_scores ->> 'clusterProximity', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'clusterProximity')::integer not between 0 and 100
          or coalesce(v_scores ->> 'existingEntity', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'existingEntity')::integer not between 0 and 100
          or coalesce(v_scores ->> 'novelty', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'novelty')::integer not between 0 and 100
          or jsonb_typeof(v_scores -> 'searchConsoleOpportunity') not in ('number', 'null')
          or (jsonb_typeof(v_scores -> 'searchConsoleOpportunity') = 'number'
            and coalesce(v_scores ->> 'searchConsoleOpportunity', '') !~ '^(100|0|[1-9][0-9]?)$')
          or (jsonb_typeof(v_scores -> 'searchConsoleOpportunity') = 'number'
            and (v_scores ->> 'searchConsoleOpportunity')::integer not between 0 and 100)
          or coalesce(v_scores ->> 'differentialValue', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'differentialValue')::integer not between 0 and 100
          or coalesce(v_scores ->> 'updateability', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'updateability')::integer not between 0 and 100
          or coalesce(v_scores ->> 'priorityScore', '') !~ '^(100|0|[1-9][0-9]?)$'
          or (v_scores ->> 'priorityScore')::integer not between 0 and 100
          or coalesce(v_assessment ->> 'recommendation', '') not in ('create', 'update', 'merge', 'expand', 'discard')
          or coalesce(v_assessment ->> 'cannibalizationRisk', '') not in ('none', 'low', 'medium', 'high')
          or jsonb_typeof(v_assessment -> 'addsNewValue') <> 'boolean'
          or jsonb_typeof(v_assessment -> 'similarArticleIds') <> 'array'
          or jsonb_array_length(v_assessment -> 'similarArticleIds') > 3
          or char_length(trim(coalesce(v_assessment ->> 'noveltyRationale', ''))) not between 30 and 600
          or char_length(trim(coalesce(v_assessment ->> 'differentiator', ''))) not between 30 and 500 then
          raise exception 'La evaluación v2 de la oportunidad no es válida.' using errcode = '22023';
        end if;

        v_recommendation := v_assessment ->> 'recommendation';
        v_target_url := v_assessment ->> 'targetUrl';
        v_evidence := v_assessment -> 'searchConsoleEvidence';
        v_entity := v_assessment -> 'entityMatch';
        v_gsc_score := case when jsonb_typeof(v_scores -> 'searchConsoleOpportunity') = 'null'
          then null else (v_scores ->> 'searchConsoleOpportunity')::integer end;
        v_entity_score := (v_scores ->> 'existingEntity')::integer;
        v_priority_score := (v_scores ->> 'priorityScore')::integer;
        v_expected_priority := round((
          (v_scores ->> 'demandSignal')::numeric * 25
          + (v_scores ->> 'clusterProximity')::numeric * 20
          + v_entity_score::numeric * 10
          + (v_scores ->> 'novelty')::numeric * 15
          + coalesce(v_gsc_score, 0)::numeric * 10
          + (v_scores ->> 'differentialValue')::numeric * 15
          + (v_scores ->> 'updateability')::numeric * 5
        ) / case when v_gsc_score is null then 90 else 100 end)::integer;

        if v_priority_score <> v_expected_priority
          or (v_gsc_score is null) <> (jsonb_typeof(v_evidence) = 'null')
          or (jsonb_typeof(v_entity) = 'null' and v_entity_score <> 0)
          or (v_recommendation = 'create' and v_target_url is not null)
          or (v_recommendation <> 'discard' and v_assessment ->> 'addsNewValue' <> 'true')
          or (v_recommendation = 'create' and (v_assessment ->> 'cannibalizationRisk' = 'high'
            or (v_scores ->> 'updateability')::integer >= 60))
          or (v_recommendation in ('update', 'merge', 'expand') and v_target_url is null)
          or (v_recommendation in ('update', 'merge') and v_target_url !~ '^/articulos/[a-z0-9]+(-[a-z0-9]+)*$')
          or (v_recommendation = 'expand' and v_target_url like '/jugadores/%'
            and (jsonb_typeof(v_entity) = 'null' or v_entity ->> 'type' <> 'player'
              or v_entity ->> 'slug' <> pg_catalog.split_part(v_target_url, '/', 3)))
          or (v_recommendation = 'expand' and v_target_url like '/equipos/%'
            and (jsonb_typeof(v_entity) = 'null' or v_entity ->> 'type' <> 'team'
              or v_entity ->> 'slug' <> pg_catalog.split_part(v_target_url, '/', 3)))
          or (v_recommendation = 'expand' and v_target_url like '/competiciones/%'
            and (jsonb_typeof(v_entity) = 'null' or v_entity ->> 'type' <> 'competition'
              or v_entity ->> 'slug' <> pg_catalog.split_part(v_target_url, '/', 3)))
          or (v_recommendation = 'expand' and v_target_url like '/partidos/%'
            and (jsonb_typeof(v_entity) = 'null' or v_entity ->> 'type' <> 'match'
              or v_entity ->> 'slug' <> pg_catalog.split_part(v_target_url, '/', 3)))
          or (v_assessment ->> 'cannibalizationRisk' in ('medium', 'high')
            and jsonb_array_length(v_assessment -> 'similarArticleIds') = 0)
          or (v_target_url is not null and v_target_url !~ '^/(articulos|jugadores|equipos|competiciones|partidos)/[a-z0-9]+(-[a-z0-9]+)*$') then
          raise exception 'La puntuación, evidencia o destino v2 no coincide con el contrato editorial.' using errcode = '22023';
        end if;

        if jsonb_typeof(v_entity) <> 'null' then
          if jsonb_typeof(v_entity) <> 'object'
            or (select count(*) from jsonb_object_keys(v_entity)) <> 3
            or coalesce(v_entity ->> 'type', '') not in ('player', 'team', 'competition', 'match')
            or coalesce(v_entity ->> 'slug', '') !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
            or char_length(trim(coalesce(v_entity ->> 'name', ''))) not between 2 and 160
            or not exists (
              select 1
              from public.editorial_article_entity_relations relation
              join public.articles article on article.id = relation.article_id
              where relation.entity_type = v_entity ->> 'type'
                and relation.entity_slug = v_entity ->> 'slug'
                and relation.entity_name = v_entity ->> 'name'
                and relation.status = 'confirmed'
                and article.status = 'published'
                and article.published_version_id is not null
            ) then
            raise exception 'La entidad debe coincidir con una relación publicada y confirmada.' using errcode = '22023';
          end if;
        end if;

        if exists (
          select 1
          from jsonb_array_elements_text(v_assessment -> 'similarArticleIds') as similar(article_id)
          where similar.article_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             or not exists (
               select 1 from public.articles article
               where article.id::text = pg_catalog.lower(similar.article_id)
                 and article.status = 'published'
                 and article.published_version_id is not null
             )
        ) or (select count(*) from jsonb_array_elements_text(v_assessment -> 'similarArticleIds'))
          <> (select count(distinct pg_catalog.lower(article_id)) from jsonb_array_elements_text(v_assessment -> 'similarArticleIds') as similar(article_id)) then
          raise exception 'Los artículos similares deben existir, estar publicados y no repetirse.' using errcode = '22023';
        end if;

        if v_target_url is not null and (
          (v_target_url like '/articulos/%' and not exists (
            select 1 from public.articles article
            where article.slug = pg_catalog.split_part(v_target_url, '/', 3)
              and article.status = 'published' and article.published_version_id is not null
          ))
          or (v_target_url like '/jugadores/%' and not exists (
            select 1 from public.editorial_article_entity_relations relation
            join public.articles article on article.id = relation.article_id
            where relation.entity_type = 'player' and relation.entity_slug = pg_catalog.split_part(v_target_url, '/', 3)
              and relation.status = 'confirmed' and article.status = 'published' and article.published_version_id is not null
          ))
          or (v_target_url like '/equipos/%' and not exists (
            select 1 from public.editorial_article_entity_relations relation
            join public.articles article on article.id = relation.article_id
            where relation.entity_type = 'team' and relation.entity_slug = pg_catalog.split_part(v_target_url, '/', 3)
              and relation.status = 'confirmed' and article.status = 'published' and article.published_version_id is not null
          ))
          or (v_target_url like '/competiciones/%' and not exists (
            select 1 from public.editorial_article_entity_relations relation
            join public.articles article on article.id = relation.article_id
            where relation.entity_type = 'competition' and relation.entity_slug = pg_catalog.split_part(v_target_url, '/', 3)
              and relation.status = 'confirmed' and article.status = 'published' and article.published_version_id is not null
          ))
          or (v_target_url like '/partidos/%' and not exists (
            select 1 from public.editorial_article_entity_relations relation
            join public.articles article on article.id = relation.article_id
            where relation.entity_type = 'match' and relation.entity_slug = pg_catalog.split_part(v_target_url, '/', 3)
              and relation.status = 'confirmed' and article.status = 'published' and article.published_version_id is not null
          ))
        ) then
          raise exception 'La URL objetivo debe corresponder a una página publicada existente.' using errcode = '22023';
        end if;

        if jsonb_typeof(v_evidence) <> 'null' then
          if jsonb_typeof(v_evidence) <> 'object'
            or (select count(*) from jsonb_object_keys(v_evidence)) <> 3
            or char_length(trim(coalesce(v_evidence ->> 'query', ''))) not between 1 and 500
            or coalesce(v_evidence ->> 'pageUrl', '') !~ '^https://(www\.)?pont3la10\.com/'
            or coalesce(v_evidence ->> 'pageUrl', '') ~ '[?#]'
            or coalesce(v_evidence ->> 'reportPeriodEnd', '') !~ '^\d{4}-\d{2}-\d{2}$'
            or not exists (
              select 1
              from public.editorial_search_console_reports report
              join public.editorial_search_console_metrics metric on metric.report_id = report.id
              where report.period_end = (v_evidence ->> 'reportPeriodEnd')::date
                and report.id = (
                  select latest.id from public.editorial_search_console_reports latest
                  order by latest.period_end desc, latest.imported_at desc limit 1
                )
                and metric.query = v_evidence ->> 'query'
                and metric.page_url = v_evidence ->> 'pageUrl'
            ) then
            raise exception 'La evidencia Search Console no pertenece al reporte real más reciente.' using errcode = '22023';
          end if;
        end if;
      else
        raise exception 'La oportunidad no corresponde a un formato v1 o v2 admitido.' using errcode = '22023';
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

-- La recomendación no es solo una instrucción del skill: se verifica antes de
-- invocar el proveedor de redacción y otra vez antes de guardar una propuesta.
create or replace function public.enforce_codex_create_recommendation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row jsonb := pg_catalog.to_jsonb(new);
  v_run_id uuid := (v_row ->> 'run_id')::uuid;
  v_category_id uuid := (v_row ->> 'category_id')::uuid;
  v_fingerprint text := lower(v_row ->> 'story_fingerprint');
  v_candidate jsonb;
  v_run_date date;
begin
  select run.run_date into v_run_date
  from public.editorial_codex_runs run
  where run.run_id = v_run_id;
  if v_run_date is null or v_run_date <> (now() at time zone 'America/Bogota')::date then
    raise exception 'La propuesta requiere una corrida editorial vigente de hoy.' using errcode = '22023';
  end if;

  select agenda.candidate into v_candidate
  from public.editorial_codex_agenda_candidates agenda
  where agenda.run_id = v_run_id
    and agenda.category_id = v_category_id
    and agenda.story_fingerprint = v_fingerprint
  for share;
  if not found then
    raise exception 'La historia no existe en la agenda editorial validada.' using errcode = '22023';
  end if;

  -- Solo agendas v1 ya persistidas antes de ED-25 se conservan para reanudar.
  -- Las agendas nuevas v1 se rechazan en save_codex_editorial_agenda.
  if v_candidate ? 'assessment'
    and ((v_candidate #>> '{assessment,recommendation}') is distinct from 'create'
      or (v_candidate #>> '{assessment,addsNewValue}') is distinct from 'true') then
    raise exception 'Solo una recomendación create con valor nuevo puede generar un borrador.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_codex_create_recommendation()
  from public, anon, authenticated, service_role;

drop trigger if exists editorial_codex_draft_create_gate
  on public.editorial_codex_draft_generations;
create trigger editorial_codex_draft_create_gate
  before insert or update on public.editorial_codex_draft_generations
  for each row when (new.status = 'running')
  execute function public.enforce_codex_create_recommendation();

drop trigger if exists editorial_codex_proposal_create_gate
  on public.editorial_codex_proposals;
create trigger editorial_codex_proposal_create_gate
  before insert on public.editorial_codex_proposals
  for each row execute function public.enforce_codex_create_recommendation();

commit;
