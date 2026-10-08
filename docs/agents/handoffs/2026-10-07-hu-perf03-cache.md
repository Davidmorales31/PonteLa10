# Handoff

- **Objetivo de la sesión:** Implementar HU-PERF-03: políticas de caché CDN
  seguras y diferenciadas para páginas y endpoints públicos, con TTL corto para
  partidos en vivo y aislamiento de sesiones editoriales.
- **Completado:** Política centralizada por tipo de dato; aplicada a páginas SSR,
  APIs públicas y sitemaps. Partidos cambian de TTL según estado. La caché de
  imágenes incluye estado del partido. Sesiones editoriales, Authorization o
  Set-Cookie se excluyen de caché compartida.
- **Archivos modificados:** `utils/cachePublica.ts`,
  `server/utils/aplicarCachePublica.ts`, `composables/useCachePublica.ts`, APIs
  públicas de artículos/equipos/competiciones/partidos/Liga/sitemaps y páginas
  públicas de artículo/equipo/competición/partido/tabla; pruebas unitarias.
- **Decisiones:** HTML usa `Cache-Control: public, max-age=0, must-revalidate`;
  `CDN-Cache-Control` define TTL por tipo. `Vary` conserva valores existentes y
  agrega `Cookie, Authorization`. TTL CDN: artículo 300s + SWR 600; equipo
  120/120; competición 60/60; programado 30; en vivo 15; pendiente 10; final,
  cancelado o abandonado 300/300; tabla 30; sitemap 300/300. No se modificó
  Supabase ni se agregaron variables o secretos.
- **Validaciones ejecutadas:** lint, typecheck, suite completa (94 archivos,
  479 pruebas), relacionadas (18/18), build de producción, `git diff --check`;
  smoke local de artículos, Liga Colombiana, sitemap y cookie de sesión. Build
  conserva aviso upstream `[DEP0155]` de `@vue/shared`. Revisión de seguridad
  cerrada sin hallazgos P0–P2.
- **Fallos:** El primer intento local requirió `NUXT_PUBLIC_SITE_URL`, que se
  configuró solo en el proceso de validación (`https://www.pont3la10.com`).
  Supabase local no tenía variables públicas, por lo que no se verificó una
  respuesta de API con datos vivos. No hubo fallos en validaciones finales.
- **Pendientes:** PR/CI/Preview, integración a `main`, verificar en Production
  los headers CDN/caché y consultar datos de rutas representativas sin sesión.
- **Siguiente acción exacta:** Abrir PR desde `codex/hu-perf03-cache`; esperar
  checks requeridos, integrar si están verdes y ejecutar smoke Production de
  artículos, equipos/competición, partido, tabla y sitemap, verificando el
  aislamiento sin usar credenciales reales.
- **Commit base:** `0de45d0d941ba1c7f2266ff24e8f064b62e9b732` (PR #100).
- **Commit final:** sin commit | pendiente del release.
