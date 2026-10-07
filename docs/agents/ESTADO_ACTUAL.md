# Estado actual de Pont3la10

## Reenfoque maestro — seguimiento P0 (2026-10-06)

- **HU-GRO-01 — medición por tipo de página:** el código ya clasifica `page_type`
  y dimensiones seguras para artículos, partidos, equipos, competiciones,
  jugadores, hubs, resultados y búsquedas. La implementación evita enviar el
  término de búsqueda. Falta demostrar el flujo de Pont3la10 desde GA4
  DebugView; la propiedad abierta actualmente no muestra datos del sitio.
- **HU-GRO-02 — baseline de Search Console:** pendiente. La cuenta Google
  disponible abre Search Console sin propiedades, así que todavía no se pueden
  extraer impresiones, clics, consultas, páginas ni cobertura de los últimos 28
  días. No se inventó ni fechó retrospectivamente un baseline. Próximo paso:
  verificar/agregar la propiedad de Pont3la10 y guardar la primera extracción con
  fecha.
- **HU-GRO-03 — filtros SSR:** se confirmó en Production que la categoría
  `futbol-colombiano` regresaba vacía aunque había artículos. La lista de cinco
  alias del cliente excedía el máximo de cuatro validado por la RPC SQL. La
  corrección conserva cuatro alias específicos (Liga BetPlay, Torneo BetPlay,
  Copa Colombia y Selección); el `slug` exacto incluye todos los artículos de la
  categoría canónica. Smoke de Production del 2026-10-06: el endpoint paginado
  respondió 20 artículos y `hayMas=true`; el desplazamiento 20 respondió otros
  20 sin slugs repetidos. La ruta SSR con el filtro respondió 200, con H1
  `Noticias de fútbol colombiano`, canonical `/futbol-colombiano` y 19 enlaces
  a artículos. La categoría principal mostrada en algunos resultados es
  `Fútbol mundial` u `Opinión`, además de `Fútbol colombiano`; el endpoint no
  expone las etiquetas temáticas para confirmar que todos esos resultados son
  relevantes para los alias. Queda una revisión editorial de esa mezcla antes
  de declarar cerrada la calidad semántica. No se modificó el esquema ni se
  consumió cuota deportiva.
- El listado de noticias ya incluye un slot nativo de Adsterra condicionado al
  consentimiento de publicidad. Se conserva una sola ubicación en este hub para
  no repetir anuncios ni interrumpir la intención de lectura.
- Handoff de la reparación y validación pendiente:
  `docs/agents/handoffs/2026-10-06-hu-gro03-alias-limit.md`.

## HU-SEO-09 — hub de Selección Colombia (2026-10-06)

- PR #72 se integró a `main` por squash como `2fb69800fd2c5e31a00efc728ee283ed55f8b491`.
  La ruta `/seleccion-colombia` presenta agenda oficial de mayores, resultados,
  convocatorias masculina/femenina, noticias y enlaces editoriales por
  futbolista. El calendario, los marcadores publicados y la sustitución de la
  convocatoria se contrastaron con fuentes FCF; las horas no anunciadas no se
  estiman.
- La página lee el endpoint público `/api/resultados` cada 60 segundos; no llama
  proveedores desde el navegador ni escribe en Supabase. El hub reutiliza el
  único espacio de publicidad de Adsterra existente, sujeto al consentimiento y
  al mínimo de tres noticias.
- Canonical y metadatos quedan bajo un solo `useSeoPont3la10`; se añadieron
  ItemLists al JSON-LD editorial existente. Sitemap e indexación exigen al menos
  tres piezas deportivas oficiales recientes y retiran la URL cuando la revisión
  supera 60 días. El sitemap tolera una falla de Supabase si el contenido
  estático aún satisface ese umbral.
- Después del merge, Production respondió HTTP 200 en la página y el sitemap;
  el endpoint `/api/resultados?deporte=futbol&timeZone=America%2FBogota`
  respondió HTTP 200 con diez partidos del día y origen `base-datos`. Se
  comprobaron canonical única, `robots=index, follow`, agenda y convocatorias SSR,
  tres ItemLists y presencia en `sitemap-hubs.xml`.
- Los nombres de jugadores enlazan a búsquedas editoriales; las fichas
  permanentes corresponden a HU-SEO-10. El calendario se revisó con FCF el
  2026-10-06; aún no hay scraping/tarea automática de actualización. Handoff de
  entrega: `docs/agents/handoffs/2026-10-06-hu-seo09-seleccion-colombia.md`.
- PR #73 integró el seguimiento de encuentros FCF recientes sin marcador
  verificado: se muestran como pendientes hasta siete días después de su fecha,
  sin inventar el resultado. Se evita listarlos como resultado mientras todavía
  es el día del partido. Después del merge, Production respondió HTTP 200 en
  `/seleccion-colombia`, conservó `robots=index, follow`, agenda y marcador
  pendiente, y el sitemap incluyó el hub. Handoff:
  `docs/agents/handoffs/2026-10-07-hu-seo09-resultado-pendiente.md`.

## HU-SEO-10 — fichas públicas de futbolistas colombianos en Europa (2026-10-06)

- Desarrollo en la rama `codex/hu-seo10-perfiles-jugadores`: rutas
  `/jugadores/:slug`, directorio de Colombianos en Europa con enlaces a perfiles,
  noticias relacionadas vía el buscador editorial público y `Person`/`SportsTeam`
  en JSON-LD. Los primeros perfiles son Luis Díaz, Jhon Lucumí y Dávinson
  Sánchez; club, posición y nacionalidad se contrastaron con fuentes oficiales.
- El gate SEO exige identidad, club, posición, competición, descripción basada
  en fuente oficial y verificación de no más de 90 días. El sitemap de jugadores
  reutiliza el mismo gate. La consulta de artículos en Production encuentra una
  pieza relacionada para cada uno de los tres nombres.
- La base de partidos mantiene snapshots solo del día. La página muestra los
  partidos de hoy disponibles y enlaza el calendario oficial del club; no inventa
  una agenda europea futura ni añade llamadas a APIs deportivas. Automatizar
  próximos fixtures requiere una fuente/caché futura que aún no existe en este
  flujo.
- Validación local: lint, suite completa (77 archivos/379 pruebas), typecheck y
  build Vercel pasaron; HTTP SSR del perfil y del hub 200, 404 para slug
  desconocido, canonical/JSON-LD `Person` presentes, tres URLs en
  `/sitemap-players.xml`. La inspección del árbol accesible confirma H1, enlaces
  de migas y perfiles; queda incompleta la vista manual de tamaños móviles.
- Release Production pendiente de PR/CI. No hubo migraciones, escrituras remotas
  ni consumo adicional de cuota deportiva.

## HU-SEO-13 — páginas públicas por jornada (2026-10-06)

- Implementación en la rama `codex/hu-seo13-jornadas-calendario`: API y página
  `/jornadas/:competencia/:temporada/jornada-N`, enlace desde la ficha de liga,
  canonical y JSON-LD propios, y `/sitemap-rounds.xml` incluido en el índice.
- Solo se construye la URL si el padrón público autorizado de la temporada está
  completo, el fixture tiene 10 partidos Liga A u 8 Torneo B, cada equipo aparece
  una vez, los slugs son únicos y todos los partidos tienen fuente DIMAYOR
  verificable. Falla de lectura del padrón => 503/no-store; una jornada válida
  ausente => 404. Las marcas de verificación futuras se excluyen (tolerancia de
  cinco minutos).
- En los datos públicos actuales, el calendario Liga A 2026-II produce 18
  jornadas completas; la Jornada 13 se omite porque incluye 11 partidos y un
  equipo aparece dos veces. El feed escribe `La Equidad` en algunos registros
  donde DIMAYOR identifica a Internacional de Bogotá. En la vista pública de
  Liga/Jornadas, el alias se presenta con el nombre, escudo y enlace del padrón
  oficial, solo para Liga A 2026-II; los históricos no se modifican. Torneo B
  2026-II conserva 15 jornadas completas. La temporada 2026-I no tiene padrón
  de tabla público suficiente para generar estas rutas, así que no se indexan.
- No se hicieron migraciones, escrituras Supabase ni peticiones a proveedores
  deportivos. Las fichas/sitemap consultan datos públicos mediante cliente anon.
- Validación local: suite 79 archivos/397 pruebas, lint, typecheck, build Nitro
  y `git diff --check` pasaron; el build conserva el aviso upstream `DEP0155` de
  `@vue/shared`. La página Preview se abrió desde el navegador autenticado: SSR,
  10 partidos y tema oscuro visibles. Esa verificación descubrió la antigua
  etiqueta `La Equidad` y el contador “partidos programados” para una jornada
  terminada; ambos quedaron corregidos en el commit local `1b1fa60`. El
  CI/Preview del PR #76
  corresponde al commit anterior y debe repetirse antes de producción. La
  revisión estática concluyó sin bloqueos tras propagar la caída del padrón
  únicamente a los flujos de jornada.
- Handoff: `docs/agents/handoffs/2026-10-06-hu-seo13-jornadas.md`.

## HU-SEO-08 — páginas permanentes de competiciones (2026-10-06)

- PR #68 integró las páginas públicas de competición en `main` como
  `83f8cd5c3755064dddf88403e732b77220280ca7`; Vercel desplegó Production
  (`4kBf7XVGB7s8uxqUpYrbRb5KMPpG`). El hub Liga BetPlay publica temporada,
  posiciones disponibles, agenda, resultados, jornadas/fases, clubes y noticias.
  Torneo BetPlay y Copa Colombia tienen sus propias rutas permanentes; el sitemap
  de competiciones las incluye.
- El smoke posterior descubrió que la URL histórica
  `/competiciones/liga-betplay/2026-I` respondía 200 pero mostraba título,
  contenido y canonical de la temporada actual. El endpoint histórico sí devolvía
  datos de 2026-I. Causa: Nuxt modela `[temporada].vue` como ruta hija de
  `[slug].vue`, pero la página padre no renderizaba `<NuxtPage>`.
- PR #69 añadió la salida anidada, conservando el hub actual en la ruta raíz;
  merge commit `a82fce8f4f56e0666cc27b4b5e9f38000b5957ee`. El deployment Vercel
  `2bKkRS1LWdcTc9obKud8AhREuycY` quedó `Ready` en Production y asignado a
  `www.pont3la10.com` y `pont3la10.com`.
