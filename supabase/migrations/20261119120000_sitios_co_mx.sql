begin;

-- Sitios que sirve la misma aplicación (Colombia y México). Todo el contenido que ya
-- existe queda en 'co' por el valor predeterminado; esta migración no cambia lo visible.
-- Las demás tablas (fútbol, redes, corridas) reciben `site` en migraciones posteriores,
-- junto con el código que las lee, para no dejar columnas sin uso.

create table if not exists public.sites (
  id text primary key check (id ~ '^[a-z]{2}$'),
  name text not null,
  country text not null,
  domain text not null unique,
  timezone text not null,
  locale text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.sites (id, name, country, domain, timezone, locale, is_active) values
  ('co', 'Pont3la10', 'Colombia', 'www.pont3la10.com', 'America/Bogota', 'es-CO', true),
  ('mx', 'Pont3la10 México', 'México', 'mx.pont3la10.com', 'America/Mexico_City', 'es-MX', false)
on conflict (id) do nothing;

-- Catálogo de solo lectura: los clientes no escriben; el servidor privado lo administra.
alter table public.sites enable row level security;

drop policy if exists "sites public read" on public.sites;
create policy "sites public read"
  on public.sites for select
  to anon, authenticated
  using (is_active);

revoke all on public.sites from anon, authenticated;
grant select on public.sites to anon, authenticated;

-- `site` por defecto 'co': agregar una columna con valor constante no reescribe la tabla.
alter table public.articles
  add column if not exists site text not null default 'co' references public.sites(id);
alter table public.editorial_tags
  add column if not exists site text not null default 'co' references public.sites(id);
alter table public.special_modules
  add column if not exists site text not null default 'co' references public.sites(id);

create index if not exists articles_site_idx on public.articles (site);
create index if not exists editorial_tags_site_idx on public.editorial_tags (site);
create index if not exists special_modules_site_idx on public.special_modules (site);

commit;
