-- Dependencias mínimas simuladas para ejecutar la migración en PostgreSQL WASM.
-- No sustituye la validación de todo el historial en una instancia Supabase.
create role anon; create role authenticated; create role service_role;
create schema auth; create schema extensions;
create function auth.role() returns text language sql as $$ select current_setting('test.role',true) $$;
create function extensions.digest(text,text) returns bytea language sql as $$ select sha256(convert_to($1,'UTF8')) $$;
create function public.has_editorial_permission(text) returns boolean language sql as $$ select false $$;
create function public.publish_due_editorial_articles() returns void language sql as $$ select $$;
create table public.categories(id uuid primary key,is_active boolean default true);
create table public.media_files(id uuid primary key, width integer, height integer);
create table public.editorial_codex_runs(run_id uuid primary key,run_date date,status text default 'in_progress');
create table public.articles(id uuid primary key default gen_random_uuid(),status text,category_id uuid,cover_media_id uuid,last_saved_by uuid,approved_at timestamptz,approved_by uuid,published_version_id uuid,scheduled_at timestamptz);
create table public.editorial_codex_proposals(idempotency_key uuid primary key,article_id uuid unique,run_id uuid,story_fingerprint text);
create table public.editorial_codex_draft_generations(idempotency_key uuid primary key,run_id uuid,category_id uuid,story_fingerprint text,status text,result jsonb);
create table public.editorial_article_search_briefs(article_id uuid primary key,editorial_differentiator text not null);
create table public.editorial_audit_log(actor_id uuid,action text,entity_type text,entity_id uuid,metadata jsonb);
create table public.editorial_publication_slot_policy(policy_key text primary key,interval_minutes integer check(interval_minutes between 15 and 1440),updated_at timestamptz);
insert into public.editorial_publication_slot_policy values('default',15,now());
create table public.editorial_codex_run_categories(opportunity_count integer check(opportunity_count between 0 and 7));
create function public.get_codex_editorial_context(p_run_id uuid) returns jsonb language plpgsql as $$
declare v_runs_today integer;
begin
  if exists(select 1 from public.editorial_codex_runs where run_id=p_run_id) then return '{}'; end if;
  select count(*) into v_runs_today from public.editorial_codex_runs where run_date=(now() at time zone 'America/Bogota')::date;
  if v_runs_today >= 5 then raise exception 'cinco corridas' using errcode='54000'; end if;
  insert into public.editorial_codex_runs values(p_run_id,(now() at time zone 'America/Bogota')::date,'in_progress');
  return '{}';
end $$;
create function public.save_codex_editorial_agenda(p_run_id uuid,p_categories jsonb,p_status text) returns jsonb language plpgsql as $$
declare v_category jsonb; v_saved_category integer;
begin
  for v_category in select value from jsonb_array_elements(p_categories) loop
    if jsonb_array_length(v_category -> 'opportunities') > 7 then raise exception 'siete oportunidades' using errcode='22023'; end if;
    v_saved_category := jsonb_array_length(v_category -> 'opportunities');
    if v_saved_category > 7 then raise exception 'siete oportunidades' using errcode='22023'; end if;
  end loop;
  update public.editorial_codex_runs set status=p_status where run_id=p_run_id;
  return jsonb_build_object('status',p_status);
end $$;
create function public.approve_and_schedule_editorial_article(uuid,integer,boolean) returns jsonb language plpgsql as $$
declare v_interval integer := 15;
begin
  if v_interval < 15 or v_interval > 1440 then raise exception 'intervalo'; end if;
  return '{}';
end $$;
create function public.submit_codex_editorial_proposal(p_input jsonb) returns jsonb language plpgsql as $$
declare v_id uuid;
begin
  if jsonb_array_length(p_input -> 'sources') < 2 then raise exception 'fuentes' using errcode='22023'; end if;
  select article_id into v_id from public.editorial_codex_proposals where story_fingerprint=p_input->>'storyFingerprint';
  if found then return jsonb_build_object('articleId',v_id,'estado','review','duplicado',true); end if;
  insert into public.articles(status,category_id,cover_media_id) values('review',(p_input->>'categoryId')::uuid,(p_input->>'coverMediaId')::uuid) returning id into v_id;
  insert into public.editorial_codex_proposals values((p_input->>'idempotencyKey')::uuid,v_id,(p_input->>'runId')::uuid,p_input->>'storyFingerprint');
  return jsonb_build_object('articleId',v_id,'estado','review','duplicado',false);
end $$;
create function public.validar_portada_codex(uuid,jsonb) returns boolean language sql as $$ select exists(select 1 from public.media_files where id=$1 and width>0 and height>0) $$;
create function public.propose_editorial_article_search_brief(uuid,uuid,jsonb) returns void language sql as $$
  insert into public.editorial_article_search_briefs values($2,$3->>'editorialDifferentiator');
$$;
