# Handoff

- **Objetivo:** publicar los ajustes acordados de Liga Colombiana, páginas SEO
  de partidos, carteles y actualización automática de la tabla.
- **Release:** PR #60 quedó integrado a `main` como
  `aeb3124e8bcc7c0bb89f286e74c66dc542a79b76`. GitHub reportó aprobados lint,
  pruebas, typecheck, build y Vercel. Production se comprobó después del merge
  con HTTP 200 en `/partidos-hoy`, `/liga-colombiana`, `/api/liga-colombiana` y
  `/api/resultados?deporte=futbol&timeZone=America%2FBogota`.
- **Datos productivos:** Supabase contiene la temporada 2026-II, 20 equipos de
  Liga A y 16 de Liga B. Las 36 posiciones públicas tienen escudo, fuente
  DIMAYOR y `checked_at=2026-10-06 12:29:09 UTC` (07:29 COT). La API pública
  confirmó los mismos conteos y fecha.
- **Migración:** aplicada en Supabase Production como versión
  `20261006115906`, nombre `hu_fut_tabla_dimayor_atomica`. El archivo local se
  renombró a esa versión para que migraciones futuras no intenten reaplicarla.
  La tabla privada de lease tiene RLS activo, sin políticas
  públicas y privilegios revocados; el endpoint interno sin firma dio 401. La
  función sólo permite escritura privilegiada mediante `service_role`, exige
  temporada/fases/equipos completos y derechos confirmados, usa actualización
  atómica y fencing token, y aplica cooldown de 15 minutos.
- **Worker/cupo:** el refresco de tabla actualizó las 36 posiciones desde
  DIMAYOR y usó 0 solicitudes de APIs. En un ciclo independiente posterior, el
  flujo de fixtures hizo 1 solicitud a Goal API (1 fixture recibido/guardado y
  su detalle actualizado). La tabla usa cooldown protegido de 15 minutos. El
  worker permanece activo mediante
  `C:\PONTE LA 10\.codex-release-dimayor-runtime`, con servidor en
  `127.0.0.1:3011`. No se modificó el servicio preexistente del puerto 3001.
- **Límite operativo:** no se instaló un Scheduled Task de Windows. Si el PC se
  suspende, se reinicia o se detiene alguno de los procesos, el refresco para y
  habrá que iniciarlos otra vez. No hay que reiniciar ahora: ambos procesos están
  activos. Para continuidad, mantener el PC despierto y las sesiones de
  servidor/worker vivas. Comandos de recuperación (sin mostrar ni copiar valores
  de `.env`):

  ```powershell
  # Desde C:\PONTE LA 10\.codex-release-dimayor-runtime, iniciar servidor:
  node --env-file='C:\PONTE LA 10\.env' --input-type=module -e "process.env.NUXT_FOOTBALL_WORKER_API_SECRET=process.env.NUXT_FUTBOL_WORKER_API_SECRET;process.env.NUXT_PUBLIC_SITE_URL='https://www.pont3la10.com';process.env.NUXT_FUTBOL_DERECHOS_PUBLICACION_CONFIRMADOS='true';process.env.NITRO_HOST='127.0.0.1';process.env.NITRO_PORT='3011';await import('./.output/server/index.mjs')"

  # En otra sesión, iniciar worker:
  node --env-file='C:\PONTE LA 10\.env' --input-type=module -e "process.env.PONT3LA10_CODEX_API_BASE_URL='http://127.0.0.1:3011';process.env.PONT3LA10_FUTBOL_WORKER_ENABLED='true';await import('./workers/ejecutar_futbol_local.mjs')"
  ```

- **UI y activos incluidos:** Liga A/B, agenda/resultados con escudos, páginas
  SEO `como-quedo`/`donde-ver`, 80 carteles WebP de octubre y reproductor de un
  video promocional en loop con redirección en los clics 1, 5, 9, etc. No se
  hizo clic en Production para evitar clics publicitarios artificiales; el
  reproductor no es una transmisión en vivo.
- **Seguridad/verificación DB:** se verificaron RLS/ACL y una escritura real del
  worker en Production. El advisor sólo señaló INFO por RLS sin política en la
  tabla privada de lease, intencional; sin hallazgos de rendimiento relevantes.
  pgTAP está disponible como extensión pero no instalado y no se instaló en
  Production; se usaron consultas de permisos y ejecución real como evidencia.
- **Vercel:** checks del merge aprobados y smoke público exitoso. El conector
  actual no permitió leer el ID del deployment (403/404) ni entrar al preview
  protegido; no se afirma un ID que no se pudo verificar.
- **Validaciones de código:** 67 archivos/326 pruebas, lint, typecheck, build,
  17 pruebas focalizadas y `git diff --check` pasaron antes del PR. Sigue el
  warning upstream `DEP0155` de `@vue/shared`.
- **Continuación:** mantener worker/servidor activos y confirmar en una próxima
  ventana que `checked_at` avanza sin incrementar cuota de proveedores. Si hay
  que recuperar el worker, usar únicamente el worktree y `.env` existentes; no
  publicar valores secretos en consola/documentación. El cierre de esta sesión
  también alinea el nombre local de la migración con la versión aplicada.
