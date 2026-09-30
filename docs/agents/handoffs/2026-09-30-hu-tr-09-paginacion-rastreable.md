# Handoff

- **Objetivo de la sesión:** implementar HU-TR-09 del backlog maestro v4:
  permitir llegar al archivo de noticias por rutas SSR estables.
- **Completado:** se agregó `/articulos/pagina/[pagina]`, con validación decimal
  canónica y rango soportado por el offset de la API; `/pagina/1` redirige
  permanentemente al listado raíz y una página posterior sin resultados da
  404. La página SSR pide el segmento correspondiente a la API, muestra la
  página completa, y enlaza anterior/siguiente mediante anchors de Nuxt con
  nombres accesibles, `rel` y estado actual. La carga progresiva sigue
  disponible en página 1. Canonical diferencia página y categorías conocidas;
  búsquedas, temas y filtros ambiguos no se indexan. JSON-LD numera artículos
  en su posición global y la analítica incorpora `pagination_view` y
  `pagination_next` bajo el consentimiento ya existente, sin transmitir el
  texto de búsqueda. No se añadió esquema de base de datos; el API de HU-TR-08
  ya ordena establemente por fecha de publicación e ID.
- **Archivos modificados:** `pages/articulos/index.vue`,
  `pages/articulos/pagina/[pagina].vue`, `utils/paginacionArticulos.ts`,
  `plugins/analiticaPublica.client.ts`, `composables/useAnaliticaPublica.ts`,
  `assets/css/landing.css`, `tests/unit/paginacionArticulos.test.ts`,
  `docs/agents/ESTADO_ACTUAL.md` y este handoff.
- **Decisiones:** solo se canonicalizan páginas y categorías reconocidas; los
  filtros de búsqueda/tema o entradas repetidas quedan `noindex` para evitar
  combinaciones indexables ilimitadas. El rango máximo de página deriva del
  límite de offset existente (100 000, tamaño de página 20), sin ampliar el
  contrato del servidor ni introducir cursor/modelo nuevo. Solo un resultado
  vacío confirmado (estado `success`) se trata como página inexistente; una
  caída del backend sigue mostrándose como error, no como 404 ni lista vacía.
- **Validaciones ejecutadas:** `npm.cmd ci`; `npm.cmd run lint`;
  `npm.cmd run test:unit -- tests/unit/paginacionArticulos.test.ts` (13);
  `npm.cmd run test:unit` (31 archivos/177 pruebas);
  `npm.cmd run typecheck`; `npm.cmd run build`;
  `git diff --check`. Se usó `NUXT_PUBLIC_SITE_URL=https://www.pont3la10.com`
  para validar/build, según el origen canónico documentado. HTTP local:
  `/articulos` 200, `/articulos/pagina/1` 301, `/pagina/01` 404,
  `/pagina/5002` 404, `/pagina/2` 200 con fallback por falta de backend.
  El navegador integrado confirmó render SSR no vacío, título de página 2 y
  fallback accesible; `agent-browser` no está instalado.
- **Fallos:** la primera invocación de pruebas sin `NUXT_PUBLIC_SITE_URL`
  falló por la protección de `nuxt.config.ts`; al definir el dominio canónico
  público las validaciones pasan. La copia aislada no tiene configuración
  pública de Supabase, por lo que el fetch de artículos cae en el estado de
  error. El navegador no pudo comprobar artículos reales, el canonical/enlaces
  de una página poblada ni el cambio de viewport responsive. Build muestra una
  advertencia deprecada upstream de `@vue/shared`; `npm ci` informó 15
  vulnerabilidades (6 moderadas, 8 altas, 1 crítica) en dependencias instaladas;
  no se cambió el manifiesto/lockfile ni se intentó una actualización masiva.
- **Pendientes:** abrir una PR apilada sobre `codex/hu-tr-08-server-filter`,
  verificar sus checks remotos y mantenerla abierta, sin aprobación ni merge.
  Completar la verificación visual responsive y con Supabase disponible antes
  de integrar/desplegar. Después continuar con HU-TR-10 en otro worktree y
  releer instrucciones, estado, mapa y Memento.
- **Siguiente acción exacta:** crear la PR de esta rama contra
  `codex/hu-tr-08-server-filter`; luego esperar CI/Preview, sin cambiar estados
  editoriales, desplegar producción, aprobar o fusionar.
- **Commit base:** `6b8e2b7` (`codex/hu-tr-08-server-filter`).
- **Commit final:** pendiente de commit | `<sha>`.

PR: pendiente de creación.
