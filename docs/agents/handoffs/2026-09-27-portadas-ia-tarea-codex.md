# Handoff — Portadas IA exclusivas de la tarea Codex

- **Objetivo de la sesión:** automatizar portadas editoriales de IA únicamente
  en la tarea programada de Codex, después de redactar y validar el borrador,
  sin cambiar ingesta TikTok ni carga manual.
- **Completado:** nueva Skill `pont3la10-ai-editorial-cover`; checkpoint de
  imagen inmutable e idempotente; optimización WebP; carga privada `media-ia`
  con disclosure fijo, sin licencia ni fuente inventada; atribución visible en
  CMS; contrato de propuesta y RPC admiten la bandera exclusiva
  `ai_generated_cover`; se actualizan HU-ED-11 y el mapa de contexto. La tarea
  diaria existente conserva estado, proyecto, modelo y tres horarios, y ahora
  invoca la skill de portada IA y `imagegen`.
- **Archivos modificados:** `.agents/skills/pont3la10-ai-editorial-cover/`,
  `.agents/skills/pont3la10-daily-editorial-run/`,
  `server/api/internal/codex/media-ai.post.ts`, validación de propuestas y
  medios Codex, `scripts/codex-editorial-checkpoint.mjs`,
  `scripts/preparar-portada-ia-codex.mjs`, vista de contenidos, pruebas,
  `docs/HU_ED_11_CONTENIDO_DESDE_INVESTIGACION.md`,
  `docs/agents/MAPA_CONTEXTO.md` y migración
  `supabase/migrations/20260928010850_codex_ai_generated_covers.sql`.
- **Decisiones:** solo la tarea programada de Codex usa ImageGen; no se
  autoriza una imagen que aparente documentar un evento real. La portada puede
  omitirse; el borrador sigue en `review` y requiere aprobación humana. Los
  reintentos reutilizan exactamente la imagen ya guardada.
- **Validaciones ejecutadas:** lint, typecheck, suite unitaria (28 archivos,
  141 pruebas), build y `git diff --check` exitosos; pruebas específicas de
  checkpoint/esquema/migración exitosas después del arreglo SQL. Supabase
  Production verificó la migración, privilegios y contrato de imagen IA. PR #23
  mergeado a `main`; Vercel confirmó el despliegue del commit
  `308827a1bd919efabdad587d0e6f077df66154a4`; POST sin firma a la nueva ruta
  devuelve 401, confirmando que permanece privada.
- **Fallos:** el primer intento de ejecutar la migración revirtió por un
  paréntesis adicional en el SQL; se corrigió, se volvió a aplicar y se verificó
  la versión `20260928010850`. No hubo cambios persistentes en el primer intento.
- **Pendientes:** no se ejecutó una corrida editorial real ni una generación
  ImageGen de prueba. En la próxima corrida programada confirmar que una
  propuesta recibe una portada y recibo `media-ia`, que se muestra su disclosure
  en el CMS y que se mantiene en revisión; confirmar también fallback de texto
  si ImageGen falla.
- **Siguiente acción exacta:** inspeccionar el resultado de la próxima ejecución
  de `Pont3la10 · propuestas editoriales diarias` y revisar sus checkpoints y
  recibos reales, sin aprobar ni publicar ninguna noticia automáticamente.
- **Commit base:** `3890024afb70238a2bf93a1e1db9972e8573969e` (`main` previo).
- **Commit final:** `308827a1bd919efabdad587d0e6f077df66154a4` (PR #23, integrado
  y desplegado en Production).
