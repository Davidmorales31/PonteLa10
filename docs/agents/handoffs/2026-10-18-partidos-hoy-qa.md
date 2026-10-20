# Handoff

- **Objetivo de la sesión:** Mostrar los partidos de hoy en QA local conectado a Production.
- **Completado:** `/partidos-hoy` ahora consulta el origen público de Production durante SSR cuando `NUXT_PUBLIC_API_ORIGIN` está configurado. La capa local `.qa-runtime` proxifica `/api` al endpoint `/api` de Production para navegador y worker. QA en `localhost:3333` devolvió HTTP 200 y cinco partidos en SSR. El worker completó sincronizaciones de `fixtures` y `resultados_liga`.
- **Archivos modificados:** `nuxt.config.ts`, `pages/partidos-hoy.vue`, `docs/agents/ESTADO_ACTUAL.md`, este handoff. Configuración local ignorada: `.env` y `.qa-runtime/nuxt.config.ts`.
- **Decisiones:** Mantener el origen remoto en configuración local; consumirlo directamente solo durante SSR. Los refrescos del navegador y las solicitudes del worker usan la ruta local `/api`, proxificada a Production. No se desplegó código.
- **Validaciones ejecutadas:** ESLint focal pasó; suite completa pasó (114 archivos, 590 pruebas); build de producción pasó; API local devolvió cinco partidos; HTML SSR devolvió HTTP 200 con los cinco equipos; `git diff --check` pasó después de actualizar el estado.
- **Fallos:** `npm.cmd run lint` incluye artefactos compilados de `fabrica-landings/.next` y reporta errores fuera de Pont3la10. `npm.cmd run typecheck` también recoge fuentes de `fabrica-landings` y falla por alias/tipos de ese proyecto. `tabla_liga` tuvo respuestas HTTP 503 en algunos ciclos del worker. El build informa avisos de sprites públicos no resueltos y `DEP0155` upstream de `@vue/shared`.
- **Pendientes:** Revisar por separado la causa de HTTP 503 en `tabla_liga`; repetir lint/typecheck global cuando `fabrica-landings` no exponga artefactos/fuentes al proyecto principal.
- **Siguiente acción exacta:** Mantener QA y el worker activos; si se vuelve a reportar ausencia de partidos, revisar el resultado del worker y el SSR de `/partidos-hoy` en QA.
- **Commit base:** `1a5b6ee`.
- **Commit final:** sin commit
