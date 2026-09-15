# Handoff actual — Fase 0

- **Objetivo:** estabilizar gobernanza, contexto, validaciones, CI y memoria opcional.
- **Completado:** contexto único, router, matriz, CI, roadmap, política de memoria
  y diagnóstico GitHub; corrección de Vitest validada sin `.nuxt` previo.
- **Archivos modificados:** documentación, CI y scripts de validación de la Fase 0; HU-ED-07 está excluida.
- **Decisiones:** Memento es opcional; no instalar sin `pipx`; no alterar producto.
- **Validaciones ejecutadas:** `npm ci`, lint, 15 archivos/83 pruebas, typecheck y build en la rama limpia.
- **Fallos:** CI remoto histórico falla en `test`; Memento no está disponible en `PATH`.
- **Pendientes:** instalar/registrar Memento cuando exista `pipx`; ejecutar CI
  remoto y activar el ruleset autorizado solo cuando los cuatro checks estén verdes.
- **Siguiente acción exacta:** publicar el PR de Fase 0, observar `lint`, `test`,
  `typecheck` y `build`, y después aplicar la gobernanza autorizada.
- **Commit base:** `24340c0`
- **Commit final:** se registrará al cerrar la Fase 0.