- Smoke posterior al hotfix: la ruta raíz sirve título/H1 `Liga BetPlay 2026-II`
  y canonical raíz; la ruta histórica sirve título/H1 `Liga BetPlay 2026-I`,
  canonical histórica e indexación habilitada. Ambas APIs responden 200; el
  sitemap de competiciones responde 200 y contiene seis URL de competición.
  Se validó navegación directa y cliente local. No hubo cambios en Supabase ni
  llamadas a proveedores.
- Validación del hotfix: lint, typecheck y build Nitro para Vercel pasaron; la
  suite pasó con `--maxWorkers=1` (75 archivos/368 pruebas). La primera corrida
  paralela alcanzó timeouts de 5 s en pruebas no relacionadas, por lo que la
  repetición serial fue la validación final satisfactoria. La revisión estática
  de seguridad no encontró hallazgos pendientes.
- Para 2026-I la clasificación permanece etiquetada como pendiente de
  confirmación y no se presenta una tabla parcial como oficial. Preview sigue sin
  configuración pública de Supabase y puede responder 503; Production fue
  verificado por separado.
- Handoff:
  `docs/agents/handoffs/2026-10-06-hu-seo08-competiciones.md`.

## HU-SEO-07 — fichas públicas de equipos colombianos (2026-10-06)

- PR #66 se integró como `f24d4ac1192bf33ce90e40bd4e0a9c1fb84461d5`. La ruta
  `/equipos/:slug`, su API, los enlaces desde Liga/fichas de partido y el sitemap
  de equipos están en Production. El smoke de 2026-10-06 comprobó página/API/XML
  HTTP 200; la ficha de Atlético Nacional ofrece posición #4, 5 próximos
  encuentros, 1 noticia, canonical, `SportsTeam`, indexación habilitada y
  presencia en sitemap (35 equipos indexables). La inspección accesible mostró
  encabezados, navegación, escudos, fixtures y enlaces etiquetados.
- El smoke reveló que el estado raw `finished` no se clasificaba como final.
  PR #67 reutilizó la normalización compartida y se integró como
  `c55f56061ba4d6860871f4094d5eb6373fb91c9c`. Después del deploy `Ready`, la API
  y el HTML fresco mostraron cinco resultados recientes: Atlético Nacional 3–1
  Junior (30-sep), Nacional 1–1 Millonarios, Llaneros 2–0 Nacional, La Equidad
  2–3 Nacional y Nacional 2–0 Águilas Doradas.
- El acceso a tablas usa el cliente Supabase anónimo y proyecta solo filas con
  `is_public` y `publication_rights_confirmed`. No hubo cambios de esquema ni
  escrituras remotas. Las fichas con datos insuficientes sirven `noindex`; el
  sitemap de equipos incluye solo fichas que pasan el mismo gate SEO.
- Los aliases de nombres se contrastaron con fixtures y clasificaciones
  públicos de Production. Slugs se generan desde `team_key` autorizado y los
  nombres ambiguos no se enlazan. No se exponen IDs de proveedor.
- Las pruebas de la reparación cubren los estados raw `finished` y `2H`, y
  excluyen partidos programados, marcadores nulos y fixtures futuros. La suite
  completa tiene 74 archivos/363 pruebas; lint, typecheck, build y CI de PR #67
  pasaron.
- El preview de PR #66 compiló, pero respondió 503 por falta de configuración
  pública de Supabase para el entorno Preview. No se copiaron credenciales. Se
  validó la respuesta y el contenido inicial ya desplegado en Production.
- Handoff de la implementación desplegada:
  `docs/agents/handoffs/2026-10-06-hu-seo07-equipos.md`.
  Handoff de la reparación desplegada:
  `docs/agents/handoffs/2026-10-06-hu-seo07-state-normalization.md`.

## Liga, partidos SEO y tabla DIMAYOR en Production (2026-10-06)

- PR #60 se integró a `main` como `aeb3124e8bcc7c0bb89f286e74c66dc542a79b76`
  (`feat(futbol): actualizar Liga BetPlay desde DIMAYOR`). PR #61 alineó
  documentación y versión de migración (`d1021f75`); PR #62 corrigió el doble
  caché del API (`da0fce0b`). Todos los checks requeridos, incluido Vercel,
  pasaron. Production se verificó por HTTP: `/partidos-hoy`, `/liga-colombiana`,
  `/api/liga-colombiana` y `/api/resultados?deporte=futbol&timeZone=America%2FBogota`
  respondieron 200.
- `/api/liga-colombiana` sirve 36 posiciones públicas de la temporada 2026-II:
  20 de Liga A y 16 de Liga B, con escudo para cada equipo. Las 36 filas tienen
  `source_name=DIMAYOR` y `checked_at=2026-10-06 12:59:50 UTC` (07:59:50 COT).
  La lectura SQL posterior confirmó 36/36 con escudo. El calendario público
  sigue sirviendo sus fixtures desde la base de datos.
- La migración aplicada en Supabase Production quedó registrada por el servidor
  como versión `20261006115906` (`hu_fut_tabla_dimayor_atomica`). Se alinea el
  nombre local de su archivo a esa versión. La función privada refresca el
  conjunto completo de Liga A/B de manera atómica, verifica temporada/fases y
  derechos vigentes, y usa lease con fencing token y cooldown de 15 minutos.
  El endpoint interno sin firma respondió 401; ACL/RLS impiden acceso público a
  la escritura. El único aviso nuevo relevante del advisor es INFO sobre RLS sin
  políticas en la tabla de lease privada (intencional); no aparecieron hallazgos
  de rendimiento relacionados con esta tabla. pgTAP está disponible pero no
  instalado en Production; las pruebas se validaron con consultas directas de
  ACL/RLS y la escritura real del worker.
- El worker local actualiza la tabla DIMAYOR en ciclos con cooldown protegido de
  15 minutos: el último ciclo observado completó 36 posiciones, `solicitudes=0`,
  sin cambiar cuotas de APIs. El worker genérico de clasificaciones respondió
  `sin_objetivos`/0 solicitudes en el mismo ciclo. En un ciclo independiente
  anterior, fixtures sí usó 1 llamada Goal API para guardar un partido y su
  detalle; la ruta genérica de snapshots/proveedores no se reemplazó.
- El API público antes combinaba caché Nitro de 5 min + SWR con caché Vercel de
  5 min + SWR, y una revalidación de CDN podía recibir de nuevo una respuesta
  vieja. PR #62 eliminó el caché interno duplicado y dejó la caché compartida de
  Vercel en 60 s + SWR 60 s. Smoke en Production: una respuesta MISS devolvió
  36 filas y `actualizadoEn=07:59:50 COT`; la lectura siguiente fue HIT en 3 s y
  otra lectura, tras vencer el TTL, volvió a MISS consultando origen. No se
  consumió cuota de proveedores para estas verificaciones.
- El servidor local y el worker siguen activos en `127.0.0.1:3011` dentro del
  worktree `.codex-release-dimayor-runtime`. No se instaló una tarea persistente
  de Windows: el PC debe permanecer despierto y los procesos deben seguir vivos;
  tras suspensión, reinicio o cierre de los procesos hay que arrancarlos de
  nuevo. Se dejó intacto el servicio preexistente del puerto 3001.
- El deploy actual es el posterior al merge de PR #62; el identificador de
  deployment no se pudo leer por el conector Vercel (403/404). El estado de CI
  de Vercel fue exitoso y la URL pública devolvió las rutas y datos anteriores.
  No se accedió al preview protegido. Se conserva el trabajo de Liga, páginas
  SEO, 80 carteles WebP de octubre y reproductor promocional incluidos en PR #60.
- Validación: PR #60 pasó lint, typecheck, suite completa (67 archivos/326
  pruebas), build y pruebas focalizadas (17/17); PR #62 pasó lint, typecheck,
  suite (67/326) y build. El aviso upstream `DEP0155` de `@vue/shared` permanece.
  La migración se revisó estáticamente y luego se verificó/escribió en
  Production. Handoff:
  `docs/agents/handoffs/2026-10-06-liga-colombiana-produccion.md`.

## Liga colombiana, SEO de partidos y cuota (2026-10-05)

- PR #55 (`cbc0200`), #56 (`6eeb0ca`) y #57 (`9066d53`) están integrados en
  `main`. El deployment Vercel `dpl_FEKYqQPWRRpe9hyCTWi2riMAqVuK` está
  `READY` en Production y sirve `www.pont3la10.com`. Las páginas de Liga,
  Colombianos en Europa, resultados, páginas pareadas de partidos, sitemap y
  sus formatos de imagen respondieron en los smoke descritos en sus handoffs.
  La imagen con `LOC`/`VIS` sigue siendo sólo una referencia; no se publicó
  como fixture.
- PR #58 se integró por squash como `d2ad599` y Vercel desplegó
  `dpl_bLF8cVbKpGrQMvwXWitfMb93ccZd` (`READY`) en los dominios raíz y `www`.
  El slug más antiguo se conserva; las revanchas se diferencian con
  competición/temporada y las URL anteriores se conservan como alias 301. El
  deduplicador ya no fusiona IDs distintos del mismo proveedor si la jornada
  está “Por confirmar” y las fechas difieren; entre proveedores exige jornada
  numérica igual o mismo día `America/Bogota`.
- Smoke posterior en Production (2026-10-05): tres URL históricas redirigen a
  tres slugs canónicos distintos; las páginas `/donde-ver` y `/como-quedo`
  canónicas responden 200; el cartel OpenGraph responde PNG; sitemap responde
  200, incluye el canónico y excluye IDs legacy. `/partidos-hoy`,
  `/liga-colombiana` y `/colombianos-en-europa` responden 200. Fueron lecturas
  HTTP: no hubo escrituras en Supabase, consumo de cuotas de proveedores ni
  reinicio del worker.
- No se pudo consultar el resumen de logs runtime de Vercel: la integración
  devolvió 403. El estado `READY` y los smoke HTTP están confirmados, pero no se
  certifica aquí la ausencia de errores runtime.
- Las migraciones `20261005093735_hu_fut_presupuesto_seguro_ventanas` y
  `20261005101132_hu_fut_calendario_colombiano` están aplicadas a Supabase
  Production. El tope operativo ahora es 80 solicitudes de API-Football y 900
  de Goal API, dejando margen respecto de los planes 90/950; además, la base
  impone ventanas mínimas de 5 minutos para fixtures y 15 para clasificaciones.
  RLS, ACL y las funciones de reserva privilegiadas se verificaron en Production.
- El worker de este PC completó la carga DIMAYOR/Goal API del 2026-10-05 con 11
  solicitudes, 1.100 fixtures recibidos y 748 insertados/actualizados. La tabla
  quedó con 756 filas: 400 Liga A, 265 Torneo B y 91 Copa Colombia. Es una
  ejecución diaria confirmada; todavía no equivale a observar varios días.
  `/api/liga-colombiana` respondió 80 fixtures el 2026-10-05 a las 12:05 UTC.
