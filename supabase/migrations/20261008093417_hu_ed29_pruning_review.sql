begin;

create schema if not exists editorial_private;
revoke all on schema editorial_private from public, anon, authenticated, service_role;
grant usage on schema editorial_private to authenticated;

create table public.editorial_content_pruning_reviews (
  article_id uuid primary key references public.articles(id) on delete cascade,
  decision text not null check (decision in (
    'actualizar', 'fusionar', 'mantener', 'noindex', 'retirar_410', 'redirect'
  )),
  note text,
  redirect_target text,
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  constraint editorial_content_pruning_review_note_length_check
    check (note is null or char_length(note) <= 500),
  constraint editorial_content_pruning_review_risky_note_check
    check (
      decision not in ('fusionar', 'noindex', 'retirar_410', 'redirect')
      or (note is not null and char_length(btrim(note)) >= 12)
    ),
  constraint editorial_content_pruning_review_redirect_check
    check (
      (decision = 'redirect'
        and redirect_target is not null
        and redirect_target ~ '^(/[a-z0-9]+(-[a-z0-9]+)*)(/[a-z0-9]+(-[a-z0-9]+)*)*/?$')
      or (decision <> 'redirect' and redirect_target is null)
    )
);

create index editorial_content_pruning_reviews_updated_idx
  on public.editorial_content_pruning_reviews (updated_at desc);

alter table public.editorial_content_pruning_reviews enable row level security;
revoke all privileges on table public.editorial_content_pruning_reviews
  from public, anon, authenticated, service_role;
grant select on public.editorial_content_pruning_reviews to authenticated;

create policy "editorial reviewers can read pruning decisions"
  on public.editorial_content_pruning_reviews for select to authenticated
  using (
    (select public.has_editorial_permission('contenido.revisar'))
    and (select public.has_aal2())
  );

create or replace function editorial_private.audit_editorial_content_pruning_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and new.decision is not distinct from old.decision
    and new.note is not distinct from old.note
    and new.redirect_target is not distinct from old.redirect_target then
    return new;
  end if;

  insert into public.editorial_audit_log (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    new.updated_by,
    'seo.content_pruning.decision',
    'article',
    new.article_id,
    pg_catalog.jsonb_build_object(
      'decision', new.decision,
      'decisionAnterior', case when tg_op = 'UPDATE' then old.decision else null end,
      'tieneNota', new.note is not null,
      'tieneDestinoInterno', new.redirect_target is not null
    )
  );
  return new;
end;
$$;

revoke all on function editorial_private.audit_editorial_content_pruning_review()
  from public, anon, authenticated, service_role;

create trigger editorial_content_pruning_review_audit
  after insert or update on public.editorial_content_pruning_reviews
  for each row execute function editorial_private.audit_editorial_content_pruning_review();

