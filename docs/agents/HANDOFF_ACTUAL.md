# Handoff actual — HU-ED-07 aislada

- **Objetivo:** aislar y auditar el desarrollo local de HU-ED-07 sin perder el
  trabajo de origen.
- **Completado:** creada la worktree `C:\PONTE LA 10 HU-ED-07` en
  `codex/hu-ed-07-aislada`, basada en `origin/main` (`ff28d4c`). Se trasladaron
  33 archivos equivalentes: UI/API, tipos, pruebas, worker, documentos,
  migraciones históricas `0011`/`0012` y diseño durable `0013`.
- **Archivos excluidos:** `.mcp.json` de la copia de origen no se abrió ni se
  copió. Se excluyó código ajeno que creaba borradores y dependencias no usadas.
- **Decisiones:** conservar `0011`/`0012` como historia compatible; `0013`
  define el protocolo nuevo que finaliza en `evidence_ready`, sin artículos. No
  se aplicó ninguna migración remota ni se publicó una rama.
- **Validaciones ejecutadas:** `git diff --check`; comparación de contenido de
  los 33 archivos entre origen y worktree; Memento recall sin resultados;
  `npm ci`, lint, 15 archivos/85 pruebas unitarias, typecheck y build pasaron.
- **Fallos:** ninguno en el traslado o validaciones. `npm ci` avisó un conflicto
  opcional de peer dependency de ESLint y el build una advertencia deprecada de
  Vue/Nuxt; no se modificó el lockfile. Queda la auditoría del catálogo remoto
  en solo lectura.
- **Auditoría posterior:** no hay un proceso que consuma
  `claim_next_editorial_ingestion`, envíe heartbeats ni llame complete/fail con
  token; `procesarTikTok` y `traducirTranscripcionTikTok` no tienen usos. No se
  puede declarar funcional la cola durable. La RPC de registro acepta payload
  directo sin repetir la validación/normalización TikTok del servidor: permite
  filas `web` que el worker no reclama y abre riesgo de URL no permitida. El
  Python no aplica los límites de descarga/temporal/redirecciones recibidos y
  siempre declara limpieza exitosa aunque `rmtree` falle. Las pruebas actuales
  son principalmente estáticas; no prueban RPC/RLS/leases sobre PostgreSQL.
- **Catálogo remoto verificado (solo lectura, 2026-09-15):** proyecto
  `pont3la10` activo, PostgreSQL 17.6; `0013_ingesta_worker_durable` está
  aplicada y las columnas/RPC durables existen. `anon` no ejecuta las RPC de
  ingesta; `authenticated` sí, con controles internos por rol. La política de
  lectura excluye al worker exclusivo y las tablas `private` solo tienen grants
  de `postgres`. El cuerpo remoto de `register_editorial_ingestion` no valida
  TikTok/allowlist y el de heartbeat no limita checkpoint: los endurecimientos
  locales aún no existen en remoto. Como `0013` ya se aplicó, cualquier arreglo
  debe ir en una migración nueva, nunca modificando esa migración histórica.
- **Avisos remotos:** Security Advisor reporta 22 funciones `SECURITY DEFINER`
  ejecutables por `authenticated` (incluye las RPC de ingesta) y varias por
  `anon`; las RPC nuevas revocan `PUBLIC`/`anon`, pero la auditoría de las
  funciones históricas queda fuera de HU-ED-07. Auth también tiene desactivada
  la protección de contraseñas filtradas. No se cambió ninguno de esos valores.
- **Implementación local posterior:** añadido `workers/procesar_ingestas_durable.mjs`.
  Usa un usuario técnico separado mediante `PONT3LA10_WORKER_EMAIL` y
  `PONT3LA10_WORKER_PASSWORD`, nunca `service_role`; reclama, renueva lease,
  ejecuta Python, traduce inglés con DeepSeek y completa/falla por RPC. Se
  ejecuta localmente con `npm run worker:ingestas -- --once` tras crear el
  usuario exclusivo `workerIngesta` y definir variables locales. No se ejecutó
  contra la base remota, no se desplegó y no se aplicó SQL.
- **Preparación remota autorizada:** se creó/verificó el usuario técnico local
  `worker@pont3la10.local` y se le asignó exclusivamente el rol activo
  `workerIngesta`, con `ingestas.worker.reclamar`,
  `ingestas.worker.reportar` e `ingestas.worker.finalizar`. No recibió roles
  humanos ni permisos de artículos.
- **Prueba real local:** `npm run worker:ingestas -- --once` autenticó el
  usuario técnico contra Supabase y llamó `claim_next_editorial_ingestion` sin
  errores; la respuesta fue `Cola vacio; esperando 10000 ms.`. No había una
  ingesta que procesar, por lo que no se escribió evidencia ni se modificaron
  artículos.
