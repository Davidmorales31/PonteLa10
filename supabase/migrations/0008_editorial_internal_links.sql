begin;

create or replace function public.resolve_public_editorial_links(
  requested_ids uuid[]
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(item order by position),
    '[]'::jsonb
  )
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
    inner join public.article_versions as version
      on version.id = article.published_version_id
    left join public.categories as category
      on category.id = nullif(version.snapshot ->> 'category_id', '')::uuid
    left join public.media_files as media
      on media.id = nullif(version.snapshot ->> 'cover_media_id', '')::uuid
    where article.id = any(requested_ids[1:8])
      and article.status::text <> 'archived'
  ) as public_links;
$$;

comment on function public.resolve_public_editorial_links(uuid[]) is
  'Resuelve hasta ocho referencias editoriales contra versiones publicadas vigentes.';

revoke all on function public.resolve_public_editorial_links(uuid[]) from public;
grant execute on function public.resolve_public_editorial_links(uuid[])
  to anon, authenticated;

commit;