create or replace function editorial_private.save_editorial_content_pruning_review(
  p_article_id uuid,
  p_decision text,
  p_note text default null,
  p_redirect_target text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resultado public.editorial_content_pruning_reviews%rowtype;
begin
  if (select auth.uid()) is null
    or (select public.has_editorial_permission('contenido.revisar')) is not true
    or (select public.has_aal2()) is not true then
    raise exception using errcode = '42501', message = 'Se requiere permiso editorial y MFA.';
  end if;

  if p_article_id is null
    or p_decision is null
    or p_decision not in ('actualizar', 'fusionar', 'mantener', 'noindex', 'retirar_410', 'redirect')
    or (p_note is not null and pg_catalog.char_length(p_note) > 500)
    or (p_decision in ('fusionar', 'noindex', 'retirar_410', 'redirect')
      and pg_catalog.char_length(pg_catalog.btrim(coalesce(p_note, ''))) < 12)
    or (p_decision = 'redirect'
      and (p_redirect_target is null
        or p_redirect_target !~ '^(/[a-z0-9]+(-[a-z0-9]+)*)(/[a-z0-9]+(-[a-z0-9]+)*)*/?$'))
    or (p_decision <> 'redirect' and p_redirect_target is not null) then
    raise exception using errcode = '22023', message = 'La decisión editorial o sus datos no cumplen el contrato.';
  end if;

  if not exists (
    select 1
    from public.articles as article
    where article.id = p_article_id
      and article.status::text = 'published'
      and article.published_version_id is not null
  ) then
    raise exception using errcode = '22023', message = 'La decisión solo puede asociarse a un artículo publicado.';
  end if;

  select review.* into resultado
  from public.editorial_content_pruning_reviews as review
  where review.article_id = p_article_id;
  if found
    and resultado.decision is not distinct from p_decision
    and resultado.note is not distinct from nullif(pg_catalog.btrim(p_note), '')
    and resultado.redirect_target is not distinct from p_redirect_target then
    return pg_catalog.jsonb_build_object(
      'articleId', resultado.article_id,
      'decision', resultado.decision,
      'nota', resultado.note,
      'destinoInterno', resultado.redirect_target,
      'actualizadoEn', resultado.updated_at
    );
  end if;

  insert into public.editorial_content_pruning_reviews as review (
    article_id, decision, note, redirect_target, updated_by, updated_at
  ) values (
    p_article_id,
    p_decision,
    nullif(pg_catalog.btrim(p_note), ''),
    p_redirect_target,
    (select auth.uid()),
    pg_catalog.now()
  )
  on conflict (article_id) do update
    set decision = excluded.decision,
        note = excluded.note,
        redirect_target = excluded.redirect_target,
        updated_by = (select auth.uid()),
        updated_at = pg_catalog.now()
  returning review.* into resultado;

  return pg_catalog.jsonb_build_object(
    'articleId', resultado.article_id,
    'decision', resultado.decision,
    'nota', resultado.note,
    'destinoInterno', resultado.redirect_target,
    'actualizadoEn', resultado.updated_at
  );
end;
$$;

revoke all on function editorial_private.save_editorial_content_pruning_review(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function editorial_private.save_editorial_content_pruning_review(uuid, text, text, text)
  to authenticated;

create or replace function editorial_private.list_editorial_search_console_zero_impression_pages()
returns table (page_url text, report_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or (select public.has_editorial_permission('contenido.revisar')) is not true
    or (select public.has_aal2()) is not true then
    raise exception using errcode = '42501', message = 'Se requiere permiso editorial y MFA.';
  end if;

  return query
  with recent_reports as (
    select report.id
    from public.editorial_search_console_reports as report
    order by report.period_end desc, report.imported_at desc
    limit 50
  )
  select metric.page_url, metric.report_id
  from public.editorial_search_console_metrics as metric
  inner join recent_reports as report on report.id = metric.report_id
  group by metric.report_id, metric.page_url
  having pg_catalog.sum(metric.impressions) = 0
  order by metric.report_id, metric.page_url
  limit 10000;
end;
$$;

revoke all on function editorial_private.list_editorial_search_console_zero_impression_pages()
  from public, anon, authenticated, service_role;
grant execute on function editorial_private.list_editorial_search_console_zero_impression_pages()
  to authenticated;

create or replace function public.list_editorial_search_console_zero_impression_pages()
returns table (page_url text, report_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from editorial_private.list_editorial_search_console_zero_impression_pages();
$$;

revoke all on function public.list_editorial_search_console_zero_impression_pages()
  from public, anon, authenticated, service_role;
grant execute on function public.list_editorial_search_console_zero_impression_pages()
  to authenticated;

create or replace function public.save_editorial_content_pruning_review(
  p_article_id uuid,
  p_decision text,
  p_note text default null,
  p_redirect_target text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select editorial_private.save_editorial_content_pruning_review(
    p_article_id, p_decision, p_note, p_redirect_target
  );
$$;

revoke all on function public.save_editorial_content_pruning_review(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.save_editorial_content_pruning_review(uuid, text, text, text)
  to authenticated;

comment on table public.editorial_content_pruning_reviews is
  'Decisiones y planes privados de revisión de bajo valor editorial; nunca ejecuta noindex, redirecciones ni eliminación.';

commit;
