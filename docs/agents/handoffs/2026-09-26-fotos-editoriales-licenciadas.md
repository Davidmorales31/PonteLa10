# Handoff — fotos editoriales licenciadas y programación

- **Objetivo de la sesión:** ajustar la prueba de HU-ED-10/11: portadas con
  fuentes/licencias verificables, atribución visible y programación solo tras
  aprobación editorial humana.
- **Completado:** contrato API/schema para fotos Commons; verificación del
  archivo, autor y licencia; persistencia del enlace; visualización de crédito y
  fuente en CRM y artículo; Skill y documentación actualizadas. La aprobación
  existente reserva la siguiente franja y el cron publica después; no se alteró.
- **Archivos modificados:** ver `git status`; principalmente
  `server/utils/esquemasCodexEditorial.ts`,
  `server/utils/validarAtribucionFotoCommons.ts`,
  `server/api/internal/codex/media.post.ts`, componentes de biblioteca/vistas,
  `types/contenidoEditorial.ts`, documentación HU-ED-10/11 y Skill de portada.
- **Decisiones:** solo Wikimedia Commons con CC0 1.0, CC BY 4.0 o dominio
  público; la autoría/licencia se consulta y valida antes de aceptar; prohibido
  marcar como aprobada/programada/publicada desde la tarea Codex.
- **Validaciones ejecutadas:** unitarias (23 archivos, 114 pruebas), lint,
  typecheck, build y `git diff --check` correctos. La migración
  `20260926174021_codex_licensed_photo_attribution.sql` se aplicó en
  Supabase y se verificaron ambas funciones modificadas.
- **Fallos:** el primer build se detuvo por el servidor Nuxt de demo activo;
  se repitió con `NUXT_IGNORE_LOCK=1` y terminó bien.
- **Pendientes:** desplegar el código antes de
  alinear la automatización diaria; después Juan pulsa **Aprobar y programar**
  en CRM y se verifica que la noticia pase a `scheduled`.
- **Siguiente acción exacta:** desplegar el código y reanudar la corrida diaria
  existente; solicitar a Juan únicamente su aprobación
  explícita en CRM para probar el ciclo real.
- **Commit base:** `main` actual.
- **Commit final:** sin commit.
