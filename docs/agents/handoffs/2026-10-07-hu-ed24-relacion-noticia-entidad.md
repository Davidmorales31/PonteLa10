# Handoff

- **Objetivo de la sesión:** Completar HU-ED-24: conectar noticias publicadas
  con entidades deportivas mediante relaciones editoriales confirmadas y usar
  esas relaciones en los hubs públicos.
- **Completado:** RPC de solo lectura por tipo/slug; endpoint público validado;
  equipos, competiciones y fichas de jugadores consultan relaciones
  estructuradas exclusivamente; retirado el fallback de coincidencias de texto.
  Se conserva el panel CMS de búsqueda/asociación ya existente. Migración
  `20261007065323_hu_ed24_noticias_entidad.sql` aplicada a Supabase Production
  `ykjithahavncswlfgsqa`.
- **Archivos modificados:** `server/api/articulos/entidad/[tipo]/[slug].get.ts`,
  `server/utils/repositorioContenidoEditorial.ts`,
  `server/utils/competicionesPublicas.ts`, `server/utils/equiposLigaPublicos.ts`,
  `pages/jugadores/[slug].vue`, migración de HU, pruebas de hubs y
  `docs/agents/ESTADO_ACTUAL.md`; además, continuidad documental de HU-ED-20.
- **Decisiones:** No buscar/rellenar entidades por texto en hubs. Mostrar solo
  relaciones confirmadas por el equipo editorial; los artículos no relacionados
  se omiten. No se hizo backfill ni escritura de contenido real. El `SECURITY
  DEFINER` público es intencional para lectura anónima de resúmenes públicos:
  valida entidad, versión publicada y relación confirmada, limita respuesta,
  fija `search_path=''`, no devuelve cuerpo ni grafo privado y no concede
  ejecución a `PUBLIC` ni `service_role`.
- **Validaciones ejecutadas:** Pruebas relacionadas (3 archivos, 22 pruebas);
  suite completa (81 archivos, 405 pruebas); `npm run lint` excluyendo solo el
  directorio ajeno no rastreado `.codex-validation-hu-seo11-20261006/`;
  `npm run typecheck`; `npm run build`; revisión estática independiente de
  seguridad/migración; verificación en Production de RPC, `search_path`, ACL,
  salida `[]` para `competition/liga-betplay`, y cero relaciones confirmadas.
  `git diff --check` queda pendiente tras la actualización final de documentos.
- **Fallos:** El primer intento de test no cargó porque faltaba
  `NUXT_PUBLIC_SITE_URL`; se repitió con el dominio público no secreto y pasó.
  El lint sin exclusión escaneó el directorio ajeno no rastreado y mostró errores
  preexistentes de nombres Vue; excluyéndolo, el lint pasa. El CLI de Supabase
  no está instalado; la migración se ejecutó y verificó mediante Supabase MCP.
  El asesor Supabase reporta un warning esperado para esta RPC pública
  `SECURITY DEFINER`, y otros avisos preexistentes del proyecto.
- **Pendientes:** PR, CI/Preview, merge y smoke de rutas/API en Production. Una
  persona editora debe asociar explícitamente noticias desde el CMS antes de que
  aparezcan en los hubs; no ejecutar una asociación automática.
- **Siguiente acción exacta:** Terminar PR de la rama actual, esperar pruebas y
  Preview, integrar a `main`, comprobar Vercel Production y hacer GET público a
  una competición, un equipo y un jugador; verificar HTTP 200 y que los bloques
  de noticias permanezcan vacíos hasta que el CMS tenga relaciones confirmadas.
- **Commit base:** `a96016bd9e9ba5604bc2c55090a08247c0e80ad5`.
- **Commit final:** sin commit.
