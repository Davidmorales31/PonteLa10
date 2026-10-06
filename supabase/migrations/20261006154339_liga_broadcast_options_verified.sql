begin;

insert into public.editorial_permissions (permission, description)
values ('partidos.programacion.gestionar', 'Gestionar programación de transmisión de partidos verificada')
on conflict (permission) do update set description = excluded.description;

insert into public.editorial_role_permissions (role, permission)
values
  ('propietario', 'partidos.programacion.gestionar'),
  ('administrador', 'partidos.programacion.gestionar'),
  ('editorJefe', 'partidos.programacion.gestionar')
on conflict do nothing;

create table if not exists public.colombian_match_broadcast_options (
  id uuid primary key default gen_random_uuid(),
  match_slug text not null check (match_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(match_slug) <= 180),
  fixture_competition_slug text not null,
  fixture_season text not null,
  fixture_provider text not null,
  provider_fixture_id text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  channel text not null check (char_length(btrim(channel)) between 2 and 120),
  platform text not null check (char_length(btrim(platform)) between 2 and 120),
  distribution_type text not null check (distribution_type in (
    'free_tv', 'paid_tv', 'free_streaming', 'subscription_streaming', 'radio'
  )),
  source_url text not null check (source_url ~ '^https://[^[:space:]]+$' and char_length(source_url) <= 2048),
  status text not null default 'unconfirmed' check (status in ('confirmed', 'unconfirmed', 'cancelled')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint colombian_match_broadcast_verified_check
    check (status <> 'confirmed' or (verified_at is not null and verified_by is not null and source_url is not null)),
  constraint colombian_match_broadcast_unique_option
    unique (match_slug, country_code, channel, platform),
  constraint colombian_match_broadcast_fixture_fk
    foreign key (fixture_competition_slug, fixture_season, fixture_provider, provider_fixture_id)
    references public.colombian_league_fixtures (competition_slug, season, provider, provider_fixture_id)
    on update cascade on delete cascade
);

create index if not exists colombian_match_broadcast_public_match_idx
  on public.colombian_match_broadcast_options (match_slug, status, country_code, verified_at desc);

alter table public.colombian_match_broadcast_options enable row level security;
revoke all privileges on public.colombian_match_broadcast_options from public, anon, authenticated;
grant select (
  id, match_slug, country_code, channel, platform, distribution_type,
  source_url, status, verified_at, notes, created_at, updated_at
) on public.colombian_match_broadcast_options to anon, authenticated;
grant insert, update, delete on public.colombian_match_broadcast_options to authenticated;
grant select, insert, update, delete on public.colombian_match_broadcast_options to service_role;

drop policy if exists "public can read confirmed match broadcast options" on public.colombian_match_broadcast_options;
create policy "public can read confirmed match broadcast options"
  on public.colombian_match_broadcast_options for select to anon, authenticated
  using (
    status = 'confirmed'
    and verified_at is not null
    and exists (
      select 1
      from public.colombian_league_fixtures as fixture
      where fixture.competition_slug = colombian_match_broadcast_options.fixture_competition_slug
        and fixture.season = colombian_match_broadcast_options.fixture_season
        and fixture.provider = colombian_match_broadcast_options.fixture_provider
        and fixture.provider_fixture_id = colombian_match_broadcast_options.provider_fixture_id
        and fixture.is_public
        and fixture.publication_rights_confirmed
    )
  );

drop policy if exists "broadcast managers can read all options with mfa" on public.colombian_match_broadcast_options;
create policy "broadcast managers can read all options with mfa"
  on public.colombian_match_broadcast_options for select to authenticated
  using (
    (select public.has_editorial_permission('partidos.programacion.gestionar'))
    and (select public.has_aal2())
  );

drop policy if exists "broadcast managers can edit options with mfa" on public.colombian_match_broadcast_options;
create policy "broadcast managers can edit options with mfa"
  on public.colombian_match_broadcast_options for all to authenticated
  using (
    (select public.has_editorial_permission('partidos.programacion.gestionar'))
    and (select public.has_aal2())
  )
  with check (
    (select public.has_editorial_permission('partidos.programacion.gestionar'))
    and (select public.has_aal2())
  );

drop trigger if exists audit_match_broadcast_option_change on public.colombian_match_broadcast_options;
create or replace function public.validate_match_broadcast_verification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'confirmed' then
    if (select auth.uid()) is null then
      raise exception 'La confirmación requiere una sesión editorial autenticada.';
    end if;
    new.verified_at := now();
    new.verified_by := (select auth.uid());
  else
    new.verified_at := null;
    new.verified_by := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.validate_match_broadcast_verification() from public, anon, authenticated;
drop trigger if exists validate_match_broadcast_verification on public.colombian_match_broadcast_options;
create trigger validate_match_broadcast_verification
  before insert or update on public.colombian_match_broadcast_options
  for each row execute function public.validate_match_broadcast_verification();

create trigger audit_match_broadcast_option_change
  after insert or update or delete on public.colombian_match_broadcast_options
  for each row execute function public.audit_editorial_change();

comment on table public.colombian_match_broadcast_options is
  'Programación asociada al fixture exacto; RLS solo hace visibles transmisiones confirmadas mientras el fixture conserve publicación autorizada.';

commit;
