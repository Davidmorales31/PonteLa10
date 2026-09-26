# Mapa de contexto para agentes

Leer primero `AGENTS.md` y `docs/agents/ESTADO_ACTUAL.md`. Después usar esta
tabla y abrir solo el dominio afectado; no cargar todas las HU ni toda la documentación.

| Dominio | Documentos | Rutas de código |
| --- | --- | --- |
| Autenticación | `docs/HU_LOGIN_EDITORIAL.md`, `docs/CONFIGURACION_CMS_EDITORIAL.md` | `middleware/`, composables de autenticación/MFA, `utils/auth/`, autorización de servidor, plugins Supabase y pruebas relacionadas |
| Editorial | HU de fundación, modelo, borradores y publicación | `pages/admin/contenidos/`, revisión/taxonomías, `components/admin/`, `utils/editorial/`, APIs, repositorio y tipos editoriales |
| Media | `docs/HU_BIBLIOTECA_MULTIMEDIA.md` | `pages/admin/media/`, componentes, APIs, repositorio/procesador, `utils/media/`, tipos y pruebas |
| Ingestas | `docs/HU_INGESTA_ASISTIDA.md`, `docs/PLAN_HU_ED_07.md`, contratos, diseño SQL y preflight de HU-ED-07 | `pages/admin/ingestas/`, `server/api/admin/ingestas/`, repositorio, `server/utils/tiktok/`, `workers/transcribir_tiktok.py`, `utils/editorial/ingestas.ts`, evidencia, tipos, migraciones `0010`–`0013` y pruebas |
| Automatización editorial Codex | `docs/PLAN_HU_ED_10_CONTENIDO_PROGRAMADO.md`, `docs/HU_ED_10_TENDENCIAS_CODEX.md`–`HU_ED_13_OPERACION_AUTOMATIZADA.md` | `server/api/internal/codex/`, `server/api/admin/operacion.get.ts`, `server/utils/codexEditorialPrivado.ts`, `server/utils/saludOperativaEditorial.ts`, `pages/admin/operacion.vue`, `scripts/codex-editorial-*.mjs`, `workers/latido_worker.mjs`, `.agents/skills/pont3la10-*`, migraciones `20260926*` y pruebas `codexEditorial*` |
| SEO | `docs/HU_ENLACES_INTERNOS_DISTRIBUCION.md` | composable/utilitario SEO, middleware privado, robots, sitemap, páginas públicas y pruebas |
| Resultados deportivos | `docs/ARQUITECTURA_INICIAL.md` | `pages/resultados/`, componentes, utilitarios, seguimiento, APIs/clientes y pruebas deportivas |
| Supabase | guías de configuración Supabase/CMS y `VALIDACIONES.md` | `supabase/migrations/`, plugins, cliente de servidor y tipos Supabase |
| UI pública | `docs/ARQUITECTURA_INICIAL.md`, HU de enlaces/distribución | home, artículos, especiales, componentes públicos, layout, CSS y `data/sitioPublico.ts` |
| CI y herramientas | contribución, estándares, `VALIDACIONES.md`, Memento y gobernanza GitHub | `package.json`, lockfile, configuraciones TS/Vitest/ESLint, `.github/`, `.gitignore` |
