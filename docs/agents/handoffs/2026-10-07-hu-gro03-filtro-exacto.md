# Handoff

- **Objetivo de la sesión:** cerrar HU-GRO-03: filtro SSR determinista para la categoría de fútbol colombiano.
- **Completado:** se identificaron falsos positivos por aliases y etiquetas editoriales inconsistentes; el RPC ahora exige categoría primaria exacta para `futbol-colombiano`. Supabase Production registra las dos migraciones. La API pública responde 57 artículos, 57 slugs distintos y ninguna categoría cruzada; la consulta temática de Selección sigue funcionando.
- **Archivos modificados:** `utils/articulosLanding.ts`, `tests/unit/filtrosArticulosPublicos.test.ts`, `tests/unit/landing.test.ts`, migraciones `20261007080659_hu_gro03_category_topic_relevance.sql` y `20261007081622_hu_gro03_exact_category_filter.sql`, `docs/agents/ESTADO_ACTUAL.md`.
- **Decisiones:** los hubs de categoría filtran por categoría primaria; no se usan aliases o tags como sustituto porque se observaron artículos irrelevantes etiquetados como Selección. Los hubs temáticos permanecen independientes. No se editó contenido publicado.
- **Validaciones ejecutadas:** revisor estático de migración sin bloqueos; lint; suite completa (81 archivos, 406 pruebas); typecheck; build; `git diff --check`; consulta directa RPC con 57/57 categorías correctas, `SECURITY DEFINER`, `search_path` vacío y EXECUTE de anon/authenticated conservados; producción: API paginada 49 + 8 con `hayMas` correcto y ruta `/futbol-colombiano` HTTP 200/canonical correcta.
- **Fallos:** una expectativa anterior de alias falló inicialmente; se actualizó y toda la suite pasó. Build muestra aviso upstream de Node `DEP0155` desde `@vue/shared`.
- **Pendientes:** crear/verificar PR, esperar CI y verificar que el código Nuxt quede desplegado por Vercel. La base de datos ya está corregida en Production. HU-GRO-01 y HU-GRO-02 siguen dependiendo de acceso a propiedades GA4/Search Console.
- **Siguiente acción exacta:** abrir PR desde `codex/hugro03-filtrado-semantico` a `main`; si checks pasan, integrar según autorización del usuario; confirmar deployment READY y repetir smoke HTTP.
- **Commit base:** `a1f64d53e6eb647ff97c1c69f4fe910a5864c718`
- **Commit final:** `8589806` (implementación; el handoff se añade en el siguiente commit)
