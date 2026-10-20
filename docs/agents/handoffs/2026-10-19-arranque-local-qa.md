# Handoff

- **Objetivo:** Evitar la preparación manual del proyecto local y del worker, y
  corregir los partidos vacíos en Inicio durante SSR.
- **Completado:** `npm run dev:qa` carga `.env` si existe, inicia Nuxt en
  `127.0.0.1:3333`, espera por una conexión TCP sin disparar renderizados
  repetidos y luego inicia el worker de fútbol si encuentra su secreto. `Ctrl+C`
  detiene los dos procesos. La orden define el origen público de datos, y Nuxt
  proxifica `/api` en desarrollo para las llamadas del navegador. La portada
  usa el origen público durante SSR en todas sus consultas públicas.
- **Archivos de esta corrección:** `scripts/dev-local.mjs`, `package.json`,
  `nuxt.config.ts`, `pages/index.vue`, este handoff y
  `docs/agents/ESTADO_ACTUAL.md`. Se preservaron los cambios sin commit que ya
  había en `nuxt.config.ts` y `pages/index.vue`; `.env` no se modificó.
- **Riesgo operativo:** El worker llama los endpoints locales firmados y escribe
  en el Supabase configurado en `.env`. Si falta el secreto, el sitio arranca y
  el worker se omite sin imprimir valores de entorno. La configuración QA usa
  datos públicos del origen configurado (por defecto, Production).
- **Validaciones:** ESLint focal y `node --check scripts/dev-local.mjs` pasan;
  `git diff --check` pasa. El smoke local devolvió HTTP 200 en Inicio con la
  lista de partidos presente y sin el estado vacío; `/api/resultados` devolvió
  HTTP 200 con cinco partidos. Nuxt y el worker se iniciaron con el comando nuevo.
  Suite unitaria, typecheck y build no se ejecutaron.
- **Observaciones del worker:** `fixtures`, `resultados_liga` y `calendario`
  completaron; `tabla_liga` devolvió HTTP 503 en ese ciclo.
- **Siguiente acción:** Para el uso diario, ejecutar `npm run dev:qa` desde
  `C:\PONTE LA 10` y detenerlo con `Ctrl+C`.
- **Commit:** sin commit.
