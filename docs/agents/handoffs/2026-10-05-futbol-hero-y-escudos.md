# Handoff

- **Objetivo de la sesión:** integrar los assets visuales de las páginas SEO de
  partido y reducir el riesgo de repetir el agotamiento de cuota de proveedores.
- **Completado:** se añadió un fondo de estadio neutral, un loop MP4 genérico de
  8 segundos en 16:9 y 9:16, poster estático, respeto de `prefers-reduced-motion`
  y fallback visual si falla el video. Los carteles dinámicos incrustan escudos
  WebP locales (36 equipos) y conservan iniciales como fallback. Se retiraron dos
  MP4 generados anteriormente que llevaban identificadores de partidos
  específicos. La protección de cuotas ya está en el código de Production:
  mínimo de 5 min, máximo de 3 actualizaciones de detalle por ciclo, persistencia
  de listados diarios y topes duros Goal API 950 / API-Football 90.
- **Archivos modificados:** `components/publico/PlantillaPartidoSeo.vue`,
  `server/api/partidos-seo/[slug]/imagen.get.ts`, nuevos utilitarios de cartel y
  escudos, 36 escudos WebP optimizados, assets WebP/MP4, pruebas unitarias y
  documentación de estado/handoff.
- **Decisiones:** el GIF de referencia con fixture identificable no se reutiliza
  como fondo universal para evitar atribuir fecha/equipos incorrectos. El video
  nuevo es atmósfera genérica; nombres, escudos, marcador, fecha y sede se
  superponen desde datos del fixture en el hero y el cartel PNG. No se añaden
  proveedores, llamadas pagadas, migraciones ni cambios de datos. La aprobación
  humana editorial continúa obligatoria.
- **Validaciones ejecutadas:** `npm ci` ya estaba ejecutado en el worktree;
  ESLint global, suite (59 archivos/291 pruebas), typecheck y build pasaron. Dos
  pruebas del renderizador confirmaron PNG 1200×628, inclusión de escudos reales
  y fallback por iniciales. Build con aviso upstream `DEP0155` de `@vue/shared`.
- **Fallos:** el primer test intentó importar directamente el handler Nuxt y
  falló porque `defineEventHandler` no existe en Vitest aislado; se separó el
  renderizador a un utilitario puro y las pruebas focalizadas pasan. La API de
  Vercel devolvió 403 al listar deployments y el CLI Vercel no está instalado.
- **Pendientes:** abrir/integrar el cambio por GitHub y esperar el deploy de
  Vercel; verificar HTTP de Production y URL de imagen en un fixture vigente.
  La automatización semanal/diaria de la programación oficial DIMAYOR a
  `colombian_league_fixtures` sigue pendiente. El PC no tenía worker ni servidor
  local activos; el refresco automático depende de reactivar el proceso local.
  Este candidato no crea un video social personalizado por partido. Viewport
  móvil y prueba visual del nuevo hero quedan pendientes del preview remoto.
- **Siguiente acción exacta:** revisar `git diff --check` y el diff acotado,
  commitear solo estos archivos en `codex/futbol-cuota-pacing`, empujar la rama,
  abrir un PR a `main`, esperar CI/preview, integrar y hacer smoke HTTP en
  `www.pont3la10.com`.
- **Commit base:** `f9bd75fed1fa92bb704d4e3c12219b95a4ffb763` (`origin/main`).
- **Commit final:** pendiente.
