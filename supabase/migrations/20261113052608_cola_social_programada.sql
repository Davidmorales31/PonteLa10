create table public.social_schedule_batches (
 id uuid primary key, actor_id uuid not null references auth.users(id),
 starts_at timestamptz not null, interval_minutes integer not null check(interval_minutes between 1 and 1440),
 created_at timestamptz not null default now()
);
create table public.social_scheduled_publications (
 id uuid primary key default gen_random_uuid(), batch_id uuid not null references public.social_schedule_batches(id),
 article_id uuid not null references public.articles(id), position integer not null check(position between 0 and 49),
 run_at timestamptz not null, revision integer not null check(revision>=0), article_version integer not null,
 document_hash text not null check(document_hash ~ '^[a-f0-9]{64}$'),
 image_hash text not null check(image_hash ~ '^[a-f0-9]{64}$'),
 destinations text[] not null check(cardinality(destinations) between 1 and 2 and destinations <@ array['facebook','instagram']),
 status text not null default 'queued' check(status in ('queued','processing','published','partial','failed','uncertain','cancelled')),
 claim_id uuid, started_at timestamptz, finished_at timestamptz, result jsonb,
 unique(batch_id,position), unique(batch_id,article_id)
);
create unique index social_scheduled_article_active on public.social_scheduled_publications(article_id) where status in ('queued','processing');
create index social_scheduled_due on public.social_scheduled_publications(run_at) where status='queued';
create table public.social_scheduler_state(id boolean primary key default true check(id),last_seen_at timestamptz not null);
alter table public.social_schedule_batches enable row level security;
alter table public.social_scheduled_publications enable row level security;
alter table public.social_scheduler_state enable row level security;
revoke all on public.social_schedule_batches,public.social_scheduled_publications,public.social_scheduler_state from public,anon,authenticated,service_role;
grant select,insert,update on public.social_schedule_batches,public.social_scheduled_publications,public.social_scheduler_state to service_role;

