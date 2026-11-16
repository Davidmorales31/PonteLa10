-- Bloqueo por noticia/red, independiente de la huella. No borra recibos históricos.
-- Reversión operativa: restaurar las definiciones begin de las migraciones previas;
-- no es necesario eliminar registros ni cambiar RLS/grants.
create index if not exists social_meta_article_destination_status on public.social_meta_publications(article_id,destination,status);
create index if not exists social_x_article_status on public.social_x_publications(article_id,status);
create or replace function public.begin_social_meta_publication(p_actor_id uuid,p_article_id uuid,p_destination text,p_content_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.social_meta_publications; v_claimed boolean := false;
begin
  if p_destination not in ('facebook','instagram') or p_content_hash !~ '^[a-f0-9]{64}$' then raise exception 'Destino o huella invalida'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('social:'||p_article_id::text||':'||p_destination,0));
  -- La noticia se comparte una sola vez por red, incluso si cambian texto, foto o cuenta.
  select * into v from public.social_meta_publications
    where article_id=p_article_id and destination=p_destination and status in ('published','uncertain','preparing','sending')
    order by case status when 'published' then 0 when 'uncertain' then 1 else 2 end,created_at
    limit 1 for update;
  if found then
    if v.status in ('preparing','sending') and v.updated_at < now()-interval '10 minutes' then
      update public.social_meta_publications set status='uncertain',updated_at=now() where id=v.id returning * into v;
      insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
        values(p_actor_id,'social.meta.uncertain','social_meta_publication',v.id,
          jsonb_build_object('destination',p_destination,'article_id',p_article_id,'reason','stale_attempt'));
    end if;
    return jsonb_build_object('id',v.id,'claim_id',null,'claimed',false,'status',v.status,'post_url',v.post_url);
  end if;
  insert into public.social_meta_publications(article_id,actor_id,destination,content_hash,status)
    values(p_article_id,p_actor_id,p_destination,p_content_hash,'preparing') on conflict(article_id,destination,content_hash) do nothing returning * into v;
  if found then v_claimed := true;
  else
    select * into v from public.social_meta_publications where article_id=p_article_id and destination=p_destination and content_hash=p_content_hash for update;
    if v.status='failed' and v.attempts<3 then
      update public.social_meta_publications set status='preparing',attempts=attempts+1,claim_id=gen_random_uuid(),actor_id=p_actor_id,updated_at=now(),
        retired_media_paths=retired_media_paths||media_paths,retired_provider_media_ids=retired_provider_media_ids||provider_media_ids,
        media_paths='{}',provider_media_ids='{}',container_id=null
        where id=v.id returning * into v;
      v_claimed := true;
    elsif v.status in ('preparing','sending') and v.updated_at < now()-interval '10 minutes' then
      -- Nunca recuperar una reserva caducada: un proceso anterior aun puede estar enviando.
      update public.social_meta_publications set status='uncertain',updated_at=now() where id=v.id returning * into v;
    end if;
  end if;
  if v_claimed then
    insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
      values(p_actor_id,'social.meta.reserved','social_meta_publication',v.id,jsonb_build_object('destination',p_destination,'article_id',p_article_id,'attempt',v.attempts));
  end if;
  return jsonb_build_object('id',v.id,'claim_id',case when v_claimed then v.claim_id else null end,'claimed',v_claimed,'status',v.status,'post_url',v.post_url);
end $$;


