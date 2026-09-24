# Handoff actual — HU-ED-07 aislada

## Actualización operativa — 2026-09-23

- La ingesta `4099be05-69b0-493f-b341-90f6f1372f04` llegó a transcribir, pero
  el primer reintento evidenció un segundo límite: la función SQL y el contrato
  Zod también restringían `source_language` a `es`/`en`. Se aplicó y verificó
  `20260923031000_permitir_traduccion_de_cualquier_idioma.sql`: conserva códigos
  ISO, exige traducción DeepSeek para todo idioma distinto de `es` y mantiene
  las demás validaciones de evidencia. La misma fila se reencoló, detectó `ca`,
  pasó a evidencia lista y creó el borrador
  `88ad178b-a089-49b4-9836-4a2b9aca2ea2`. Además, el extractor JSON del worker
  ahora toma el primer objeto balanceado de DeepSeek (y también se aplicó al
  proveedor del servidor), evitando que texto residual posterior invalide una
  respuesta correcta.

- Se activó en Supabase el cron `pont3la10-publicar-programadas` (`* * * * *`)
  que llama a `public.publish_due_editorial_articles()`. Antes existía la
  transición a `scheduled`, pero no un disparador automático. La consulta de
  catálogo confirmó una fila activa. La migración usa `pg_cron` en
  `pg_catalog`; fue revisada para idempotencia, concurrencia y no exposición de
  RPC adicional.
- Las tarjetas públicas omiten la imagen cuando un artículo no tiene portada,
  el estado activo de la navegación ya no deja Noticias y una categoría activos
  al mismo tiempo, y el footer muestra la propiedad de Labs Pont3la10.

- Se detectó y corrigió el bloqueo de demo de TikTok: el Python configurado no
  tenía `imageio_ffmpeg`; se instalaron todas las dependencias declaradas en
  `workers/requirements-tiktok.txt`. El worker incorpora ahora un preflight de
  imports antes de reclamar trabajo, por lo que falla al inicio si vuelve a
  faltar una dependencia. La validación de imports, autenticación y cola vacía
  fue correcta; `tests/unit/ingestasEditoriales.test.ts` pasó (14 pruebas) y
  el lint del worker más `git diff --check` pasaron.

- Se implementó el atajo **Cambiar portada rápida** para evitar forzar el
  estado `changes_requested` cuando solo se sustituye la imagen.
- La migración `20260923020009_portada_rapida_sin_cambiar_estado.sql` fue
  aplicada en Supabase y la función
  `public.update_editorial_article_cover_fast(uuid,integer,uuid)` fue
  verificada por consulta de catálogo.
- Conserva el estado y controla concurrencia con `lock_version`. Autoriza
  `review` con revisión, `approved` con aprobación, y `scheduled`/`published`
  con el permiso respectivo más AAL2. Para publicados refresca el snapshot
  público. El endpoint es
  `PUT /api/admin/contenidos/:id/portada-rapida`.
- El servidor local se inició en `http://127.0.0.1:3001`. Queda pendiente la
  comprobación visual autenticada del botón; no se modificó ningún artículo
  real durante la verificación.

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

## Handoff parcial — 2026-09-19 (HU-ED-09)

- **Implementación local:** se añadió la migración
  `20260918192005_hu_ed_09_preparacion_editorial_automatica.sql` y se actualizó
  el worker. DeepSeek recibe únicamente un catálogo cerrado de IDs de secciones,
  temas y artículos publicados; la preparación valida todo en PostgreSQL,
  registra temas y hasta tres enlaces internos derivados desde artículos
  publicados, y pasa solo de `draft` a `review`.
- **Seguridad:** el worker recibe el permiso exclusivo
  `ingestas.worker.prepararRevision`, no permisos de aprobar, programar ni
  publicar. La excepción del trigger exige worker exclusivo, el permiso nuevo,
  origen `ingesta`, transición `draft → review` y una marca de sesión establecida
  solo dentro de la RPC. Aprobación y publicación conservan permisos humanos y
  MFA.
- **Estado remoto:** la migración se ejecutó el 2026-09-19 en el SQL Editor del
  proyecto `ykjithahavncswlfgsqa`. Una consulta de solo lectura confirmó que las
  tres RPC y las columnas `prepared_for_review_at` y
  `preparation_error_code` existen. El CLI continúa sin token; la aplicación se
  hizo mediante el panel autenticado.
