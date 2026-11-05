# Handoff

- **Objetivo de la sesión:** agregar Especiales al explorador de categorías de Inicio y mostrar Todas las noticias con carga progresiva.
- **Completado:** enlace Especiales en la lista de categorías; feed paginado con tarjetas secundarias, carga por IntersectionObserver, deduplicación, estado de carga y reintento ante error.
- **Archivos modificados:** data/sitioPublico.ts, pages/index.vue. Se actualizaron docs/agents/ESTADO_ACTUAL.md y este handoff.
- **Decisiones:** reutilizar la API pública `/api/articulos` con `paginado`, `limite=20` y `desplazamiento`; conservar el estilo y componentes ya usados por la portada.
- **Validaciones ejecutadas:** `npx eslint pages/index.vue data/sitioPublico.ts` (pasa); `git diff --check` (pasa); `npm.cmd run build` (pasa).
- **Fallos:** `npm.cmd run typecheck` falla en `fabrica-landings` y `tests` con errores preexistentes no relacionados. Build conserva advertencias sobre sprites editoriales no resueltos.
- **Pendientes:** no se ejecut? la suite de pruebas unitarias ni QA visual responsive. El diff de `pages/index.vue` incluye cambios preexistentes del espacio de trabajo; deben conservarse.
- **Siguiente acción exacta:** verificar Inicio en navegador en escritorio y móvil; probar que el sentinel cargue páginas consecutivas y que el fin/error quede accesible.
- **Commit base:** consultar `git rev-parse HEAD` (no hubo commit).
- **Commit final:** sin commit.
