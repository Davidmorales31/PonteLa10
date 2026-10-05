# Handoff

- **Objetivo de la sesión:** unir el estado de Liga/Europa/carteles con el
  diagnóstico del agotamiento de Goal API, limitar el gasto y dejar el worker
  local de fútbol activo sin tocar la cola editorial.
- **Completado:** PR #55 y PR #56 están en Production; el smoke HTTP público de
  `/partidos-hoy`, `/liga-colombiana`, `/colombianos-en-europa`,
  `/donde-ver/deportivo-pasto-vs-fortaleza`,
  `/como-quedo/deportivo-pasto-vs-fortaleza` y `/sitemap.xml` respondió 200.
  Las rutas de imagen OG/horizontal/vertical respondieron PNG 200 después del
  PR #56. Se aplicó la migración `20261005093735_hu_fut_presupuesto_seguro_ventanas`
  en Supabase Production: topes 80 API-Football / 900 Goal API, lease mínimo
  300 s para fixtures y 900 s para clasificaciones. Las dos funciones conservan
  `SECURITY DEFINER`, `search_path` vacío y ejecución sólo por `service_role`.
  El servidor local del build validado está en `127.0.0.1:3001`; un loop
  dedicado a fútbol recibió HTTP 200 y se difirió hasta las 06:00 COT con cero
  llamadas externas. El worker editorial no se inició.
- **Archivos modificados:**
  `supabase/migrations/20261005092319_hu_fut_presupuesto_seguro_ventanas.sql`,
  `supabase/tests/hu_fut_presupuesto_seguro_ventanas_test.sql`,
  `docs/HU_FUT_10_SCHEDULER_ADAPTATIVO_Y_CUOTAS.md`,
  `docs/agents/ESTADO_ACTUAL.md` y este handoff. La migración y la prueba aún
  deben llegar a GitHub mediante PR.
- **Decisiones:** el límite de trabajo deja 10 peticiones libres en
  API-Football y 50 en Goal API respecto de 90/950. El worker se mantuvo en el
  PC, sin Vercel Cron y separado de la cola editorial. No se empezó a poblar
  `colombian_league_fixtures`: faltan en Git tres migraciones ya presentes en
  Supabase Production, y el importador debe respetar identidad/duplicados antes
  de escribir el calendario. El MP4 publicado sigue siendo ambiente genérico,
  no un video 6–10 s personalizado por fixture. La imagen de referencia con
  `LOC`/`VIS` es conceptual, no un partido real. El contenido editorial conserva
  aprobación humana.
- **Validaciones ejecutadas:** `npm.cmd run lint`,
  `npm.cmd run test:unit` (59 archivos / 291 pruebas), `npm.cmd run typecheck`,
  `npm.cmd run build` y `git diff --check` pasan; el build emite la advertencia
  upstream `DEP0155` de `@vue/shared`. Las pruebas SQL verificadas en Production
  confirmaron migration version, límites, `search_path`, atributos de seguridad,
  ACL, RLS y rechazo de cinco combinaciones con argumentos nulos. Smoke público
  de seis rutas respondió HTTP 200. Revisión estática independiente de la
  migración: sin defecto bloqueante.
- **Fallos:** el primer `npm run lint` no tenía `NUXT_PUBLIC_SITE_URL` y falló
  al cargar la configuración; la matriz completa pasó al repetir con el
  canonical `https://www.pont3la10.com`. La primera activación firmada local
  recibió 401 porque el servidor del build necesitaba el alias de runtime
  `NUXT_FOOTBALL_WORKER_API_SECRET`; al arrancarlo con el alias en el proceso,
  el worker obtuvo respuesta correcta y diferida, sin consumo de proveedor.
  `supabase test db`/pgTAP no se pudo correr localmente porque no hay Docker.
- **Pendientes:**
  1. Revisar el diff, commitear sólo los cinco archivos del release y hacer
     push/PR; comprobar CI/preview, integrar a `main` y verificar el build que
     Vercel asigne. La lista de deployments de Vercel MCP respondió 403, por lo
     que se usó smoke HTTP directo del dominio.
  2. Tras las 06:00 COT, revisar el primer ciclo externo del worker y el
     presupuesto diario agregado. No anunciar recuperación de cuota completa
     hasta observar una jornada entera.
  3. Implementar el flujo semanal/diario que alimente
     `colombian_league_fixtures` desde datos estructurados de proveedor con
     atribución oficial DIMAYOR, idempotencia, fallback, actualización de
     cambios de fecha/estado y prioridad Liga A/B + Copa.
  4. Conciliar las migraciones de Supabase aplicadas el 2026-10-04 que no están
     en el árbol Git, sin duplicar ni reconstruir a ciegas el esquema.
  5. Generar una pieza de video por fixture; mientras falte, conservar poster
     PNG real y video ambiental genérico como fallback.
  6. El proceso local actual no sobrevive al reinicio del PC; no se registró
     todavía una tarea de Windows de arranque.
- **Siguiente acción exacta:** validar el diff de la rama
  `codex/dimayor-calendar-worker`, commitearlo y abrir el PR del presupuesto;
  luego completar el importador de calendario antes de afirmar terminada la HU.
- **Commit base:** `6eeb0ca3bd751fc980d9e71befb2bc164ed49986` (PR #56 integrado).
- **Commit final:** pendiente.
