begin;

insert into public.editorial_permissions (permission, description) values
  ('searchConsole.ver', 'Consultar oportunidades de Search Console'),
  ('searchConsole.importar', 'Importar exports de Search Console')
on conflict (permission) do update
set description = excluded.description;

insert into public.editorial_role_permissions (role, permission)
select rol.role, permiso.permission
from (values ('propietario'), ('administrador')) as rol(role)
cross join (values ('searchConsole.ver'), ('searchConsole.importar')) as permiso(permission)
on conflict do nothing;

create table public.search_console_import_runs (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid not null references auth.users(id) on delete restrict,
  date_from date not null,
  date_to date not null,
  rows_processed integer not null check (rows_processed between 1 and 10000),
  created_at timestamptz not null default now(),
  constraint search_console_import_runs_date_order check (date_from <= date_to)
);

create index search_console_import_runs_created_idx
  on public.search_console_import_runs (created_at desc);

create table public.search_console_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  query text not null,
  page_url text not null,
  clicks integer not null check (clicks >= 0),
  impressions integer not null check (impressions > 0),
  ctr numeric(8, 7) not null check (ctr between 0 and 1),
  position numeric(8, 3) not null check (position between 1 and 1000),
  is_estimated boolean not null default false,
  import_run_id uuid not null references public.search_console_import_runs(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint search_console_clicks_within_impressions check (clicks <= impressions),
  constraint search_console_query_length check (char_length(query) between 1 and 256),
  constraint search_console_query_normalized check (query = lower(btrim(query))),
  constraint search_console_query_no_email check (
    query !~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}'
  ),
  constraint search_console_query_no_address check (
    query !~* '\m(calle|carrera|cra\.?|cl\.?|diagonal|diag\.?|transversal|tv\.?|avenida|av\.?)\s+[0-9]+'
  ),
  constraint search_console_query_no_long_id check (
    regexp_replace(
      query,
      '\m(19|20)[0-9]{2}([-/\.][0-9]{1,2}){2}\M|\m(19|20)[0-9]{2}\M',
      ' ',
      'g'
    ) !~ '(^|[^0-9])[0-9][0-9 .()+-]{4,}[0-9]($|[^0-9])'
  ),
  constraint search_console_page_url_internal_https check (
    page_url ~ '^https://(www\.)?pont3la10\.com(/[A-Za-z0-9._~!$&()*+,;=:@%/-]*)?$'
  ),
  constraint search_console_page_url_length check (char_length(page_url) between 1 and 1200),
  constraint search_console_page_url_no_email check (
    page_url !~* '(%40|@)[^/]*\.[a-z]{2,}'
  ),
  constraint search_console_page_url_no_long_id check (
    regexp_replace(
      page_url,
      '\m(19|20)[0-9]{2}([-/\.][0-9]{1,2}){2}\M|\m(19|20)[0-9]{2}\M',
      ' ',
      'g'
    ) !~ '(^|[^0-9])[0-9][0-9 .()+-]{4,}[0-9]($|[^0-9])'
  ),
  constraint search_console_daily_dimensions_unique unique (metric_date, query, page_url)
);

create index search_console_metrics_date_idx
  on public.search_console_metrics_daily (metric_date desc, query, page_url);

alter table public.search_console_import_runs enable row level security;
alter table public.search_console_import_runs force row level security;
alter table public.search_console_metrics_daily enable row level security;
alter table public.search_console_metrics_daily force row level security;

revoke all on public.search_console_import_runs from public, anon, authenticated, service_role;
revoke all on public.search_console_metrics_daily from public, anon, authenticated, service_role;
grant select on public.search_console_import_runs to authenticated;
grant select on public.search_console_metrics_daily to authenticated;

create policy "search console run read"
  on public.search_console_import_runs for select to authenticated
  using (
    (select public.has_editorial_permission('searchConsole.ver'))
    and (select public.has_aal2())
  );

create policy "search console run rpc owner"
  on public.search_console_import_runs for all to postgres
  using (true)
  with check (true);

create policy "search console metrics read"
  on public.search_console_metrics_daily for select to authenticated
  using (
    (select public.has_editorial_permission('searchConsole.ver'))
    and (select public.has_aal2())
  );

create policy "search console metrics rpc owner"
  on public.search_console_metrics_daily for all to postgres
  using (true)
  with check (true);

create or replace function public.audit_search_console_import_run()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Importar Search Console requiere una sesión autenticada.';
  end if;

  insert into public.editorial_audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (
    (select auth.uid()),
    'search_console_import',
    'search_console_import',
    new.id,
    jsonb_build_object(
      'dateFrom', new.date_from,
      'dateTo', new.date_to,
      'rowsProcessed', new.rows_processed
    )
  );

  return new;
end;
$$;

alter function public.audit_search_console_import_run() owner to postgres;
revoke all on function public.audit_search_console_import_run() from public, anon, authenticated, service_role;

