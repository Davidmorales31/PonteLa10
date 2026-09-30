begin;

-- La primera versión publicada conserva la fecha de publicación aunque se
-- publique una revisión posterior del artículo.
create index if not exists idx_article_versions_first_published
  on public.article_versions (article_id, version_number)
  include (created_at)
  where status = 'published';

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
    'publicadoEn', coalesce(primera_publicacion.created_at, article.published_at),
    'modificadoEn', version.created_at,
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
  inner join public.article_versions as version
    on version.id = article.published_version_id
    and version.status = 'published'
  left join lateral (
    select primera_version.created_at
    from public.article_versions as primera_version
    where primera_version.article_id = article.id
      and primera_version.status = 'published'
    order by primera_version.version_number asc
    limit 1
  ) as primera_publicacion on true
  left join public.categories as category on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
  left join public.media_files as media on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
  left join public.user_profiles as profile on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
  where version.snapshot ->> 'slug' = requested_slug
    and article.status = 'published'
    and article.published_version_id is not null
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
  select coalesce(
    jsonb_agg(
      published_item.item
      order by published_item.publication_date desc nulls last, published_item.article_id
    ),
    '[]'::jsonb
  )
  from (
    select
      article.id as article_id,
      coalesce(primera_publicacion.created_at, article.published_at) as publication_date,
      jsonb_build_object(
        'id', article.id,
        'slug', version.snapshot ->> 'slug',
        'titulo', version.snapshot ->> 'title',
        'resumen', version.snapshot ->> 'summary',
        'tipo', version.snapshot ->> 'content_type',
        'publicadoEn', coalesce(primera_publicacion.created_at, article.published_at),
        'modificadoEn', version.created_at,
        'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
        'categoria', coalesce(category.name, 'Actualidad'),
        'imagenBucket', coalesce(media.bucket, ''),
        'imagenPath', coalesce(media.path, ''),
        'lecturaMinutos', public.editorial_reading_minutes(version.snapshot -> 'body_json')
      ) as item
    from public.articles as article
    inner join public.article_versions as version
      on version.id = article.published_version_id
      and version.status = 'published'
    left join lateral (
      select primera_version.created_at
      from public.article_versions as primera_version
      where primera_version.article_id = article.id
        and primera_version.status = 'published'
      order by primera_version.version_number asc
      limit 1
    ) as primera_publicacion on true
    left join public.categories as category on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
    left join public.media_files as media on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
    left join public.user_profiles as profile on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
    where article.status = 'published'
      and article.published_version_id is not null
    order by publication_date desc nulls last, article.id
    limit least(greatest(result_limit, 1), 50)
    offset greatest(result_offset, 0)
  ) as published_item;
$$;

create or replace function public.get_public_editorial_latest_article_with_cover()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', article.id,
    'slug', version.snapshot ->> 'slug',
    'titulo', version.snapshot ->> 'title',
    'resumen', version.snapshot ->> 'summary',
    'tipo', version.snapshot ->> 'content_type',
    'publicadoEn', coalesce(primera_publicacion.created_at, article.published_at),
    'modificadoEn', version.created_at,
    'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
    'categoria', coalesce(category.name, 'Actualidad'),
    'imagenBucket', media.bucket,
    'imagenPath', media.path,
    'lecturaMinutos', public.editorial_reading_minutes(version.snapshot -> 'body_json')
  )
  from public.articles as article
  inner join public.article_versions as version
    on version.id = article.published_version_id
    and version.status = 'published'
  inner join public.media_files as media on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
  inner join storage.buckets as bucket on bucket.id = media.bucket and bucket.public is true
  inner join storage.objects as stored_object
    on stored_object.bucket_id = media.bucket
    and stored_object.name = media.path
  left join lateral (
    select primera_version.created_at
    from public.article_versions as primera_version
    where primera_version.article_id = article.id
      and primera_version.status = 'published'
    order by primera_version.version_number asc
    limit 1
  ) as primera_publicacion on true
  left join public.categories as category on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
  left join public.user_profiles as profile on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
  where article.status = 'published'
    and article.published_version_id is not null
    and nullif(pg_catalog.btrim(media.bucket), '') is not null
    and nullif(pg_catalog.btrim(media.path), '') is not null
    and media.mime_type like 'image/%'
  order by coalesce(primera_publicacion.created_at, article.published_at) desc nulls last, article.id
  limit 1;
$$;