- Uso agregado leído de Supabase: el 2026-10-04 llegó a 950/950 Goal API y
  35/80 API-Football; el 2026-10-05 a las 11:55 UTC figuraban 46/900 Goal API
  (incluidas 11 llamadas de calendario) y 1/80 API-Football. La barrera impide
  volver a consumir el tope anterior, pero el uso diario requiere seguimiento.
- El servidor de la versión desplegada corre localmente en
  `127.0.0.1:3003`; un proceso aislado de fútbol usa ese endpoint y no la cola
  editorial. Sigue activo durante esta sesión/PC, pero no existe una tarea de
  Windows que lo reinicie automáticamente después de apagar o reiniciar.
  Vercel no ejecuta un Cron para este flujo.
- La promoción de partidos usa el GIF ambiental existente con datos/escudos
  reales superpuestos y genera PNG OpenGraph/formatos sociales; aún no genera un
  MP4 personalizado de 6–10 s por fixture. No se afirma que el sitio transmita
  partidos. La aprobación de cualquier artículo continúa siendo humana.
- La suite del PR #57 pasó (60 archivos / 298 pruebas), junto con lint,
  typecheck y build. El aviso upstream `DEP0155` de `@vue/shared` permanece.
  pgTAP no se ejecutó localmente porque faltan Docker y Supabase CLI; sus
  permisos, límites y caminos nulos se verificaron con SQL en Production.
- Handoff operativo:
  `docs/agents/handoffs/2026-10-05-calendario-y-cuota-production.md`.

## Base canónica alineada con Production (2026-10-02)

- La fuente del deployment activo `dpl_64hECvYHAArmLsgXP9pv9NBUek58` se
  recuperó del worktree local que produjo el despliegue. Vercel lo etiqueta
  como `vercel deploy` (sin SHA Git); la base de ese worktree era `07aca0a`, más
  14 archivos versionados modificados y 4 archivos nuevos. Los hashes SHA-256
  de esos 18 archivos se compararon con la copia importada en este checkout y
  coinciden. No se copiaron `.env` ni archivos ignorados.
- El checkout dejó atrás los 42 commits de backlog del antiguo `HEAD=e42b57b`
  y ahora parte de la fuente exacta del deployment. Para recuperación local se
  conserva `archive/pre-production-reset-2026-10-02-e42b57b` (commit anterior)
  y un stash llamado `respaldo pre-reset 2026-10-02; rama e42b57b` (cambios no
  ignorados). No aplicar ni publicar esos respaldos salvo pedido explícito.
- El snapshot importado se fijó en el commit local `ccebe0d` sobre la rama
  `codex/production-baseline-2026-10-02`, sin upstream del backlog.
- Se preservaron las demás ramas/worktrees, el contenido ignorado y el proceso
  local ya activo en el puerto 3001. No hubo push, PR ni nuevo deployment.
- Guía para instancias futuras:
  `docs/agents/BASE_PRODUCCION_Y_CONTINUIDAD.md`; detalle de esta operación:
  `docs/agents/handoffs/2026-10-02-base-produccion-y-reset-42-commits.md`.

- **SSR de fechas, slots Adsterra y publicación de fixtures de hoy (Production, 2026-10-02):** deployment `dpl_64hECvYHAArmLsgXP9pv9NBUek58` (`READY`), alias `https://www.pont3la10.com`, desplegado desde CLI como `vercel deploy` sin SHA Git asociado. El source exacto usado fue recuperado desde el worktree local basado en `07aca0a` y ahora está importado en este checkout. No hubo PR ni push; el despliegue original no incluyó los otros 42 commits del checkout principal. En Vercel Production se agregó `NUXT_FUTBOL_DERECHOS_PUBLICACION_CONFIRMADOS=true`; sigue siendo configuración privada del servidor, no parámetro de URL. `/api/resultados?deporte=futbol&timeZone=America/Bogota` ya devuelve 22 fixtures de `base-datos`; portada, `/partidos-hoy`, `/resultados/futbol` y `/privacidad` responden HTTP 200. El detalle probado es El Salvador–Jamaica, programado; los 22 snapshots aún no tienen `details_fetched_at`, eventos, alineaciones ni estadísticas. En el PC `PONT3LA10_FUTBOL_WORKER_ENABLED=false` y su `.env` no contiene la clave exclusiva `NUXT_FUTBOL_WORKER_API_SECRET`; no fue posible activar otro ciclo sin configurarlo. Los intentos de arranque fallaron antes de contactar el endpoint local; no se consumieron cuotas. El flujo conserva API-Football/Goal API, prioridad/ventana de 90 minutos y cuotas existentes, pero el refresco autónomo de detalles queda pendiente de habilitar el worker local. El iframe Adsterra conserva sandbox opaco y presenta una capa local de `document.cookie` vacía para evitar `SecurityError`; el espacio ya no tiene fondo azul. Se conserva el consentimiento publicitario existente porque el tag consulta cookies; no se promete impresión para usuarios que no autorizaron publicidad. Las fechas SSR/client usan instante serializado y zona horaria explícita Bogotá, luego zona del dispositivo en cliente. Lint, 49 archivos/241 pruebas, typecheck y build pasan; smoke HTTP y árbol accesible de las páginas pasan. No se capturó la consola del navegador, por lo que el warning de hidratación queda pendiente de certificación manual. Handoff: `docs/agents/handoffs/2026-10-02-hidratacion-publicidad-y-flujo-futbol.md`.

- **Publicidad consentida y escudos de fútbol (Production, 2026-10-02):** el commit `1a5078c` publicó los tags Adsterra suministrados por el usuario en portada, noticias, artículos, resultados/partidos de hoy y detalle. Los espacios no cargan hasta consentimiento explícito separado de Analytics; el Smartlink es patrocinado y requiere clic. La creatividad va en iframe aislado, sin popups. Los escudos HTTPS pasan allowlist del host oficial, se guardan en snapshots y se proyectan a tarjetas; no requirió migración. Vercel Production deployment `dpl_HwLkWibJUbvEMZfcM5JwVh4pKZLR`, `READY`, alias `https://www.pont3la10.com`; build remoto OK. Smoke: portada, artículos, partidos de hoy, resultados y privacidad HTTP 200; detalle de partido accesible. El API de fútbol respondió `base-datos` con 0 fixtures para el 2-oct: no hubo escudos en esas páginas y no se consumieron llamadas de proveedor para fabricar una prueba. Cuando el worker obtenga un nuevo listado de fútbol, los logos permitidos pasarán por el mismo flujo de snapshots. Lint, typecheck y 47 archivos/235 pruebas pasan. Build local omitido por Nuxt activo en el mismo worktree; no se detuvo el worker. Sin push ni PR. Revisión independiente: sin P1; P2 residual: falta CSP pública global. Handoff: `docs/agents/handoffs/2026-10-02-anuncios-y-escudos.md`.

- **Corrección del dominio canónico (2026-10-02):** el canonical servido se verificó como https://www.pont3la10.com/partidos-hoy. Se reemplazó en Vercel Production la variable NUXT_PUBLIC_SITE_URL por https://www.pont3la10.com; sustituye el alias ponte-la10.vercel.app usado al compilar el deployment bloqueado. El valor aplica a builds futuros; no modifica la versión activa.

- **Alcance de derechos:** el usuario confirmó por escrito que cuenta con las autorizaciones aplicables y asume la responsabilidad de publicar los datos y las imágenes. La confirmación quedó registrada como autorización humana; no es una verificación independiente de licencias. Este release no agregó ni publicó nuevos archivos de imagen o escudos.
- **Nota histórica:** el siguiente bullet resume el estado previo a la autorización (aprox. 22:00 COT del 2026-10-01); sus frases de snapshots privados y ausencia de publicación quedaron superadas por el estado actual de arriba.

- **Flujo fútbol desplegado en Production (2026-10-02 UTC / 2026-10-01 COT):** el usuario autorizó publicar el código y los snapshots Goal API del día de negocio 2026-10-01. En Supabase quedaron públicos únicamente esos 8 fixtures, la competencia y los 16 equipos canónicos mapeados; clasificaciones y otras fechas no se publicaron. El commit `2136086` (`feat(futbol): cuotas diarias y limpieza local`) se creó con la misma identidad GitHub ya vinculada a Vercel y contiene solo 24 archivos de este flujo, pruebas y handoff; no incluye los otros 42 commits, no se hizo push ni se abrió PR. Vercel Production aceptó el build remoto: deployment `dpl_9y5ueqBe9s1gmkUqKm4x5jTR2Ce6`, estado READY, alias `https://www.pont3la10.com`. El build usó las variables directamente desde Production; no se desplegaron placeholders locales de secretos. Smoke posterior: `/partidos-hoy` HTTP 200; `/api/resultados?deporte=futbol&timeZone=America%2FBogota` devuelve 8 filas desde `base-datos`; el detalle probado de Azerbaijan–Liechtenstein se sirve desde `base-datos`, finalizado, con 2 alineaciones, 23 estadísticas y 0 eventos. La migración `20261001215733_hu_fut_presupuesto_diario_limpieza` ya estaba aplicada a Production, con límites diarios 90 API-Football/950 Goal API y limpieza por fecha de Bogotá. El worker sigue activo en el PC; sus ciclos recientes reutilizan el estado sincronizado y registran 0 solicitudes. No se agregaron ni publicaron archivos de imágenes/escudos en este release. Pendiente operativo: comprobar tras la próxima medianoche COT la limpieza y carga de solo el nuevo día. Handoff: `docs/agents/handoffs/2026-10-01-presupuesto-futbol-y-scheduler-pc.md`.

