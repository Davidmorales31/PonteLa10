# Handoff: sitios Colombia/México, fase 2 (2026-11-19)

Plan: `docs/PLAN_LIGA_MX.md`. Rama `feat/sitio-mx-marca`. La migración de la fase 1
(`sites` y `site`) ya está aplicada en Supabase (proyecto pont3la10) y verificada:
549 artículos, 101 etiquetas y 3 módulos quedaron en `co`.

## Qué cambia
- Cabecera, menú móvil, pie, categorías de la portada, `lang`, `og:locale`, `og:site_name`,
  JSON-LD y canonical salen del sitio activo (`useSitio()`). México muestra la insignia
  "México" y solo enlaza páginas que ya funcionan (Liga MX, Selección Mexicana y Mexicanos
  en el exterior se añaden en las fases 4 y 5).
- México NO está lanzado (`indexable: false` en `utils/sitio.ts`): `server/middleware/sitioNoLanzado.ts`
  pone `X-Robots-Tag: noindex, nofollow`, devuelve sitemaps vacíos y 404 en el feed;
  `robots.txt` bloquea todo y no se cachea; `useSeoPont3la10` fuerza noindex.
- Colombia no cambia (verificado en navegador y por host).

## Pendiente conocido
- Los textos de las páginas (título de portada, descripciones, "es-CO" en formateos) y los datos
  siguen siendo de Colombia hasta las fases 3 a 5. Muchas páginas leen `siteUrl` directo
  para canonical/JSON-LD: se revisan al lanzar.
- Al lanzar: poner `indexable: true`, activar `sites.is_active` de `mx`, DNS, Search Console.

## Validaciones
lint, 894 pruebas, typecheck y build pasan. Manual: robots, sitemaps, feed y portada con
`mx.localhost` y `?sitio=mx` (escritorio y 375 px). `ESTADO_ACTUAL.md` no se tocó (cambios
sin commitear de otro agente).
