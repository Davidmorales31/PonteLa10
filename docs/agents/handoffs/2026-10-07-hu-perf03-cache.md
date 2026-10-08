# Handoff

- **Objetivo de la sesión:** Implementar HU-PERF-03: políticas de caché CDN
  seguras y diferenciadas para páginas y endpoints públicos, con TTL corto para
  partidos en vivo y aislamiento de sesiones editoriales.
- **Completado:** Política centralizada por tipo de dato; aplicada a páginas SSR,
  APIs públicas y sitemaps. Partidos cambian de TTL según estado. La caché de
  imágenes incluye estado del partido. Sesiones editoriales, Authorization o
  Set-Cookie se excluyen de caché compartida. PR #101 quedó en Production como
  `64005429dbd7a0a400db52872bec2e096b2def6b`.
- **Archivos modificados:** `utils/cachePublica.ts`,
  `server/utils/aplicarCachePublica.ts`, `composables/useCachePublica.ts`, APIs
  públicas de artículos/equipos/competiciones/partidos/Liga/sitemaps y páginas
  públicas de artículo/equipo/competición/partido/tabla; pruebas unitarias.
- **Decisiones:** HTML usa `Cache-Control: public, max-age=0, must-revalidate`;
  `CDN-Cache-Control` define TTL por tipo. La versión inicial agregó
  `Vary: Cookie, Authorization` a toda respuesta; Production mostró MISS
  persistente. La corrección actual omite esos nombres de `Vary` en respuestas
  públicas y solo los mantiene en variantes `private, no-store`, porque Vercel
  no almacena respuestas cuyo `Vary` incluye Cookie. TTL CDN: artículo 300s + SWR 600; equipo
  120/120; competición 60/60; programado 30; en vivo 15; pendiente 10; final,
  cancelado o abandonado 300/300; tabla 30; sitemap 300/300. No se modificó
  Supabase ni se agregaron variables o secretos.
- **Validaciones ejecutadas:** lint, typecheck, suite completa (94 archivos,
  479 pruebas), relacionadas (18/18 y luego 4/4), build de producción,
  `git diff --check`; smoke local de artículos, Liga Colombiana, sitemap y
  cookies de consentimiento/sesión. Build conserva aviso upstream `[DEP0155]`
  de `@vue/shared`. Revisión de seguridad inicial y del ajuste Vary cerradas sin
  hallazgos P0–P2. La corrección sigue las [notas de Vercel sobre respuestas
  `Vary: Cookie`](https://vercel.com/changelog/vary-cookie-responses-no-longer-cached).
- **Fallos:** El primer intento local requirió `NUXT_PUBLIC_SITE_URL`, que se
  configuró solo en el proceso de validación (`https://www.pont3la10.com`).
  Supabase local no tenía variables públicas, por lo que no se verificó una
  respuesta de API con datos vivos. No hubo fallos en validaciones finales.
- **Pendientes:** Integrar la corrección de `Vary` y verificar HIT en Production.
- **Siguiente acción exacta:** Crear PR de corrección desde `main`; tras checks
  verdes, integrar y hacer dos solicitudes anónimas consecutivas a un endpoint
  público para confirmar HIT; confirmar que cookie de sesión sigue `no-store`.
- **Commit base:** `64005429dbd7a0a400db52872bec2e096b2def6b` (PR #101).
- **Commit final:** pendiente de la corrección CDN.
