-- Publica artículos cuya fecha programada ya llegó. El trabajo permanece
-- dentro de PostgreSQL: no depende del navegador ni del worker de TikTok.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'pont3la10-publicar-programadas',
  '* * * * *',
  $$select public.publish_due_editorial_articles();$$
);