create trigger search_console_import_run_audit
  after insert on public.search_console_import_runs
  for each row execute function public.audit_search_console_import_run();

create or replace function public.reject_future_search_console_metric()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.metric_date > current_date then
    raise exception using errcode = '22023', message = 'Las métricas de Search Console no pueden tener fechas futuras.';
  end if;
  return new;
end;
$$;

alter function public.reject_future_search_console_metric() owner to postgres;
revoke all on function public.reject_future_search_console_metric() from public, anon, authenticated, service_role;

create trigger search_console_metrics_date_guard
  before insert or update of metric_date on public.search_console_metrics_daily
  for each row execute function public.reject_future_search_console_metric();

create or replace function public.import_search_console_metrics(
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_run_id uuid := gen_random_uuid();
  v_date_from date;
  v_date_to date;
  v_row_count integer;
begin
  if v_user_id is null
    or not public.has_editorial_permission('searchConsole.importar')
    or not public.has_aal2() then
    raise exception using errcode = '42501', message = 'Importar Search Console requiere permiso y MFA.';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) not between 1 and 10000 then
    raise exception using errcode = '22023', message = 'El lote CSV está vacío o supera los límites permitidos.';
  end if;

  select min(fila.metric_date), max(fila.metric_date), count(*)::integer
    into v_date_from, v_date_to, v_row_count
  from jsonb_to_recordset(p_rows) as fila(
    metric_date date,
    query text,
    page_url text,
    clicks integer,
    impressions integer,
    ctr numeric,
    position numeric
  );

  if v_date_from is null or v_date_to is null or v_row_count <> jsonb_array_length(p_rows) then
    raise exception using errcode = '22023', message = 'El lote incluye filas incompletas.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as fila(metric_date date)
    where fila.metric_date > current_date
  ) then
    raise exception using errcode = '22023', message = 'El lote incluye fechas futuras.';
  end if;

  insert into public.search_console_import_runs (
    id, imported_by, date_from, date_to, rows_processed
  ) values (
    v_run_id, v_user_id, v_date_from, v_date_to, v_row_count
  );

  insert into public.search_console_metrics_daily (
    metric_date, query, page_url, clicks, impressions, ctr, position, is_estimated, import_run_id
  )
  select
    fila.metric_date,
    fila.query,
    fila.page_url,
    fila.clicks,
    fila.impressions,
    fila.ctr,
    fila.position,
    false,
    v_run_id
  from jsonb_to_recordset(p_rows) as fila(
    metric_date date,
    query text,
    page_url text,
    clicks integer,
    impressions integer,
    ctr numeric,
    position numeric
  )
  on conflict (metric_date, query, page_url) do update set
    clicks = excluded.clicks,
    impressions = excluded.impressions,
    ctr = excluded.ctr,
    position = excluded.position,
    is_estimated = false,
    import_run_id = excluded.import_run_id;

  get diagnostics v_row_count = row_count;

  return jsonb_build_object(
    'loteId', v_run_id,
    'filasProcesadas', v_row_count
  );
end;
$$;

alter function public.import_search_console_metrics(jsonb) owner to postgres;

create or replace function public.get_search_console_opportunities(
  p_date_from date,
  p_date_to date
)
returns table (
  query text,
  page_url text,
  clicks bigint,
  impressions bigint,
  ctr numeric,
  position numeric,
  is_estimated boolean
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not public.has_editorial_permission('searchConsole.ver')
    or not public.has_aal2() then
    raise exception using errcode = '42501', message = 'Consultar Search Console requiere permiso y MFA.';
  end if;

  if p_date_from is null or p_date_to is null
    or p_date_to < p_date_from
    or p_date_to > current_date
    or p_date_to - p_date_from > 548 then
    raise exception using errcode = '22023', message = 'El rango de fechas no es válido.';
  end if;

  return query
  select
    metrica.query,
    metrica.page_url,
    sum(metrica.clicks)::bigint,
    sum(metrica.impressions)::bigint,
    (sum(metrica.clicks)::numeric / nullif(sum(metrica.impressions), 0))::numeric(8, 5),
    (sum(metrica.position * metrica.impressions)::numeric / nullif(sum(metrica.impressions), 0))::numeric(8, 2),
    bool_or(metrica.is_estimated)
  from public.search_console_metrics_daily as metrica
  where metrica.metric_date between p_date_from and p_date_to
  group by metrica.query, metrica.page_url
  having sum(metrica.impressions) >= 100
    and sum(metrica.clicks)::numeric / nullif(sum(metrica.impressions), 0) < 0.02
  order by sum(metrica.impressions) desc, metrica.page_url, metrica.query
  limit 200;
end;
$$;

revoke all on function public.import_search_console_metrics(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.get_search_console_opportunities(date, date) from public, anon, authenticated, service_role;
grant execute on function public.import_search_console_metrics(jsonb) to authenticated;
grant execute on function public.get_search_console_opportunities(date, date) to authenticated;

commit;
