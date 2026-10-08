# Handoff

- **Objetivo de la sesión:** Implementar las páginas públicas de transparencia editorial HU-TRUST-02, HU-TRUST-03 y HU-TRUST-04.
- **Completado:** Rutas `/quienes-somos`, `/politica-editorial` y `/correcciones`; metadatos SEO/canonical y datos estructurados; enlaces en pie público y sitemap; contenido coherente con los procesos y datos de contacto ya publicados.
- **Archivos modificados:** `pages/quienes-somos.vue`, `pages/politica-editorial.vue`, `pages/correcciones.vue`, `data/sitioPublico.ts`, `server/routes/sitemap-pages.xml.get.ts`, `tests/unit/sitemapPublico.test.ts`, `docs/agents/ESTADO_ACTUAL.md`.
- **Decisiones:** Se reutilizan los estilos de páginas legales para mantener identidad visual y soporte de tema. No se agregan biografías, credenciales, cifras ni plazos no verificados. Los perfiles de autor necesitan exposición pública voluntaria y revisión de seguridad; las nuevas páginas no requieren Supabase ni migración.
- **Validaciones ejecutadas:** lint, typecheck, suite completa (94 archivos/482 pruebas), build Vercel, prueba focalizada del sitemap (12/12), `git diff --check`, smoke local HTTP 200 y revisión manual desktop claro + móvil 390 px en ambos temas, sin overflow horizontal.
- **Fallos:** El primer `lint` no recibió `NUXT_PUBLIC_SITE_URL` y Nuxt rechazó cargar configuración; se repitió con la variable temporal en el proceso, sin modificar `.env`. Build completado con aviso upstream `[DEP0155]` de `@vue/shared`. La consola local muestra mismatches de hidratación globales en privacidad/tema (AvisoAnalitica y CabeceraPrincipal), ajenos a estas páginas; quedan registrados como seguimiento, no corregidos aquí.
- **Pendientes:** Abrir PR, esperar CI y Vercel Preview; confirmar las tres rutas y el sitemap en Preview; después integrar y comprobar Production. Continuar con HU-TRUST-01 bajo opt-in de perfiles públicos, luego HU-TRUST-05 y OPS-02/03/04 según prioridad. No afirmar la creatividad publicitaria ni métricas de GA4 sin evidencia.
- **Siguiente acción exacta:** Ejecutar `git diff --check`, crear commit y abrir PR desde `codex/hu-trust-policies` hacia `main`; inspeccionar Preview antes de integrar.
- **Commit base:** `2c696bf4d59aef6947a28ee647a8368ad0678fec` (PR #105 en `main`).
- **Commit final:** sin commit.
