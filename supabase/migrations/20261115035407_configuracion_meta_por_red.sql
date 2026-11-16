-- Permitir una red operativa mientras la otra requiere reautorización humana.
create or replace function public.set_social_meta_configuration(p_config jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare secreto uuid; clave text; token text;
begin
 if p_config is null or jsonb_typeof(p_config)<>'object'
  or (p_config-array['metaAccessToken','metaFacebookPageAccessToken','metaFacebookPageId','metaInstagramAccountId'])<>'{}'::jsonb
  or p_config->>'metaFacebookPageId' is distinct from '1432682403259329'
  or p_config->>'metaInstagramAccountId' is distinct from '17841472510522793'
  or (coalesce(length(p_config->>'metaAccessToken'),0)=0 and coalesce(length(p_config->>'metaFacebookPageAccessToken'),0)=0) then
  raise exception 'Configuracion Meta invalida';
 end if;
 foreach clave in array array['metaAccessToken','metaFacebookPageAccessToken'] loop
  token:=p_config->>clave;
  if token is not null and (jsonb_typeof(p_config->clave)<>'string' or length(token) not between 20 and 8192) then
   raise exception 'Credencial Meta invalida';
  end if;
 end loop;
 select id into secreto from vault.secrets where name='pont3la10_social_meta';
 if secreto is null then
  perform vault.create_secret(p_config::text,'pont3la10_social_meta','Cuentas oficiales Meta; solo servidor');
 else perform vault.update_secret(secreto,p_config::text); end if;
 insert into public.social_runtime_configuration_audit(action) values('meta.configured');
end $$;
revoke all on function public.set_social_meta_configuration(jsonb) from public,anon,authenticated;
grant execute on function public.set_social_meta_configuration(jsonb) to service_role;
