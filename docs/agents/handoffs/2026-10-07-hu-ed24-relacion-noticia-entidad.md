# Handoff

- **Objetivo de la sesión:** Completar HU-ED-24: conectar noticias publicadas
  con entidades deportivas mediante relaciones editoriales confirmadas y usar
  esas relaciones en los hubs públicos.
- **Completado:** RPC de solo lectura por tipo/slug; endpoint público validado;
  equipos, competiciones y fichas de jugadores consultan relaciones
  estructuradas exclusivamente; retirado el fallback de coincidencias de texto.
  Se conserva el panel CMS de búsqueda/asociación ya existente. Migración
  `20261007065323_hu_ed24_noticias_entidad.sql` aplicada a Supabase Production
  `ykjithahavncswlfgsqa`. El smoke inicial detectó 503 por el resolver de
  entidades (latencia observada ~4,9 s); la migración
  `20261007070936_hu_ed24_reader_performance.sql` elimina esa revalidación cara
  durante la lectura y ya está aplicada en Production. El endpoint volvió a
  `200 []` (~1,0 s); competición, equipo y jugador también respondieron `200`.
- **Archivos modificados:** `server/api/articulos/entidad/[tipo]/[slug].get.ts`,
  `server/utils/repositorioContenidoEditorial.ts`,
  `server/utils/competicionesPublicas.ts`, `server/utils/equiposLigaPublicos.ts`,
  `pages/jugadores/[slug].vue`, migración de HU, pruebas de hubs y
  `docs/agents/ESTADO_ACTUAL.md`; además, migración de rendimiento
  `20261007070936_hu_ed24_reader_performance.sql`, test del contrato optimizado
  y este handoff.
- **Decisiones:** No buscar/rellenar entidades por texto en hubs. Mostrar solo
  relaciones confirmadas por el equipo editorial; los artículos no relacionados
  se omiten. No se hizo backfill ni escritura de contenido real. El `SECURITY
  DEFINER` público es intencional para lectura anónima de resúmenes públicos.
  El RPC escritor autentica, autoriza y valida la entidad antes de aceptar la
  relación confirmada; el lector conserva tipo/slug, publicación, versión,
  límites y `search_path=''`, no devuelve cuerpo ni grafo privado y no concede
  ejecución a `PUBLIC` ni `service_role`. Caveat: el vínculo persistirá si el
  resolver deja de reconocer el slug después, aunque solo expone una relación
  con contenido publicado. El asesor Supabase marca la RPC como acceso público
  `SECURITY DEFINER` esperado y lista otros avisos del proyecto.
- **Validaciones ejecutadas:** Prueba focal (4/4); suite completa (81 archivos,
  406 pruebas); `npm.cmd run lint` excluyendo solo el directorio ajeno no
  rastreado `.codex-validation-hu-seo11-20261006/`; `npm.cmd run typecheck`;
  `npm.cmd run build`; revisión independiente de seguridad; verificación en
  Production de migración, `search_path`, ACL (`anon`/`authenticated` sí,
  `service_role` no), API HTTP 200 y hubs HTTP 200. Las relaciones confirmadas
  siguen en cero. PR #82 pasó CI y Vercel; merge squash `ccc4635` quedó
  registrado y el smoke final de Production repitió HTTP 200 en las cuatro rutas.
- **Fallos:** El primer intento de test no cargó porque faltaba
  `NUXT_PUBLIC_SITE_URL`; se repitió con el dominio público no secreto y pasó.
  El lint sin exclusión escaneó el directorio ajeno no rastreado y mostró errores
  preexistentes de nombres Vue; excluyéndolo, el lint pasa. Supabase MCP aplicó
  la migración versión `20261007070936`, alineada con el archivo local. El build
  conserva la advertencia upstream Node `DEP0155`.
- **Pendientes:** Una persona editora debe asociar explícitamente noticias desde
  el CMS antes de que aparezcan en los hubs; no ejecutar una asociación
  automática. La RPC devuelve `[]` correctamente mientras no existan vínculos.
- **Siguiente acción exacta:** Si se desea mostrar noticias en hubs, confirmar
  relaciones desde el CMS con el equipo editorial. No repetir la migración ya
  aplicada y no incluir `.codex-validation-hu-seo11-20261006/` en cambios.
- **Commit base:** `7cbf26728a7e1eda297b73fa8abc5a3ea5a371cc`.
- **PR:** [#82](https://github.com/Davidmorales31/PonteLa10/pull/82), integrado.
- **Commit final:** `ccc463553ec47f07204cd3843c14443ebf2727bd`.
