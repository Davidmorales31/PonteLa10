# Handoff: sitios Colombia/México, fase 8A (mapas y feed listos para el lanzamiento), 2026-11-19

Rama `feat/sitio-mx-sitemaps`. Plan: `docs/PLAN_LIGA_MX.md`.

- `server/utils/sitemapsMexico.ts` + `server/middleware/sitioNoLanzado.ts`: con México SIN lanzar todo sigue igual
  (noindex, mapas vacíos, sin feed). Cuando `indexable` pase a `true`, el middleware genera los mapas de México:
  páginas, artículos (solo de México), hubs (solo con noticias suficientes) e índice, con el dominio `mx.pont3la10.com`;
  los mapas de datos de Colombia (partidos, equipos, competiciones, jornadas, jugadores) salen vacíos.
- `news-sitemap.xml` y `feed.xml` filtran por el sitio de la petición y usan su dominio.
- Verificado en local: Colombia igual (índice de 9 mapas, 547 artículos, feed 200); México sigue vacío/404 porque no está lanzado.
  Las rutas del México lanzado se probaron solo con pruebas unitarias (no hay forma de activarlo sin cambiar `indexable`).

## Lista para lanzar México (la decide el responsable)
1. Derechos de publicación de datos de Liga MX (`NUXT_FUTBOL_DERECHOS_PUBLICACION_CONFIRMADOS`) y `PONT3LA10_FUTBOL_MX_ENABLED=true`.
2. `habilitada: true` en `config/automatizacionEditorialMx.json` y reactivar la tarea `pont3la10-mx-corrida-futbol-mexicano`;
   crear la automatización de Codex de México (12:30 y 20:30).
3. DNS `mx` → mismo destino, alta del dominio en Vercel (`mx.pont3la10.com`), Search Console (propiedad de dominio o de prefijo) y GA4.
4. Poner `indexable: true` y `sites.is_active = true` para `mx`; revisar textos es-CO de `/partidos-hoy`, `/resultados`, `/articulos`.
5. Probar una publicación en redes de punta a punta con un artículo de México.
