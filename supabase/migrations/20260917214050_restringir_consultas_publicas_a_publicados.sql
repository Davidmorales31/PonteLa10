begin;

-- Las RPC expuestas al sitio solo pueden resolver la versión pública vigente.
create or replace function public.get_public_editorial_article(requested_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', article.id,
    'versionId', version.id,
    'slug', version.snapshot ->> 'slug',
    'titulo', version.snapshot ->> 'title',
    'resumen', version.snapshot ->> 'summary',
    'tipo', version.snapshot ->> 'content_type',
    'documento', coalesce(version.snapshot -> 'body_json', '{"type":"doc","content":[]}'::jsonb),
    'seoTitulo', coalesce(version.snapshot ->> 'seo_title', ''),
    'seoDescripcion', coalesce(version.snapshot ->> 'seo_description', ''),
    'textoSocial', coalesce(version.snapshot ->> 'social_brief', ''),
    'publicadoEn', version.snapshot ->> 'published_at',
    'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
    'categoria', case when category.id is null then null else jsonb_build_object('slug', category.slug, 'nombre', category.name) end,
    'portada', case when media.id is null then null else jsonb_build_object(
      'bucket', media.bucket, 'path', media.path, 'textoAlternativo', coalesce(media.alt, ''),
      'pieDeFoto', coalesce(media.caption, ''), 'credito', coalesce(media.credit, ''),
      'ancho', media.width, 'alto', media.height
    ) end,
    'fuente', jsonb_build_object(
      'url', coalesce(version.snapshot ->> 'source_url', ''),
      'nombre', coalesce(version.snapshot ->> 'source_name', ''),
      'autor', coalesce(version.snapshot ->> 'source_author', ''),
      'creditos', coalesce(version.snapshot ->> 'credits', '')
    )
  )
  from public.articles as article
  inner join public.article_versions as version on version.id = article.published_version_id
  left join public.categories as category on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
  left join public.media_files as media on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
  left join public.user_profiles as profile on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
  where version.snapshot ->> 'slug' = requested_slug
    and article.status = 'published'
  limit 1;
$$;

create or replace function public.list_public_editorial_articles(
  result_limit integer default 20,
  result_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by item ->> 'publicadoEn' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', article.id,
      'slug', version.snapshot ->> 'slug',
      'titulo', version.snapshot ->> 'title',
      'resumen', version.snapshot ->> 'summary',
      'tipo', version.snapshot ->> 'content_type',
      'publicadoEn', version.snapshot ->> 'published_at',
      'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
      'categoria', coalesce(category.name, 'Actualidad'),
      'imagenBucket', coalesce(media.bucket, ''),
      'imagenPath', coalesce(media.path, '')
    ) as item
    from public.articles as article
    inner join public.article_versions as version on version.id = article.published_version_id
    left join public.categories as category on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
    left join public.media_files as media on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
    left join public.user_profiles as profile on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
    where article.status = 'published'
    order by (version.snapshot ->> 'published_at')::timestamptz desc
    limit least(greatest(result_limit, 1), 50)
    offset greatest(result_offset, 0)
  ) as published_items;
$$;

create or replace function public.resolve_public_editorial_links(
  requested_ids uuid[]
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by position), '[]'::jsonb)
  from (
    select
      array_position(requested_ids, article.id) as position,
      jsonb_build_object(
        'articuloId', article.id,
        'slug', version.snapshot ->> 'slug',
        'titulo', version.snapshot ->> 'title',
        'resumen', version.snapshot ->> 'summary',
        'categoria', coalesce(category.name, 'Actualidad'),
        'imagenBucket', coalesce(media.bucket, ''),
        'imagenPath', coalesce(media.path, '')
      ) as item
    from public.articles as article
    inner join public.article_versions as version on version.id = article.published_version_id
    left join public.categories as category on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
    left join public.media_files as media on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
    where article.id = any(requested_ids[1:8])
      and article.status = 'published'
  ) as public_links;
$$;

revoke all on function public.get_public_editorial_article(text) from public;
revoke all on function public.list_public_editorial_articles(integer, integer) from public;
revoke all on function public.resolve_public_editorial_links(uuid[]) from public;
grant execute on function public.get_public_editorial_article(text) to anon, authenticated;
grant execute on function public.list_public_editorial_articles(integer, integer) to anon, authenticated;
grant execute on function public.resolve_public_editorial_links(uuid[]) to anon, authenticated;

commit;
