# Handoff

- **Objetivo de la sesión:** campo nuevo de titular de portada (imagen del centro
  de noticias), distinto del título SEO/H1, para el enfoque editorial de fútbol
  colombiano. Pedido por el responsable el 2026-11-15.
- **Completado:** columna `articles.cover_headline` (opcional, 8–120 caracteres,
  sin espacios en los extremos); editor del CMS con el campo «Titular de portada»
  en el paso SEO y distribución; guardado atómico con control de versión; contrato
  de publicación automática Codex (`coverHeadline`); exposición pública
  `tituloPortada` en ficha, listados, por entidad, última con portada y destacada;
  tarjetas principal y secundaria, tarjeta de artículo y carrusel de Liga muestran
  el titular de portada y caen al título si falta. El H1, el `alt` de las imágenes
  y los metadatos SEO siguen usando el título.
- **Archivos modificados:** `supabase/migrations/20261115150000_titular_portada_articulos.sql`
  (nuevo), `types/contenidoEditorial.ts`, `types/editorial.ts`,
  `utils/editorial/contenido.ts`, `utils/editorial/tituloPortada.ts` (nuevo),
  `server/utils/repositorioContenidoEditorial.ts`,
  `server/utils/esquemasCodexEditorial.ts`, `server/utils/ai/deepseekRedaccion.ts`,
  `server/api/admin/contenidos/[id]/reescritura-ia.post.ts`,
  `pages/admin/contenidos/[id].vue`, `pages/index.vue`, `pages/articulos/index.vue`,
  `components/TarjetaNoticiaPrincipal.vue`, `components/TarjetaNoticiaSecundaria.vue`,
  `components/TarjetaArticulo.vue`, `components/publico/CarruselNoticiasLiga.vue`,
  `tests/unit/editorArticulo.test.ts`, `tests/unit/tituloPortada.test.ts` (nuevo),
  `tests/sql/tituloPortada.integration.mjs` (nuevo).
- **Decisiones:**
  - `cover_headline` no entra en las listas de columnas de los disparadores de
    bloqueo, versión y fechas. Se escribe solo desde
    `save_editorial_article_with_cover_headline` (que en la misma transacción llama
    al guardado vigente, y este crea la versión con `to_jsonb(new)`) o desde la
    aprobación IA antes de aprobar/programar. Así no hay versiones intermedias ni
    cambia `modified_at` por un ajuste de portada.
  - Sin permiso de columna para `authenticated`: un PATCH directo no puede escribir
    el titular. Lo hace `editorial_private.set_article_cover_headline`
    (SECURITY DEFINER estrecho: permiso, estado editable y versión esperada).
  - En el guardado, `NULL` conserva el titular (clientes con el bundle anterior),
    cadena vacía lo quita.
  - La ruta manual de propuestas Codex rechaza `coverHeadline` (no lo persiste);
    solo la ruta automática lo acepta.
  - La reescritura con IA nunca cambia el titular de portada.
  - Las funciones públicas se parchean con `pg_get_functiondef` + `replace` y
    guardas, mismo patrón que `20261105033000`; reaplicar es idempotente.
- **Validaciones ejecutadas:** lint PASS; suite 129 archivos / 705 pruebas PASS;
  typecheck PASS; build PASS (con `NUXT_PUBLIC_SITE_URL` público, el worktree no
  tiene `.env`); `git diff --check` PASS; integración SQL en PGlite
  (`node tests/sql/tituloPortada.integration.mjs`) 40 comprobaciones PASS contra
  las definiciones públicas reales vigentes y la aprobación IA real.
  Revisión independiente: sin P0; P1 de orden de despliegue y P2 aplicados.
- **Fallos:** primer intento SQL falló por objetos que el fixture mínimo no tiene
  en el listado filtrado; se desactivó solo la validación de cuerpos al aplicar la
  migración en la prueba (la ficha y el listado general sí se ejecutan).
- **Pendientes:** validación manual responsive/accesible del editor y de las
  tarjetas en navegador; aplicar la migración en Supabase; PR y despliegue con
  autorización.
- **Siguiente acción exacta:** **aplicar primero la migración
  `20261115150000_titular_portada_articulos.sql` en Supabase y después desplegar
  el código.** Si el código sale antes, el editor no abre artículos (columna
  inexistente) ni guarda (RPC inexistente). La migración es compatible con el
  código actual de `main`.
- **Commit base:** `7216853` (`main`). Rama `feat/titulo-portada`, worktree
  `.codex/worktrees/titulo-portada`.
- **Commit final:** sin commit.
