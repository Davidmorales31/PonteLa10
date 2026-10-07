begin;

-- Brief SEO privado: se guarda por separado del snapshot público del artículo.
-- Las entidades principales/secundarias viven en editorial_article_entity_relations.
create table public.editorial_article_search_briefs (
  article_id uuid primary key references public.articles(id) on delete cascade,
  target_query text check (
    target_query is null or char_length(btrim(target_query)) between 2 and 160
  ),
  search_intent text check (search_intent is null or search_intent in (
    'actualidad', 'resultado', 'transmision', 'calendario',
    'explicacion', 'perfil', 'analisis', 'opinion'
  )),
  parent_cluster text check (
    parent_cluster is null or char_length(btrim(parent_cluster)) between 1 and 120
  ),
  freshness_window_days smallint check (
    freshness_window_days is null or freshness_window_days between 0 and 3650
  ),
  opportunity_source text check (
    opportunity_source is null or char_length(btrim(opportunity_source)) between 1 and 2048
  ),
  editorial_differentiator text check (
    editorial_differentiator is null
    or char_length(btrim(editorial_differentiator)) between 1 and 500
  ),
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed')),
  created_by uuid references auth.users(id) on delete set null,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_article_search_briefs_confirmation_check check (
    (status = 'confirmed' and confirmed_by is not null and confirmed_at is not null)
    or (status = 'proposed' and confirmed_by is null and confirmed_at is null)
  )
);

alter table public.editorial_article_search_briefs enable row level security;
revoke all privileges on table public.editorial_article_search_briefs
  from public, anon, authenticated, service_role;
grant select, insert, update on table public.editorial_article_search_briefs
  to authenticated;

create policy "editorial team can read search briefs"
  on public.editorial_article_search_briefs for select to authenticated
  using ((select public.has_editorial_permission('contenido.verBorradores')));

create policy "article editors can create search briefs"
  on public.editorial_article_search_briefs for insert to authenticated
  with check (
    exists (
      select 1
      from public.articles as article
      where article.id = article_id
        and (
          (
            (select public.can_edit_article(article_id))
            and article.status::text in ('draft', 'changes_requested')
          )
          or (
            (select public.has_editorial_permission('contenido.aprobar'))
            and article.status::text = 'review'
          )
        )
      )
  );

create policy "article editors can update search briefs"
  on public.editorial_article_search_briefs for update to authenticated
  using (
    exists (
      select 1
      from public.articles as article
      where article.id = article_id
        and (
          (
            (select public.can_edit_article(article_id))
            and article.status::text in ('draft', 'changes_requested')
          )
          or (
            (select public.has_editorial_permission('contenido.aprobar'))
            and article.status::text = 'review'
          )
        )
      )
  )
  with check (
    exists (
      select 1
      from public.articles as article
      where article.id = article_id
        and (
          (
            (select public.can_edit_article(article_id))
            and article.status::text in ('draft', 'changes_requested')
          )
          or (
            (select public.has_editorial_permission('contenido.aprobar'))
            and article.status::text = 'review'
          )
        )
      )
  );

create or replace function public.audit_editorial_article_search_brief()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  article_status text;
  registrar_auditoria boolean := false;
begin
  select article.status::text
    into article_status
  from public.articles as article
  where article.id = new.article_id
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'El artículo del brief ya no está disponible.';
  end if;

  if (select auth.uid()) is not null then
    if new.status = 'confirmed' then
      if article_status <> 'review'
        or not (select public.has_editorial_permission('contenido.aprobar')) then
        raise exception using errcode = '42501', message = 'Solo un aprobador puede confirmar el brief de un artículo en revisión.';
      end if;
    elsif not (
      (article_status in ('draft', 'changes_requested') and public.can_edit_article(new.article_id))
      or (article_status = 'review' and public.has_editorial_permission('contenido.aprobar'))
    ) then
      raise exception using errcode = '42501', message = 'No tienes permiso para modificar este brief en el estado actual.';
    end if;
  elsif new.status = 'confirmed' then
    raise exception using errcode = '42501', message = 'La automatización no puede confirmar briefs.';
  end if;

  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.created_at := now();
    registrar_auditoria := true;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    registrar_auditoria := new.target_query is distinct from old.target_query
      or new.search_intent is distinct from old.search_intent
      or new.parent_cluster is distinct from old.parent_cluster
      or new.freshness_window_days is distinct from old.freshness_window_days
      or new.opportunity_source is distinct from old.opportunity_source
      or new.editorial_differentiator is distinct from old.editorial_differentiator
      or new.status is distinct from old.status;
  end if;

  if new.status = 'confirmed' then
    if (select auth.uid()) is not null then
      new.confirmed_by := (select auth.uid());
      new.confirmed_at := now();
    elsif tg_op = 'UPDATE' then
      if old.status = 'confirmed' then
        new.confirmed_by := old.confirmed_by;
        new.confirmed_at := old.confirmed_at;
      else
        new.confirmed_by := null;
        new.confirmed_at := null;
      end if;
    else
      new.confirmed_by := null;
      new.confirmed_at := null;
    end if;
  else
    new.confirmed_by := null;
    new.confirmed_at := null;
  end if;

  new.updated_at := now();
  if registrar_auditoria and (select auth.uid()) is not null then
    insert into public.editorial_audit_log (
      actor_id, action, entity_type, entity_id, metadata
    ) values (
      (select auth.uid()),
      case when new.status = 'confirmed'
        then 'contenido.brief_seo_confirmado'
        else 'contenido.brief_seo_propuesto'
      end,
      'article',
      new.article_id,
      jsonb_build_object(
        'intencion', new.search_intent,
        'tieneConsultaObjetivo', new.target_query is not null,
        'tieneCluster', new.parent_cluster is not null
      )
    );
  end if;
  return new;