- **Flujo local de fútbol verificado (2026-10-01, rama `codex/futbol-production-worker` basada en Production):** migración `20261001215733_hu_fut_presupuesto_diario_limpieza` aplicada/verificada en Supabase Production (`ykjithahavncswlfgsqa`), con topes diarios duros de 90 solicitudes para API-Football y 950 para Goal API, reserva atómica, listados diarios y limpieza en horario de Bogotá. El worker durable del PC y Nuxt local están activos en `127.0.0.1:3001`; el intervalo local se ajustó a 5 minutos para detectar ventanas de partido, sin quitar los topes. La corrida real del 1 de octubre COT usó Goal API como respaldo y dejó 8 partidos priorizados en `football_fixtures_today`, con marcador y detalle de eventos/alineaciones/estadísticas cargado; los 8 siguen `is_public=false` y sin derechos confirmados. Si Goal es el único proveedor con mappings del día tras un fallback, los ciclos siguientes reutilizan su lista/detalles guardados y no vuelven a gastar en el principal; API-Football vuelve a intentarse al cambiar la fecha de Bogotá. La ruta pública local devuelve `sin_datos`/0 fixtures, intencionalmente hasta aprobar derechos. Contadores observados cerca de las 22:00 COT: API-Football 14/90 y Goal API 250/950 (incluyen diagnósticos y reintentos de carga; no son el costo esperado de una jornada limpia). El adaptador Goal ahora lee `leagueYear`, `homeTeamScore` y `awayTeamScore`, que faltaban en el esquema real. Suite completa 46 archivos/230 pruebas, lint, typecheck, build Production y `git diff --check` pasan; el build emite la advertencia existente de `@vue/shared` y Git avisa cambio LF→CRLF de `.gitignore`. No se publicó este worktree en Vercel y el sitio Production aún no contiene este código. Próximo paso: esperar la confirmación del usuario antes de publicar el código; mantener privados los snapshots hasta recibir/registrar autorización de derechos. Handoff: `docs/agents/handoffs/2026-10-01-presupuesto-futbol-y-scheduler-pc.md`.

- **Flujo fútbol con worker local al desplegar la base (2026-10-01, Production):** el PR #48 integró el commit `2589451` desde una rama basada exactamente en Production `5b57f734`; el merge `8e945a8` ya está desplegado en Vercel Production. El ciclo vive dentro del worker durable local existente, era opt-in (`PONT3LA10_FUTBOL_WORKER_ENABLED=false` por defecto), firma solicitudes sólo hacia Nuxt local en `127.0.0.1:3001` y no agrega Vercel Cron. Usa API-Football y Goal API como respaldo; lista, marcador y detalle de fútbol leen snapshots Supabase y exigen mapping canónico y derechos documentados. Production recibió las migraciones `20261001192209`, `20261001192210` y `20261001192504`; al smoke inicial las tablas estaban vacías, con RLS activo y claim de lease exclusivo de `service_role`. El smoke live confirmó `/partidos-hoy` y APIs públicas HTTP 200 sin datos, detalle sin snapshot 404 y endpoint interno sin firma 401. A esa fecha no se habían consultado proveedores ni cargado mappings/derechos. Lint, 45 archivos/219 pruebas, typecheck, build, `git diff --check` y revisión independiente pasaron; pgTAP no se ejecutó por falta de Supabase CLI/Docker. Handoff: `docs/agents/handoffs/2026-10-01-flujo-futbol-worker-local.md`.

- **Portada obligatoria en propuestas de la tarea Codex (2026-09-29, Production):** auditoría
  de la corrida `3b39393b-8709-4aa7-b8ae-0d5922fb07eb` encontró cero artefactos
  `portadaIA`/`media`; la corrida previa `bd4ad640-dec7-4560-8720-ba757d89b496`
  sí tiene 56 artefactos de imagen. Causa reproducible: la instrucción activa de
  la automatización aún permitía explícitamente entregar sin portada cuando no
  hubiera foto licenciada, y el contrato privado también aceptaba
  `coverMediaId: null`; la Skill IA además permitía continuar sin imagen. La
  tarea activa se actualizó para exigir ImageGen → inspección → checkpoint →
  `media-ia` → propuesta con el ID persistido. El horario (06:05, 14:05, 20:05
  COT), modelo, proyecto y entorno local se conservaron. En la rama
  `codex/require-editorial-covers`, el CLI y la API ahora rechazan propuestas
  sin portada y con flags ausentes/ambiguos; la Skill instruye omitir ese
  candidato y reportar el faltante si ImageGen falla, nunca entregar un borrador
  sin imagen. No se cambia TikTok, carga manual ni base de datos; no se generó
  imagen ni se disparó una corrida manual. Validaciones locales y de GitHub:
  `npm ci`, lint, suite (29 archivos/146 pruebas), typecheck, build y
  `git diff --check` pasan. PR #32 se integró a `main` como
  `1f199aaeb11797a63a01e39f761676d50cb058a4`; CI y el despliegue Vercel de
  Production reportaron éxito. La ejecución programada de las 14:05 COT está
  activa, pero aún no hay recibo `media-ia` verificable; revisar sus artefactos
  al terminar. Handoff:
  `docs/agents/handoffs/2026-09-29-portadas-obligatorias-codex.md`.

- **Buscador y noticias relacionadas (2026-09-29):** el buscador de noticias
  define fondo, borde, texto, placeholder y foco legibles al activar el tema
  blanco, manteniendo el diseño azul intacto. Las tarjetas de artículos
  relacionados usan `NuxtLink` explícito cuando son navegables y conservan un
  contenedor no navegable en la vista previa editorial; no se vuelve a mostrar
  un espacio de imagen cuando el artículo no tiene portada. Se añadieron
  pruebas para ambos contratos.

- **Portadas editoriales generadas con IA en tarea Codex (Production, 2026-09-28):**
  HU-ED-11 agrega una ruta privada e idempotente de imagen generada, optimiza a
  WebP y guarda la atribución fija “Imagen generada con IA” con disclosure de
  que no es fotografía documental. Es exclusiva de la tarea programada Codex;
  ingesta TikTok y carga manual siguen sin cambios. El checkpoint impide
  regenerar o sustituir una portada al reanudar. La propuesta continúa siempre
  en `review`; la imagen es opcional si ImageGen no está disponible o puede
  inducir a error. Migración `20260928010850_codex_ai_generated_covers`
  aplicada y verificada en Supabase Production: RPC `SECURITY INVOKER`,
  `search_path` vacío, grants solo a `service_role`. PR #23 se integró en `main`
  como `308827a1bd919efabdad587d0e6f077df66154a4`; Vercel reportó deployment
  completo y la ruta pública devuelve 401 sin firma. La automatización local
  diaria existente fue actualizada (3 corridas/día, configuración intacta)
  para invocar `pont3la10-ai-editorial-cover` e `imagegen`; no se disparó una
  corrida real como parte del despliegue. Siguiente verificación: en la próxima
  corrida programada confirmar un recibo `media-ia` y portada visible en un
  borrador, o verificar el fallback sin portada. Handoff:
  `docs/agents/handoffs/2026-09-27-portadas-ia-tarea-codex.md`.

- **Google Analytics 4 (Production, 2026-09-29):** se conserva la
  integración pública del PR #21 (`3c4da416aacbec5704228ec7e9220b6223a6defa`),
  pero ahora el ID `G-PHNWBM2D7X` queda fijado en el cliente y GA4 inicia para
  visitantes nuevos sin exigir aceptar primero. Se conserva el control del pie
  para desactivar/reactivar, respetando rechazos ya guardados. Pageviews SPA
  manuales; `article_view`; búsqueda sin texto; categorías en allowlist; rutas
  administrativas, login y API excluidas. Se actualizó la política de
  privacidad. PR #30 quedó integrado en `main` como
  `e173dfbddcf2a7a187c59493cf33310818d7c21e`; el estado de Vercel fue exitoso,
  Inicio y Privacidad respondieron HTTP 200 y el JavaScript publicado contiene
  el ID y el cargador de Google. La recepción en Realtime/DebugView aún no se
  confirmó desde la cuenta de Analytics. Handoff:
  `docs/agents/handoffs/2026-09-27-ga4-consentimiento.md`.

- **Corrida editorial de producción 2/5 (2026-09-26, cierre parcial):** se
  reutilizó el runId `97a62412-2f4a-4c88-a914-3e7641edc3fd` y la API aceptó
  15 propuestas en total. El checkpoint cerró las siete categorías activas;
  Trends Colombia aportó 4 oportunidades de fútbol colombiano y 2 de fútbol
  mundial. Tecnología deportiva y Gaming tienen propuesta sustentada en fuente
  institucional, pero sin señal de búsqueda de Trends. Tendencias, Especiales
  y Opinión quedaron con motivo explícito de omisión; no se inventó demanda ni
  voz editorial para completar el lote. Estado remoto `partial`. En la última
  lectura, las 15 propuestas asociadas a esta corrida estaban así: 3
  `published`, 7 `scheduled`, 5 `review`; Juan confirmó que está aprobándolas
  desde el CMS. Las ocho entregas de esta continuación fueron: Países Bajos–
  Alemania (`6b4ad99f-6c2f-40e8-a91e-bd56f8cff25a`), Noruega–Dinamarca
  (`4d0f1df0-6858-45a1-90c1-18b149e6946d`), Portugal–Gales
  (`e536db78-b20d-4817-bca0-40e1dc473093`), Serbia–Grecia
  (`f3a43ff5-1d7c-453d-b58e-17a7e2401ef2`), Suecia–Rumania
  (`4cf27d33-bbe7-45f1-960a-97c077dc90ec`), Georgia–Irlanda del Norte
  (`6e75fbd9-249c-4204-baa4-7047c1980e3b`), UEFA Clear Line
  (`07a4f819-2572-4f0b-8e41-6673208edaa1`) y FIFAe Finals 2026
  (`caf153d5-098b-41a9-9949-e77b934b8cda`). Todas se enviaron sin portada
  cuando no había fotografía pertinente licenciada; nunca se aprobaron,
  programaron ni publicaron desde Codex. Quedan 3 corridas nuevas disponibles
  para hoy; no abrir otra sin solicitud explícita.

- **Límite de corridas editoriales (2026-09-26):** regla corregida a un máximo
  de cinco `runId` distintos por fecha de Colombia, aplicado directamente en
  Supabase producción (`ykjithahavncswlfgsqa`) mediante
  `20260926195023_limite_cinco_corridas_editoriales_por_dia.sql`. La función
  mantiene `SECURITY INVOKER`, ejecución solo para `service_role`, bloqueo para
  asignaciones concurrentes e idempotencia por `runId`; los reintentos reutilizan
  el mismo ID y una corrida parcial no se borra ni se reabre como otra. Verificado
  en producción: hoy hay 2 corridas de 5; la primera y la segunda permanecen
  `partial`. La segunda alcanzó 15 propuestas aceptadas y dejó el detalle de
  categorías/faltantes en el checkpoint editorial superior.

