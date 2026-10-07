begin;

alter table public.editorial_article_search_briefs
  add column template_id text;

alter table public.editorial_article_search_briefs
  add column template_fields_complete text[] not null default '{}'::text[];

alter table public.editorial_article_search_briefs
  add constraint editorial_article_search_briefs_template_id_check
  check (
    template_id is null or template_id in (
      'previaPartido', 'dondeVer', 'resultadoPartido', 'explicacionTabla',
      'proximaFecha', 'convocatoria', 'perfilFutbolista',
      'analisisPospartido', 'noticiaRapida', 'piezaEvergreen'
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
  campos_permitidos text[];
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

  if tg_op = 'UPDATE'
    and article_status = 'review'
    and old.template_id is not null
    and new.template_id is null then
    raise exception using
      errcode = '23514',
      message = 'No se puede retirar una plantilla mientras el artículo está en revisión.';
  end if;

  if tg_op = 'UPDATE' then
    if new.template_id is distinct from old.template_id then
      new.template_fields_complete := '{}'::text[];
    end if;
  end if;

  new.template_fields_complete := coalesce(new.template_fields_complete, '{}'::text[]);
  campos_permitidos := case
    when new.template_id is null then '{}'::text[]
    when new.template_id = 'previaPartido' then array['Equipos y competición', 'Fecha, hora y zona horaria', 'Sede confirmada y contexto reciente']
    when new.template_id = 'dondeVer' then array['Partido, fecha, hora y zona horaria', 'Canal o plataforma confirmados', 'Disponibilidad territorial, si está publicada']
    when new.template_id = 'resultadoPartido' then array['Marcador final y estado', 'Autores/minutos solo si están confirmados', 'Competición y fecha']
    when new.template_id = 'explicacionTabla' then array['Fecha y hora de corte de la tabla', 'Puntos y diferencia relevantes', 'Regla de desempate o clasificación citada']
    when new.template_id = 'proximaFecha' then array['Partidos confirmados', 'Fecha, hora y zona horaria', 'Sede solo cuando esté publicada']
    when new.template_id = 'convocatoria' then array['Lista oficial y fecha del anuncio', 'Novedades verificadas', 'Partidos o fechas relacionados']
    when new.template_id = 'perfilFutbolista' then array['Identidad y club actual con fecha', 'Trayectoria con temporadas verificables', 'Estadísticas con fuente y corte']
    when new.template_id = 'analisisPospartido' then array['Marcador, alineaciones y contexto confirmados', 'Datos con proveedor y corte', 'Separación explícita entre dato e interpretación']
    when new.template_id = 'noticiaRapida' then array['Hecho nuevo y fecha', 'Protagonistas identificados', 'Datos aún no confirmados señalados como tales']
    when new.template_id = 'piezaEvergreen' then array['Respuesta directa', 'Alcance y excepciones', 'Fecha de revisión y fuente vigente']
    else null
  end;

  if campos_permitidos is null then
    raise exception using errcode = '23514', message = 'La plantilla editorial seleccionada no es válida.';
  end if;
  if pg_catalog.array_position(new.template_fields_complete, null) is not null
    or pg_catalog.cardinality(new.template_fields_complete) <> (
      select pg_catalog.count(distinct campo)::integer
      from pg_catalog.unnest(new.template_fields_complete) as verificacion(campo)
    )
    or not (new.template_fields_complete <@ campos_permitidos) then
    raise exception using
      errcode = '23514',
      message = 'La verificación debe contener campos únicos y permitidos por la plantilla seleccionada.';
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
      or new.template_id is distinct from old.template_id
      or new.template_fields_complete is distinct from old.template_fields_complete
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
        'plantillaId', new.template_id,
        'camposPlantillaCompletos', new.template_fields_complete,
        'tieneConsultaObjetivo', new.target_query is not null,
        'tieneCluster', new.parent_cluster is not null
      )
    );
  end if;
  return new;
