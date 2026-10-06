# Handoff

- **Objetivo de la sesión:** completar HU-SEO-07: fichas SEO públicas para los
  equipos de Liga BetPlay y Torneo BetPlay.
- **Completado:** PR #66 se integró como `f24d4ac1192bf33ce90e40bd4e0a9c1fb84461d5`;
  la ruta `/equipos/:slug`, endpoint público con validación de
  slug, lectura anónima de filas autorizadas, tabla/fixtures/resultados,
  noticias y sede oficial verificable; enlaces desde Liga y fichas SEO de
  partidos; gate `noindex` para páginas con contenido insuficiente; sitemap
  dinámico de equipos. La ficha/API/XML de Atlético Nacional dio HTTP 200 en
  Production, con canonical, SportsTeam, 5 próximos partidos, 1 noticia e
  inclusión en el sitemap de 35 equipos. El árbol de accesibilidad también
  mostró jerarquía y enlaces identificables. La sede excluye verificaciones
  futuras.
- **Archivos modificados:**
  `components/publico/PlantillaPartidoSeo.vue`, `pages/equipos/[slug].vue`,
  `pages/liga-colombiana.vue`, `server/api/equipos/[slug].get.ts`,
  `server/api/liga-colombiana.get.ts`, `server/routes/sitemap-teams.xml.get.ts`,
  `server/utils/equiposLigaPublicos.ts`, `server/utils/partidosSeoPublicos.ts`,
  `utils/indexabilidadPublica.ts`, pruebas unitarias, este handoff y
  `docs/agents/ESTADO_ACTUAL.md`.
- **Decisiones:** no se agregó migración; se usa el cliente anónimo y se
  verifica explícitamente `is_public` más `publication_rights_confirmed`. El
  slug procede de `team_key` saneado; nombres alternos de fixtures se resuelven
  con aliases probados. No se publican identificadores de proveedores. Se
  conserva `noindex` cuando no hay tabla, escudo permitido, fecha verificada y
  al menos tres fixtures públicos relacionados. No hubo llamadas nuevas a
  proveedores deportivos ni escrituras en Supabase Production.
- **Validaciones ejecutadas:** `npm.cmd run lint` (0); `npm.cmd run test:unit`
  (74 archivos, 362 pruebas, 0); `npm.cmd run typecheck` (0); `npm.cmd run build`
  en `C:\PONTE LA 10\.codex-build-hu-seo07-final-20261006\source` (0);
  `git diff --check` (0). Revisión independiente de seguridad sin bloqueos.
  CI de PR #66 (lint, test, typecheck, build) y Vercel Preview build pasaron.
- **Fallos:** el build en el worktree activo había encontrado un bloqueo Windows
  `EPERM` al reemplazar `libvips`; el build repetido en snapshot aislado terminó
  correctamente. Permanece aviso deprecado upstream `DEP0155` de `@vue/shared`.
  El preview de PR #66 carecía de la configuración pública de Supabase y dio
  503; la ficha de Production respondió y quedó inspeccionada. El smoke detectó
  que el estado raw `finished` no entraba en Resultados recientes. La corrección
  está en curso en `codex/seo07-normalize-fixture-states`.
- **Pendientes:** desplegar la normalización de estados de proveedor y confirmar
  resultados recientes en Production.
- **Siguiente acción exacta:** cerrar pruebas/build de la reparación, crear PR
  contra `main`, esperar checks, integrar y confirmar el 3–1 de Nacional–Junior.
- **Commit base:** `bac0f9d` (`feat(seo): split public sitemaps by page type`).
- **Commit final:** `f24d4ac1192bf33ce90e40bd4e0a9c1fb84461d5` (merge de PR #66).
