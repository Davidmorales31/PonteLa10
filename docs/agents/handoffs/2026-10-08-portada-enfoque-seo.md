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
- **Ajuste posterior en curso:** el botón flotante de privacidad se superponía a
  texto en móvil (390×844). El cambio local lo oculta hasta 680 px y conserva
  el control del pie. Su prueba focal (9/9), suite completa (111 archivos/570
  pruebas), lint focalizado, typecheck y build pasan; `git diff --check` pasa.
  La revisión visual del fix y su despliegue aún están pendientes. El build
  mantiene la advertencia upstream DEP0155 en `@vue/shared`.
- **Límites:** no se inventan marcadores, canales ni convocatorias. El preview
  local no tiene dataset de producción. No incluir artefactos locales de build
  ni el handoff ajeno `2026-10-08-revalidacion-hu-gro-seo10.md`.
- **Pendientes:** enviar el ajuste móvil por PR, esperar los checks requeridos,
  integrar solo si pasan, verificar Vercel Production y repetir inspección
  visual móvil. Luego continuar la auditoría del resto de HUs del roadmap; la
  recolección GA4, Search Console y newsletter conservan las dependencias
  externas indicadas en `ESTADO_ACTUAL.md`.
- **Siguiente acción exacta:** PR protegido para el fix móvil; tras el merge,
  confirmar `Ready`, rutas públicas y layout a 390×844. Después reanudar la
  siguiente HU implementable desde la matriz, sin declarar cerrado el roadmap.
- **Commit base de portada:** `d25eb6560b760829f7f5419295f4dffde9dbf459`.
- **Commit de portada:** `208a60d` (integrado por PR #128).