- **Lote editorial mínimo y portada opcional (2026-09-26):** la tarea
  diaria existente quedó actualizada para apuntar a un mínimo de 15 propuestas
  completas por corrida total (no por categoría), balanceadas entre categorías
  activas y sin rellenar con historias débiles. Si la evidencia no permite
  llegar, debe reportar una corrida parcial y el faltante. La foto licenciada
  pasó a ser opcional: si no hay una imagen pertinente y verificable, puede
  enviar `coverMediaId: null`; la RPC mantiene la verificación completa cuando
  sí hay foto y ambas rutas crean solo contenido `review`.
  En `C:\PONTE LA 10`, rama `codex/cinco-corridas-diarias`, se cambió
  el esquema API, los checkpoints, la completitud del editor, el aviso SEO y las
  instrucciones HU/Skills. Supabase producción se inspeccionó en solo lectura:
  `articles.cover_media_id` ya acepta NULL y la RPC actual es `SECURITY INVOKER`;
  un query de simulación confirmó que los reemplazos conservan el chequeo de
  licencia y condicionan los flags. Esos cambios funcionales de portada opcional
  ya estaban integrados en `main`; la migración adicional para cinco corridas
  está aplicada, y la segunda corrida ya creó un borrador en revisión. Suite
  23 archivos/117 pruebas, lint y build pasan en la validación histórica previa;
  typecheck pasó al ejecutarse secuencialmente (una primera ejecución paralela
  chocó con la generación de `.nuxt` y dio falsos errores). Handoff:
  `docs/agents/handoffs/2026-09-26-minimo-15-sin-portada.md`.

- **Corrida editorial diaria 2026-09-26 (parcial):** la API confirmó el runId
  `bc0378be-0cbb-4449-9d20-7db13d7b3e11`, siete categorías activas,
  cinco oportunidades acumuladas y checkpoint de agenda en las siete. Se
  reanudó sin duplicar la propuesta previa Colombia–México, que ya figura
  `published` por una acción ajena a esta corrida. La tarea entregó dos nuevas
  propuestas privadas en `review`: final femenina Cali–Santa Fe
  (`e77cb5e9-4e13-41f3-9e91-a412897e45b4`) e Inglaterra–España
  (`923ac0a0-19e4-4b50-b1c3-02bfedca5600`). Ambas tienen expediente,
  borrador, fuentes, SEO, foto original de Wikimedia Commons CC BY 4.0 con
  crédito y recibos de media/entrega. Quedaron dos expedientes incompletos:
  Colombia–Italia Sub-20 sin resultado final corroborado al cierre y FC 27 sin
  fotografía específica con licencia admitida. Fútbol colombiano suma tres
  oportunidades (dos entregas, una incompleta); Fútbol mundial una entrega;
  Gaming deportivo una incompleta; Tecnología deportiva, Tendencias,
  Especiales y Opinión quedaron en cero por falta de evidencia/encaje o enfoque
  humano. La corrida quedó `partial`, sin aprobar, programar ni publicar.
  Handoff: `docs/agents/handoffs/2026-09-26-corrida-propuestas-editoriales.md`.

- **Cierre de migraciones y validación (2026-09-26):** respecto a la nota
  histórica inferior, ya quedaron aplicadas en Supabase producción las cinco
  migraciones HU-ED-11–13 en orden: `codex_editorial_proposals`,
  `hu_ed_10_codex_agenda_checkpoints`,
  `hu_ed_12_aprobar_programar_siguiente_slot` y
  `hu_ed_13_worker_heartbeat_y_salud` y
  `hu_ed_13_cron_privilege_guard`. La segunda necesitó simplificar la
  validación de scores tras el primer intento de sintaxis; el segundo intento
  pasó y el historial remoto confirma las cinco versiones. No se modificaron
  filas de artículos ni programaciones existentes. `npm run lint`, typecheck,
  build, `git diff --check` y 111 pruebas (22 archivos) pasan. La regla editorial
  de 60 minutos sí se aplica tanto a nuevas reservas manuales como a las
  automáticas, según HU-ED-12; no desplaza horarios ya reservados. Revisión
  estática de API/RPC sin bypass de aprobación/publicación; el smoke test
  firmado desde Vercel ya responde. La primera llamada encontró que `service_role`
  no puede inspeccionar `cron`; la migración correctiva informa Cron como
  desconocido sin ampliar grants, y se verificó el RPC usando ese rol.
  Diagnóstico de producción: worker desconocido (sin latido), 2 ingestas fallidas,
  cero en cola/en curso, cero programadas vencidas y Cron desconocido. No se
  alteraron las dos ingestas ni horarios existentes. PR #10 quedó mergeado a
  `main` en `1e3cf28`; PR #11 también quedó mergeado en `044bd4e`. Ambos PR
  pasaron build, lint, typecheck y pruebas; Vercel generó los despliegues. Se excluye
  `pontela10.zip` (artefacto de respaldo) del commit; no se borra.

- **Tareas Codex activas (2026-09-26):** en el proyecto local canónico
  `C:\PONTE LA 10` quedó activa la tarea diaria de investigación y creación de
  borradores para todas las categorías, a las 06:00 America/Bogota, con meta de
  5–7 propuestas sólidas por categoría y estado `review` únicamente. También
  quedó activo un monitor operativo cada seis horas; solo consulta salud y puede
  reintentar una entrega técnica ya preparada e idempotente. Ninguna tarea puede
  aprobar, programar, publicar, despertar al worker ni reencolar ingestas. Node
  carga `.env` solo al proceso cliente mediante `--env-file-if-exists=.env`; no se
  imprimen credenciales. La PC y Codex Desktop deben estar encendidos para las
  ejecuciones locales. Primer diagnóstico seguro: worker desconocido (sin
  heartbeat), dos ingestas fallidas, ninguna en cola/procesando ni programación
  vencida; Cron queda desconocido porque `service_role` no inspecciona su esquema.
  No se modificaron esas ingestas ni publicaciones existentes.

- **Automatización editorial con Codex (registro histórico del corte local
  previo a integración; estado vigente arriba):** se
  inició HU-ED-10–13 en `codex/hu-ed-10-contenido-programado`, basada en `main`
  (`39acbb2`), preservando los cambios previos del árbol. Primer hito HU-ED-11:
  API privada firmada para cargar portada y entregar borradores en `review`, con
  HMAC/nonce de un solo uso, límites, esquema estricto, idempotencia, fuentes y
  trazabilidad; migración local y Skills de investigación/redacción/imagen. El
  responsable sigue siendo quien aprueba; no hay autoaprobación ni publicación.
  Typecheck, 110 pruebas unitarias, lint completo, build y `git diff --check` pasan.
  La revisión de seguridad confirmó firma ligada a método/ruta/requestId,
  nonce de un uso, límite durante streaming e idempotencia serializada; el
  adaptador sin streaming ahora falla cerrado. El build de producción local pasó;
  no se aplicaron las migraciones, ni se tocaron secretos/producción,
  ni se creó automatización. HU-ED-10 también tiene endpoints privados de
  contexto/agenda y checkpoints diarios deduplicados por 30 días, con hasta siete
  propuestas verificables por categoría, con motivo cuando el total acumulado
  termina por debajo de cinco. El contexto entrega también los temas públicos
  activos. Al reanudar, devuelve metadatos de propuestas ya creadas en esa
  corrida para saltarlas y no volver a pagar su redacción/portada.
  Las RPC usan `SECURITY INVOKER`, grants solo a service_role y no dependen de
  `auth.role()`; segunda revisión ACL confirma el cierre a clientes. SQL valida
  `trendTitle` y scores además de Zod. Los temas públicos nuevos ahora rechazan
  caracteres de control tanto en Zod como dentro de la RPC, alineado con la
  protección HU-ED-09. El revisor detectó y se corrigió el conteo
  no acumulativo al reanudar lotes: el checkpoint se calcula desde oportunidades
  persistidas por corrida/categoría, conserva el motivo si aún faltan hallazgos,
  lo limpia al llegar a cinco y rechaza más de siete en total. Zod permite enviar
  lotes parciales; el servidor decide según el acumulado. Revisión final sin
  riesgo nuevo; falta cobertura PostgreSQL para dos lotes y rollback al superar
  siete. La migración aún no se ejecutó localmente,
  por lo que la sintaxis/plpgsql y RPC no tienen verificación de integración.
  HU-ED-12 tiene un primer flujo local de **Aprobar y programar**: exige ambos
  permisos editoriales, MFA/AAL2, confirmación explícita y versión vigente; la
  RPC bloquea artículo/slot y registra aprobación + reserva en una transacción,
  usando el primer intervalo libre de 60 minutos en America/Bogota. Un trigger
  común serializa las reservas manuales y automáticas y bloquea colisiones; si
  no hay slot, conserva `approved` y notifica. La revisión SQL confirmó permisos,
  MFA y bloqueo compartido; los conflictos manuales se mapean a HTTP 409. Suite
  completa, typecheck y build pasan. La configuración desde UI y ejecución
  PostgreSQL siguen pendientes.
  HU-ED-13 tiene un primer hito local: heartbeat independiente cada 60 s que no
  bloquea al worker si la migración aún no está instalada; API privada firmada
  de salud resume worker, ingestas, lotes Codex, programadas vencidas y última
  ejecución de Cron, distinguiendo extensión ausente y job sin configurar.
  Incluye edades de cola/evidencia y atraso programado, y omite mensajes crudos
  de Cron. La Skill `pont3la10-operational-monitor` limita el chequeo a lectura.
  Los datos de heartbeat se purgan tras 30 días; una señal `stopping` caduca a
  desconectado en 120 s. La Skill de seis horas permite una sola recuperación
  técnica idempotente de entregas ya preparadas, sin generar de nuevo, reencolar
  ingestas ni publicar; Cron conserva sus reintentos propios. La Skill de portadas ahora usa
  `scripts/preparar-portada-codex.mjs` para verificar firma MIME/tamaño y
  preparar el payload binario sin imprimir base64. Hay checkpoints locales por
  candidato/etapa, portada almacenada por SHA-256, payload restringido al
  directorio aislado y exportación silenciosa de etapas para replay. Preparar el
  payload de portada ahora es reanudable: reutiliza el JSON existente solo si es
  idéntico y falla cerrado ante colisiones; dos pruebas cubren ambos casos. El CLI puede
  enumerar etapas de una corrida para reanudarla;
  la Skill `pont3la10-daily-editorial-run` coordina la
  reanudación sin repetir propuestas registradas ni cruzar aprobación humana.
  El CRM tiene una vista Operación de solo lectura protegida por
  `configuracion.ver` (propietario/administrador), con alertas globales y
  proyección de estado sin IDs, secretos ni mensajes crudos. El inicio del CRM
  ya describe los tres flujos actuales y enlaza al monitor para los roles
  habilitados. Revisión de seguridad sin bloqueantes. Suite completa (22
  archivos, 110 pruebas), lint, typecheck, build y `git diff --check` pasan. Revisión
  estática SQL sin bloqueantes; no hay PostgreSQL local para ejecutar las
  migraciones. Inspección de solo lectura a Supabase confirmó PostgreSQL 17.6,
  ninguna rama de desarrollo activa y que la lista remota aún no contiene las
  migraciones de 2026-09-26. Una consulta constante y sin escritura verificó que
  `[:cntrl:]` rechaza controles C0/C1 y acepta texto normal en esa versión; no
  valida la migración completa ni modifica datos.
  Bloqueo de automatización confirmado de nuevo el 2026-09-26: `list_projects`
  solo registra `PONTE LA 10` en OneDrive (`54ac99aa-ff11-473b-a742-42fdfa87e236`).
  No existe `C:\Users\juand\.codex\automations`, por lo que no hay una tarea
  local anterior que reusar o actualizar.
  No es el árbol canónico: allí Git está en `master`/`65afe48`, mientras
  `C:\PONTE LA 10` está en `codex/hu-ed-10-contenido-programado`/`39acbb2` con
  59 rutas modificadas o nuevas que deben preservarse. No programar la tarea
  diaria en el proyecto OneDrive. La inspección local de nombres de variables
  halló únicamente las dos públicas de Supabase; no existen en `.env` las
  variables privadas requeridas por el endpoint (`NUXT_CODEX_EDITORIAL_API_SECRET`
  y `NUXT_SUPABASE_SERVICE_ROLE_KEY`), ni la URL del cliente. Se añadieron los
  tres nombres a `.env.example` con URL local y secretos vacíos; no se mostraron
  valores. Pendientes:
  HU-ED-11 end-to-end, recuperación HU-ED-13, validación visual del monitor con
  sesión y pruebas PostgreSQL reales de todas las migraciones/API.

