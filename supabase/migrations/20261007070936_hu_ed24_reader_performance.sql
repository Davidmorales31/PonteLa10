begin;

-- Las relaciones confirmadas ya fueron validadas al guardarse por el RPC
-- editorial. No se recalcula la disponibilidad de la entidad en cada lectura:
-- para algunas competiciones ese resolver deduplica fixtures y supera el
-- timeout de PostgREST. Se mantienen los filtros de slug y contenido público.
create or replace function public.list_public_editorial_articles_for_entity(
  requested_entity_type text,
  requested_entity_slug text,
  result_limit integer default 6,
  result_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if requested_entity_type is null
    or requested_entity_type not in ('article', 'match', 'team', 'player', 'competition')
    or requested_entity_slug is null
    or requested_entity_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or pg_catalog.char_length(requested_entity_slug) > 120 then
    return '[]'::jsonb;
  end if;

  return (
    select coalesce(
      pg_catalog.jsonb_agg(
        seleccion.item
        order by seleccion.publicado_en desc nulls last, seleccion.prioridad_relacion
      ),
      '[]'::jsonb
    )
    from (
      select pg_catalog.jsonb_build_object(
        'id', articulo.id,
        'slug', version.snapshot ->> 'slug',
        'titulo', version.snapshot ->> 'title',
        'resumen', version.snapshot ->> 'summary',
        'tipo', version.snapshot ->> 'content_type',
        'publicadoEn', version.snapshot ->> 'published_at',
        'autorNombre', coalesce(perfil.display_name, 'Equipo Pont3la10'),
        'categoria', coalesce(categoria.name, 'Actualidad'),
        'imagenBucket', coalesce(medio.bucket, ''),
        'imagenPath', coalesce(medio.path, ''),
        'lecturaMinutos', public.editorial_reading_minutes(version.snapshot -> 'body_json')
      ) as item,
      (version.snapshot ->> 'published_at')::timestamptz as publicado_en,
      case relacion.relation_type
        when 'about' then 0
        when 'mentions' then 1
        else 2
      end as prioridad_relacion
      from public.editorial_article_entity_relations as relacion
      inner join public.articles as articulo
        on articulo.id = relacion.article_id
      inner join public.article_versions as version
        on version.id = articulo.published_version_id
      left join public.categories as categoria
        on categoria.id = nullif(version.snapshot ->> 'category_id', '')::uuid
      left join public.media_files as medio
        on medio.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
      left join public.user_profiles as perfil
        on perfil.id = nullif(version.snapshot ->> 'author_id', '')::uuid
      where relacion.entity_type = requested_entity_type
        and relacion.entity_slug = requested_entity_slug
        and relacion.status = 'confirmed'
        and articulo.status = 'published'
        and articulo.published_version_id is not null
      order by publicado_en desc nulls last, prioridad_relacion
      limit least(greatest(coalesce(result_limit, 6), 1), 50)
      offset least(greatest(coalesce(result_offset, 0), 0), 5000)
    ) as seleccion
  );
end;
$$;

revoke all on function public.list_public_editorial_articles_for_entity(text, text, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.list_public_editorial_articles_for_entity(text, text, integer, integer)
  to anon, authenticated;

comment on function public.list_public_editorial_articles_for_entity(text, text, integer, integer) is
  'Devuelve resúmenes públicos de artículos publicados con relación editorial confirmada; el RPC editorial valida la entidad al guardar el vínculo.';

commit;
