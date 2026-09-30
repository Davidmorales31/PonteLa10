# Handoff

- **Objetivo de la sesión:** Implementar HU-TR-17 del backlog maestro v4:
  rutas canónicas estables de partidos, independientes del estado del encuentro.
- **Completado:** Nueva tabla de fixtures con UUID interno, slug público e
  inmutabilidad desde la primera publicación. Los mappings de fixture son
  exactos por proveedor y únicos por fixture/proveedor. Se añadieron el lookup
  público por slug y `/api/partidos/:slug`; el detalle SSR comparte la vista con
  la ruta antigua `/resultados/:id`. Tarjetas, respuesta directa, resultados y
  `/partidos-hoy` usan enlace canónico solo ante mapping público resoluble; el
  fallback legado se conserva. Metadata/canonical, breadcrumbs, lista JSON-LD,
  marcador y analítica consentida quedan integrados. Revisión estática de
  seguridad cerrada sin bloqueos después de hacer inmutable el slug y garantizar
  un solo mapping por fixture/proveedor.
- **Archivos modificados:** migración
  `supabase/migrations/20260930083427_hu_tr_17_identidad_partidos_estables.sql`
  y prueba pgTAP `supabase/tests/hu_tr_17_partidos_estables_rls_test.sql`;
  componentes, `pages/partidos-hoy.vue`, `pages/resultados/`, APIs y repositorio
  de resultados; contratos y utilitarios en `types/`, `utils/` y `composables/`;
  pruebas `tests/unit/rutasPartidos.test.ts`,
  `tests/unit/repositorioPartidos.test.ts` y
  `tests/unit/entidadesDeportivas.test.ts`; estado y este handoff.
- **Decisiones:** El slug se crea/persiste explícitamente en la identidad
  interna, nunca se deriva de nombres cambiantes ni de fecha por sí solos.
  `/partidos/:slug` exige lookup exacto de fixture y mapping aprobado; no usa
  `service_role`. Se preservan los IDs externos y `/resultados/:id`. Sin
  configuración pública/mapping, no se ofrece enlace canónico inventado. No se
  aplicó ninguna migración remota ni se sembraron datos deportivos/licenciados.
- **Validaciones ejecutadas:** lint; pruebas relacionadas (10); suite completa
  (36 archivos/198 pruebas); typecheck; build con
  `NUXT_PUBLIC_SITE_URL=http://localhost:3100`; `git diff --check`. En
  `agent-browser`, `/partidos/:slug` y `/resultados/1234` comparten la vista de
  detalle de fallback; ambas pasan axe-core con cero violaciones. Viewport 390 ×
  844: `scrollWidth=390` y `clientWidth=390`, con H1 en el estado de error. Axe
  deja contraste y diferenciación de algunos enlaces del shell como revisión
  manual incompleta. `npm ci` había reportado 15 vulnerabilidades en el árbol
  existente; build conserva el aviso upstream DEP0155 de `@vue/shared`.
- **Fallos:** Un typecheck y lint iniciales se lanzaron sin la variable pública
  de dominio canónico que exige `nuxt.config.ts`; se repitieron con
  `NUXT_PUBLIC_SITE_URL` y pasaron. La inspección Axe inicial halló ausencia de
  H1 solo cuando fallaba la consulta; el estado de error ahora incluye uno y
  Axe pasa sin violaciones. El contraste del shell sigue señalado para revisión
  manual, fuera del alcance de esta HU.
- **Pendientes:** pgTAP (15 aserciones) no se pudo ejecutar porque `npx supabase
  status` no encuentra Docker ni Podman. No se aplicó el SQL a ninguna base.
  No hay configuración Supabase pública ni fixtures/mappings aprobados para
  verificar un partido real o su metadata indexable; el endpoint retorna error
  controlado. Se requiere validar el camino de fixture publicado en Supabase
  Preview cuando exista autorización/datos. PR #44 está abierta contra
  `codex/hu-tr-16-sports-entities`, pendiente de checks, sin aprobación ni
  fusión. HU-TR-16 PR #43 está abierta y mergeable, y su Vercel Preview reporta
  success.
- **Siguiente acción exacta:** Revisar el estado de CI/Vercel de PR #44 sin
  aprobar ni fusionar. Luego comenzar HU-TR-18 en un worktree aislado distinto
  o recién liberado, releyendo `AGENTS.md`, estado, mapa, memoria y validaciones
  antes de editar.
- **Commit base:** `2b3c005e9329872163744c49202765a906d1669e`.
- **Commit final:** `25b604af2c0fb9cfc8e9141b8cd2fd3d53a0fdd6`.