end;
$$;

create trigger editorial_article_search_briefs_audit
  before insert or update on public.editorial_article_search_briefs
  for each row execute function public.audit_editorial_article_search_brief();

revoke all on function public.audit_editorial_article_search_brief()
  from public, anon, authenticated, service_role;

create or replace function public.propose_editorial_article_search_brief(
  p_idempotency_key uuid,
  p_article_id uuid,
  p_brief jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  article_status text;
begin
  if p_idempotency_key is null or p_article_id is null
    or pg_catalog.jsonb_typeof(p_brief) <> 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_brief)) <> 6
    or not (p_brief ?& array[
      'targetQuery', 'searchIntent', 'parentCluster',
      'freshnessWindowDays', 'opportunitySource', 'editorialDifferentiator'
    ]) then
    raise exception using errcode = '22023', message = 'La propuesta SEO no cumple el contrato.';
  end if;

  -- El bloqueo serializa esta propuesta frente a la transición del artículo.
  select article.status::text
    into article_status
  from public.articles as article
  where article.id = p_article_id
  for update;

  -- Una detección similar no puede reasignar metadatos a un artículo ajeno.
  if article_status is distinct from 'review' or not exists (
    select 1
    from public.editorial_codex_proposals as proposal
    inner join public.articles as article on article.id = proposal.article_id
    where proposal.idempotency_key = p_idempotency_key
      and proposal.article_id = p_article_id
      and article.status::text = 'review'
  ) then
    return;
  end if;

  insert into public.editorial_article_search_briefs as brief_actual (
    article_id, target_query, search_intent, parent_cluster,
    freshness_window_days, opportunity_source, editorial_differentiator, status
  ) values (
    p_article_id,
    nullif(pg_catalog.btrim(p_brief ->> 'targetQuery'), ''),
    nullif(p_brief ->> 'searchIntent', 'null'),
    nullif(pg_catalog.btrim(p_brief ->> 'parentCluster'), ''),
    nullif(p_brief ->> 'freshnessWindowDays', 'null')::smallint,
    nullif(pg_catalog.btrim(p_brief ->> 'opportunitySource'), ''),
    nullif(pg_catalog.btrim(p_brief ->> 'editorialDifferentiator'), ''),
    'proposed'
  )
  on conflict (article_id) do update set
    target_query = excluded.target_query,
    search_intent = excluded.search_intent,
    parent_cluster = excluded.parent_cluster,
    freshness_window_days = excluded.freshness_window_days,
    opportunity_source = excluded.opportunity_source,
    editorial_differentiator = excluded.editorial_differentiator,
    status = 'proposed'
  where brief_actual.status = 'proposed';
end;
$$;

