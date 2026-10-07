begin;

create schema if not exists editorial_private;
revoke all on schema editorial_private from public, anon, authenticated, service_role;
grant usage on schema editorial_private to authenticated;
comment on schema editorial_private is
  'Funciones internas no expuestas por la Data API para operaciones editoriales validadas.';

-- Métricas de Search Console: internas al CMS, nunca parte del contenido público.
create table public.editorial_search_console_reports (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  imported_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  imported_at timestamptz not null default now(),
  row_count integer not null check (row_count between 1 and 5000),
  constraint editorial_search_console_period_order_check check (period_start <= period_end),
  constraint editorial_search_console_period_length_check check (period_end - period_start <= 490)
);

create index editorial_search_console_reports_period_idx
  on public.editorial_search_console_reports (period_end desc, imported_at desc);

create table public.editorial_search_console_metrics (
  report_id uuid not null references public.editorial_search_console_reports(id) on delete cascade,
  query text not null check (
    pg_catalog.char_length(pg_catalog.btrim(query)) between 1 and 500 and query !~ '[[:cntrl:]]'
  ),
  page_url text not null check (
    pg_catalog.char_length(page_url) between 1 and 2048
    and page_url !~ '[?#]'
    and page_url ~ '^https://(www\.)?pont3la10\.com/'
  ),
  clicks integer not null check (clicks >= 0),
  impressions integer not null check (impressions >= 0),
  ctr numeric(8, 3) not null check (ctr between 0 and 100),
  average_position numeric(10, 2) not null check (average_position between 0 and 100000),
  primary key (report_id, query, page_url),
  constraint editorial_search_console_clicks_within_impressions_check check (clicks <= impressions)
);

create index editorial_search_console_metrics_report_impressions_idx
  on public.editorial_search_console_metrics (report_id, impressions desc, clicks desc);

