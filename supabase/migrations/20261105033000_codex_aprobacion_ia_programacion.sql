begin;

-- Aprobación IA autorizada por el responsable. No se atribuye a un usuario humano.
create table public.editorial_codex_ai_approvals (
  idempotency_key uuid primary key references public.editorial_codex_proposals(idempotency_key),
  article_id uuid not null unique references public.articles(id),
  run_id uuid not null references public.editorial_codex_runs(run_id),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  review jsonb not null check (jsonb_typeof(review) = 'object'),
  scheduled_at timestamptz not null,
  receipt jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.editorial_codex_ai_approvals enable row level security;
revoke all on public.editorial_codex_ai_approvals from public, anon, authenticated;
grant all on public.editorial_codex_ai_approvals to service_role;
create policy codex_ai_approvals_read on public.editorial_codex_ai_approvals
  for select to authenticated using (public.has_editorial_permission('contenido.verBorradores'));
grant select on public.editorial_codex_ai_approvals to authenticated;

alter table public.editorial_publication_slot_policy
  drop constraint editorial_publication_slot_policy_interval_minutes_check;
alter table public.editorial_publication_slot_policy
  add constraint editorial_publication_slot_policy_interval_minutes_check check (interval_minutes between 2 and 1440);
update public.editorial_publication_slot_policy set interval_minutes = 2, updated_at = now() where policy_key = 'default';
alter table public.editorial_codex_run_categories
  drop constraint editorial_codex_run_categories_opportunity_count_check;
alter table public.editorial_codex_run_categories
  add constraint editorial_codex_run_categories_opportunity_count_check check (opportunity_count between 0 and 20);

-- Ajustes acotados sobre las definiciones vigentes; abortar si cambió el contrato.
do $$
declare
  v_def text;
begin
  v_def := pg_get_functiondef('public.get_codex_editorial_context(uuid)'::regprocedure);
  if strpos(v_def, 'v_runs_today >= 5') = 0 then raise exception 'Revisar límite de corridas vigente.'; end if;
  execute replace(replace(v_def, 'v_runs_today >= 5', 'v_runs_today >= 2'), 'cinco corridas', 'dos corridas');

  v_def := pg_get_functiondef('public.save_codex_editorial_agenda(uuid,jsonb,text)'::regprocedure);
  if strpos(v_def, 'v_saved_category > 7') = 0
    or strpos(v_def, 'jsonb_array_length(v_category -> ''opportunities'') > 7') = 0 then
    raise exception 'Revisar límite de agenda vigente.';
  end if;
  v_def := replace(replace(replace(v_def, 'v_saved_category > 7', 'v_saved_category > 20'),
    'jsonb_array_length(v_category -> ''opportunities'') > 7', 'jsonb_array_length(v_category -> ''opportunities'') > 20'),
    'siete oportunidades', 'veinte oportunidades');
  -- Una corrida incompleta se cierra como parcial, nunca como objetivo cumplido.
  if strpos(v_def, '  for v_category in select value from jsonb_array_elements(p_categories) loop') = 0 then
    raise exception 'Revisar bloqueo y bucle de agenda vigente.';
  end if;
  v_def := replace(v_def, '  for v_category in select value from jsonb_array_elements(p_categories) loop', E'  if p_status = ''completed'' and exists (\n    select 1 from public.categories c where c.is_active and (\n      select count(*) from public.editorial_codex_ai_approvals a\n      join public.articles article on article.id = a.article_id\n      where a.run_id = p_run_id and article.category_id = c.id\n        and article.status::text in (''scheduled'', ''published'')\n    ) < 10\n  ) then p_status := ''partial''; end if;\n  for v_category in select value from jsonb_array_elements(p_categories) loop');
  execute v_def;

  v_def := pg_get_functiondef('public.approve_and_schedule_editorial_article(uuid,integer,boolean)'::regprocedure);
  if strpos(v_def, 'v_interval < 15 or v_interval > 1440') = 0 then raise exception 'Revisar intervalo vigente.'; end if;
  execute replace(v_def, 'v_interval < 15 or v_interval > 1440', 'v_interval < 2 or v_interval > 1440');

  v_def := pg_get_functiondef('public.submit_codex_editorial_proposal(jsonb)'::regprocedure);
  if strpos(v_def, 'jsonb_array_length(p_input -> ''sources'') < 2') = 0 then raise exception 'Revisar contrato de fuentes vigente.'; end if;
  -- El endpoint legado conserva dos fuentes; la nueva ruta admite una fuente atribuida.
  execute replace(v_def, 'jsonb_array_length(p_input -> ''sources'') < 2', 'jsonb_array_length(p_input -> ''sources'') < 1');
end;
$$;

create or replace function public.submit_and_schedule_codex_proposal(
  p_input jsonb, p_brief jsonb, p_review jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_key uuid := (p_input ->> 'idempotencyKey')::uuid;
  v_run uuid := (p_input ->> 'runId')::uuid;
  v_hash text := encode(extensions.digest(jsonb_build_array(p_input,p_brief,p_review)::text, 'sha256'), 'hex');
  v_existing public.editorial_codex_ai_approvals%rowtype;
  v_article public.articles%rowtype;
  v_generation public.editorial_codex_draft_generations%rowtype;
  v_result jsonb;
  v_slot timestamptz;
  v_conflict timestamptz;
  v_interval integer;
  v_receipt jsonb;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception 'La aprobación automatizada requiere el servicio autorizado.' using errcode='42501';
  end if;
  if v_key is null or v_run is null or jsonb_typeof(p_review) is distinct from 'object'
    or p_review -> 'categoryMatches' is distinct from 'true'::jsonb
    or p_review -> 'topicsMatch' is distinct from 'true'::jsonb
    or p_review -> 'imagePresent' is distinct from 'true'::jsonb
    or p_review -> 'titleFaithful' is distinct from 'true'::jsonb
    or (p_input -> 'editorialFlags') @> '["ai_generated_cover"]'::jsonb
    or p_review ->> 'categoryId' is distinct from p_input ->> 'categoryId'
    or p_review ->> 'coverMediaId' is distinct from p_input ->> 'coverMediaId'
    or char_length(coalesce(p_review ->> 'model','')) not between 2 and 120
    or char_length(coalesce(p_review ->> 'notes','')) not between 30 and 1000
    or jsonb_typeof(p_review -> 'tagIds') is distinct from 'array'
    or jsonb_typeof(p_review -> 'newTopicNames') is distinct from 'array' then
    raise exception 'La revisión IA está incompleta o no corresponde al contenido.' using errcode='22023';
  end if;
  if (select coalesce(jsonb_agg(value order by value), '[]') from jsonb_array_elements_text(p_review -> 'tagIds'))
    is distinct from (select coalesce(jsonb_agg(value order by value), '[]') from jsonb_array_elements_text(p_input -> 'tagIds'))
    or (select coalesce(jsonb_agg(value order by value), '[]') from jsonb_array_elements_text(p_review -> 'newTopicNames'))
    is distinct from (select coalesce(jsonb_agg(topic ->> 'name' order by topic ->> 'name'), '[]') from jsonb_array_elements(p_input -> 'newTopics') topic) then
    raise exception 'Los temas revisados no corresponden a la propuesta.' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('codex-direct:' || v_key::text, 0));
  select * into v_existing from public.editorial_codex_ai_approvals where idempotency_key = v_key;
  if found then
    if v_existing.request_hash <> v_hash then
      raise exception 'La clave ya corresponde a otro contenido o revisión.' using errcode='23505';
    end if;
    return v_existing.receipt || jsonb_build_object('duplicado',true);
  end if;
  perform 1 from public.editorial_codex_runs where run_id = v_run
    and run_date = (now() at time zone 'America/Bogota')::date and status = 'in_progress' for update;
  if not found then raise exception 'La corrida no está activa para hoy.' using errcode='22023'; end if;

  -- Se conserva DeepSeek: solo se aprueba una generación completada de esta historia.
  select * into v_generation from public.editorial_codex_draft_generations
    where idempotency_key = v_key for update;
  if not found or v_generation.status <> 'completed'
    or v_generation.run_id <> v_run
    or v_generation.category_id <> (p_input ->> 'categoryId')::uuid
    or v_generation.story_fingerprint <> lower(p_input ->> 'storyFingerprint')
    or v_generation.result ->> 'proveedor' is distinct from 'deepseek'
    or v_generation.result -> 'briefSeo' is distinct from p_brief then
    raise exception 'No existe una redacción DeepSeek completada para esta propuesta.' using errcode='22023';
  end if;

  -- No tomar un artículo legado ni uno previamente modificado para aprobarlo.
  if exists (select 1 from public.editorial_codex_proposals where idempotency_key = v_key) then
    raise exception 'Esta clave ya pertenece a otro flujo editorial.' using errcode='23505';
  end if;
  v_result := public.submit_codex_editorial_proposal(p_input);
  if (v_result ->> 'duplicado')::boolean then
    return v_result || jsonb_build_object('autoApproved',false);
  end if;
  select * into v_article from public.articles where id = (v_result ->> 'articleId')::uuid for update;
  if not found or v_article.status::text <> 'review' or v_article.last_saved_by is not null
    or v_article.approved_at is not null or v_article.published_version_id is not null
    or not exists (select 1 from public.editorial_codex_proposals where idempotency_key = v_key
      and run_id = v_run and article_id = v_article.id)
    or not public.validar_portada_codex(v_article.cover_media_id, p_input -> 'editorialFlags') then
    raise exception 'No se puede aprobar este artículo automáticamente.' using errcode='22023';
  end if;
  perform public.propose_editorial_article_search_brief(v_key, v_article.id, p_brief);
  if not exists (select 1 from public.editorial_article_search_briefs
    where article_id = v_article.id and editorial_differentiator = p_brief ->> 'editorialDifferentiator') then
    raise exception 'El brief editorial no quedó persistido.' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('pont3la10:editorial-publication-slot', 0));
  select interval_minutes into v_interval from public.editorial_publication_slot_policy where policy_key='default';
  if v_interval is distinct from 2 then raise exception 'La cadencia automática debe ser de dos minutos.' using errcode='22023'; end if;
  v_slot := date_trunc('minute', now()) + interval '6 minutes';
  loop
    if v_slot > now() + interval '1 year' then raise exception 'No hay espacio de publicación disponible.' using errcode='22023'; end if;
    select max(scheduled_at) into v_conflict from public.articles
      where status::text='scheduled' and scheduled_at > v_slot - interval '2 minutes'
        and scheduled_at < v_slot + interval '2 minutes';
    exit when v_conflict is null;
    v_slot := v_conflict + interval '2 minutes';
  end loop;

  update public.articles set status='approved', approved_at=now(), approved_by=null where id=v_article.id;
  update public.articles set status='scheduled', scheduled_at=v_slot where id=v_article.id;
  v_receipt := jsonb_build_object('articleId', v_article.id, 'estado','scheduled',
    'autoApproved',true,'duplicado',false,'programadoPara',v_slot,'intervaloMinutos',2);
  insert into public.editorial_codex_ai_approvals(idempotency_key,article_id,run_id,request_hash,review,scheduled_at,receipt)
    values(v_key,v_article.id,v_run,v_hash,p_review,v_slot,v_receipt);
  insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
    values(null,'codex.aprobacion_ia_programada','article',v_article.id,
      jsonb_build_object('actorType','ai','reviewProvider','codex','writerProvider','deepseek','runId',v_run,'requestHash',v_hash,
        'review',p_review,'scheduledAt',v_slot,'intervalMinutes',2));
  return v_receipt;
end;
$$;
revoke all on function public.submit_and_schedule_codex_proposal(jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.submit_and_schedule_codex_proposal(jsonb,jsonb,jsonb) to service_role;

-- La publicación vencida pertenece al Cron/servicio, no al visitante público.
revoke all on function public.publish_due_editorial_articles() from public,anon,authenticated;
grant execute on function public.publish_due_editorial_articles() to service_role;

commit;
