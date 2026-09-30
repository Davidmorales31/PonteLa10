# Handoff

- **Objetivo de la sesión:** implementar HU-TR-10 del backlog maestro v4:
  incorporar hubs públicos como páginas permanentes independientes de las
  categorías, con publicación controlada e indexación selectiva.
- **Completado:** migración `public_hubs` con tipos `topic`, `competition`,
  `player_collection`, `technology` y `gaming`; módulos tipados/validados y
  editor administrativo mínimo. El acceso público resuelve exclusivamente
  hubs publicados y oculta borradores; las acciones editoriales requieren
  permisos centralizados, auditoría y MFA. SSR genera metadatos, canonical,
  breadcrumbs y JSON-LD; el sitemap filtra por indexabilidad y artículos
  disponibles. Eventos `hub_view` y `hub_module_click` respetan consentimiento.
  No se sembraron hubs ni se modificó su estado editorial.
- **Archivos modificados:** migración `supabase/migrations/20260930060344_hu_tr_10_hubs_publicos.sql`;
  `types/editorial.ts`, `types/contenidoEditorial.ts`,
  `utils/editorial/permisos.ts`, `utils/editorial/hubs.ts`,
  `server/utils/repositorioHubsPublicos.ts`, `server/api/hubs/[slug].get.ts`,
  `server/api/admin/hubs/`, `components/editorial/RenderizadorHubPublico.vue`,
  `pages/[...slug].vue`, `pages/admin/hubs.vue`, `layouts/admin.vue`,
  `server/routes/sitemap.xml.get.ts`, `composables/useAnaliticaPublica.ts`,
  `assets/css/landing.css`, `assets/css/admin.css`,
  `tests/unit/hubsPublicos.test.ts`, `tests/unit/seguridadEditorial.test.ts`,
  `docs/agents/ESTADO_ACTUAL.md` y este handoff.
- **Decisiones:** el hub no sustituye categorías. La publicación exige copy
  suficiente y feed con artículos públicos disponibles; sin contenido no hay
  indexación ni URL pública. Se conserva contenido de módulos limitado a
  texto, enlaces internos validados y feed de artículos. La migración se creó
  mediante `supabase migration new`; las funciones de trigger son
  `SECURITY INVOKER`, con grants explícitos y privilegios por columna para no
  exponer ni aceptar metadatos de actor desde el cliente. No se aplicó la
  migración a una base.
- **Validaciones ejecutadas:** `npm.cmd ci`; `npm.cmd run lint`;
  `npm.cmd run test:unit -- tests/unit/hubsPublicos.test.ts` (4 pruebas);
  `npm.cmd run test:unit` (32 archivos/181 pruebas);
  `npm.cmd run typecheck`; `npm.cmd run build`; `git diff --check`.
  Nuxt requiere `NUXT_PUBLIC_SITE_URL=https://www.pont3la10.com`.
  HTTP local verificó fallback 404 para un hub no disponible y compatibilidad
  del listado/filtros `/articulos`; sin variables Supabase no se pudieron
  verificar un hub publicado, sitemap con datos, RLS/ACL en base real ni
  respuesta visual responsive. Revisión independiente de seguridad y
  migración: sin hallazgos bloqueantes.
- **Fallos:** la primera repetición de lint/tests sin URL canónica falló en la
  configuración Nuxt; las ejecuciones con la URL documentada pasaron. Al
  renombrar la migración generada por CLI a su timestamp real se actualizaron
  las referencias de las pruebas; suite final completa verde. `npm ci` informó
  15 vulnerabilidades en dependencias existentes (6 moderadas, 8 altas,
  1 crítica); no se modificaron dependencias.
- **Pendientes:** crear la PR apilada contra la rama HU-TR-09;
  revisar CI/Preview cuando estén disponibles. Aplicar/verificar la migración,
  hacer pruebas RLS con roles reales y validar visualmente datos publicados
  solo con configuración/entorno autorizados. No aprobar ni fusionar la PR,
  desplegar producción ni publicar hubs.
- **Siguiente acción exacta:** abrir PR de `codex/hu-tr-10-public-hubs` hacia
  `codex/hu-tr-09-traceable-pagination`; después continuar HU-TR-11 en otro
  worktree basado en esta rama, releyendo instrucciones, estado, mapa y Memento.
- **Commit base:** `9eca004` (`codex/hu-tr-09-traceable-pagination`).
- **Commit final:** pendiente de crear.
