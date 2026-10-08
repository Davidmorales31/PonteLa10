# Handoff

- **Objetivo de la sesión:** Implementar HU-PERF-03: políticas de caché CDN
  seguras y diferenciadas para páginas y endpoints públicos, con TTL corto para
  partidos en vivo y aislamiento de sesiones editoriales.
- **Completado:** Política centralizada por tipo de dato; aplicada a páginas SSR,
  APIs públicas y sitemaps. Partidos cambian de TTL según estado. La caché de
  imágenes incluye estado del partido. PR #101 quedó en Production como
  `64005429dbd7a0a400db52872bec2e096b2def6b`; PR #102 quitó Cookie y
  Authorization de `Vary` en respuestas públicas y habilitó HIT anónimo.
- **Archivos modificados:** `utils/cachePublica.ts`,
  `server/utils/aplicarCachePublica.ts`, `composables/useCachePublica.ts`, APIs
  públicas de artículos/equipos/competiciones/partidos/Liga/sitemaps y páginas
  públicas de artículo/equipo/competición/partido/tabla; `middleware.ts`,
  dependencia de Routing Middleware y pruebas unitarias.
- **Decisiones:** HTML usa `Cache-Control: public, max-age=0, must-revalidate`;
  `CDN-Cache-Control` define TTL por tipo. Production mostró MISS persistente
  con `Vary: Cookie`; quitar Cookie/Authorization habilitó HIT anónimo, pero un
  smoke de seguridad posterior detectó que una solicitud con cookie de sesión
  podía recibir un objeto anónimo ya cacheado antes de llegar al servidor. La
  corrección pendiente usa Routing Middleware de Vercel para fijar antes de la
  CDN `x-pont3la10-cache-variant: publica|privada`, sobrescribiendo cualquier
  valor proporcionado por el cliente. `Vary` usa esa dimensión de baja
  cardinalidad; cookies de consentimiento no privatizan, mientras la sesión y
  Authorization siguen `private, no-store`. No se revela ni registra el token.
  TTL CDN: artículo 300s + SWR 600; equipo
  120/120; competición 60/60; programado 30; en vivo 15; pendiente 10; final,
  cancelado o abandonado 300/300; tabla 30; sitemap 300/300. No se modificó
  Supabase ni se agregaron variables o secretos.
- **Validaciones ejecutadas:** `npm ci`, lint, typecheck y suite completa (94
  archivos, 480 pruebas). La prueba unitaria de la variante cubre cookie de
  consentimiento, sesión y Authorization. Build local pasó. El primer Preview
  devolvió `MIDDLEWARE_INVOCATION_FAILED`: el runtime ESM no encontró el import
  extensionless de `utils/cachePublica`; se ajustó la cadena relacionada a
  extensiones `.js`. El nuevo Preview y el smoke siguen pendientes. Revisiones
  de seguridad previas sin
  hallazgos P0–P2. La corrección sigue las [notas de Vercel sobre respuestas
  `Vary: Cookie`](https://vercel.com/changelog/vary-cookie-responses-no-longer-cached).
- **Fallos:** El primer intento local requirió `NUXT_PUBLIC_SITE_URL`, que se
  configuró solo en el proceso de validación (`https://www.pont3la10.com`).
  Supabase local no tenía variables públicas, por lo que no se verificó una
  respuesta de API con datos vivos. Build y smoke de la revisión actual aún
  están pendientes.
- **Pendientes:** Abrir PR con Routing Middleware, comprobar checks/preview,
  integrar y comprobar separación real de variantes en Production.
- **Siguiente acción exacta:** Ejecutar validaciones, subir el fix al PR #103,
  esperar el nuevo Preview y probar: anónimo MISS→HIT, cookie de sesión
  `private, no-store` sin HIT
  cruzado, y anónimo HIT posterior; verificar también cookie de consentimiento.
- **Commit base:** `3ed59b60d2704341626ad9a641cbd4998ec044f6` (merge de PR #102).
- **Commit final:** pendiente de PR y smoke de producción.
