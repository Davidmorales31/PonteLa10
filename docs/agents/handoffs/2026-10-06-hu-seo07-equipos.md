# Handoff

- **Objetivo de la sesión:** completar HU-SEO-07: fichas SEO públicas para los
  equipos de Liga BetPlay y Torneo BetPlay.
- **Completado:** ruta `/equipos/:slug`, endpoint público con validación de
  slug, lectura anónima de filas autorizadas, tabla/fixtures/resultados,
  noticias y sede oficial verificable; enlaces desde Liga y fichas SEO de
  partidos; gate `noindex` para páginas con contenido insuficiente; sitemap
  dinámico de equipos. Se bloquea la sede con fecha de verificación futura.
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
- **Fallos:** el build en el worktree activo había encontrado un bloqueo Windows
  `EPERM` al reemplazar `libvips`; el build repetido en snapshot aislado terminó
  correctamente. Permanece aviso deprecado upstream `DEP0155` de `@vue/shared`.
  El Vercel CLI no está instalado ni hay `.vercel` ligado en este checkout; la
  publicación se hará mediante la integración Git conectada a Vercel, sin
  vincular el proyecto por conjetura.
- **Pendientes:** crear PR solo de esta HU, revisar CI y preview, validar
  renderizado/responsive/accesibilidad en el preview y, si queda verde, integrar
  para desplegar. Después comprobar HTTP/SEO/sitemap de equipos en Production.
- **Siguiente acción exacta:** revisar el diff final, crear commit HU-SEO-07,
  hacer push de `codex/seo07-equipos` y abrir PR contra `main`. No publicar ni
  alterar otros PR del backlog.
- **Commit base:** `bac0f9d` (`feat(seo): split public sitemaps by page type`).
- **Commit final:** sin commit.
