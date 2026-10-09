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
- **Estado de publicación:** `main` remoto fue comprobado en
  `80ed373be1b6ff08ddb45bcc34e2e82d530f6dbf`; el cambio quedó en el commit local
  `208a60d`. GitHub rechazó el push a `main` porque exige PR y cuatro checks. No
  se intentó alterar o evadir la regla. La versión todavía no está en
  producción. No incluir artefactos locales de build ni el handoff ajeno
  `2026-10-08-revalidacion-hu-gro-seo10.md`.
- **Pendientes:** desplegar y verificar las rutas públicas; auditar el resto de
  HUs del roadmap contra producción y continuar con las que sean implementables.
  Algunas tareas analíticas/editoriales dependen de acceso real a GA4, Search
  Console o un proveedor de newsletter; no inventar esos datos.
- **Siguiente acción exacta:** seguir el flujo requerido de PR, esperar los
  cuatro checks, fusionar únicamente si pasan, confirmar Vercel Production
  `ponte-la10`/equipo `somosnoobs` en estado READY y probar las rutas públicas;
  después continuar la auditoría del roadmap.
- **Commit base:** `d25eb6560b760829f7f5419295f4dffde9dbf459`.
- **Commit del cambio:** `208a60d` (local, pendiente de PR/checks/integración).