- **Imagen del login (2026-09-26, local):** se integró, con aprobación del
  responsable, una imagen genérica generada para el panel visual del login.
  Está en `public/editorial/login_pont3la10_tunel_estadio.png`; no incrusta logo
  ni texto y la marca del sitio sigue renderizada por separado. La imagen previa
  se conserva. No se publicó ni se desplegó este cambio.

- **Login y correos Auth (2026-09-26):** se corrigió en el proyecto Supabase
  `pont3la10` el `Site URL` que apuntaba a `http://localhost:3000/admin/login`;
  ahora es `https://www.pont3la10.com`. Se añadieron y verificaron tres destinos
  exactos: producción `/login`, `localhost:3001/login` y
  `127.0.0.1:3001/login`. Antes no existía ninguna Redirect URL, por lo que los
  enlaces de confirmación/recuperación podían caer al Site URL local. SMTP
  personalizado quedó activo con Brevo, remitente `contact@pont3la10.com`,
  nombre `Pont3la10`, relay Brevo y puerto 587. La clave permanece únicamente en
  el Dashboard. Se guardaron y previsualizaron las plantillas Confirm sign up y
  Reset password desde `supabase/templates/`; ambas conservan
  `{{ .ConfirmationURL }}`. Falta que el responsable inicie una recuperación o
  registro real para comprobar entrega en su bandeja; no se enviaron correos de
  prueba. El login de contraseña no dispara por sí mismo un correo: normalmente
  el mensaje corresponde a confirmación de cuenta o recuperación.

- **Navegación, horarios locales y paridad de resultados (2026-09-26):** el menú móvil es un panel agrupado con estados activos, enlace a cuenta y cierre con Escape; hay migas reutilizables en artículo, partidos de hoy y resultados en vivo. `/partidos-hoy` consulta y muestra horarios según la zona del navegador (Bogotá como respaldo); el indicador muestra una zona localizada y los enlaces relacionados son controles compactos. El usuario actualizó variables/deploy de Production; el deployment `8rXU7by5tM3LJApYWmR2k8qq82NZ` aparece Ready en `main` (`a1fa711`). Comparación del endpoint para `America/Bogota`: local y producción devolvieron 30 partidos y origen `mixto`; los tres primeros encuentros coincidieron. Por tratarse de datos en vivo, scores/estados pueden cambiar entre consultas. En el árbol local aún sin commit, rama `codex/ui-ux-publico` en `21483de`, están los cambios UI y de timezone, por lo que el deploy de `a1fa711` no incluye ese último ajuste visual. Lint, suite relacionada (10 pruebas), typecheck y `git diff --check` pasan. Build omitido para preservar el servidor de demo en 3001; verificación visual responsive sigue pendiente.
- **Actualizado:** 2026-09-25
- **Salida Vercel (2026-09-26):** el proyecto `ponte-la10` quedó creado en el equipo Hobby y `main` está desplegada en `https://ponte-la10.vercel.app`. El primer runtime respondió 500 porque faltaban las dos variables públicas de Supabase; se añadieron solo `NUXT_PUBLIC_SUPABASE_URL` y la clave `sb_publishable` en el entorno Production, sin trasladar secretos de DeepSeek ni credenciales/rutas del worker. El redeploy sirve Inicio y Noticias con contenido real. `pont3la10.com` no quedó conectado. El nuevo PR #8 propone los cambios de SEO que aún están en `codex/ui-ux-publico`; sus checks iniciales fallaron porque GitHub Actions no tenía origen canónico para `nuxt prepare`. Se agrega un origen `.invalid` exclusivo de CI; falta verificar todos los checks antes de integrar.
- **Commit base:** `3b2ec84` (`codex/hu-ed-08`)
- **Estado general:** HU-ED-07 y HU-ED-08 operan desde `C:\PONTE LA 10`. La ingesta durable genera el borrador automáticamente; la bandeja se actualiza en tiempo real y anuncia con una alerta global cuando el borrador queda listo.
- **Árbol de trabajo:** `C:\PONTE LA 10`. Los respaldos locales están ignorados por Nuxt para no duplicar el escaneo del proyecto.
- **Preflight de salida pública (2026-09-25):** `npm.cmd run typecheck` pasa al excluir `_RESPALDOS_POR_ELIMINAR/**` del proyecto TypeScript, conservando los tipos generados de `.nuxt`; la carpeta también queda ignorada por Git y no se borró. `nuxt.config.ts` usa `NUXT_PUBLIC_SITE_URL` o `VERCEL_PROJECT_PRODUCTION_URL` para el origen canónico y detiene builds de producción si ninguno existe, evitando canonicals/sitemaps en localhost. En copia temporal aislada (sin `.env`, demo intacta) pasaron ESLint completo, typecheck, 89 pruebas unitarias, build de producción y `git diff --check`. Los cambios quedaron committeados y empujados a `github/codex/ui-ux-publico` en `06548a7`; no se publicó producción. El dominio canónico confirmado es `pont3la10.com`; privacidad/términos muestran nombre, correo y domicilio Neiva, Huila, y omiten la identificación hasta autorización expresa. La integración Vercel conectada muestra el equipo `SomosNoobs' projects` pero ningún proyecto; el dashboard web está sin sesión y el asistente de deploy no está disponible. `pont3la10.com` no está disponible para registro (esto no verifica propiedad ni asignación DNS). Próximo paso: el usuario debe iniciar sesión en el dashboard de Vercel o cambiar a la cuenta/equipo correcto para importar GitHub, crear preview, configurar variables y verificarlo antes de producción. El worker seguirá en el PC del usuario y solo procesa mientras ese equipo y conexión estén activos.
- **SEO, páginas legales y lectura pública (2026-09-25, local):** el sitemap general pagina el catálogo público completo en grupos de 50 e incluye `/privacidad` y `/terminos`; el sitemap de Google News recorre la ventana móvil de 48 horas en páginas de 50. Se retiró `lastmod` inventado a partir de la publicación porque el DTO público no expone una modificación verificable. Privacidad y términos tienen contenido y presentación editorial responsive, canonical y `WebPage` JSON-LD. El artículo en tema azul recibe contraste claro para texto, listas, encabezados, fuentes y enlaces relacionados. Lint focalizado, `git diff --check` y rutas locales `/privacidad`, `/terminos`, una noticia, `/sitemap.xml` y `/news-sitemap.xml` respondieron correctamente. Build no ejecutado: Nuxt detectó activo el servidor de demo `3001`; no se detuvo ni se forzó sobre el mismo árbol. Pendiente completar identificación jurídica/domicilio del responsable en política de privacidad antes de tratarla como documento legal definitivo.
- **Preflight del worker (2026-09-23):** el worker ahora verifica al inicio las
  dependencias Python de TikTok (`imageio-ffmpeg`, `yt-dlp`,
  `faster-whisper`) después de autenticarse y antes de reclamar una ingesta.
  La instalación local fue completada y el worker informó
  `Worker listo: Supabase y dependencias de TikTok verificadas.`. Así una
  instalación incompleta se detecta antes de que una ingesta entre a proceso.
- **Idiomas de ingesta (2026-09-23):** el contrato completo admite códigos ISO
  detectados por el transcriptor, no solo `es`/`en`. Todo idioma distinto de
  español exige traducción estructurada de DeepSeek antes de persistir la
  evidencia. La migración `20260923031000_permitir_traduccion_de_cualquier_idioma.sql`
  ya se aplicó y verificó en Supabase; una prueba real detectó `ca`, alcanzó
  evidencia lista, se tradujo y creó el borrador
  `88ad178b-a089-49b4-9836-4a2b9aca2ea2` automáticamente.
- **Publicación programada (2026-09-23):** la tarea
  `pont3la10-publicar-programadas` quedó creada y activa en Supabase. Ejecuta
  cada minuto `public.publish_due_editorial_articles()`, por lo que un artículo
  en `scheduled` se publica sin depender de que permanezcan abiertos el
  navegador o el worker de TikTok. La migración versionada es
  `20260923023630_programar_publicacion_automatica.sql`.
  Se comprobó además una noticia aún en `scheduled`: su fecha real era
  `2026-09-24 03:27:00+00` (22:27 del 23 de septiembre en Colombia), por lo
  que el cron no debía publicarla todavía. El modal de programación ya forma
  el valor de `datetime-local` en horario local y no en UTC, evitando que la
  persona vea o reprograme una hora desplazada.
- **Presentación pública (2026-09-23):** las tarjetas ya no sustituyen una
  portada ausente con la imagen de estadio; omiten por completo el bloque de
  imagen. La navegación marca únicamente la categoría actual y el pie identifica
  el producto como propiedad de `labs.pont3la10.com`.