end;
$$;

create or replace function public.validate_editorial_article_template_quality()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  plantilla_id text;
  secciones_requeridas text[];
  campos_requeridos text[];
  campos_verificados text[];
  seccion text;
  posicion_encabezado bigint;
  posicion_siguiente_encabezado bigint;
  hay_desarrollo boolean;
begin
  if tg_op <> 'UPDATE'
    or old.status is not distinct from new.status
    or new.status::text not in ('review', 'approved', 'scheduled', 'published') then
    return new;
  end if;

  select brief.template_id, brief.template_fields_complete
    into plantilla_id, campos_verificados
  from public.editorial_article_search_briefs as brief
  where brief.article_id = new.id;
  if not found or plantilla_id is null then
    if coalesce(pg_catalog.cardinality(campos_verificados), 0) > 0 then
      raise exception using errcode = '23514', message = 'No se pueden verificar campos sin una plantilla seleccionada.';
    end if;
    return new;
  end if;

  if coalesce(pg_catalog.btrim(new.source_name), '') = ''
    or coalesce(new.source_url, '') !~* '^https://([[:alnum:]][[:alnum:].-]*|\[[[:xdigit:]:]+\])(:[0-9]{1,5})?([/?#][^[:space:]]*)?$' then
    raise exception using
      errcode = '23514',
      message = 'La plantilla requiere una fuente principal con nombre y URL HTTPS.';
  end if;

  if pg_catalog.jsonb_typeof(new.body_json -> 'content') is distinct from 'array' then
    raise exception using
      errcode = '23514',
      message = 'El cuerpo debe conservar la estructura editable de la plantilla.';
  end if;

  secciones_requeridas := case plantilla_id
    when 'previaPartido' then array['Ficha del partido', 'Claves del encuentro', 'Qué está en juego']
    when 'dondeVer' then array['Horario y zona', 'Dónde verlo', 'Cómo confirmar la transmisión']
    when 'resultadoPartido' then array['Marcador final', 'Momentos clave', 'Qué cambia con el resultado']
    when 'explicacionTabla' then array['Tabla actual y puntos', 'Criterios de clasificación', 'Qué escenarios siguen abiertos']
    when 'proximaFecha' then array['Calendario confirmado', 'Partidos destacados', 'Cómo seguir la fecha']
    when 'convocatoria' then array['Lista confirmada', 'Novedades de la convocatoria', 'Fechas y próximos compromisos']
    when 'perfilFutbolista' then array['Trayectoria verificada', 'Situación actual', 'Datos y contexto']
    when 'analisisPospartido' then array['Contexto del partido', 'Claves tácticas', 'Lecturas y límites del análisis']
    when 'noticiaRapida' then array['Hecho confirmado', 'Contexto esencial', 'Qué falta por confirmar']
    when 'piezaEvergreen' then array['Respuesta directa', 'Contexto y reglas', 'Fuentes y vigencia']
    else null
  end;

  campos_requeridos := case plantilla_id
    when 'previaPartido' then array['Equipos y competición', 'Fecha, hora y zona horaria', 'Sede confirmada y contexto reciente']
    when 'dondeVer' then array['Partido, fecha, hora y zona horaria', 'Canal o plataforma confirmados', 'Disponibilidad territorial, si está publicada']
    when 'resultadoPartido' then array['Marcador final y estado', 'Autores/minutos solo si están confirmados', 'Competición y fecha']
    when 'explicacionTabla' then array['Fecha y hora de corte de la tabla', 'Puntos y diferencia relevantes', 'Regla de desempate o clasificación citada']
    when 'proximaFecha' then array['Partidos confirmados', 'Fecha, hora y zona horaria', 'Sede solo cuando esté publicada']
    when 'convocatoria' then array['Lista oficial y fecha del anuncio', 'Novedades verificadas', 'Partidos o fechas relacionados']
    when 'perfilFutbolista' then array['Identidad y club actual con fecha', 'Trayectoria con temporadas verificables', 'Estadísticas con fuente y corte']
    when 'analisisPospartido' then array['Marcador, alineaciones y contexto confirmados', 'Datos con proveedor y corte', 'Separación explícita entre dato e interpretación']
    when 'noticiaRapida' then array['Hecho nuevo y fecha', 'Protagonistas identificados', 'Datos aún no confirmados señalados como tales']
    when 'piezaEvergreen' then array['Respuesta directa', 'Alcance y excepciones', 'Fecha de revisión y fuente vigente']
    else null
  end;

  if secciones_requeridas is null or campos_requeridos is null then
    raise exception using errcode = '23514', message = 'La plantilla editorial seleccionada no es válida.';
  end if;

  if not (campos_requeridos <@ coalesce(campos_verificados, '{}'::text[])) then
    raise exception using
      errcode = '23514',
      message = 'Confirma todos los campos mínimos de la plantilla antes de continuar.';
  end if;

  foreach seccion in array secciones_requeridas loop
    select min(bloque.ordinality)
      into posicion_encabezado
    from pg_catalog.jsonb_array_elements(new.body_json -> 'content')
      with ordinality as bloque(value, ordinality)
    where bloque.value ->> 'type' = 'heading'
      and bloque.value -> 'attrs' ->> 'level' = '2'
      and pg_catalog.lower(pg_catalog.btrim(coalesce((
        select pg_catalog.string_agg(coalesce(texto.value ->> 'text', ''), '')
        from pg_catalog.jsonb_array_elements(coalesce(bloque.value -> 'content', '[]'::jsonb)) as texto(value)
      ), ''))) = pg_catalog.lower(seccion);

    if posicion_encabezado is null then
      raise exception using
        errcode = '23514',
        message = pg_catalog.format('La plantilla requiere la sección «%s».', seccion);
    end if;

    select min(bloque.ordinality)
      into posicion_siguiente_encabezado
    from pg_catalog.jsonb_array_elements(new.body_json -> 'content')
      with ordinality as bloque(value, ordinality)
    where bloque.ordinality > posicion_encabezado
      and bloque.value ->> 'type' = 'heading'
      and bloque.value -> 'attrs' ->> 'level' = '2';

    select exists (
      select 1
      from pg_catalog.jsonb_array_elements(new.body_json -> 'content')
        with ordinality as bloque(value, ordinality)
      where bloque.value ->> 'type' = 'paragraph'
        and bloque.ordinality > posicion_encabezado
        and (posicion_siguiente_encabezado is null
          or bloque.ordinality < posicion_siguiente_encabezado)
        and pg_catalog.char_length(pg_catalog.btrim(coalesce((
          select pg_catalog.string_agg(coalesce(texto.value ->> 'text', ''), '')
          from pg_catalog.jsonb_array_elements(coalesce(bloque.value -> 'content', '[]'::jsonb)) as texto(value)
        ), ''))) >= 30
    ) into hay_desarrollo;

    if not hay_desarrollo then
      raise exception using
        errcode = '23514',
        message = pg_catalog.format('Desarrolla la sección «%s» antes de continuar.', seccion);
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists articles_template_quality_gate on public.articles;
create trigger articles_template_quality_gate
  before update of status on public.articles
  for each row execute function public.validate_editorial_article_template_quality();

revoke all on function public.audit_editorial_article_search_brief()
  from public, anon, authenticated, service_role;
revoke all on function public.validate_editorial_article_template_quality()
  from public, anon, authenticated, service_role;

comment on column public.editorial_article_search_briefs.template_id is
  'Plantilla editorial privada; las reglas de calidad se comprueban al avanzar el flujo.';
comment on column public.editorial_article_search_briefs.template_fields_complete is
  'Campos mínimos confirmados por la persona editora; se reinician al cambiar la plantilla y son obligatorios al avanzar el flujo.';

commit;
