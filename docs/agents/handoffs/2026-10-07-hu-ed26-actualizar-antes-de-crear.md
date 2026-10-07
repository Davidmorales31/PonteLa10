# Handoff — HU-ED-26 actualizar antes de crear

- **Objetivo de la sesión:** hacer visibles en la bandeja de revisión las
  evaluaciones `create/update/merge/expand/discard` de HU-ED-25 para que el
  equipo editorial pueda decidir con URL, entidad, artículos similares y
  razonamiento a la vista.
- **Completado:** endpoint privado GET para la corrida más reciente; proyección
  validada del contrato v2 y compatibilidad de lectura v1; prioridad visual
  para actualizar antes de crear; destino y artículos publicados verificados;
  propuesta de borrador relacionada; candidatas antiguas marcadas pendientes y
  candidatas inválidas contabilizadas. No se ejecuta ninguna acción editorial.
  Se aplica MFA conforme a la política del contexto antes de usar `service_role`.
- **Archivos modificados:** `server/api/admin/oportunidades-editoriales.get.ts`,
  `server/utils/proyectarOportunidadesEditorialesCodex.ts`,
  `server/utils/esquemasCodexEditorial.ts`,
  `server/utils/autorizacionEditorial.ts`, `types/oportunidadesEditoriales.ts`,
  `pages/admin/revision.vue`, `tests/unit/oportunidadesEditorialesCodex.test.ts`,
  `tests/unit/seguridadEditorial.test.ts`,
  `tests/unit/codexEditorialPrivado.test.ts`,
  `supabase/migrations/20261007152635_hu_ed25_scoring_oportunidades_editoriales.sql`
  (rename para igualar el número registrado por Production),
  `docs/agents/ESTADO_ACTUAL.md`, el handoff ED-25 actualizado y este handoff.
- **Decisiones:** la página no modifica, fusiona, descarta, aprueba ni publica
  contenido. Solo enlaces a CMS cuando el artículo objetivo publicado fue
  verificado; una ruta de artículo no verificada se muestra sin link. Los
  candidatos v1 no se reevalúan ni transforman durante la lectura; quedan
  marcados para revisión posterior. El GET no acepta parámetros de entrada y
  no contiene una migración nueva.
- **Validaciones ejecutadas:** pruebas focalizadas 10/10; suite completa 88
  archivos/453 pruebas; lint; typecheck; build; `git diff --check`; revisión
  estática de seguridad sin hallazgos P0–P3 tras resolver el P2 MFA y P3 de
  candidatas inválidas.
- **Fallos:** lint inicial sin `NUXT_PUBLIC_SITE_URL` terminó antes de preparar
  Nuxt; al configurar el dominio canónico pasó. La primera suite completa falló
  por un test que apuntaba al nombre viejo de la migración; se corrigió y la
  repetición completa pasó. El build conserva el aviso upstream `[DEP0155]` de
  `@vue/shared`.
- **Pendientes:** inspección visual autenticada responsive; PR, CI/Preview y
  despliegue Production. La inspección visual requiere sesión editorial, no
  disponible en este turno.
- **Siguiente acción exacta:** revisar diff final, commit en
  `codex/hu-ed26-update-before-create`, abrir PR contra `main`, adjuntarlo a la
  tarea, esperar CI/Vercel Preview y revisión, integrar solo con checks verdes,
  confirmar Vercel Production y probar que el GET rechaza acceso anónimo. No
  ejecutar migraciones ni modificar estados editoriales para este HU.
- **Commit base:** `cb3bcb30f0317a57d9fb6aad9ea563187008e03d`.
- **Commit final:** sin commit.
