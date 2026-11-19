# Handoff: sitios Colombia/México, fase 1 (2026-11-19)

Plan completo: `docs/PLAN_LIGA_MX.md`. Rama `feat/sitio-liga-mx`.

## Qué hay
- `utils/sitio.ts`: ids `co`/`mx`, configuración (zona horaria, locale, origen, hosts) y
  `sitioDesdeHost()`. Lo desconocido cae en `co`.
- `composables/useSitio.ts` (cliente/SSR; `?sitio=mx` solo en desarrollo) y
  `server/utils/sitioDeSolicitud.ts` (solo para elegir contenido público, nunca para autorizar).
- Migración `20261119120000_sitios_co_mx.sql`: tabla `sites` y columna `site` (default `co`)
  en `articles`, `editorial_tags` y `special_modules`. `mx` queda inactivo.
- Pruebas: `tests/unit/sitio.test.ts` y `tests/sql/sitios.integration.mjs` (PGlite).

## No hay cambio visible
Nada lee aún `site` ni el composable. Colombia no cambia.

## Validaciones
lint, 891 pruebas, typecheck y build pasan; SQL PGlite pasa (idempotente, FK, RLS).
No se aplicó la migración a ninguna base remota (requiere autorización).

## Siguiente
Aplicar la migración (con autorización) y seguir con la fase 2: marca, navegación,
textos, zona horaria y sitemaps por host. `docs/agents/ESTADO_ACTUAL.md` no se tocó
porque tiene cambios sin commitear de otro agente.