create or replace function public.begin_social_x_publication(p_actor_id uuid, p_article_id uuid, p_content_hash text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_publication public.social_x_publications;
begin
  if p_content_hash !~ '^[a-f0-9]{64}$' then raise exception 'Huella de publicación inválida'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('social:' || p_article_id::text || ':x', 0));
  select * into v_publication from public.social_x_publications
    where article_id=p_article_id and status in ('published','uncertain','reserved','uploading','sending')
    order by case status when 'published' then 0 when 'uncertain' then 1 else 2 end,created_at
    limit 1 for update;
  if found then
    if v_publication.status in ('reserved','uploading','sending') and v_publication.updated_at < now()-interval '10 minutes' then
      update public.social_x_publications set status='uncertain',updated_at=now(),error_code='proveedor_no_disponible'
        where id=v_publication.id returning * into v_publication;
      insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
        values(p_actor_id,'social.x.uncertain','social_x_publication',v_publication.id,
          jsonb_build_object('provider','x','article_id',p_article_id,'reason','stale_attempt'));
    end if;
    return jsonb_build_object('id',v_publication.id,'status',v_publication.status,'claimed',false,
      'post_id',v_publication.provider_post_id,'post_url',v_publication.post_url);
  end if;
  insert into public.social_x_publications(article_id, actor_id, content_hash, status)
    values (p_article_id, p_actor_id, p_content_hash, 'reserved')
    on conflict (article_id, content_hash) do nothing;
  if found then
    select * into v_publication from public.social_x_publications
      where article_id = p_article_id and content_hash = p_content_hash;
    insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
      values (p_actor_id, 'social.x.reserved', 'social_x_publication', v_publication.id,
        jsonb_build_object('provider', 'x', 'article_id', p_article_id));
    return jsonb_build_object('id', v_publication.id, 'status', v_publication.status, 'claimed', true,
      'post_id', v_publication.provider_post_id, 'post_url', v_publication.post_url);
  end if;

  select * into v_publication from public.social_x_publications
    where article_id = p_article_id and content_hash = p_content_hash for update;
  if v_publication.status = 'published' or v_publication.status = 'uncertain' then
    return jsonb_build_object('id', v_publication.id, 'status', v_publication.status, 'claimed', false,
      'post_id', v_publication.provider_post_id, 'post_url', v_publication.post_url);
  end if;
  if v_publication.status = 'sending' then
    if v_publication.updated_at > now() - interval '10 minutes' then
      return jsonb_build_object('id', v_publication.id, 'status', 'sending', 'claimed', false,
        'post_id', null, 'post_url', null);
    end if;
    update public.social_x_publications set status = 'uncertain', updated_at = now(), error_code = 'proveedor_no_disponible'
      where id = v_publication.id returning * into v_publication;
    insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
      values (v_publication.actor_id, 'social.x.uncertain', 'social_x_publication', v_publication.id,
        jsonb_build_object('provider', 'x', 'article_id', p_article_id, 'reason', 'stale_sending'));
    return jsonb_build_object('id', v_publication.id, 'status', v_publication.status, 'claimed', false,
      'post_id', null, 'post_url', null);
  end if;
  if v_publication.status in ('reserved', 'uploading') and v_publication.updated_at > now() - interval '10 minutes' then
    return jsonb_build_object('id', v_publication.id, 'status', v_publication.status, 'claimed', false,
      'post_id', null, 'post_url', null);
  end if;
  if v_publication.attempt_count >= 3 then
    return jsonb_build_object('id', v_publication.id, 'status', 'failed', 'claimed', false,
      'post_id', null, 'post_url', null);
  end if;
  update public.social_x_publications set status = 'reserved', attempt_count = attempt_count + 1,
    updated_at = now(), error_code = null
    where id = v_publication.id returning * into v_publication;
  insert into public.editorial_audit_log(actor_id, action, entity_type, entity_id, metadata)
    values (p_actor_id, 'social.x.reserved', 'social_x_publication', v_publication.id,
      jsonb_build_object('provider', 'x', 'article_id', p_article_id, 'attempt', v_publication.attempt_count));
  return jsonb_build_object('id', v_publication.id, 'status', v_publication.status, 'claimed', true,
    'post_id', null, 'post_url', null);
end $$;


revoke all on function public.begin_social_meta_publication(uuid,uuid,text,text), public.begin_social_x_publication(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.begin_social_meta_publication(uuid,uuid,text,text), public.begin_social_x_publication(uuid,uuid,text) to service_role;