- **Eliminación de ingestas fallidas (local, pendiente de migrar):** se añadió
  `0014_eliminar_ingestas_fallidas.sql`, la RPC protegida
  `delete_failed_editorial_ingestion`, endpoint `DELETE /api/admin/ingestas/:id`,
  modal con aviso irreversible y alertas globales del panel. Solo propietario o
  administrador con MFA, permiso `ingestas.eliminar` y confirmación `ELIMINAR`
  pueden borrar una ingesta `failed` sin evidencia, borrador ni intento activo;
  también se elimina su historial técnico privado. La migración no se aplicó al
  proyecto remoto. Validaron 15 archivos/86 pruebas, typecheck, build, lint y
  `git diff --check`.
- **Eliminación de ingestas fallidas (local, pendiente de migrar):** se añadió
  `0014_eliminar_ingestas_fallidas.sql`, la RPC protegida
  `delete_failed_editorial_ingestion`, endpoint `DELETE /api/admin/ingestas/:id`,
  modal con aviso irreversible y alertas globales del panel. Solo propietario o
  administrador con MFA, permiso `ingestas.eliminar` y confirmación `ELIMINAR`
  pueden borrar una ingesta `failed` sin evidencia, borrador ni intento activo;
  también se elimina su historial técnico privado. La migración no se aplicó al
  proyecto remoto. Validaron 15 archivos/86 pruebas, typecheck, build, lint y
  `git diff --check`.
- **Pendientes:** diseñar e implementar el worker autenticado y su protocolo de
  progreso; imponer la allowlist y la normalización en la frontera que persiste
  la cola; hacer verificable la limpieza y los límites; añadir pruebas de base
  de datos. Luego auditar catálogo remoto, RLS, grants y firmas en solo lectura.
- **Siguiente acción exacta:** decidir si el worker durable será un proceso
  Node/Python separado autenticado como `workerIngesta` o un servicio externo;
  con esa decisión, corregir los bloqueos antes de commit/PR.
- **Commit base:** `ff28d4c`
- **Commit final:** consolidado en la rama `codex/hu-ed-07-aislada`.

## Actualización de cierre — 2026-09-16

- `0013_ingesta_worker_durable` ya estaba aplicada en Supabase remoto; se
  aplicó y registró también `0014_eliminar_ingestas_fallidas` (versión
  `20260916110000`). La verificación remota confirmó RPC, permiso,
  autorizaciones de propietario/administrador y `EXECUTE` para
  `authenticated`.
- Se realizó la prueba funcional manual de eliminación desde `/admin/ingestas`
  con MFA y confirmación `ELIMINAR`; el usuario confirmó su resultado. No se
  invocó ninguna eliminación adicional durante la verificación SQL.
- Validación final: lint, 15 archivos/86 pruebas unitarias, typecheck, build y
  `git diff --check` pasaron. El build mostró únicamente la advertencia
  existente `DEP0155` de una dependencia.
- El servidor local se reinicia en `http://127.0.0.1:3001` tras las
  validaciones. El siguiente paso requiere autorización: revisar el diff
  completo y crear el commit de HU-ED-07; después, decidir PR o mantener la
  rama local.

## Actualización de cierre — 2026-09-17

- **Objetivo:** corregir el bloqueo de aprobación que persistía en Supabase
  aunque el editor mostraba portada y SEO como recomendaciones.
- **Completado:** se creó y aplicó
  `20260917213028_permitir_publicacion_sin_metadatos_opcionales.sql`. La
  función `validate_article_status_transition` conserva permisos, MFA,
  transiciones y contenido mínimo; deja de exigir portada o una descripción
  SEO de 40 caracteres para aprobar, programar o publicar.
- **Verificación remota:** una consulta a la definición desplegada confirmó
  `portada_opcional = true` y `seo_opcional = true`. La transición funcional
  del artículo `37722690-209f-4c7e-a0e7-049325d517e7` terminó en `approved`,
  versión 4. No se publicó el artículo.
- **Cambios locales:** se versionó la misma migración; el repositorio también
  traduce errores futuros que empiecen por `Completa` a un 422 legible.
- **Validaciones:** `git diff --check`, lint, typecheck y 15 archivos/87
  pruebas unitarias pasaron. Falta `build` porque el servidor de desarrollo
  local sigue activo y tomaría su lock.
- **Siguiente acción exacta:** si el responsable quiere hacer visible esta
  historia, usar **Publicar ahora** y confirmar la publicación explícitamente
  en ese momento.
