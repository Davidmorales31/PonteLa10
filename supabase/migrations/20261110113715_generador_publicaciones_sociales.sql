-- Composición editable compartida; social_publications conserva las entregas por red.
-- No activa publicación, cron, ingestas ni automatización editorial.
create function public.can_write_social_composition() returns boolean
language sql stable security invoker set search_path = '' as $$
  select public.has_editorial_permission('contenido.editarTodos') and (
    public.has_aal2() or not (
      public.has_role('propietario') or public.has_role('administrador') or public.has_role('editorJefe')
      or public.has_editorial_permission('contenido.publicar')
    )
  );
$$;
revoke all on function public.can_write_social_composition() from public, anon;
grant execute on function public.can_write_social_composition() to authenticated;
create table public.social_compositions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null unique references public.articles(id) on delete cascade,
  document jsonb not null check (jsonb_typeof(document) = 'object' and document ->> 'version' = '1' and octet_length(document::text) <= 100000),
  status text not null default 'draft' check (status in ('draft', 'ready')),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.social_compositions enable row level security;
revoke all on public.social_compositions from anon, authenticated;
grant select, insert, update on public.social_compositions to authenticated;
create policy "social compositions editorial read" on public.social_compositions for select to authenticated
  using (public.has_editorial_permission('contenido.verBorradores'));
create policy "social compositions editorial insert" on public.social_compositions for insert to authenticated
  with check (public.can_write_social_composition());
create policy "social compositions editorial update" on public.social_compositions for update to authenticated
  using (public.can_write_social_composition())
  with check (public.can_write_social_composition());

create function public.validate_social_composition() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.article_id <> old.article_id or new.id <> old.id then
      raise exception 'No se puede reasignar la composición';
    end if;
    new.revision := old.revision + 1;
  else
    new.revision := 1;
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.validate_social_composition() from public, anon, authenticated;
create trigger validate_social_composition before insert or update on public.social_compositions
  for each row execute function public.validate_social_composition();
create trigger audit_social_composition after insert or update on public.social_compositions
  for each row execute function public.audit_editorial_change();

create table public.social_copy_requests (
  id uuid primary key,
  article_id uuid not null references public.articles(id) on delete cascade,
  state text not null default 'pending' check (state in ('pending', 'completed', 'uncertain', 'cancelled')),
  source_revision integer not null default 0 check (source_revision >= 0),
  result jsonb,
  created_at timestamptz not null default now()
);
create unique index social_copy_one_active_article on public.social_copy_requests(article_id)
  where state in ('pending', 'uncertain');
create index social_copy_article_date on public.social_copy_requests(article_id, created_at);
alter table public.social_copy_requests enable row level security;
revoke all on public.social_copy_requests from anon, authenticated;
grant select, insert, update on public.social_copy_requests to authenticated;
create policy "social copy editors" on public.social_copy_requests for all to authenticated
  using (public.can_write_social_composition())
  with check (public.can_write_social_composition());

create function public.reserve_social_copy(p_id uuid, p_article_id uuid, p_source_revision integer default 0) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare anterior public.social_copy_requests;
begin
  if not public.can_write_social_composition() then raise insufficient_privilege; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_article_id::text, 1042));
  select * into anterior from public.social_copy_requests where id = p_id;
  if found then
    if anterior.article_id <> p_article_id or anterior.source_revision <> p_source_revision then raise exception 'Identidad o revisión incompatible'; end if;
    return jsonb_build_object('state', anterior.state, 'result', anterior.result);
  end if;
  if exists(select 1 from public.social_copy_requests where article_id = p_article_id and state in ('pending','uncertain')) then
    return jsonb_build_object('state', 'blocked');
  end if;
  if (select count(*) from public.social_copy_requests where article_id = p_article_id and created_at > now() - interval '1 day') >= 10 then
    return jsonb_build_object('state', 'limited');
  end if;
  insert into public.social_copy_requests(id, article_id, source_revision) values(p_id, p_article_id, p_source_revision);
  return jsonb_build_object('state', 'reserved');
end;
$$;
revoke all on function public.reserve_social_copy(uuid,uuid,integer) from public, anon;
grant execute on function public.reserve_social_copy(uuid,uuid,integer) to authenticated;
-- Reversión: retirar triggers, tabla y validate_social_composition(), previa copia de borradores.