create table public.editorial_search_console_triage (
  triage_key text generated always as (
    pg_catalog.md5(pg_catalog.lower(pg_catalog.btrim(query)) || pg_catalog.chr(31) || page_url)
  ) stored primary key,
  query text not null check (
    pg_catalog.char_length(pg_catalog.btrim(query)) between 1 and 500 and query !~ '[[:cntrl:]]'
  ),
  page_url text not null check (
    pg_catalog.char_length(page_url) between 1 and 2048
    and page_url !~ '[?#]'
    and page_url ~ '^https://(www\.)?pont3la10\.com/'
  ),
  action text not null check (action in (
    'actualizar', 'mejorar_titulo', 'ampliar_respuesta', 'fusionar', 'no_actuar'
  )),
  note text check (note is null or pg_catalog.char_length(note) <= 500),
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create index editorial_search_console_triage_updated_idx
  on public.editorial_search_console_triage (updated_at desc);

alter table public.editorial_search_console_reports enable row level security;
alter table public.editorial_search_console_metrics enable row level security;
alter table public.editorial_search_console_triage enable row level security;

revoke all privileges on table public.editorial_search_console_reports,
  public.editorial_search_console_metrics,
  public.editorial_search_console_triage
  from public, anon, authenticated, service_role;
grant select on table public.editorial_search_console_reports,
  public.editorial_search_console_metrics,
  public.editorial_search_console_triage to authenticated;

create policy "editorial team can read search console reports"
  on public.editorial_search_console_reports for select to authenticated
  using ((select public.has_editorial_permission('contenido.verBorradores')));

create policy "editorial team can read search console metrics"
  on public.editorial_search_console_metrics for select to authenticated
  using ((select public.has_editorial_permission('contenido.verBorradores')));

create policy "editorial team can read search console triage"
  on public.editorial_search_console_triage for select to authenticated
  using ((select public.has_editorial_permission('contenido.verBorradores')));

create or replace function editorial_private.import_editorial_search_console_report(
  p_period_start date,
  p_period_end date,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report_id uuid;
  total_rows integer;
begin
  if (select auth.uid()) is null
    or not (select public.has_editorial_permission('contenido.editarTodos'))
    or not (select public.has_aal2()) then
    raise exception using errcode = '42501', message = 'Se requiere permiso editorial y MFA.';
  end if;

  if p_period_start is null or p_period_end is null
    or p_period_start > p_period_end
    or p_period_end - p_period_start > 490
    or p_period_end > current_date
    or p_rows is null
    or pg_catalog.jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'El período o las filas no son válidos.';
  end if;

  total_rows := pg_catalog.jsonb_array_length(p_rows);
  if total_rows < 1 or total_rows > 5000 then
    raise exception using errcode = '22023', message = 'El reporte debe contener entre 1 y 5000 filas.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_to_recordset(p_rows) as fila(query text, page_url text)
    group by pg_catalog.lower(pg_catalog.btrim(fila.query)), fila.page_url
    having pg_catalog.count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'El reporte tiene consultas y páginas duplicadas.';
  end if;

  insert into public.editorial_search_console_reports (
    period_start, period_end, imported_by, row_count
  ) values (
    p_period_start, p_period_end, (select auth.uid()), total_rows
  ) returning id into v_report_id;

  insert into public.editorial_search_console_metrics (
    report_id, query, page_url, clicks, impressions, ctr, average_position
  )
  select
    v_report_id,
    fila.query,
    fila.page_url,
    fila.clicks,
    fila.impressions,
    fila.ctr,
    fila.average_position
  from pg_catalog.jsonb_to_recordset(p_rows) as fila(
    query text,
    page_url text,
    clicks integer,
    impressions integer,
    ctr numeric,
    average_position numeric
  );

  return pg_catalog.jsonb_build_object(
    'reportId', v_report_id,
    'periodStart', p_period_start,
    'periodEnd', p_period_end,
    'rowCount', total_rows
  );
end;
$$;

revoke all on function editorial_private.import_editorial_search_console_report(date, date, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function editorial_private.import_editorial_search_console_report(date, date, jsonb)
  to authenticated;

create or replace function public.import_editorial_search_console_report(
  p_period_start date,
  p_period_end date,
  p_rows jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select editorial_private.import_editorial_search_console_report(
    p_period_start, p_period_end, p_rows
  );
$$;

revoke all on function public.import_editorial_search_console_report(date, date, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.import_editorial_search_console_report(date, date, jsonb)
  to authenticated;

create or replace function editorial_private.save_editorial_search_console_triage(
  p_query text,
  p_page_url text,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resultado public.editorial_search_console_triage%rowtype;
begin
  if (select auth.uid()) is null
    or not (select public.has_editorial_permission('contenido.editarTodos'))
    or not (select public.has_aal2()) then
    raise exception using errcode = '42501', message = 'Se requiere permiso editorial y MFA.';
  end if;

  if p_query is null or pg_catalog.char_length(pg_catalog.btrim(p_query)) not between 1 and 500
    or p_page_url is null or pg_catalog.char_length(p_page_url) not between 1 and 2048
    or p_page_url ~ '[?#]'
    or p_page_url !~ '^https://(www\.)?pont3la10\.com/'
    or p_action is null
    or p_action not in ('actualizar', 'mejorar_titulo', 'ampliar_respuesta', 'fusionar', 'no_actuar')
    or (p_note is not null and pg_catalog.char_length(p_note) > 500) then
    raise exception using errcode = '22023', message = 'La acción editorial no cumple el contrato.';
  end if;

  if not exists (
    select 1
    from public.editorial_search_console_metrics as metric
    where pg_catalog.lower(pg_catalog.btrim(metric.query)) = pg_catalog.lower(pg_catalog.btrim(p_query))
      and metric.page_url = p_page_url
  ) then
    raise exception using errcode = '22023', message = 'La consulta y página no existen en un reporte importado.';
  end if;

  insert into public.editorial_search_console_triage as triage (
    query, page_url, action, note, updated_by, updated_at
  ) values (
    pg_catalog.btrim(p_query), p_page_url, p_action,
    nullif(pg_catalog.btrim(p_note), ''), (select auth.uid()), pg_catalog.now()
  )
  on conflict (triage_key) do update
    set action = excluded.action,
        note = excluded.note,
        updated_by = (select auth.uid()),
        updated_at = pg_catalog.now()
  returning triage.* into resultado;

  return pg_catalog.jsonb_build_object(
    'consulta', resultado.query,
    'paginaUrl', resultado.page_url,
    'accion', resultado.action,
    'nota', resultado.note,
    'actualizadoEn', resultado.updated_at
  );
end;
$$;

revoke all on function editorial_private.save_editorial_search_console_triage(text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function editorial_private.save_editorial_search_console_triage(text, text, text, text)
  to authenticated;

create or replace function public.save_editorial_search_console_triage(
  p_query text,
  p_page_url text,
  p_action text,
  p_note text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select editorial_private.save_editorial_search_console_triage(
    p_query, p_page_url, p_action, p_note
  );
$$;

revoke all on function public.save_editorial_search_console_triage(text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.save_editorial_search_console_triage(text, text, text, text)
  to authenticated;

create or replace function editorial_private.audit_editorial_search_console_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'editorial_search_console_reports' then
    insert into public.editorial_audit_log (
      actor_id, action, entity_type, entity_id, metadata
    ) values (
      new.imported_by,
      'seo.search_console.importado',
      'search_console_report',
      new.id,
      pg_catalog.jsonb_build_object(
        'periodoDesde', new.period_start,
        'periodoHasta', new.period_end,
        'filas', new.row_count
      )
    );
  else
    insert into public.editorial_audit_log (
      actor_id, action, entity_type, entity_id, metadata
    ) values (
      new.updated_by,
      'seo.search_console.accion_registrada',
      'search_console_triage',
      null,
      pg_catalog.jsonb_build_object(
        'accion', new.action,
        'huellaConsulta', new.triage_key,
        'accionAnterior', case when tg_op = 'UPDATE' then old.action else null end
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function editorial_private.audit_editorial_search_console_change()
  from public, anon, authenticated, service_role;

create trigger editorial_search_console_reports_audit
  after insert on public.editorial_search_console_reports
  for each row execute function editorial_private.audit_editorial_search_console_change();

create trigger editorial_search_console_triage_audit
  after insert or update on public.editorial_search_console_triage
  for each row execute function editorial_private.audit_editorial_search_console_change();

comment on table public.editorial_search_console_reports is
  'Importaciones privadas de métricas agregadas de Search Console; no se publican ni se sincronizan automáticamente.';
comment on table public.editorial_search_console_metrics is
  'Consultas, páginas y métricas Search Console accesibles solo al equipo editorial con permiso.';
comment on table public.editorial_search_console_triage is
  'Decisión editorial privada por consulta/página; registrar una acción nunca modifica ni publica un artículo.';

commit;
