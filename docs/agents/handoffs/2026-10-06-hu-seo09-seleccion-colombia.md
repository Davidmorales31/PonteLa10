# Handoff

- **Objetivo de la sesión:** completar el hub de Selección Colombia con agenda,
  marcadores verificados, convocatorias, noticias y SEO sin consumir cuotas de
  proveedores deportivos.
- **Completado:** `/seleccion-colombia` muestra los partidos oficiales FCF
  conocidos al 2026-10-06, resultados recientes confirmados, convocatoria
  masculina (26) y femenina (23, con sustitución oficial de Ilana Izquierdo por
  Sara Sofía Martínez), noticias editoriales y enlaces por jugador a búsquedas
  relacionadas. El resultado del proveedor solo aparece si el endpoint público
  lo confirma; no se inventa marcador/hora. Se usa el endpoint existente, con
  caché compartida y refresco visual de 60 segundos. Canonical y JSON-LD se
  integran en el `useSeoPont3la10` del hub padre sin duplicarlo. Sitemap y gate
  de indexación aceptan tres o más datos oficiales recientes, aun sin tres
  noticias, y excluyen la sección cuando estos datos quedan vencidos.
- **Archivos modificados:** `components/publico/HubEditorialPublico.vue`,
  `pages/seleccion-colombia.vue`, `server/routes/sitemap-hubs.xml.get.ts`,
  `utils/indexabilidadPublica.ts`, `utils/seleccionColombia.ts`,
  `data/seleccionColombia2026.ts`, `tests/unit/seleccionColombia.test.ts`,
  `tests/unit/indexabilidadPublica.test.ts`, `tests/unit/sitemapPublico.test.ts`,
  `docs/agents/ESTADO_ACTUAL.md` y este handoff.
- **Decisiones:** no escribir en Supabase ni consultar API-Football/Goal API;
  el endpoint público existente lee la base de datos y su caché compartida evita
  llamadas de cliente directas a proveedores. Se conserva el único slot
  Adsterra del hub editorial, que aparece si hay al menos tres publicaciones y
  solo según su consentimiento existente. No se crean fichas de jugador sin la
  siguiente HU-SEO-10; los nombres enlazan a búsqueda editorial. Las fechas y
  plantillas estáticas requieren revisión FCF; si superan 60 días se retiran del
  gate de sitemap/indexación.
- **Fuentes oficiales verificadas:** [calendario FCF](https://www.fcf.com.co/calendario/),
  [convocatoria masculina](https://fcf.com.co/2026/09/17/convocatoria-de-la-seleccion-colombia-de-mayores-amistosos-internacionales-de-septiembre-octubre-2026/),
  [convocatoria femenina](https://fcf.com.co/2026/10/02/convocatoria-seleccion-colombia-femenina-de-mayores-fecha-fifa-octubre-2026/),
  [reemplazo de convocatoria](https://fcf.com.co/2026/10/05/ilana-izquierdo-no-se-unira-a-la-concentracion-de-la-seleccion-colombia-femenina/),
  [empate ante México](https://fcf.com.co/2026/09/26/colombia-obtiene-un-empate-en-la-primera-fecha-fifa-de-septiembre/),
  [derrota ante Paraguay](https://fcf.com.co/2026/10/02/la-seleccion-colombia-completa-su-segundo-compromiso-amistoso/).
- **Validaciones ejecutadas:**
  - Pruebas relacionadas (`seleccionColombia.test.ts` e
    `indexabilidadPublica.test.ts`): 2 archivos / 11 pruebas pasaron.
  - Suite completa: 76 archivos / 375 pruebas pasaron.
  - `npm.cmd run lint`: pasó.
  - `npm.cmd run typecheck`: pasó.
  - `npm.cmd run build` con `NUXT_PUBLIC_SITE_URL=https://www.pont3la10.com`:
    pasó; permanece aviso upstream `DEP0155` de `@vue/shared`.
  - Smoke local de producción: `/seleccion-colombia` HTTP 200, H1 y canonical
    únicos correctos, calendario/convocatorias presentes, tres ItemLists en el
    HTML y `robots=index, follow`. El servidor de smoke se detuvo al terminar.
  - Smoke Production existente (código previo a esta HU): página 200 y API
    `/api/resultados` 200 con `origen=base-datos`; no valida aún la nueva UI.
  - `git diff --check`: pasó antes de la documentación final; repetir al cerrar.
- **Fallos:** el primer test no pudo preparar Nuxt sin dominio canónico; se
  repitió pasando `NUXT_PUBLIC_SITE_URL` solo al proceso. La primera suite
  completa encontró una aserción estática obsoleta del sitemap, actualizada para
  la nueva regla; repetición completa pasó. Typecheck detectó dos tipos que se
  corrigieron antes de la compilación.
- **Entrega Production:** PR #72 se integró el 2026-10-06 por squash como
  `2fb69800fd2c5e31a00efc728ee283ed55f8b491`. El smoke posterior confirmó
  `/seleccion-colombia`, `/sitemap-hubs.xml` y el endpoint
  público de resultados mediante HTTP 200; el calendario, canonical, robots,
  convocatorias y tres ItemLists llegaron en SSR. El endpoint devolvió diez
  partidos del día desde `base-datos`.
- **Pendientes:** falta validación visual manual responsive/accesible en modo
  claro y oscuro. La verificación de horarios y convocatorias necesita revisión
  FCF cuando cambien; no existe tarea automática de scraping. El listado de
  jugadores enlaza búsquedas, no perfiles: continúa HU-SEO-10. HU-GRO-01 requiere
  una visita de prueba con consentimiento y DebugView; HU-GRO-02 requiere una
  propiedad de Search Console verificada.
- **Siguiente acción exacta:** ver
  `docs/agents/handoffs/2026-10-07-hu-seo09-resultado-pendiente.md`; continuar
  después con HU-SEO-10.
- **Commit base:** `723adcf` (`origin/main`).
- **Commit final:** `2fb69800fd2c5e31a00efc728ee283ed55f8b491`.
