-- HU-GRO-03: keep the Colombian-football category exact while allowing
-- cross-category Selección Colombia stories only when editorially tagged.
-- CREATE OR REPLACE retains the existing owner and EXECUTE grants.
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
set search_path to ''
as $function$
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
      (version.snapshot ->> 'published_at')::timestamptz as publication_date,
      pg_catalog.jsonb_build_object(
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
              where (
                filter_category_slug = 'futbol-colombiano'
                and public.normalize_public_article_filter_text(category_term.value) = 'seleccion colombia'
                and exists (
                  select 1
                  from public.editorial_tags as selection_topic
                  inner join public.article_tags as article_topic
                    on article_topic.tag_id = selection_topic.id
                  where selection_topic.slug = 'seleccion-colombia'
                    and selection_topic.is_active
                    and article_topic.article_id = article.id
                )
              )
              or (
                (
                  filter_category_slug is distinct from 'futbol-colombiano'
                  or public.normalize_public_article_filter_text(category_term.value) <> 'seleccion colombia'
                )
                and pg_catalog.strpos(
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
          )
          and (
            filter_topic_slug is null
            or exists (
              select 1
              from public.editorial_tags as topic
              inner join public.article_tags as article_topic
                on article_topic.tag_id = topic.id
              where topic.slug = filter_topic_slug
                and topic.is_active
                and article_topic.article_id = article.id
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
$function$;