- **UI/UX pública (2026-09-23, rama `codex/ui-ux-publico`, sin integrar):** la
  home reemplaza el hero institucional por una portada editorial tomada del CMS
  (noticia destacada o la más reciente), conserva la franja de marcadores y usa
  una lista con horas para las últimas noticias. La navegación principal incluye
  Resultados y Especiales; Tech, Gaming, Tendencias y Opinión pasan al menú Más.
  Se añadió un house ad accesible e identificado de Pont3la10 Labs, filtros
  rápidos en Noticias, estados honestos para Especiales, breadcrumb de artículo,
  CTA comercial en el pie, registro directo con `?modo=registro`, cuenta pública
  separada y enlaces navegables en Tendencias. No se alteró CMS, Supabase ni el
  worker. Validaciones: lint, 89 pruebas unitarias, typecheck, build de Nuxt con
  `NUXT_IGNORE_LOCK=1` y revisión manual local. Falta revisión visual final del
  responsable y autorización para commit/integración a `main`.

## Terminado en el repositorio

- **Ajuste visual por referencia (2026-09-23, local):** home navy con acentos
  amarillos, apertura principal + tres secundarias, últimas junto al anuncio real
  `public/publicidad/pont3la10-labs.png`, resultados reutilizados y categorías
  compactas. `NoticiaPortada` y tarjetas de listado eliminan la imagen y su columna
  si está ausente o falla; el anuncio tiene alternativa textual si falla su imagen.
  Verificado en navegador a 1440 y 390 px, sin desborde horizontal móvil, anuncio
  real cargado. ESLint y 89 pruebas pasan. Corrección al reporte anterior:
  `npm run typecheck` NO está verde; descubre copias en `_RESPALDOS_POR_ELIMINAR`
  y un tipo incompatible de temporizador en `useAlertasEditoriales.ts:23`.
  No se modificaron estos archivos ajenos al ajuste visual.

- **Extensión visual a pestañas públicas (2026-09-24, local):** se añadió
  `useTemaPublico` para alternar modo azul y modo blanco clásico desde la cabecera,
  persistido en `localStorage` y aplicado al `body` sin acumular clases. La estética
  navy/amarilla de la home se extendió a Noticias, Resultados, Especiales y categorías
  públicas. `/articulos` fue rehecha como pantalla editorial tipo referencia: franja
  de marcadores, chips de categorías, noticia principal real, bloque de tendencias,
  grilla de últimas noticias, boletín y selección editorial, siempre desde artículos
  publicados y sin inventar contenido ni reservar espacios para imágenes ausentes.
  Verificado en navegador local: `/articulos`, categorías principales, `/resultados`
  y `/especiales` cargan 200, sin overflow desktop; móvil queda en una columna con
  filtros/carril horizontal. Lint, prueba focal de landing, build aislado y
  `git diff --check` pasan. `typecheck` falla por la deuda ya documentada:
  respaldos dentro de `_RESPALDOS_POR_ELIMINAR/...` y
  `composables/useAlertasEditoriales.ts:23`; no se observó fallo nuevo del cambio
  visual.

- **Resultados en modo azul (2026-09-24, local):** las tarjetas compactas de
  partidos y los estados de datos vacíos/error ya reciben la misma superficie
  navy, bordes y tipografía clara en cualquier pantalla que los reutilice
  (portada, listados y detalle), no solo en Inicio. El modo blanco conserva su
  variante clara. Se verificó en `/resultados` tanto con partidos como con el
  filtro vacío de "Siguiendo".

- **Pulido de Noticias y detalle deportivo (2026-09-24, local):** los filtros
  de Noticias ahora usan iconos de interfaz en lugar de abreviaturas, reducen
  su altura y conservan rutas reales. Una tendencia sin portada cambia a dos
  columnas, por lo que no reserva un hueco de imagen. El tema azul también cubre
  skeletons de Resultados, panel de eventos, minuto, marcador, iconos de gol,
  cambio y tarjeta, última jugada e indicadores: ya no quedan superficies
  blancas en el historial del partido. Verificado en Noticias de fútbol y en
  un detalle de partido con eventos reales.

- **Worker local de ingestas (2026-09-24):** se comprobó que no había ningún
  proceso `procesar_ingestas_durable.mjs` activo, lo que explica un registro
  que conservaba el estado `processing` al 45 %. Se volvió a iniciar con
  `npm.cmd run worker:ingestas`; superó autenticación y preflight de Supabase,
  yt-dlp y Whisper. La cola conserva dos fallos reencolables y el proceso
  durable se encargará de liberar una asignación expirada según su lease.

- Base Nuxt 3, identidad visual, sitio público y panel administrativo.
- Autenticación pública opcional y acceso editorial protegido, recuperación y MFA.
- CMS: taxonomías, borradores, autoguardado, versiones, multimedia y publicación.
- Artículos públicos, enlaces internos, tarjetas sociales, sitemap y robots.
- Resultados deportivos para fútbol, baloncesto, béisbol y tenis.
- Bandeja segura para registrar y gestionar ingestas editoriales.
- 10 migraciones versionadas en `main`, desde `0001` hasta `0010`.
- Memento local opcional instalado, con Codex registrado y datos fuera de Git.

## Parcial o activo

- **Destacada de portada y cambios con IA (local, pendiente de migración):** se
  preparó la migración `20260922122414_noticia_destacada_y_reescritura_ia.sql`.
  La portada deja de elegir implícitamente la última publicación: una persona
  con `contenido.publicar` y MFA puede marcar una sola noticia publicada como
  **Noticia destacada del día**; cambiarla reemplaza la anterior y queda en
  auditoría. La marca no se expone como tabla pública y se retira al archivar o
  reabrir la noticia. En **Solicitar cambios**, la persona revisora puede optar
  por enviar su instrucción una vez a DeepSeek. La IA solo reescribe el
  borrador en `changes_requested`; no aprueba ni publica. Hay una reserva
  idempotente, límite de espera superior al timeout del proveedor y trazabilidad
  privada para evitar cargos duplicados. La migración se aplicó en Supabase el
  2026-09-22 y se verificó la existencia de ambas tablas y RPC principales.
  Falta la prueba funcional con una cuenta MFA antes de habilitarlo en una demo
  remota.

- **HU-ED-09 (preparación editorial automática):** implementación local y SQL
  aplicado en Supabase el 2026-09-19.
  El worker obtiene un catálogo cerrado de secciones, temas y artículos ya
  publicados; DeepSeek solo puede devolver IDs de ese catálogo. Una RPC
  exclusiva del trabajador valida esos IDs, añade hasta tres enlaces internos,
  guarda los temas y pasa únicamente `draft` a `review`. No concede permisos de
  aprobar, programar ni publicar. La migración
  `20260918192005_hu_ed_09_preparacion_editorial_automatica.sql` quedó
  aplicada y se verificaron sus tres RPC y las dos nuevas columnas. Falta hacer
  una ingesta nueva de extremo a extremo con el worker local para certificar el
  comportamiento visual. Si la preparación no se puede completar, el borrador
  se conserva y la bandeja muestra una alerta de intervención editorial en lugar
  de anunciarlo como listo para revisión.
  Desde el 2026-09-23 también puede proponer hasta tres **temas públicos** si
  ninguno existente representa bien el asunto. La migración
  `20260923100000_temas_publicos_automaticos.sql` ya está aplicada y verificada
  en Supabase. La creación se deduplica por nombre/slug con bloqueo transaccional,
  omite temas inactivos y sucede dentro de la misma RPC que lleva el borrador a
  `review`: si falla la preparación no queda un tema huérfano. Solo
  `workerIngesta` tiene la capacidad, y se auditan los IDs creados. No crea
  categorías ni etiquetas internas.

- **HU-ED-08:** propuesta IA de borrador desde evidencia lista, con proveedor DeepSeek solo servidor, contrato Zod, reserva idempotente previa al proveedor, trazabilidad y RPC atómico. La generación es automática tras la evidencia. Cuando falla, un usuario con `ingestas.redactar` y `contenido.crear` dispone de **Reintentar borrador** en la bandeja: confirma el gasto, reutiliza la evidencia y bloquea duplicados mientras existe una reserva activa.
  La bandeja consulta la última traza autorizada de `editorial_ai_generations`: mientras
  está `running` muestra **Generando borrador con IA**, oculta el reintento y refresca
  cada cuatro segundos como respaldo a Realtime. El contrato actual pide 7–10 párrafos
  y 850–1.200 palabras cuando la evidencia lo soporte, con titular atractivo sin inventar;
  la fuente queda en su campo estructurado y no se inserta como párrafo en el cuerpo.
  DeepSeek recibe la evidencia y un catálogo interno, no un servicio de navegación web:
  no hay investigación ni fuentes externas verificadas implementadas todavía.
  El worker y el endpoint usan salida de texto con JSON extraído de forma tolerante,
  en lugar de `response_format: json_object`, porque ese modo puede devolver
  contenido vacío. Para la redacción se desactiva el razonamiento de DeepSeek y
  se reserva el límite de salida para el JSON final; la normalización reconstruye
  únicamente campos trazables de la evidencia antes de validarlos con Zod.
  La migración `20260917101500_recuperar_reservas_ia_interrumpidas.sql` está
  aplicada en Supabase: una reserva `running` de más de dos minutos se marca como
  interrumpida cuando se solicita el siguiente reintento, así nunca bloquea la
  ingesta de forma permanente.
  El worker recupera evidencia pendiente por RPC, limita a tres segmentos de
  contexto y solicita solamente IDs de fundamento al proveedor, evitando que
  una transcripción extensa trunque el JSON. La prueba real del 2026-09-18
  creó el borrador `755e4b0f-e319-4209-af6f-d9ae5e04e1db` desde la ingesta
  `447aee2a-d1a5-4793-8f6c-f87b0055fae6`.

- **HU-ED-07:** se trasladaron a esta rama local la propuesta de cola durable,
  extracción, transcripción, traducción y evidencia. La prueba local alcanzó
  `evidence_ready`; las migraciones `0013` y `0014` ya están aplicadas en
  Supabase remoto, pero falta la certificación funcional completa. Desde el
  2026-09-21 no hay un límite fijo de duración de TikTok: se mantienen la
  validación de duración positiva, máximo de 2.000 segmentos, limpieza, límite
  de recursos y timeout del worker. La migración
  `20260922025410_quitar_limite_duracion_tiktok.sql` quedó aplicada y una
  validación SQL confirmó que una evidencia de 181 segundos es aceptada.
