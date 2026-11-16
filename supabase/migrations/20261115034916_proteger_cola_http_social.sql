-- pg_net es administrado por supabase_admin y sus ACL pueden no ser revocables
-- por postgres. Nunca encolar un secreto permanente: solo un desafío de un uso.
create table public.social_scheduler_dispatches (
 token_hash bytea primary key,
 expires_at timestamptz not null
);
alter table public.social_scheduler_dispatches enable row level security;
revoke all on public.social_scheduler_dispatches from public,anon,authenticated,service_role;

create or replace function public.authorize_social_scheduler(p_token text) returns boolean
language plpgsql security definer set search_path='' as $$
declare consumidos integer;
begin
 if p_token is null or length(p_token)<>64 then return false; end if;
 delete from public.social_scheduler_dispatches
  where token_hash=extensions.digest(p_token,'sha256') and expires_at>now();
 get diagnostics consumidos=row_count;
 return consumidos=1;
end $$;

create or replace function public.dispatch_social_scheduler() returns bigint
language plpgsql security definer set search_path='' as $$
declare desafio text;
begin
 delete from public.social_scheduler_dispatches where expires_at<=now();
 desafio:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.social_scheduler_dispatches(token_hash,expires_at)
  values(extensions.digest(desafio,'sha256'),now()+interval '60 seconds');
 return net.http_post(url:='https://www.pont3la10.com/api/internal/redes/procesar',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||desafio),
  body:='{}'::jsonb,timeout_milliseconds:=250000);
end $$;
revoke all on function public.authorize_social_scheduler(text),public.dispatch_social_scheduler() from public,anon,authenticated;
grant execute on function public.authorize_social_scheduler(text),public.dispatch_social_scheduler() to service_role;
