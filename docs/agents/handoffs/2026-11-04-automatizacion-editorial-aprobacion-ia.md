# Handoff

- **Objetivo de la sesión:** preparar dos corridas diarias, diez artículos por categoría, aprobación IA por API y programación cada dos minutos; mejorar titulares y ampliar Tendencias a actualidad latinoamericana/general.
- **Completado:** API privada `/api/internal/codex/auto-proposals`, CLI `propuesta-automatica`, contrato de revisión IA y migración atómica de propuesta/brief/aprobación/programación. Conserva DeepSeek por instrucción final del usuario: se exige su generación completada y brief correspondiente. Clave independiente de publicación, HMAC/nonce, RLS/ACL, hash, actor IA, reintento exacto y dedupe sin reaprobación. Política dos corridas/día, cuotas10/categoría y agenda20; cierre parcial si falta cuota. Reserva primer hueco con separación2min sin desplazar manuales futuras. Prompt DeepSeek con títulos de alto atractivo y atribución explícita; no cambia TikTok.
- **Archivos modificados:** `AGENTS.md`, `nuxt.config.ts`, `scripts/codex-editorial-submit.mjs`, `server/api/internal/codex/{context,draft,auto-proposals}.post.ts`, `server/utils/esquemasCodexEditorial.ts`, `server/utils/ai/instrucciones/redaccion-codex.mjs`, migración `20261105033000_codex_aprobacion_ia_programacion.sql`, skills locales de corrida/investigación/redacción/SEO, `config/automatizacionEditorial.json`, política/prompt/estado y pruebas nuevas SQL/TypeScript.
- **Decisiones:** mantener DeepSeek como redactor; Codex prepara y revisa. Admisible una fuente identificable con atribución, sin convertir rumores en hechos ni fabricar métricas. El responsable autorizó la excepción de aprobación IA para esta corrida, conservando las capacidades y MFA humanos. Horario deseado elegido: 06:05 y 18:05 Bogotá. El archivo de configuración no instala ni modifica una tarea real.
- **Validaciones ejecutadas:** pruebas relacionadas 37/37 (seis archivos); suite completa 598/602 (116 archivos, 113 pasan); ESLint focal pasa; build pasa; `git diff --check` pasa. Prueba SQL aislada 25 comprobaciones: generación DeepSeek, identidad/brief/revisión/imagen, rollback, replay, conflicto, duplicado ajeno, separación2min, manual lejana, cuota10, agenda20/21, cierre parcial terminal y máximo2 corridas; ACL anon denegada. Revisión de seguridad completada sin bloqueos.
- **Fallos:** suite global conserva cuatro fallos anteriores en `workerFutbolLocal` (dos), `noticiasPorEntidadSeo` y `seoRutasPublicas`. Lint global falla en fabrica-landings (incluye .next generado); typecheck global termina con193 errores ajenos, sin diagnósticos en archivos de este cambio. Build conserva advertencias de sprites editoriales y de dependencia Vue anteriores.
- **Pendientes:** aplicar/verificar migración en una base objetivo; desplegar únicamente el cambio autorizado; configurar `NUXT_CODEX_EDITORIAL_PUBLICATION_API_SECRET` privado y distinto de investigación; actualizar la tarea existente con el prompt/horario preparados; comprobar Cron real y prueba HTTP autenticada de extremo a extremo. No se ejecutó una corrida editorial ni se aprobaron/publicaron noticias reales. El estado remoto de tarea/Cron no se certificó.
- **Siguiente acción exacta:** revisar el diff y preparar activación conjunta de migración, despliegue, secreto y tarea existente. No duplicar tareas ni afirmar activa la programación local. Verificar primero una propuesta controlada y su recibo/auditoría/CMS antes de una corrida completa.
- **Commit base:** `f0d0cda`.
- **Commit final:** sin commit.

Prueba SQL reproducible, sin cambiar dependencias del proyecto:

```powershell
npm.cmd install --prefix .codex/validacion-automatizacion --no-save --package-lock=false @electric-sql/pglite@0.5.15
node tests/sql/codexAuto.integration.mjs
```

PGlite ejecuta PostgreSQL en memoria. La fixture simula dependencias de propuesta,
contexto y brief; se ejecutan la migración nueva y el trigger real de separación.
No equivale a aplicar todo el historial Supabase ni probar conexiones concurrentes.
Los logs locales de build/typecheck y el paquete temporal están en la carpeta ignorada.
