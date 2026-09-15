# Handoff actual — Fase 0

- **Objetivo:** completar la integración local y opcional de Memento.
- **Completado:** Python/pipx verificados; núcleo y capa multiagente instalados;
  memoria inicializada fuera de Git; Codex registrado como `pont3la10-codex`.
- **Archivos modificados:** instrucciones y documentación de agentes; HU-ED-07 excluida.
- **Decisiones:** instalación aislada con pipx, solo local, sin sync ni servidor remoto.
- **Validaciones ejecutadas:** doctor, status, remember, decide, recall,
  deep-recall, dashboard HTTP 200 limitado a `127.0.0.1` y `git diff --check`.
- **Fallos:** `memento-multiagent` no existe en PyPI; CP-1252 rompe la salida
  Unicode del núcleo. Se usaron commits oficiales y `PYTHONUTF8=1`.
- **Pendientes:** publicar el cambio documental y confirmar CI remoto.
- **Siguiente acción exacta:** abrir un PR separado para la integración de Memento.
- **Commit base:** `cd5044e`
- **Commit final:** se registrará al cerrar la Fase 0.