- **Validación local:** `node --check`, suite unitaria (15 archivos, 87 pruebas)
  y `git diff --check` pasaron. Lint y typecheck se iniciaron sin errores de
  salida; falta certificar build y ejecutar la migración en Supabase antes de
  afirmar que el flujo está disponible.

## Handoff — 2026-09-21 (TikToks largos)

- **Cambio:** se retiró el rechazo fijo de 180 segundos del transcriptor, del
  contrato Zod y del procesador legado. Se conservan duración positiva, 2.000
  segmentos máximos, limpieza y el timeout de 14 minutos del proceso.
- **Base remota:** se aplicó
  `20260922025410_quitar_limite_duracion_tiktok.sql` en el SQL Editor de
  Supabase. La función privada conserva sus permisos y guardas; únicamente
  elimina el tope de duración y exige que la duración sea JSON numérico.
- **Verificación:** Supabase devolvió `true` para un payload válido de 181
  segundos. Lint, 87 pruebas unitarias, typecheck y `git diff --check` pasaron;
  el build generó `.output/server/index.mjs` tras detener temporalmente la demo
  y la aplicación fue levantada otra vez en `http://127.0.0.1:3001`.
- **Siguiente prueba:** reencolar la ingesta larga o registrar otra. Puede
  tardar más y fallar de forma segura si supera el timeout del worker; todavía
  no se certifica extremo a extremo una fuente larga.

## Handoff — 2026-09-21 (calidad y visibilidad de redacción)

- **Cambio local:** la bandeja ahora cruza cada ingesta visible con la última
  traza permitida de `editorial_ai_generations`. Una reserva `running` aparece
  como **Generando borrador con IA**, no permite disparar un reintento duplicado
  y usa un refresco de cuatro segundos si Realtime no entrega el cambio final.
- **Contrato DeepSeek:** se amplió la guía a 7–10 párrafos y 850–1.200 palabras
  cuando la evidencia lo respalde; exige jerarquía periodística y curiosidad
  legítima. Se retiró `Fuente:` del cuerpo y el normalizador descarta ese párrafo
  si el proveedor lo devuelve; la fuente estructurada sigue alimentando la UI.
  El límite de salida pasó de 4096 a 6144 tokens para que el JSON largo no se
  corte.
- **Límite explícito:** la implementación actual llama solo a Chat Completions
  de DeepSeek con transcripción y catálogo interno. No investiga la web, no
  consulta fuentes externas y no genera imágenes. Añadir cualquiera de esas
  capacidades exige un proveedor/API específico y no se debe fingir que ya
  existe.
- **Validación:** ESLint de archivos modificados, `node --check` del worker,
  `tests/unit/ingestasEditoriales.test.ts` (13), suite completa (15 archivos,
  87 pruebas), typecheck y `git diff --check` pasaron. El build no se repitió:
  Nuxt detectó el servidor de desarrollo activo en el mismo directorio y evitó
  tomar su lock; el artefacto de build previo permanece.

## Handoff — 2026-09-21 (sitio público sin simulaciones)

- **Cambio:** se retiró todo contenido público que afirmaba actividad o
  funcionalidad inexistente: métricas, noticias y tarjetas quemadas, especiales
  simulados, newsletter que no suscribía y perfiles sociales genéricos. Se
  eliminaron los archivos de datos ficticios y el inicio/listado se apoya en
  artículos publicados desde el CMS.
- **Resultado visible:** la portada conserva identidad, búsqueda, resultados,
  categorías y artículos reales. La página de especiales comunica que aún no
  hay publicaciones en vez de prometer módulos inexistentes; el footer contiene
  únicamente rutas internas reales.
- **Verificación:** el DOM local de `/` confirmó que no aparecen contadores,
  cards ficticias, newsletter ni enlaces sociales de relleno. ESLint puntual,
  `tests/unit/landing.test.ts` (2), suite completa (15 archivos, 85 pruebas),
  typecheck y `git diff --check` pasaron. Build pendiente por el lock legítimo
  del servidor Nuxt local activo.

## Handoff — 2026-09-21 (corte para producción)

- **Acceso Google:** se retiró temporalmente de `FormularioLoginEditorial` el
  botón de OAuth y su icono. No se eliminaron usuarios, sesiones ni la
  configuración de Supabase; la función queda disponible internamente para una
  futura reactivación deliberada. La referencia a Google Authenticator en MFA
  no corresponde a OAuth y se conserva.
- **Alcance del corte:** incluye los ajustes de HU-ED-07, HU-ED-08 y HU-ED-09
  presentes en el árbol, las mejoras de visibilidad y calidad de IA, la
  limpieza del sitio público y la ocultación temporal de Google. Los respaldos
  locales y `pontela10.zip` se excluyen expresamente del commit.
