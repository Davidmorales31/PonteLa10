# Handoff: sitios Colombia/México, fase 3 (2026-11-19)

Plan: `docs/PLAN_LIGA_MX.md`. Rama `feat/sitio-contenido-por-sitio`.

## Base de datos (YA aplicada en Supabase pont3la10)
`20261119140000_lecturas_publicas_por_sitio.sql`: las 6 funciones públicas de artículos
(`get_public_editorial_article`, `..._home_feature`, `..._latest_article_with_cover`,
`list_public_editorial_articles`, `..._filtered`, `..._for_entity`) reciben
`requested_site text default 'co'`. Se parchearon desde su definición vigente con anclas
exactas; permisos idénticos (anon/authenticated, service_role en home_feature) y siguen
`security definer` con `search_path` vacío. Una llamada sin el parámetro devuelve lo de siempre.
Antes de aplicar se probó en producción dentro de una transacción que se revirtió: mover un
artículo a `mx` lo hizo salir de `co`, aparecer en `mx` y ser inaccesible por slug en `co`.

## Código
- `sitioDeSolicitud(evento)`: `?sitio=` válido > host. Necesario porque la portada puede llamar
  a una API en otro origen (`NUXT_PUBLIC_API_ORIGIN`) y perder el host; `pages/index.vue`
  añade `?sitio=` solo en ese caso. API públicas de artículos, destacada, entidad, autores
  y feed pasan el sitio. Verificado: `mx.localhost` devuelve 0 artículos, Colombia 25.
- Panel: selector "Sitio que administras" (cookie `pont3la10_sitio_panel`; sin cookie, el
  sitio del dominio). Lista de contenidos, revisión, resumen, bandeja de redes y temas se
  filtran por sitio; los borradores y temas nuevos se crean en el sitio elegido.
  Categorías, etiquetas internas, medios y usuarios son comunes.

## Pendiente / límites
- Verificación manual del panel con inicio de sesión y MFA: NO hecha (solo build, tipos y
  pruebas). Probar el selector, crear un borrador en México y comprobar que no aparece en Colombia.
- Sitemaps de artículos, news-sitemap, hubs, grafo SEO, competiciones y equipos siguen con
  `co` por defecto; se pasan a `sitioDeSolicitud` al lanzar México (fases 4 y 8). El feed de
  México sigue bloqueado por `sitioNoLanzado`.
- `editorial_home_feature` es una sola fila: la "noticia del día" de México necesita su propio slot.
- Las funciones privadas de Codex/redes (RPC de propuestas) escriben `co` por defecto; la
  corrida de México (fase 6) debe declarar su sitio.
- `list_public_editorial_article_links` (autenticadas) no se filtró.
- Categorías compartidas: las secciones propias de México (`futbol-mexicano`) se crean en la fase 4.

## Validaciones
lint, 897 pruebas, typecheck y build pasan. SQL: ensayo con rollback en producción.
`ESTADO_ACTUAL.md` no se tocó (cambios sin commitear de otro agente).
