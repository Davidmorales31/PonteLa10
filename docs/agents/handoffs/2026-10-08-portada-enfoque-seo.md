# Handoff

- **Objetivo de la sesión:** avanzar el rediseño de la portada según el orden de
  utilidad deportiva y SEO del documento maestro, conservando la identidad
  visual Pont3la10.
- **Completado:** portada SSR con jornada de fútbol de hoy, partidos/results,
  Liga BetPlay, agenda oficial de Selección, perfiles/noticias de colombianos en
  Europa, actualidad editorial, análisis y espacios comerciales. Se añadieron
  filtros utilitarios y tarjetas de artículo. La revisión móvil detectó y
  corrigió el contraste del H1 en tema oscuro.
- **Archivos modificados:** `pages/index.vue`, `components/FranjaMarcadores.vue`,
  `components/TarjetaArticuloPortada.vue`, `utils/portadaPublica.ts`,
  `assets/css/landing.css`, pruebas de portada y este handoff; también se añadió
  el estado factual en `docs/agents/ESTADO_ACTUAL.md`.
- **Decisiones:** se reutilizan endpoints públicos existentes y no se agregan
  llamadas directas a proveedores. Las noticias se filtran por contenido y
  categoría; no se inventan canales, convocados ni datos deportivos. El
  documento maestro es un roadmap; solo se implementó el alcance de la portada.
- **Validaciones ejecutadas:** `npm.cmd run lint`, `npm.cmd run test:unit`
  (111 archivos, 569 pruebas), `npm.cmd run typecheck`, build de producción con
  salida aislada, `git diff --check`, smoke HTTP local 200 y comprobación visual
  del primer ingreso, consentimiento y temas claro/oscuro. Build advierte
  DEP0155 en una dependencia upstream de Vue/Nuxt.
- **Hidratación:** se reprodujo el mismatch en el primer ingreso cuando el SSR
  renderizaba un control distinto al cliente por el consentimiento persistido.
  `AvisoAnalitica` ahora espera al montaje antes de mostrarlo; `useTemaPublico`
  difiere lectura/escritura de almacenamiento y maneja su bloqueo. La visita
  limpia al preview mostró el aviso sin cambiar la elección del usuario. No se
  habilitó `allow-same-origin` en el iframe publicitario.
- **Límites de la prueba:** el preview local no tiene backend de producción, por
  lo que no certifica datos deportivos/editoriales reales ni el `Failed to fetch`
  de sesión Supabase reportado en Production. La interacción observada confirma
  lectura/visibilidad; no sustituye un smoke con datos en producción.
- **Estado de publicación de portada:** PR #128 integró `208a60d` y la nota de
  estado en `95f25575d30ec904a6880bf9ba4c76416886a9eb`. Vercel Production
  `DaawAHdpH6SrWeyr4KxoXgJLAUC3` está `Ready`, con dominio `www.pont3la10.com`.
  La vista pública `/`, `/partidos-hoy` y `/liga-colombiana` respondió y el
  deployment indica como fuente el merge de `main`; no se intentó evadir la
  protección de GitHub.
- **Revalidación de datos:** el worker local terminó su ciclo sin consumir cuota
  de proveedor para la clasificación. Supabase confirmó 20 filas de Liga A y
  16 de Torneo B actualizadas a las 22:45 COT. Dos partidos quedaron con
  resultado final verificado; otros dos siguen pendientes de confirmación.
- **Ajuste móvil integrado:** PR #129 se fusionó por squash como
  `fee72379b0622c3a65379bdcd2a5fd90de634021`; los cuatro checks de CI pasaron y
  Vercel reportó `success` para el commit de `main`. En Production,
  `/jugadores/luis-diaz` responde HTTP 200; su JavaScript referencia el CSS
  servido `default.FmEej3R6.css`, que contiene el `@media(max-width:680px)` que
  oculta el botón flotante. El HTML conserva el botón de preferencias del pie.
  La captura visual final a 390×844 quedó pendiente porque CUA agotó tiempo dos
  veces; no se alteró Deployment Protection ni el consentimiento.
- **Validaciones:** prueba focal (9/9), suite (111 archivos/570 pruebas), lint
  focalizado, typecheck, build, CI completo y `git diff --check` pasan. El build
  mantiene la advertencia upstream DEP0155 en `@vue/shared`.
- **Límites:** no se inventan marcadores, canales ni convocatorias. El preview
  local no tiene dataset de producción. No incluir artefactos locales de build
  ni el handoff ajeno `2026-10-08-revalidacion-hu-gro-seo10.md`.
- **Pendientes:** completar una captura visual a 390×844 cuando la automatización
  del navegador responda. Después continuar la auditoría del resto de HUs del
  roadmap; la recolección GA4, Search Console y newsletter conservan las
  dependencias externas indicadas en `ESTADO_ACTUAL.md`.
- **Siguiente acción exacta:** revisar el layout a 390×844 y continuar con la
  siguiente HU implementable; no declarar cerrado el roadmap completo.
- **Commit base de portada:** `d25eb6560b760829f7f5419295f4dffde9dbf459`.
- **Commit de portada:** `208a60d` (integrado por PR #128).