create or replace function public.list_public_editorial_articles_filtered(
  result_limit integer,
  result_offset integer,
  filter_category_slug text,
  filter_category_terms text[],
  filter_topic_slug text,
  filter_search text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    pg_catalog.jsonb_agg(
      published_item.item
      order by published_item.publication_date desc nulls last, published_item.article_id
    ),
    '[]'::jsonb
  )
  from (
    select
      article.id as article_id,
      coalesce(primera_publicacion.created_at, article.published_at) as publication_date,
      pg_catalog.jsonb_build_object(
        'id', article.id,
        'slug', version.snapshot ->> 'slug',
        'titulo', version.snapshot ->> 'title',
        'resumen', version.snapshot ->> 'summary',
        'tipo', version.snapshot ->> 'content_type',
        'publicadoEn', coalesce(primera_publicacion.created_at, article.published_at),
        'modificadoEn', version.created_at,
        'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
        'categoria', coalesce(category.name, 'Actualidad'),
        'imagenBucket', coalesce(media.bucket, ''),
        'imagenPath', coalesce(media.path, ''),
        'lecturaMinutos', public.editorial_reading_minutes(version.snapshot -> 'body_json')
      ) as item
    from public.articles as article
    inner join public.article_versions as version
      on version.id = article.published_version_id
      and version.status = 'published'
    left join lateral (
      select primera_version.created_at
      from public.article_versions as primera_version
      where primera_version.article_id = article.id
        and primera_version.status = 'published'
      order by primera_version.version_number asc
      limit 1
    ) as primera_publicacion on true
    left join public.categories as category
      on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
    left join public.media_files as media
      on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
    left join public.user_profiles as profile
      on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
    where article.status = 'published'
      and article.published_version_id is not null
      and case
        when filter_category_slug is not null
          and pg_catalog.char_length(filter_category_slug) > 80 then false
        when filter_category_slug is not null
          and filter_category_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then false
        when filter_topic_slug is not null
          and pg_catalog.char_length(filter_topic_slug) > 80 then false
        when filter_topic_slug is not null
          and filter_topic_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then false
        when filter_search is not null and pg_catalog.char_length(filter_search) > 120
          then false
        when pg_catalog.cardinality(coalesce(filter_category_terms, '{}'::text[])) > 4
          then false
        when filter_category_slug is null
          and pg_catalog.cardinality(coalesce(filter_category_terms, '{}'::text[])) > 0
          then false
        when exists (
          select 1
          from pg_catalog.unnest(coalesce(filter_category_terms, '{}'::text[])) as category_term(value)
          where category_term.value is null
        ) then false
        when exists (
          select 1
          from pg_catalog.unnest(coalesce(filter_category_terms, '{}'::text[])) as category_term(value)
          where pg_catalog.char_length(category_term.value) > 120
        ) then false
        when exists (
          select 1
          from pg_catalog.unnest(coalesce(filter_category_terms, '{}'::text[])) as category_term(value)
          where pg_catalog.btrim(category_term.value) = ''
        ) then false
        else
          (
            filter_category_slug is null
            or category.slug = filter_category_slug
            or exists (
              select 1
              from pg_catalog.unnest(coalesce(filter_category_terms, '{}'::text[])) as category_term(value)
              where pg_catalog.strpos(
                public.normalize_public_article_filter_text(
                  pg_catalog.concat_ws(
                    ' ',
                    version.snapshot ->> 'title',
                    version.snapshot ->> 'summary',
                    category.name
                  )
                ),
                public.normalize_public_article_filter_text(category_term.value)
              ) > 0
            )
          )
          and (
            filter_topic_slug is null
            or exists (
              select 1
              from public.editorial_tags as topic
              where topic.slug = filter_topic_slug
                and topic.is_active
                and coalesce(version.snapshot -> 'tagIds', '[]'::jsonb)
                  @> pg_catalog.jsonb_build_array(topic.id::text)
            )
          )
          and (
            filter_search is null
            or pg_catalog.strpos(
              public.normalize_public_article_filter_text(
                pg_catalog.concat_ws(
                  ' ',
                  version.snapshot ->> 'title',
                  version.snapshot ->> 'summary',
                  category.name
                )
              ),
              public.normalize_public_article_filter_text(filter_search)
            ) > 0
          )
      end
    order by publication_date desc nulls last, article.id
    limit least(greatest(coalesce(result_limit, 20), 1), 50)
    offset least(greatest(coalesce(result_offset, 0), 0), 100_000)
  ) as published_item;
$$;

revoke all on function public.get_public_editorial_article(text) from public;
revoke all on function public.list_public_editorial_articles(integer, integer) from public;
revoke all on function public.get_public_editorial_latest_article_with_cover()
  from public, anon, authenticated;
revoke all on function public.list_public_editorial_articles_filtered(
  integer, integer, text, text[], text, text
) from public, anon, authenticated;

grant execute on function public.get_public_editorial_article(text)
  to anon, authenticated;
grant execute on function public.list_public_editorial_articles(integer, integer)
  to anon, authenticated;
grant execute on function public.get_public_editorial_latest_article_with_cover()
  to anon, authenticated;
grant execute on function public.list_public_editorial_articles_filtered(
  integer, integer, text, text[], text, text
) to anon, authenticated;

commit;