- **Validación de cierre:** `npm run lint`, las 85 pruebas unitarias, typecheck,
  comprobación de sintaxis del worker, `git diff --check` y `npm run build`
  finalizaron correctamente. La demo local volvió a responder `200` en
  `http://127.0.0.1:3001/login` y no entrega el texto del botón de Google.

## Handoff — 2026-09-22 (edición y calidad de redacción)

- **Causa corregida:** `puedeEditar` se calculaba solo por rol. En revisión,
  la UI podía permitir seleccionar portada y luego pedir un guardado que la RPC
  rechaza correctamente. Ahora la API y el cliente condicionan esa capacidad a
  `draft` o `changes_requested`; desde revisión se aprueba directamente o se
  usa **Solicitar cambios** antes de editar. Una carrera de estado actualiza el
  editor y explica la acción segura.
- **Redacción:** el normalizador dejaba de conservar saltos y partía por cada
  oración. Ahora conserva los párrafos del proveedor, agrupa únicamente los
  demasiado cortos y descarta líneas de fuente, créditos, video original y URLs
  de TikTok. El contrato DeepSeek exige párrafos desarrollados y prohíbe esas
  atribuciones dentro del documento.
- **Validación:** pruebas focalizadas (27), suite completa (15 archivos, 87
  pruebas), lint, typecheck, `node --check` del worker, `git diff --check` y
  build de producción pasaron. La demo local volvió a responder 200 en el
  puerto 3001.
# Handoff actual

## Trabajo local sin commit

- Se añadió la selección exclusiva de noticia destacada de portada, el endpoint
  protegido y el consumo público de la selección.
- Se añadió el modo opcional **Aplicar estos cambios con IA** dentro de
  `Solicitar cambios`; pasa primero a `changes_requested`, aplica una única
  propuesta y conserva el control humano para enviar de nuevo a revisión y
  aprobar.
- La migración `20260922122414_noticia_destacada_y_reescritura_ia.sql` quedó
  aplicada en Supabase el 2026-09-22. La consola confirmó
  `editorial_home_feature`, `editorial_ai_article_rewrites`,
  `set_editorial_home_feature(uuid)` y
  `get_public_editorial_home_feature()`. Falta probar el checkbox con MFA y
  una solicitud real de cambios con IA desde la interfaz.

## Validación

- `npm.cmd run typecheck`: pasó.
- `npm.cmd run test:unit`: pasó antes de este corte (15 archivos, 87 pruebas).
- `npm.cmd run lint`: pasó antes de este corte.
- `npm.cmd run build` con `NUXT_IGNORE_LOCK=1`: cliente construido; el proceso
  de build no se dejó finalizar de forma observable tras la fase SSR mientras
  el demo local seguía activo. Repetir al detener o aislar el servidor si se
  requiere certificación final.
# Handoff actual

## Publicación programada y taxonomías — 2026-09-23

- Se verificó en Supabase que `pont3la10-publicar-programadas` está activo y
  ejecuta `publish_due_editorial_articles()` cada minuto con ejecuciones
  exitosas.
- La noticia `88ad178b-a089-49b4-9836-4a2b9aca2ea2` no estaba atrasada: tiene
  `scheduled_at = 2026-09-24 03:27:00+00`, equivalente a 22:27 del 23 en
  Colombia. No se publicó manualmente.
- Se corrigió `components/admin/ModalAccionFlujoEditorial.vue`: el control
  `datetime-local` ahora recibe la hora local mediante
  `utils/editorial/fechaProgramacion.ts`, no un ISO UTC. Prueba unitaria
  `tests/unit/fechaProgramacion.test.ts` aprobada; lint de los archivos y
  `git diff --check` también aprobaron.
- HU-ED-09 todavía usa catálogo cerrado. La creación automática de taxonomías
  se habilitó el 2026-09-23 exclusivamente para hasta tres temas públicos. La
  migración `20260923100000_temas_publicos_automaticos.sql` crea una sobrecarga
  de siete argumentos de `prepare_editorial_article_from_ingestion`: valida al
  worker y la generación completada, deduplica por slug con bloqueo transaccional
  y prepara artículo+temas en una única transacción. Está aplicada y verificada
  en Supabase mediante su firma y el permiso `ingestas.worker.crearTemas` de
  `workerIngesta`. No crea categorías ni etiquetas internas.
