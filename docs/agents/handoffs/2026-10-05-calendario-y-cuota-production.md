# Handoff

- **Objetivo de la sesión:** integrar el límite de peticiones, el calendario
  colombiano y las dos páginas SEO por fixture en Production; mantener activo
  el worker de fútbol local sin tocar la cola editorial; evitar perder URLs
  históricas cuando existan revancha o fixtures repetidos.
- **Completado:** PR #57 quedó integrado en `main` (`9066d53`) y Vercel marcó
  `dpl_FEKYqQPWRRpe9hyCTWi2riMAqVuK` como `READY` para Production. Las
  migraciones de presupuesto y calendario se aplicaron en Supabase Production.
  El worker local completó la carga colombiana de 2026-10-05 con 11 llamadas de
  Goal API, 1.100 fixtures recibidos y 748 insertados/actualizados; la tabla
  quedó con 756 filas (400 Liga A, 265 Torneo B, 91 Copa Colombia). A las
  12:05 UTC, `/api/liga-colombiana` devolvió 80 encuentros desde DB.
- **Trabajo en esta continuación:** una consulta SEO de Production confirmó
  cruces repetidos hasta tres veces por temporada. La solución conserva el
  slug base para el fixture más antiguo, usa competencia/temporada para las
  revanchas, añade una clave compacta estable si hay más colisiones y resuelve
  los slugs largos emitidos por la versión anterior. Las páginas 301 canonizan
  aliases a la URL estable. Este cambio está validado localmente; aún falta PR,
  preview, merge y verificación de Production.
- **Archivos del seguimiento:** `utils/partidosSeo.ts`,
  `server/utils/partidosSeoPublicos.ts`, `pages/donde-ver/[slug].vue`,
  `pages/como-quedo/[slug].vue`, `tests/unit/partidosSeo.test.ts`,
  `tests/unit/partidosSeoPublicosCache.test.ts`,
  `docs/HU_FUT_10_SCHEDULER_ADAPTATIVO_Y_CUOTAS.md`,
  `docs/agents/ESTADO_ACTUAL.md` y este handoff.
- **Decisiones:** worker de fútbol ejecutado desde el PC y separado de la
  cola editorial; sin Vercel Cron. La cuota diaria 2026-10-04 llegó a 950/950
  Goal API y 35 API-Football; el 2026-10-05 a las 11:55 UTC registraba
  46/900 Goal API (incluidas 11 peticiones de calendario) y 1/80
  API-Football. No afirmar recuperación sostenida hasta observar más días.
  Se reutiliza el GIF ambiental autorizado y los posters PNG; todavía no existe
  un MP4 personalizado de 6–10 s por fixture. El mockup LOC/VIS no es un partido
  real. No se afirma tener derechos para retransmitir partidos y la publicación
  de noticias sigue requiriendo aprobación humana.
- **Validaciones ejecutadas en el seguimiento:** `npm.cmd ci`; lint; pruebas
  focalizadas (3 archivos / 7 pruebas); suite completa (60 archivos / 299
  pruebas); typecheck; build de Production y `git diff --check` pasan. Build
  conserva el aviso upstream `DEP0155` de `@vue/shared`. `npm ci` informó 24
  advisories y `npm audit --omit=dev` 22 (3 moderados, 18 altos, 1 crítico); no
  se actualizaron dependencias ajenas al arreglo SEO. pgTAP no se pudo ejecutar
  localmente por falta de Docker y Supabase CLI; se comprobaron en Production
  límites, funciones, ACL, RLS y rechazos por argumentos nulos.
- **Fallos:** el primer test de Nuxt no tenía `NUXT_PUBLIC_SITE_URL` y abortó
  antes de ejecutar pruebas; todas las validaciones posteriores se ejecutaron
  con `https://www.pont3la10.com` en el entorno temporal del proceso, sin editar
  `.env`.
- **Pendientes:** crear PR del cambio de slugs y revisar CI/preview; luego
  integrar y comprobar redirección de una URL larga histórica, URL canónica de
  una revancha, sitemap y las dos páginas del fixture en Production. La
  automatización local no sobrevive un reinicio del PC porque no hay tarea de
  Windows registrada. Observar el límite durante varias jornadas y evaluar por
  separado el MP4 por fixture y los advisories de dependencias.
- **Siguiente acción exacta:** revisar `git diff --check`, commitear únicamente
  los ocho archivos de este seguimiento, subir la rama
  `codex/stable-match-seo-slugs`, abrir PR y, si CI/preview pasan, integrarlo a
  `main` y verificar Production.
- **Commit base:** `9066d53ed5626b33d2b92c94b6d5ccc5819fbe9e` (PR #57 Production).
- **Commit final:** pendiente.
