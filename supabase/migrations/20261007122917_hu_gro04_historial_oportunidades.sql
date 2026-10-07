begin;

-- Keep existing ED-21 decisions valid while adding the four HU-GRO-04 choices.
alter table public.editorial_search_console_triage
  drop constraint editorial_search_console_triage_action_check;

alter table public.editorial_search_console_triage
  add constraint editorial_search_console_triage_action_check
  check (action in (
    'optimizar', 'actualizar', 'consolidar', 'ignorar',
    'mejorar_titulo', 'ampliar_respuesta', 'fusionar', 'no_actuar'
  ));

create table public.editorial_search_console_triage_history (
  id uuid primary key default gen_random_uuid(),
  triage_key text not null references public.editorial_search_console_triage(triage_key) on delete restrict,
  action text not null check (action in (
    'optimizar', 'actualizar', 'consolidar', 'ignorar',
    'mejorar_titulo', 'ampliar_respuesta', 'fusionar', 'no_actuar'
  )),
  note text check (note is null or pg_catalog.char_length(note) <= 500),
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now()
);

create index editorial_search_console_triage_history_key_changed_idx
  on public.editorial_search_console_triage_history (triage_key, changed_at desc);
create index editorial_search_console_triage_history_changed_idx
  on public.editorial_search_console_triage_history (changed_at desc);
create index editorial_search_console_triage_history_changed_by_idx
  on public.editorial_search_console_triage_history (changed_by);

alter table public.editorial_search_console_triage_history enable row level security;
revoke all privileges on table public.editorial_search_console_triage_history
  from public, anon, authenticated, service_role;
grant select on table public.editorial_search_console_triage_history to authenticated;

create policy "editorial team can read search console decision history"
  on public.editorial_search_console_triage_history for select to authenticated
  using ((select public.has_editorial_permission('contenido.verBorradores')));

comment on table public.editorial_search_console_triage_history is
  'Historial append-only de decisiones privadas sobre oportunidades Search Console.';

-- Reconstruct prior choices from the existing audit log, which stores only a
-- query hash and the choice (not the private query, URL, or note).
insert into public.editorial_search_console_triage_history (
  triage_key, action, changed_by, changed_at
)
select
  log.metadata ->> 'huellaConsulta',
  log.metadata ->> 'accion',
  log.actor_id,
  log.created_at
from public.editorial_audit_log as log
where log.entity_type = 'search_console_triage'
  and log.action = 'seo.search_console.accion_registrada'
  and log.actor_id is not null
  and log.metadata ->> 'huellaConsulta' ~ '^[a-f0-9]{32}$'
  and log.metadata ->> 'accion' in (
    'optimizar', 'actualizar', 'consolidar', 'ignorar',
    'mejorar_titulo', 'ampliar_respuesta', 'fusionar', 'no_actuar'
  )
  and exists (
    select 1
    from public.editorial_search_console_triage as triage
    where triage.triage_key = log.metadata ->> 'huellaConsulta'
  );

-- Ensure decisions without an audit row still have a visible initial snapshot.
insert into public.editorial_search_console_triage_history (
  triage_key, action, note, changed_by, changed_at
)
select triage.triage_key, triage.action, triage.note, triage.updated_by, triage.updated_at
from public.editorial_search_console_triage as triage
where not exists (
  select 1
  from public.editorial_search_console_triage_history as historial
  where historial.triage_key = triage.triage_key
);

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
    or p_action not in (
      'optimizar', 'actualizar', 'consolidar', 'ignorar',
      'mejorar_titulo', 'ampliar_respuesta', 'fusionar', 'no_actuar'
    )
    or (p_action in ('consolidar', 'fusionar') and nullif(pg_catalog.btrim(p_note), '') is null)
    or (p_action = 'consolidar' and not (
      pg_catalog.btrim(p_note) ~ '^https://(www\.)?pont3la10\.com/[^?#]*$'
      or (
        pg_catalog.btrim(p_note) like '/%'
        and pg_catalog.btrim(p_note) not like '//%'
        and pg_catalog.btrim(p_note) !~ '[?#]'
      )
    ))
    or (p_action = 'consolidar' and (
      pg_catalog.strpos(pg_catalog.btrim(p_note), pg_catalog.chr(92)) > 0
      or pg_catalog.btrim(p_note) ~ '[[:cntrl:]]'
    ))
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

create or replace function editorial_private.record_editorial_search_console_triage_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
    and new.action is not distinct from old.action
    and new.note is not distinct from old.note then
    return new;
  end if;

  insert into public.editorial_search_console_triage_history (
    triage_key, action, note, changed_by, changed_at
  ) values (
    new.triage_key, new.action, new.note, new.updated_by, new.updated_at
  );
  return new;
end;
$$;

revoke all on function editorial_private.record_editorial_search_console_triage_history()
  from public, anon, authenticated, service_role;

create trigger editorial_search_console_triage_history_record
  after insert or update on public.editorial_search_console_triage
  for each row execute function editorial_private.record_editorial_search_console_triage_history();

commit;
