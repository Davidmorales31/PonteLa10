-- Reserva atómica para impedir que activaciones repetidas consuman cuota de
-- standings. Esta migración depende de 20261001040000_hu_fut_05_07_snapshot_persistence.sql.

create table public.football_sync_leases (
  provider text not null check (provider in ('goal-api', 'api-football')),
  operation text not null check (operation in ('standings', 'fixtures_diarios')),
  window_started_at timestamptz not null,
  acquired_at timestamptz not null default now(),
  primary key (provider, operation, window_started_at)
);

alter table public.football_sync_leases enable row level security;
revoke all privileges on table public.football_sync_leases from public, anon, authenticated;
grant select, insert, update, delete on table public.football_sync_leases to service_role;

create or replace function public.claim_football_sync_lease(
  p_provider text,
  p_operation text,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  ventana timestamptz;
begin
  if p_provider not in ('goal-api', 'api-football')
    or p_operation not in ('standings', 'fixtures_diarios')
    or p_window_seconds < 60
    or p_window_seconds > 3600 then
    raise exception using errcode = '22023', message = 'La reserva del worker de fútbol no es válida.';
  end if;

  ventana := pg_catalog.date_bin(
    pg_catalog.make_interval(secs => p_window_seconds),
    pg_catalog.now(),
    '2000-01-01T00:00:00Z'::timestamptz
  );
  insert into public.football_sync_leases (provider, operation, window_started_at)
  values (p_provider, p_operation, ventana)
  on conflict do nothing;
  return found;
end;
$$;

revoke all on function public.claim_football_sync_lease(text, text, integer)
  from public, anon, authenticated;
grant execute on function public.claim_football_sync_lease(text, text, integer) to service_role;

comment on table public.football_sync_leases is
  'Reserva atómica por ventana para proteger la cuota del worker privado de fútbol.';