revoke all on function public.propose_editorial_article_search_brief(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.propose_editorial_article_search_brief(uuid, uuid, jsonb)
  to service_role;

-- El brief exige una sola entidad principal; las secundarias siguen siendo múltiples.
create unique index editorial_article_entity_relations_one_primary_idx
  on public.editorial_article_entity_relations (article_id)
  where relation_type = 'about' and status = 'confirmed';

-- Permite al aprobador revisar únicamente las relaciones editoriales del
-- artículo mientras está en revisión; no habilita la edición del cuerpo.
create or replace function public.save_editorial_article_entity_relations(
  p_article_id uuid,
  p_relations jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  relation jsonb;
  entity_type text;
  entity_slug text;
  entity_name text;
  relation_type text;
  relation_status text;
  relation_source text;
  relation_confidence numeric;
  article_status text;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Debes iniciar sesión.';
  end if;
  if p_relations is null
    or pg_catalog.jsonb_typeof(p_relations) <> 'array'
    or pg_catalog.jsonb_array_length(p_relations) > 40 then
    raise exception using errcode = '22023', message = 'La lista de relaciones no es válida.';
  end if;

  select article.status::text
    into article_status
  from public.articles as article
  where article.id = p_article_id
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'El contenido no está disponible.';
  end if;
  if not (
    (article_status in ('draft', 'changes_requested') and public.can_edit_article(p_article_id))
    or (article_status = 'review' and public.has_editorial_permission('contenido.aprobar'))
  ) then
    raise exception using errcode = '42501', message = 'No tienes permiso para editar estas relaciones en el estado actual.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_relations) as item(value)
    where pg_catalog.jsonb_typeof(item.value) <> 'object'
      or not (item.value ?& array[
        'entity_type', 'entity_slug', 'relation_type', 'status', 'source', 'confidence'
      ])
      or exists (
        select 1
        from pg_catalog.jsonb_object_keys(item.value) as key_name(value)
        where key_name.value not in (
          'entity_type', 'entity_slug', 'relation_type', 'status', 'source', 'confidence'
        )
      )
      or coalesce(item.value ->> 'entity_type', '') not in ('article', 'match', 'team', 'player', 'competition')
      or coalesce(item.value ->> 'entity_slug', '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or pg_catalog.char_length(coalesce(item.value ->> 'entity_slug', '')) > 120
      or coalesce(item.value ->> 'relation_type', '') not in ('about', 'mentions', 'related')
      or coalesce(item.value ->> 'status', '') not in ('confirmed', 'rejected')
      or coalesce(item.value ->> 'source', '') not in ('automatic', 'editorial')
      or (
        item.value -> 'confidence' <> 'null'::jsonb
        and (
          pg_catalog.jsonb_typeof(item.value -> 'confidence') <> 'number'
          or (item.value ->> 'confidence')::numeric < 0
          or (item.value ->> 'confidence')::numeric > 1
        )
      )
  ) then
    raise exception using errcode = '22023', message = 'Una de las relaciones no cumple el formato permitido.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_relations) as item(value)
    group by item.value ->> 'entity_type', item.value ->> 'entity_slug'
    having pg_catalog.count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'No repitas la misma entidad en una decisión.';
  end if;

  if (
    select pg_catalog.count(*)
    from pg_catalog.jsonb_array_elements(p_relations) as item(value)
    where item.value ->> 'relation_type' = 'about'
      and item.value ->> 'status' = 'confirmed'
  ) > 1 then
    raise exception using errcode = '23505', message = 'Solo se permite una entidad principal confirmada.';
  end if;

  for relation in select value from pg_catalog.jsonb_array_elements(p_relations) as items(value) loop
    entity_type := relation ->> 'entity_type';
    entity_slug := relation ->> 'entity_slug';
    relation_type := relation ->> 'relation_type';
    relation_status := relation ->> 'status';
    relation_source := relation ->> 'source';
    relation_confidence := case
      when relation -> 'confidence' = 'null'::jsonb then null
      else (relation ->> 'confidence')::numeric
    end;

    if entity_type = 'article' and exists (
      select 1
      from public.articles as current_article
      left join public.article_versions as published_version
        on published_version.id = current_article.published_version_id
      where current_article.id = p_article_id
        and (
          current_article.slug = entity_slug
          or published_version.snapshot ->> 'slug' = entity_slug
        )
    ) then
      raise exception using errcode = '23514', message = 'Una publicación no puede relacionarse consigo misma.';
    end if;

    entity_name := public.resolve_public_entity_name(entity_type, entity_slug);
    if entity_name is null then
      if relation_status <> 'rejected' then
        raise exception using errcode = '22023', message = 'Una de las entidades ya no está disponible para enlazar.';
      end if;

      select existing_relation.entity_name
        into entity_name
      from public.editorial_article_entity_relations as existing_relation
      where existing_relation.article_id = p_article_id
        and existing_relation.entity_type = entity_type
        and existing_relation.entity_slug = entity_slug;
      if entity_name is null then
        raise exception using errcode = '22023', message = 'No se puede descartar una entidad que no estaba vinculada.';
      end if;
    end if;

    insert into public.editorial_article_entity_relations (
      article_id, entity_type, entity_slug, entity_name, relation_type,
      status, source, confidence
    ) values (
      p_article_id, entity_type, entity_slug, entity_name, relation_type,
      relation_status, relation_source, relation_confidence
    )
    on conflict (article_id, entity_type, entity_slug) do update set
      entity_name = excluded.entity_name,
      relation_type = excluded.relation_type,
      status = excluded.status,
      source = excluded.source,
      confidence = excluded.confidence;
  end loop;

  if pg_catalog.jsonb_array_length(p_relations) > 0 then
    insert into public.editorial_audit_log (
      actor_id, action, entity_type, entity_id, metadata
    ) values (
      (select auth.uid()),
      'contenido.relaciones_seo_actualizadas',
      'article',
      p_article_id,
      jsonb_build_object('cantidad', pg_catalog.jsonb_array_length(p_relations))
    );
  end if;
end;
$$;

revoke all on function public.save_editorial_article_entity_relations(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.save_editorial_article_entity_relations(uuid, jsonb)
  to authenticated;

comment on table public.editorial_article_search_briefs is
  'Brief de intención SEO interno del CMS; nunca se expone en la respuesta pública. Las relaciones de entidades se guardan en editorial_article_entity_relations.';

commit;
