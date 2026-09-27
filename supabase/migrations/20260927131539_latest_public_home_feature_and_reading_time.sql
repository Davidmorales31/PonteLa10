begin;

-- Mantiene una estimación real y compartida con el editor (220 palabras/min).
create or replace function public.editorial_reading_minutes(requested_document jsonb)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select greatest(
    1,
    pg_catalog.ceil(
      coalesce(
        pg_catalog.sum(
          pg_catalog.cardinality(
            pg_catalog.regexp_split_to_array(
              pg_catalog.regexp_replace(text_node.value #>> '{}', E'^\\s+|\\s+$', '', 'g'),
              E'\\s+'
            )
          )
        ),
        0
      )::numeric / 220
    )::integer
  )
  from pg_catalog.jsonb_path_query(requested_document, '$.**.text') as text_node(value)
  where pg_catalog.jsonb_typeof(text_node.value) = 'string'
    and pg_catalog.regexp_replace(text_node.value #>> '{}', E'^\\s+|\\s+$', '', 'g') <> '';
$$;

revoke all on function public.editorial_reading_minutes(jsonb)
  from public, anon, authenticated;

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
    jsonb_agg(item order by item ->> 'publicadoEn' desc),
    '[]'::jsonb
  )
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
      'imagenPath', coalesce(media.path, ''),
      'lecturaMinutos', public.editorial_reading_minutes(version.snapshot -> 'body_json')
    ) as item
    from public.articles as article
    inner join public.article_versions as version
      on version.id = article.published_version_id
    left join public.categories as category
      on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
    left join public.media_files as media
      on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
    left join public.user_profiles as profile
      on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
    where article.status = 'published'
      and article.published_version_id is not null
    order by (version.snapshot ->> 'published_at')::timestamptz desc nulls last, article.id
    limit least(greatest(result_limit, 1), 50)
    offset greatest(result_offset, 0)
  ) as published_items;
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
    'publicadoEn', version.snapshot ->> 'published_at',
    'autorNombre', coalesce(profile.display_name, 'Equipo Pont3la10'),
    'categoria', coalesce(category.name, 'Actualidad'),
    'imagenBucket', media.bucket,
    'imagenPath', media.path,
    'lecturaMinutos', public.editorial_reading_minutes(version.snapshot -> 'body_json')
  )
  from public.articles as article
  inner join public.article_versions as version
    on version.id = article.published_version_id
  inner join public.media_files as media
    on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
  inner join storage.buckets as bucket
    on bucket.id = media.bucket
    and bucket.public is true
  inner join storage.objects as stored_object
    on stored_object.bucket_id = media.bucket
    and stored_object.name = media.path
  left join public.categories as category
    on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
  left join public.user_profiles as profile
    on profile.id = nullif(version.snapshot ->> 'author_id', '')::uuid
  where article.status = 'published'
    and article.published_version_id is not null
    and nullif(pg_catalog.btrim(media.bucket), '') is not null
    and nullif(pg_catalog.btrim(media.path), '') is not null
    and media.mime_type like 'image/%'
  order by (version.snapshot ->> 'published_at')::timestamptz desc nulls last, article.id
  limit 1;
$$;

revoke all on function public.list_public_editorial_articles(integer, integer)
  from public;
revoke all on function public.get_public_editorial_latest_article_with_cover()
  from public, anon, authenticated;

grant execute on function public.list_public_editorial_articles(integer, integer)
  to anon, authenticated;
grant execute on function public.get_public_editorial_latest_article_with_cover()
  to anon, authenticated;

commit;