create function public.enqueue_social_schedule(p_id uuid,p_actor_id uuid,p_starts_at timestamptz,p_interval_minutes integer,p_items jsonb,p_destinations text[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare item jsonb; pos integer:=0; previous public.social_schedule_batches;
begin
 if not exists(select 1 from public.user_roles r join public.editorial_role_permissions p on p.role=r.role
   where r.user_id=p_actor_id and r.is_active and p.permission='contenido.editarTodos') then raise exception 'Permiso revocado'; end if;
 select * into previous from public.social_schedule_batches where id=p_id;
 if found then
   if previous.actor_id<>p_actor_id then raise exception 'Lote ajeno'; end if;
   return previous.id;
 end if;
 if p_starts_at<now() or p_starts_at>now()+interval '90 days' or p_interval_minutes not between 1 and 1440
   or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50
   or cardinality(p_destinations) not between 1 and 2 or not(p_destinations <@ array['facebook','instagram']) then raise exception 'Programacion invalida'; end if;
 insert into public.social_schedule_batches(id,actor_id,starts_at,interval_minutes) values(p_id,p_actor_id,p_starts_at,p_interval_minutes);
 for item in select * from jsonb_array_elements(p_items) loop
   if not exists(select 1 from public.articles where id=(item->>'id')::uuid and status='published') then raise exception 'Articulo no publicado'; end if;
   insert into public.social_scheduled_publications(batch_id,article_id,position,run_at,revision,article_version,document_hash,image_hash,destinations)
    values(p_id,(item->>'id')::uuid,pos,p_starts_at+make_interval(mins=>pos*p_interval_minutes),
      (item->>'revision')::integer,(item->>'articleVersion')::integer,item->>'hash',item->>'imageHash',p_destinations);
   pos:=pos+1;
 end loop;
 insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
  values(p_actor_id,'social.schedule.approved','social_schedule_batch',p_id,jsonb_build_object('count',pos,'starts_at',p_starts_at,'interval_minutes',p_interval_minutes,'destinations',p_destinations));
 return p_id;
end $$;

create function public.claim_social_scheduled_publication() returns jsonb language plpgsql security invoker set search_path='' as $$
declare job public.social_scheduled_publications; batch public.social_schedule_batches;
begin
 insert into public.social_scheduler_state(id,last_seen_at) values(true,now()) on conflict(id) do update set last_seen_at=now();
 update public.social_scheduled_publications set status='failed',finished_at=now(),result='{"aviso":"Hora vencida hace mas de 24 horas. Revisar y programar de nuevo."}'::jsonb
  where status='queued' and run_at<now()-interval '24 hours';
 update public.social_scheduled_publications set status='uncertain',finished_at=now(),result='{"aviso":"Proceso interrumpido. Revisar los recibos de Meta antes de reprogramar."}'::jsonb
  where status='processing' and started_at<now()-interval '15 minutes';
 select j.* into job from public.social_scheduled_publications j join public.social_schedule_batches b on b.id=j.batch_id
  where j.status='queued' and j.run_at<=now() and (j.position=0 or exists(
    select 1 from public.social_scheduled_publications prev where prev.batch_id=j.batch_id and prev.position=j.position-1
    and prev.status not in ('queued','processing') and
      coalesce(prev.started_at,prev.finished_at,prev.run_at)+make_interval(mins=>b.interval_minutes)<=now()))
  order by j.run_at,j.position for update of j skip locked limit 1;
 if job.id is null then return null; end if;
 select * into batch from public.social_schedule_batches where id=job.batch_id;
 update public.social_scheduled_publications set status='processing',claim_id=gen_random_uuid(),started_at=now() where id=job.id returning * into job;
 insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
  values(batch.actor_id,'social.schedule.started','social_scheduled_publication',job.id,jsonb_build_object('batch_id',job.batch_id));
 return to_jsonb(job)||jsonb_build_object('actor_id',batch.actor_id);
end $$;

create function public.finish_social_scheduled_publication(p_id uuid,p_claim_id uuid,p_status text,p_result jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare actor uuid;
begin
 if p_status not in ('published','partial','failed','uncertain') or octet_length(p_result::text)>12000 then raise exception 'Resultado invalido'; end if;
 update public.social_scheduled_publications set status=p_status,result=p_result,finished_at=now()
  where id=p_id and claim_id=p_claim_id and status='processing';
 if not found then raise exception 'Reserva de programacion invalida'; end if;
 select b.actor_id into actor from public.social_schedule_batches b join public.social_scheduled_publications j on j.batch_id=b.id where j.id=p_id;
 insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
  values(actor,'social.schedule.'||p_status,'social_scheduled_publication',p_id,'{}');
end $$;

create function public.cancel_social_schedule(p_id uuid,p_actor_id uuid) returns integer language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if not exists(select 1 from public.social_schedule_batches where id=p_id and actor_id=p_actor_id) then raise exception 'Lote ajeno'; end if;
 update public.social_scheduled_publications set status='cancelled',finished_at=now() where batch_id=p_id and status='queued';
 get diagnostics n=row_count;
 insert into public.editorial_audit_log(actor_id,action,entity_type,entity_id,metadata)
  values(p_actor_id,'social.schedule.cancelled','social_schedule_batch',p_id,jsonb_build_object('count',n));
 return n;
end $$;
revoke all on function public.enqueue_social_schedule(uuid,uuid,timestamptz,integer,jsonb,text[]) from public,anon,authenticated;
revoke all on function public.claim_social_scheduled_publication() from public,anon,authenticated;
revoke all on function public.finish_social_scheduled_publication(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.cancel_social_schedule(uuid,uuid) from public,anon,authenticated;
grant execute on function public.enqueue_social_schedule(uuid,uuid,timestamptz,integer,jsonb,text[]) to service_role;
grant execute on function public.claim_social_scheduled_publication() to service_role;
grant execute on function public.finish_social_scheduled_publication(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.cancel_social_schedule(uuid,uuid) to service_role;
