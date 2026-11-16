-- Cron independiente del PC. Se deja desactivado hasta verificar el despliegue.
create extension if not exists pg_net with schema extensions;
revoke all on net.http_request_queue, net._http_response from public, anon, authenticated, service_role;

create table public.social_runtime_configuration_audit (
 id bigint generated always as identity primary key,
 action text not null check (action = 'meta.configured'),
 created_at timestamptz not null default now()
);
alter table public.social_runtime_configuration_audit enable row level security;
revoke all on public.social_runtime_configuration_audit from public, anon, authenticated, service_role;
grant select on public.social_runtime_configuration_audit to service_role;

do $$ begin
 if not exists(select 1 from vault.secrets where name='pont3la10_social_scheduler') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'pont3la10_social_scheduler','Autenticación exclusiva del programador social');
 end if;
end $$;

create function public.set_social_meta_configuration(p_config jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare secreto uuid;
begin
 if jsonb_typeof(p_config)<>'object' or (select count(*) from jsonb_object_keys(p_config))<>4
  or p_config->>'metaFacebookPageId' is distinct from '1432682403259329'
  or p_config->>'metaInstagramAccountId' is distinct from '17841472510522793'
  or coalesce(length(p_config->>'metaAccessToken'),0) not between 20 and 8192
  or coalesce(length(p_config->>'metaFacebookPageAccessToken'),0) not between 20 and 8192 then
  raise exception 'Configuracion Meta invalida';
 end if;
 select id into secreto from vault.secrets where name='pont3la10_social_meta';
 if secreto is null then
  perform vault.create_secret(p_config::text,'pont3la10_social_meta','Cuentas oficiales Meta; solo servidor');
 else
  perform vault.update_secret(secreto,p_config::text);
 end if;
 insert into public.social_runtime_configuration_audit(action) values('meta.configured');
end $$;

create function public.get_social_meta_configuration() returns jsonb
language sql stable security definer set search_path='' as $$
 select decrypted_secret::jsonb from vault.decrypted_secrets where name='pont3la10_social_meta';
$$;
create function public.authorize_social_scheduler(p_token text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(length(p_token)=64 and extensions.digest(p_token,'sha256')=
  (select extensions.digest(decrypted_secret,'sha256') from vault.decrypted_secrets where name='pont3la10_social_scheduler'),false);
$$;

create function public.dispatch_social_scheduler() returns bigint
language plpgsql security definer set search_path='' as $$
declare secreto text;
begin
 select decrypted_secret into secreto from vault.decrypted_secrets where name='pont3la10_social_scheduler';
 if secreto is null then raise exception 'Programador sin configurar'; end if;
 return net.http_post(url:='https://www.pont3la10.com/api/internal/redes/procesar',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secreto),
  body:='{}'::jsonb,timeout_milliseconds:=250000);
end $$;

revoke all on function public.set_social_meta_configuration(jsonb),public.get_social_meta_configuration(),public.authorize_social_scheduler(text),public.dispatch_social_scheduler() from public,anon,authenticated;
grant execute on function public.set_social_meta_configuration(jsonb),public.get_social_meta_configuration(),public.authorize_social_scheduler(text),public.dispatch_social_scheduler() to service_role;
select cron.schedule('pont3la10-programador-social','* * * * *','select public.dispatch_social_scheduler();');
select cron.alter_job((select jobid from cron.job where jobname='pont3la10-programador-social'),active:=false);