- **Eliminación de ingestas:** el botón aparece a usuarios autorizados para todos
  los estados. La RPC `delete_editorial_ingestion` exige permiso, MFA y
  confirmación; elimina evidencia, historial y borrador automático. Protege
  procesos activos y contenido en revisión o publicado. La migración
  `20260917090000_eliminacion_total_ingestas.sql` se aplicó y su RPC se verificó
  en Supabase el 2026-09-17.
- **Sitio público sin contenido simulado (2026-09-21):** el inicio, listado y
  detalle consumen artículos publicados reales. Se retiraron métricas,
  titulares, especiales, newsletter y enlaces sociales que no correspondían a
  funciones o cuentas reales. La portada conserva solo marca, navegación y
  categorías; si no hay publicaciones, muestra un estado vacío honesto.
- **Acceso editorial (2026-09-21):** se ocultó temporalmente el botón de inicio
  de sesión con Google. El acceso por correo y contraseña permanece disponible;
  no se modificaron cuentas, sesiones ni la configuración remota de OAuth para
  poder reactivarlo sin migraciones cuando haga falta.
- **Flujo del editor:** una revisión ya no queda bloqueada por un autoguardado
  local que no se puede persistir en ese estado. Las decisiones se habilitan si
  no hay cambios editables pendientes; el editor explica cuándo aprobar y cuándo
  solicitar cambios. Los nuevos borradores completan SEO desde título y resumen
  cuando el proveedor lo omite, y la navegación compacta de etapas evita el
  desborde visual en pantallas estrechas. Portada y descripción SEO son
  recomendaciones visibles: no bloquean la aprobación, programación ni
  publicación de una persona autorizada.
  Desde el 2026-09-22, la capacidad de edición combina permiso y estado:
  solamente `draft` y `changes_requested` habilitan cambios. Así la interfaz no
  permite seleccionar portada ni guardar mientras el contenido está en
  `review`, `approved` o estados posteriores, que PostgreSQL ya rechazaba. Si
  el estado cambia en otra sesión durante un guardado, el editor se recarga y
  explica la siguiente acción en vez de dejar el error técnico como bloqueo.
- **Calidad de borradores IA:** el normalizador de DeepSeek y el worker ahora
  preservan los saltos reales de párrafo, consolidan solo fragmentos menores a
  55 palabras y eliminan atribuciones claras de fuente (incluidas URLs y
  créditos de TikTok) del cuerpo. La fuente permanece exclusivamente en los
  campos estructurados de fuente. El prompt exige párrafos desarrollados de
  70–140 palabras normalmente; esto aplica a nuevas generaciones y reintentos,
  no reescribe artículos ya creados.
- **Alineación de producción (2026-09-17):** la migración
  `20260917213028_permitir_publicacion_sin_metadatos_opcionales.sql` quedó
  aplicada en Supabase. Se verificó que el disparador ya no exige portada ni
  descripción SEO; título, resumen, categoría, cuerpo, fuente, permisos y MFA
  continúan siendo obligatorios. El contenido `37722690-209f-4c7e-a0e7-049325d517e7`
  pasó de `review` a `approved` como comprobación funcional.
- **Sitio público (2026-09-17):** la migración
  `20260917214050_restringir_consultas_publicas_a_publicados.sql` quedó
  aplicada en Supabase. Inicio, listado y detalle ya no usan artículos mock;
  las RPC públicas y los enlaces internos resuelven exclusivamente artículos
  con estado `published`.

## Bloqueos

- La última prueba real con `deepseek-flash` devolvió `content` vacío aun con
  razonamiento bajo. El adaptador quedó corregido a `reasoning_effort: none`; falta
  un reintento explícitamente autorizado para certificar el resultado final. La
  reserva que quedó activa por esa falla será recuperada por `0015` antes de ese
  próximo intento.

No hay bloqueos para consolidar los cambios locales validados en la rama de
producción. La certificación extremo a extremo de una nueva ingesta y de la
preparación editorial automática sigue siendo una prueba funcional pendiente,
no un impedimento para este corte.

## Deuda técnica confirmada

- Memento es un MVP externo instalado desde commits oficiales porque
  `memento-multiagent` no está publicado en PyPI.
- CI instala dependencias en cuatro jobs; se conserva para mantener checks independientes.
- `npm audit` reporta 14 vulnerabilidades en dependencias (5 moderadas, 8 altas
  y 1 crítica); requieren revisión separada, sin aplicar arreglos automáticos.
- Funciones `security definer` y usos históricos de `auth.role()` requieren auditoría SQL.
- Falta un entorno Python reproducible para el worker de TikTok.
- El estado remoto de RLS, Storage, Cron y migraciones no está certificado.
- Varias ramas `codex/*` antiguas siguen en remoto.

## Siguiente paso recomendado

Registrar una fuente real desde `/admin/ingestas` y esperar la generación
automática. Si la IA falla, revisar el código de error y usar **Reintentar
borrador** solo con autorización explícita del responsable editorial.

## Última validación conocida

**Atajo de portada (2026-09-23):** se añadió la migración
`20260923020009_portada_rapida_sin_cambiar_estado.sql`, ya aplicada y
verificada en Supabase mediante la función
`update_editorial_article_cover_fast(uuid,integer,uuid)`. En la presentación
del editor, **Cambiar portada** funciona también en `review`, `approved`,
`scheduled` y `published` cuando el usuario tiene el permiso correspondiente.
Actualiza exclusivamente la imagen y conserva el estado editorial; para
programados/publicados exige AAL2 y, al estar publicado, actualiza el snapshot
público. No habilita cambios de texto, SEO, etiquetas ni la eliminación de la
portada fuera de estados editables.

El 2026-09-17 pasaron lint de archivos cambiados,
`tests/unit/ingestasEditoriales.test.ts` (13 pruebas), `npm.cmd run typecheck`
y `git diff --check`. La interfaz local verificó botón, confirmación y bloqueo
durante la llamada; los errores de acciones ahora se muestran solo con la alerta
global. La migración `0015` devolvió éxito en Supabase. El servidor de desarrollo
está en `http://127.0.0.1:3001`.

**Pulido público y reintentos (2026-09-24):** la franja de marcadores ya
hereda el fondo completo del modo azul en Noticias y el modo blanco fuerza sus
superficies claras incluso cuando el componente se reutiliza fuera de Inicio.
Los enlaces de la franja y el menú “Más” usan iconos Lucide consistentes. Se
validaron visualmente ambos temas, `lint`, las 2 pruebas de `landing` y
`git diff --check`. Con sesión editorial de propietario se reencolaron las dos
ingestas fallidas: la primera avanzó a `Procesando` (1 %) y la segunda quedó en
cola con el worker local activo.

**Base SEO pública (2026-09-24):** se incorporaron las rutas evergreen
`/partidos-hoy` y `/resultados/en-vivo`, ambas alimentadas únicamente por el
endpoint real de resultados. Tienen title, descripción, canonical, JSON-LD,
estados vacíos útiles y enlaces al detalle existente; el sitemap las incluye.
Liga BetPlay, Selección Colombia y equipos quedan deliberadamente aplazados
hasta disponer de datos reales suficientes. La cabecera importa de forma
explícita `useTemaPublico`, eliminando el 500 que podía causar la resolución
automática desactualizada del composable durante desarrollo.

**Fotos con fuente y programación editorial (2026-09-26, local):** se cambió
el contrato de portadas del flujo Codex de ilustración generada a fotografía
reutilizable verificada contra la ficha de Wikimedia Commons (CC0 1.0, CC BY
4.0 o dominio público). El endpoint privado obtiene la atribución desde la API
de Commons y guarda el enlace de fuente; biblioteca, selección, vista previa y
artículo público muestran crédito y fuente. Se versionó la Skill de portada y
se actualizaron los documentos HU-ED-10/11. La migración
`20260926174021_codex_licensed_photo_attribution.sql` quedó aplicada en
Supabase y se verificó el contrato de las dos RPC. No se cambió el flujo de aprobación: la
propuesta sigue en `review` hasta que Juan use **Aprobar y programar**; esa
acción reserva la siguiente franja y el cron publica al llegar la hora.
Validado localmente: suite unitaria (23 archivos/114 pruebas), lint,
typecheck, build con `NUXT_IGNORE_LOCK=1` y `git diff --check`. El servidor
de demo continuó activo. El código aún requiere commit y despliegue.

**Redacción Codex con DeepSeek y SEO (2026-09-26, local):** en la rama
`codex/cinco-corridas-diarias` se añadió la ruta privada firmada
`/api/internal/codex/draft`. Codex entrega un expediente investigado y el
servidor llama al mismo proveedor/prompt y contrato de redacción DeepSeek usado
por ingestas; la respuesta estructurada incluye propuesta editorial, consultas
SEO limitadas a términos investigados (sin aceptar consultas inventadas por el
modelo), temas y artículos relacionados limitados al catálogo recibido. La generación
no crea ni aprueba un artículo: `/proposals` sigue siendo la entrega separada a
`review`. La migración nueva persiste el resultado idempotente en tabla privada
con RLS y RPC solo para `service_role`; si la llamada/guardado queda ambiguo,
bloquea el cobro repetido y admite a lo sumo un reintento explícito. La migración
`20260926234143` fija 15 minutos como separación mínima de slots y conserva
permisos, MFA y aprobación humana. Ambas quedaron aplicadas en Supabase
`ykjithahavncswlfgsqa` y se verificaron: tabla privada con RLS, RPC disponibles
solo para `service_role`, intervalo de 15 minutos y guard de aprobación
actualizado. El límite de cinco corridas ya coincidía con el registro remoto
`20260926195023`; se alineó el nombre del archivo local.

Se creó la Skill local `pont3la10-seo-editorial` y se actualizaron Skills y HUs
para cinco corridas/día, meta de cinco a siete por categoría cuando la evidencia
lo permita, piso total de 15 por corrida y SEO people-first. Suite unitaria
(24 archivos/123 pruebas), lint, typecheck y build Vercel pasaron
(`maxDuration: 120` confirmado en `.vc-config.json`). La ruta local rechaza
solicitudes sin firma con HTTP 401 antes de acceder a Supabase. El servidor Nuxt
de demo (PID 9708) siguió activo. Falta desplegar el endpoint y verificar las
variables runtime en Vercel sin revelar sus valores. Después se debe actualizar
la automatización editorial existente a cinco corridas diarias, usando solo la
ruta canónica `C:\\PONTE LA 10`, y sin generar contenido durante el despliegue.
No crear una automatización duplicada ni apuntarla al árbol OneDrive.

## Documentos posiblemente desactualizados

- `docs/ARQUITECTURA_INICIAL.md`: conserva el diseño de la primera etapa y no
  sustituye el estado verificado de este documento.
