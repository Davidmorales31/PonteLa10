begin;

create table if not exists public.editorial_publication_slot_policy (
  policy_key text primary key check (policy_key = 'default'),
  timezone_name text not null default 'America/Bogota'
    check (timezone_name = 'America/Bogota'),
  interval_minutes integer not null default 60
    check (interval_minutes between 30 and 1440),
  updated_at timestamptz not null default now()
);

insert into public.editorial_publication_slot_policy (
  policy_key, timezone_name, interval_minutes
) values ('default', 'America/Bogota', 60)
on conflict (policy_key) do nothing;

alter table public.editorial_publication_slot_policy enable row level security;
revoke all on public.editorial_publication_slot_policy from public, anon, authenticated;
grant all on public.editorial_publication_slot_policy to service_role;

create or replace function public.enforce_editorial_publication_spacing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_interval integer;
begin
  if new.status::text <> 'scheduled' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.status::text = 'scheduled'
      and old.scheduled_at is not distinct from new.scheduled_at then
      return new;
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('pont3la10:editorial-publication-slot', 0)
  );
  select policy.interval_minutes into v_interval
  from public.editorial_publication_slot_policy policy
  where policy.policy_key = 'default';
  if v_interval is null then
    raise exception 'No hay una política de programación válida.' using errcode = '22023';
  end if;
  if new.scheduled_at is null then
    raise exception 'La programación requiere fecha y hora.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.articles occupied
    where occupied.id <> new.id
      and occupied.status::text = 'scheduled'
      and occupied.scheduled_at > new.scheduled_at - make_interval(mins => v_interval)
      and occupied.scheduled_at < new.scheduled_at + make_interval(mins => v_interval)
  ) then
    raise exception 'Ese horario está ocupado; elige otro espacio de publicación.' using errcode = '23P01';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_editorial_publication_spacing()
  from public, anon, authenticated;
drop trigger if exists enforce_editorial_publication_spacing_trigger on public.articles;
create trigger enforce_editorial_publication_spacing_trigger
  before insert or update of status, scheduled_at on public.articles
  for each row execute function public.enforce_editorial_publication_spacing();

create or replace function public.approve_and_schedule_editorial_article(
  p_article_id uuid,
  p_expected_lock_version integer,
  p_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_article public.articles%rowtype;
  v_updated public.articles%rowtype;
  v_user_id uuid := (select auth.uid());
  v_timezone text;
  v_interval integer;
  v_now_local timestamp without time zone;
  v_slot_local timestamp without time zone;
  v_slot timestamptz;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para aprobar el contenido.' using errcode = '42501';
  end if;
  if p_confirmed is not true then
    raise exception 'Confirma explícitamente aprobar y programar.' using errcode = '22023';
  end if;
  if not public.has_editorial_permission('contenido.aprobar')
    or not public.has_editorial_permission('contenido.programar') then
    raise exception 'Aprobar y programar requiere ambos permisos editoriales.' using errcode = '42501';
  end if;
  if not public.has_aal2() then
    raise exception 'Aprobar y programar requiere verificación en dos pasos.' using errcode = '42501';
  end if;
  if p_article_id is null or p_expected_lock_version is null or p_expected_lock_version < 1 then
    raise exception 'La versión del contenido no es válida.' using errcode = '22023';
  end if;

  select * into v_article
  from public.articles
  where id = p_article_id
  for update;
  if not found then
    raise exception 'El contenido no existe.' using errcode = 'P0002';
  end if;
  if v_article.status::text <> 'review' then
    raise exception 'Solo se puede aprobar contenido que está en revisión.' using errcode = '22023';
  end if;
  if v_article.lock_version <> p_expected_lock_version then
    raise exception 'El contenido cambió en otra sesión.' using errcode = '40001';
  end if;

  select policy.timezone_name, policy.interval_minutes
  into v_timezone, v_interval
  from public.editorial_publication_slot_policy policy
  where policy.policy_key = 'default';
  if not found or v_interval is null or v_interval < 30 or v_interval > 1440 then
    raise exception 'No hay una política de programación válida.' using errcode = '22023';
  end if;

  -- Serializa la reserva global; la selección nunca pisa una programación manual.
  perform pg_advisory_xact_lock(hashtextextended('pont3la10:editorial-publication-slot', 0));
  v_now_local := timezone(v_timezone, now());
  v_slot_local := date_trunc('day', v_now_local)
    + make_interval(mins => (
      floor(extract(epoch from (v_now_local - date_trunc('day', v_now_local)))
        / (v_interval * 60))::integer + 1
    ) * v_interval);
  v_slot := v_slot_local at time zone v_timezone;

  select candidate.slot into v_slot
  from generate_series(
    v_slot,
    now() + interval '1 year' - make_interval(mins => v_interval),
    make_interval(mins => v_interval)
  ) as candidate(slot)
  where candidate.slot > now() + interval '4 minutes'
    and not exists (
      select 1 from public.articles occupied
      where occupied.status::text = 'scheduled'
        and occupied.scheduled_at > candidate.slot - make_interval(mins => v_interval)
        and occupied.scheduled_at < candidate.slot + make_interval(mins => v_interval)
    )
  order by candidate.slot
  limit 1;
  if v_slot is null then
    update public.articles
    set status = 'approved'::public.article_status,
        approved_by = v_user_id,
        approved_at = now(),
        last_saved_by = v_user_id
    where id = p_article_id
    returning * into v_updated;

    insert into public.article_review_comments (
      article_id, author_id, comment_type, body
    ) values (
      p_article_id,
      v_user_id,
      'approval',
      'Aprobó el contenido, pero no había espacio libre; quedó aprobado para programarse después.'
    );

    return jsonb_build_object(
      'id', v_updated.id,
      'estado', v_updated.status::text,
      'versionBloqueo', v_updated.lock_version,
      'programadoPara', null,
      'zonaHoraria', v_timezone,
      'intervaloMinutos', v_interval,
      'codigo', 'APROBADO_SIN_SLOT'
    );
  end if;

  -- La transición pasa por ambos estados permitidos por la máquina actual,
  -- pero ambos UPDATE y sus auditorías quedan dentro de esta única transacción.
  update public.articles
  set status = 'approved'::public.article_status,
      approved_by = v_user_id,
      approved_at = now(),
      last_saved_by = v_user_id
  where id = p_article_id
  returning * into v_updated;

  update public.articles
  set status = 'scheduled'::public.article_status,
      scheduled_at = v_slot,
      last_saved_by = v_user_id
  where id = p_article_id
  returning * into v_updated;

  insert into public.article_review_comments (
    article_id, author_id, comment_type, body
  ) values (
    p_article_id,
    v_user_id,
    'approval',
    'Aprobó y programó el contenido en el siguiente horario disponible.'
  );

  return jsonb_build_object(
    'id', v_updated.id,
    'estado', v_updated.status::text,
    'versionBloqueo', v_updated.lock_version,
    'programadoPara', v_updated.scheduled_at,
    'zonaHoraria', v_timezone,
    'intervaloMinutos', v_interval
  );
end;
$$;

revoke all on function public.approve_and_schedule_editorial_article(uuid, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.approve_and_schedule_editorial_article(uuid, integer, boolean)
  to authenticated;

commit;
