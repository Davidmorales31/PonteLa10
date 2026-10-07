# Handoff

- **Objetivo de la sesión:** implementar páginas permanentes para jornadas
  completas de Liga BetPlay y Torneo BetPlay, sin duplicar `/partidos-hoy` y con
  indexación/sitemap condicionados a calidad de datos.
- **Completado:** página `/jornadas/:competencia/:temporada/jornada-N`, API
  pública, enlace desde la ficha de competición y sitemap propio enlazado desde
  `/sitemap-index.xml`. Canonical, `CollectionPage`, `ItemList` y `BreadcrumbList`
  usan rutas estables. El contenido reutiliza tarjetas de partido y un slot
  publicitario existente con la condición de consentimiento vigente.
- **Archivos modificados:** `server/utils/competicionesPublicas.ts`,
  `server/api/jornadas/[slug]/[temporada]/[jornada].get.ts`,
  `server/routes/sitemap-rounds.xml.get.ts`,
  `server/utils/sitemapsPublicos.ts`, `components/publico/PaginaJornadaCompeticion.vue`,
  `pages/jornadas/[slug]/[temporada]/[jornada].vue`,
  `components/publico/PaginaCompeticionPublica.vue`,
  `tests/unit/competicionesPublicas.test.ts`,
  `tests/unit/sitemapPublico.test.ts` y `docs/agents/ESTADO_ACTUAL.md`.
- **Decisiones:** la clasificación pública verificada es el padrón canónico; se
  exige cobertura exacta (20 clubes Liga A, 16 Torneo B), un fixture completo sin
  duplicados, fuente HTTPS DIMAYOR y `verificadoEn` no futura. El feed de Liga A
  2026-II conserva en algunos fixtures el alias `La Equidad`; la página de
  designaciones de DIMAYOR del 15-sep identifica ese juego como Internacional de
  Bogotá vs. Atlético Nacional. Se normaliza solo para esa competencia/temporada.
  En las fichas y tarjetas de jornada el alias se resuelve con nombre, escudo y
  slug del padrón oficial; las filas originales y temporadas históricas no
  cambian. La Jornada 13 del calendario actual sigue fuera del índice por tener
  11 juegos.
  Sin padrón público, la ficha de jornada propaga 503 y el sitemap responde 503
  no-cache; una consulta exitosa sin jornadas elegibles devuelve sitemap vacío.
  No se escribieron datos ni se usaron API-Football/Goal API.
- **Validaciones ejecutadas:** 12 pruebas del utilitario pasaron; suite completa
  79 archivos/397 pruebas pasó; `npm.cmd run lint` pasó excluyendo el directorio
  temporal ajeno `.codex-validation-hu-seo11-20261006/`; `npm.cmd run typecheck`,
  `npm.cmd run build` y `git diff --check` pasaron. El build muestra un aviso
  upstream `DEP0155` de `@vue/shared`. El Preview inicial del PR #76 (commit
  `671ca3c`) se abrió autenticado; SSR y tema oscuro visibles. Se detectaron y
  corrigieron localmente el nombre/escudo faltante del alias y el rótulo del
  contador. El PR debe recibir este ajuste y repetir CI/Preview. Vercel MCP
  denegó el bypass automatizado (403); no se modificó Deployment Protection ni
  se copiaron credenciales.
- **Fallos:** `NUXT_PUBLIC_SITE_URL=https://www.pont3la10.com` es necesario al
  ejecutar pruebas, typecheck y build en este worktree. No se copiaron claves de
  Supabase a Preview. No se aplicaron cambios de esquema.
- **Entrega Production:** PR #76 abierto; CI y Preview pasaron para el commit
  anterior, no para los ajustes locales aún sin commit. Producción pendiente.
- **Pendientes:** validar SSR de Liga A 2026-II y Torneo B 2026-II; esperar 404
  para Jornada 13 y params inválidos; revisar canonical, JSON-LD, sitemap y tema
  móvil/oscuro; confirmar deployment Ready y smoke de Production.
- **Siguiente acción exacta:** commitear solo los ajustes de identidad/etiqueta y
  documentación, sin incluir el directorio temporal; actualizar la rama de PR
  #76, esperar el CI/Preview nuevo y verificar en navegador autenticado. Luego
  integrar y confirmar Production antes de HU-SEO-14.
- **Commit base:** `163bf80a115e125184143947328f0fc412560c42`.
- **Commit final:** pendiente.
