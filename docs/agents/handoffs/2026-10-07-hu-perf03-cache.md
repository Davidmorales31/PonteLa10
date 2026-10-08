# Handoff

- **Objetivo de la sesión:** Implementar y desplegar HU-PERF-03: políticas de
  caché CDN seguras por tipo de contenido y estado de partido, sin mezclar
  respuestas públicas con sesiones editoriales.
- **Completado:** Políticas centralizadas aplicadas a páginas SSR, APIs públicas,
  sitemaps y caché de imágenes de partidos. PR #103 quedó en Production como
  `2efea57e2603e5234a3628ee028f57063f2c474e`.
- **Archivos modificados:** `utils/cachePublica.ts`,
  `server/utils/aplicarCachePublica.ts`, `composables/useCachePublica.ts`, APIs
  públicas de artículos/equipos/competiciones/partidos/Liga/sitemaps y páginas
  públicas de artículo/equipo/competición/partido/tabla; `middleware.ts`,
  dependencia de Routing Middleware, pruebas y documentación de estado.
- **Decisiones:** HTML usa `Cache-Control: public, max-age=0, must-revalidate`;
  `CDN-Cache-Control` define TTL: artículo 300s + SWR 600; equipo 120/120;
  competición 60/60; programado 30; en vivo 15; pendiente 10; final,
  cancelado o abandonado 300/300; tabla 30; sitemap 300/300. Como Vercel ya no
  cachea `Vary: Cookie`, Routing Middleware fija antes de la CDN
  `x-pont3la10-cache-variant: publica|privada`, sobrescribiendo valores del
  cliente. Cookies de consentimiento quedan públicas; sesión, Authorization o
  Set-Cookie responden `private, no-store`. No se revela ni registra el token.
  No se modificó Supabase ni se agregaron variables o secretos.
- **Validaciones ejecutadas:** `npm ci`, lint, typecheck, suite completa (94
  archivos/480 pruebas), build local y CI, prueba relacionada (5/5), `git diff
  --check`, Preview final 200 en `/articulos` y `/api/articulos`. Smoke
  Production en ambas rutas: anónimo MISS→HIT; cookie de sesión fixture
  `private, no-store`/MISS; solicitud anónima siguiente HIT. `consent=accepted`
  se mantuvo público/HIT. Revisión de seguridad sin hallazgos P0–P2. El primer
  Preview tuvo un fallo ESM de import sin extensión; se corrigió con `.js` antes
  de integrar. La política concuerda con las [notas de Vercel sobre respuestas
  `Vary: Cookie`](https://vercel.com/changelog/vary-cookie-responses-no-longer-cached).
- **Fallos:** El primer intento local requirió `NUXT_PUBLIC_SITE_URL`, definido
  solo en el proceso de validación (`https://www.pont3la10.com`). El primer
  Preview devolvió `MIDDLEWARE_INVOCATION_FAILED`, corregido antes de Production.
- **Pendientes:** Ninguno para HU-PERF-03. No se requiere acción del usuario.
- **Siguiente acción exacta:** Vigilar `x-vercel-cache` y los TTL configurados;
  reducir los TTL de contenido vivo si el producto requiere mayor frescura.
- **Commit base:** `3ed59b60d2704341626ad9a641cbd4998ec044f6` (merge de PR #102).
- **Commit final:** `2efea57e2603e5234a3628ee028f57063f2c474e` (PR #103).
