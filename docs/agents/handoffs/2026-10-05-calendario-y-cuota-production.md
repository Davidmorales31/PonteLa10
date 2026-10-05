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
- **Trabajo y release:** una consulta SEO de Production confirmó
  cruces repetidos hasta tres veces por temporada y con jornadas “Por
  confirmar” distintas. La solución mantiene separados los IDs distintos del
  mismo proveedor cuando ronda desconocida y fecha difieren; solo fusiona
  copias de proveedores distintos si coincide la jornada numérica o el día
  local. Conserva el slug base del fixture más antiguo, usa
  competencia/temporada para las revanchas, añade una clave compacta estable
  si hay más colisiones y resuelve los slugs largos anteriores. Las páginas
  301 canonizan aliases a la URL estable. PR #58 se integró por squash como
  `d2ad599`; Vercel Production `dpl_bLF8cVbKpGrQMvwXWitfMb93ccZd` quedó
  `READY` con alias `www.pont3la10.com` y dominio raíz.
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
  focalizadas (3 archivos / 7 pruebas); suite completa (60 archivos / 300
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
- **Smoke antes de integrar:** con el build de producción local en el puerto
  3010 y el entorno de servidor del PC (sin mostrar sus valores), las tres URL
  históricas devuelven su slug canónico y ambas páginas responden 301 al
  canónico. `/donde-ver` y `/como-quedo` canónicas responden 200; el cartel OG
  devuelve `image/png` (142.436 bytes); sitemap responde 200 e incluye el
  canónico sin publicar los IDs de las URL legacy. Las lecturas fueron de solo
  lectura. Preview Vercel está `READY` pero su SSR muestra 503 por configuración
  de datos ausente; no se cambió ni se evitó la protección de Preview.
- **Smoke después de desplegar:** tres URL históricas redirigen con 301 a
  slugs distintos; las rutas canónicas de ambas páginas responden 200; el cartel
  OG devuelve `image/png` (98.006 bytes); `/partidos-hoy`, `/liga-colombiana` y
  `/colombianos-en-europa` responden 200; el sitemap 200 incluye el canónico y
  excluye IDs legacy. No hubo escrituras en Supabase, consultas a proveedores ni
  reinicio del worker.
- **Pendientes fuera del release:** la automatización del PC no sobrevive un
  reinicio porque no hay tarea de Windows registrada; aún no hay MP4
  personalizado de 6–10 s por fixture; se debe observar el límite durante
  varias jornadas y evaluar aparte las advisories de dependencias. La integración
  no permitió leer el resumen de logs runtime de Vercel (403), así que no se
  certifica ausencia de errores runtime.
- **Siguiente acción:** no queda trabajo de código de PR #58 pendiente. En una
  revisión operativa aparte, observar una jornada completa y decidir si se
  automatiza el arranque local de Windows y se genera MP4 personalizado.
- **Commit base:** `9066d53ed5626b33d2b92c94b6d5ccc5819fbe9e` (PR #57 Production).
- **Commit de release:** `d2ad59922e8f13468f4dca52d248f2068b1a3a4f`.
