-- Tokens exclusivamente cifrados por el backend. Sin acceso Data API a usuarios.
create table public.social_x_oauth_attempts (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  state_hash text not null unique check (state_hash ~ '^[a-f0-9]{64}$'),
  browser_hash text not null check (browser_hash ~ '^[a-f0-9]{64}$'),
  encrypted_flow text not null check (length(encrypted_flow) between 40 and 24000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  consumed_at timestamptz,
  persisted_at timestamptz
);
create index social_x_oauth_attempts_actor_date on public.social_x_oauth_attempts(actor_id, created_at);
create table public.social_x_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique default 'x' check (provider = 'x'),
  provider_user_id text not null check (provider_user_id ~ '^[0-9]{1,30}$'),
  username text not null check (lower(username) = 'pont3la10'),
  token_cipher text not null check (length(token_cipher) between 40 and 24000),
  scopes text[] not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  connected_by uuid not null references auth.users(id)
);
alter table public.social_x_oauth_attempts enable row level security;
alter table public.social_x_connections enable row level security;
revoke all on public.social_x_oauth_attempts, public.social_x_connections from public, anon, authenticated;
grant select, insert, update on public.social_x_oauth_attempts, public.social_x_connections to service_role;

create function public.begin_social_x_oauth(p_actor_id uuid, p_state_hash text, p_browser_hash text, p_flow text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('social-x:' || p_actor_id::text, 0));
  if (select count(*) from public.social_x_oauth_attempts where actor_id = p_actor_id and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Demasiados intentos de conexión';
  end if;
  insert into public.social_x_oauth_attempts(actor_id,state_hash,browser_hash,encrypted_flow)
    values(p_actor_id,p_state_hash,p_browser_hash,p_flow) returning id into v_id;
  insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
    values(p_actor_id,'social.oauth.started','social_connection',v_id,'{"provider":"x"}');
  return v_id;
end $$;

create function public.consume_social_x_oauth(p_actor_id uuid, p_state_hash text, p_browser_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_attempt public.social_x_oauth_attempts;
begin
  update public.social_x_oauth_attempts set consumed_at = now()
    where actor_id = p_actor_id and state_hash = p_state_hash and browser_hash = p_browser_hash
      and consumed_at is null and expires_at > now() returning * into v_attempt;
  if v_attempt.id is null then return null; end if;
  return jsonb_build_object('id',v_attempt.id,'encrypted_flow',v_attempt.encrypted_flow);
end $$;

create function public.save_social_x_connection(p_actor_id uuid,p_attempt_id uuid,p_provider_user_id text,
  p_username text,p_token_cipher text,p_expires_at timestamptz,p_scopes text[])
returns void language plpgsql security invoker set search_path = '' as $$
declare v_attempt public.social_x_oauth_attempts; v_connection uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('social-x-connection',0));
  select * into v_attempt from public.social_x_oauth_attempts where id = p_attempt_id and actor_id = p_actor_id for update;
  if v_attempt.id is null or v_attempt.consumed_at is null or v_attempt.persisted_at is not null or v_attempt.expires_at <= now()
    or lower(p_username) <> 'pont3la10' or p_expires_at <= now()
    or not array['tweet.read','users.read','tweet.write','media.write','offline.access']::text[] <@ p_scopes then
    raise exception 'Autorización de conexión inválida';
  end if;
  if exists(select 1 from public.social_x_connections where connected_at > v_attempt.created_at) then
    raise exception 'Existe una autorización posterior';
  end if;
  insert into public.social_x_connections(provider_user_id,username,token_cipher,expires_at,scopes,connected_by)
    values(p_provider_user_id,p_username,p_token_cipher,p_expires_at,p_scopes,p_actor_id)
    on conflict(provider) do update set provider_user_id=excluded.provider_user_id,username=excluded.username,
      token_cipher=excluded.token_cipher,expires_at=excluded.expires_at,scopes=excluded.scopes,
      connected_by=excluded.connected_by,connected_at=now() returning id into v_connection;
  update public.social_x_oauth_attempts set persisted_at=now() where id=p_attempt_id;
  insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
    values(p_actor_id,'social.oauth.connected','social_connection',v_connection,'{"provider":"x","username":"Pont3la10"}');
end $$;

revoke all on function public.begin_social_x_oauth(uuid,text,text,text),
  public.consume_social_x_oauth(uuid,text,text), public.save_social_x_connection(uuid,uuid,text,text,text,timestamptz,text[]) from public, anon, authenticated;
grant execute on function public.begin_social_x_oauth(uuid,text,text,text),
  public.consume_social_x_oauth(uuid,text,text), public.save_social_x_connection(uuid,uuid,text,text,text,timestamptz,text[]) to service_role;
-- Reversión: detener flujo OAuth antes de retirar funciones/tablas. Conservar las
-- credenciales cifradas y la clave maestra en respaldos; no borrarlas al revertir app.
