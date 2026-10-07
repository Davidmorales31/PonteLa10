-- HU-ED-23: article_versions es un registro histórico. Las modificaciones
-- de su snapshot se hacen desde funciones editoriales autorizadas.
revoke update on table public.article_versions from public, anon, authenticated;
