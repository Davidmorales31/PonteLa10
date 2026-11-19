begin;

-- Sección y temas propios del sitio de México. Las categorías son comunes a los dos
-- sitios; los temas llevan `site` y la portada de México filtra por ellos.
insert into public.categories (slug, name, description, display_order) values
  ('futbol-mexicano', 'Fútbol mexicano', 'Liga MX, selección y protagonistas del fútbol de México.', 25)
on conflict (slug) do nothing;

insert into public.editorial_tags (slug, name, description, site) values
  ('liga-mx', 'Liga MX', 'Noticias, resultados y análisis de la Liga MX.', 'mx'),
  ('seleccion-mexicana', 'Selección Mexicana', 'Noticias y calendario de la Selección Mexicana.', 'mx'),
  ('mexicanos-en-el-exterior', 'Mexicanos en el exterior', 'Futbolistas mexicanos en Europa, MLS y otras ligas.', 'mx')
on conflict (slug) do nothing;

commit;
