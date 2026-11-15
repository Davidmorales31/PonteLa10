begin;

-- Titular de portada: texto para la imagen del centro de noticias (tarjetas,
-- carrusel y destacada). Es distinto del título SEO del artículo (title/H1).
-- Es opcional: si falta, la portada usa el título del artículo.
alter table public.articles
  add column if not exists cover_headline text;

alter table public.articles
  drop constraint if exists articles_cover_headline_format;
alter table public.articles
  add constraint articles_cover_headline_format check (
    cover_headline is null
    or (
      char_length(cover_headline) between 8 and 120
      and cover_headline = pg_catalog.btrim(cover_headline)
    )
  );

comment on column public.articles.cover_headline is
  'Titular de portada para tarjetas e imagen del centro de noticias. Opcional; el H1 sigue siendo title.';

-- Sin permiso de columna: un PATCH directo no puede cambiar el titular sin
-- pasar por el control de bloqueo. Lo escribe solo la función estrecha de abajo.
revoke update (cover_headline) on table public.articles from public, anon, authenticated;

-- SECURITY DEFINER estrecho (mismo patrón que sync_latest_article_version_metadata):
-- comprueba permiso, estado editable y versión esperada antes de escribir.
create or replace function editorial_private.set_article_cover_headline(
  target_article_id uuid,
  expected_lock_version integer,
  next_cover_headline text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or not public.can_edit_article(target_article_id) then
    raise exception 'No tienes permiso para editar este contenido.';
  end if;

  -- Si la versión o el estado no coinciden, no se escribe; el guardado vigente
  -- que se ejecuta a continuación informa el conflicto y revierte todo.
  update public.articles as article
  set cover_headline = next_cover_headline
  where article.id = target_article_id
    and article.lock_version = expected_lock_version
    and article.status::text in ('draft', 'changes_requested')
    and article.cover_headline is distinct from next_cover_headline;
end;
$$;

revoke all on function editorial_private.set_article_cover_headline(uuid, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function editorial_private.set_article_cover_headline(uuid, integer, text)
  to authenticated;

-- Decisión de diseño: cover_headline NO se añade a las listas de columnas de los
-- disparadores de bloqueo, versión y fechas. Todas las escrituras pasan por:
--   1) save_editorial_article_with_cover_headline, que lo actualiza y en la
--      misma transacción llama al guardado vigente (que sí crea la versión con
--      to_jsonb(new), incluido cover_headline), o
--   2) submit_and_schedule_codex_proposal, que lo fija antes de aprobar y
--      programar (esas transiciones crean las versiones).
-- Así no se generan versiones intermedias ni se altera modified_at por un
-- cambio que no es del contenido del artículo.

create or replace function public.save_editorial_article_with_cover_headline(
  target_article_id uuid,
  expected_lock_version integer,
  next_slug text,
  next_title text,
  next_summary text,
  next_body text,
  next_body_json jsonb,
  next_category_id uuid,
  next_cover_media_id uuid,
  next_content_type text,
  next_source_url text,
  next_source_name text,
  next_source_author text,
  next_credits text,
  next_seo_title text,
  next_seo_description text,
  next_social_brief text,
  next_tag_ids uuid[],
  next_label_ids uuid[],
  next_change_note text,
  next_correction_note text,
  next_cover_headline text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_cover_headline text := nullif(pg_catalog.btrim(coalesce(next_cover_headline, '')), '');
begin
  -- NULL = conservar el titular vigente (clientes que aún no envían el campo).
  -- Cadena vacía = quitarlo. Otro valor = reemplazarlo.
  if next_cover_headline is not null then
    if normalized_cover_headline is not null
      and char_length(normalized_cover_headline) not between 8 and 120 then
      raise exception 'El titular de portada debe tener entre 8 y 120 caracteres.'
        using errcode = '22023';
    end if;

    perform editorial_private.set_article_cover_headline(
      target_article_id,
      expected_lock_version,
      normalized_cover_headline
    );
  end if;

  return public.save_editorial_article_with_correction(
    target_article_id,
    expected_lock_version,
    next_slug,
    next_title,
    next_summary,
    next_body,
    next_body_json,
    next_category_id,
    next_cover_media_id,
    next_content_type,
    next_source_url,
    next_source_name,
    next_source_author,
    next_credits,
    next_seo_title,
    next_seo_description,
    next_social_brief,
    next_tag_ids,
    next_label_ids,
    next_change_note,
    next_correction_note
  );
end;
$$;

revoke all on function public.save_editorial_article_with_cover_headline(
  uuid, integer, text, text, text, text, jsonb, uuid, uuid, text,
  text, text, text, text, text, text, text, uuid[], uuid[], text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.save_editorial_article_with_cover_headline(
  uuid, integer, text, text, text, text, jsonb, uuid, uuid, text,
  text, text, text, text, text, text, text, uuid[], uuid[], text, text, text
) to authenticated;

-- Ajustes acotados sobre las definiciones vigentes; abortar si cambió el contrato.
do $$
declare
  v_def text;
  v_funcion text;
  v_titulo constant text := '''titulo'', version.snapshot ->> ''title'',';
  v_titulo_con_portada constant text :=
    '''titulo'', version.snapshot ->> ''title'', ''tituloPortada'', coalesce(version.snapshot ->> ''cover_headline'', ''''),';
  v_aprobacion constant text :=
    'update public.articles set status=''approved'', approved_at=now(), approved_by=null where id=v_article.id;';
begin
  foreach v_funcion in array array[
    'public.get_public_editorial_article(text)',
    'public.list_public_editorial_articles(integer,integer)',
    'public.list_public_editorial_articles_filtered(integer,integer,text,text[],text,text)',
    'public.list_public_editorial_articles_for_entity(text,text,integer,integer)',
    'public.get_public_editorial_latest_article_with_cover()',
    'public.get_public_editorial_home_feature()'
  ] loop
    v_def := pg_get_functiondef(v_funcion::regprocedure);
    if strpos(v_def, '''tituloPortada''') > 0 then
      continue;
    end if;
    if strpos(v_def, v_titulo) = 0 then
      raise exception 'Revisar contrato público vigente de %.', v_funcion;
    end if;
    execute replace(v_def, v_titulo, v_titulo_con_portada);
  end loop;

  v_def := pg_get_functiondef('public.submit_and_schedule_codex_proposal(jsonb,jsonb,jsonb)'::regprocedure);
  if strpos(v_def, 'cover_headline') = 0 then
    if strpos(v_def, v_aprobacion) = 0 then
      raise exception 'Revisar aprobación automática vigente.';
    end if;
    execute replace(
      v_def,
      v_aprobacion,
      'update public.articles set cover_headline=nullif(pg_catalog.btrim(coalesce(p_input ->> ''coverHeadline'', '''')), '''') where id=v_article.id;'
        || E'\n  ' || v_aprobacion
    );
  end if;
end;
$$;

commit;
