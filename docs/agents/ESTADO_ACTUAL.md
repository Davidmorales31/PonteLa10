# Estado actual de Pont3la10

- **Actualizado:** 2026-09-23
- **Commit base:** `3b2ec84` (`codex/hu-ed-08`)
- **Estado general:** HU-ED-07 y HU-ED-08 operan desde `C:\PONTE LA 10`. La ingesta durable genera el borrador automáticamente; la bandeja se actualiza en tiempo real y anuncia con una alerta global cuando el borrador queda listo.
- **Árbol de trabajo:** `C:\PONTE LA 10`. Los respaldos locales están ignorados por Nuxt para no duplicar el escaneo del proyecto.
- **Preflight del worker (2026-09-23):** el worker ahora verifica al inicio las
  dependencias Python de TikTok (`imageio-ffmpeg`, `yt-dlp`,
  `faster-whisper`) después de autenticarse y antes de reclamar una ingesta.
  La instalación local fue completada y el worker informó
  `Worker listo: Supabase y dependencias de TikTok verificadas.`. Así una
  instalación incompleta se detecta antes de que una ingesta entre a proceso.
- **Idiomas de ingesta (2026-09-23):** el contrato completo admite códigos ISO
  detectados por el transcriptor, no solo `es`/`en`. Todo idioma distinto de
  español exige traducción estructurada de DeepSeek antes de persistir la
  evidencia. La migración `20260923031000_permitir_traduccion_de_cualquier_idioma.sql`
  ya se aplicó y verificó en Supabase; una prueba real detectó `ca`, alcanzó
  evidencia lista, se tradujo y creó el borrador
  `88ad178b-a089-49b4-9836-4a2b9aca2ea2` automáticamente.
- **Publicación programada (2026-09-23):** la tarea
  `pont3la10-publicar-programadas` quedó creada y activa en Supabase. Ejecuta
  cada minuto `public.publish_due_editorial_articles()`, por lo que un artículo
  en `scheduled` se publica sin depender de que permanezcan abiertos el
  navegador o el worker de TikTok. La migración versionada es
  `20260923023630_programar_publicacion_automatica.sql`.
  Se comprobó además una noticia aún en `scheduled`: su fecha real era
  `2026-09-24 03:27:00+00` (22:27 del 23 de septiembre en Colombia), por lo
  que el cron no debía publicarla todavía. El modal de programación ya forma
  el valor de `datetime-local` en horario local y no en UTC, evitando que la
  persona vea o reprograme una hora desplazada.
- **Presentación pública (2026-09-23):** las tarjetas ya no sustituyen una
  portada ausente con la imagen de estadio; omiten por completo el bloque de
  imagen. La navegación marca únicamente la categoría actual y el pie identifica
  el producto como propiedad de `labs.pont3la10.com`.

## Terminado en el repositorio

- Base Nuxt 3, identidad visual, sitio público y panel administrativo.
- Autenticación pública opcional y acceso editorial protegido, recuperación y MFA.
- CMS: taxonomías, borradores, autoguardado, versiones, multimedia y publicación.
- Artículos públicos, enlaces internos, tarjetas sociales, sitemap y robots.
- Resultados deportivos para fútbol, baloncesto, béisbol y tenis.
- Bandeja segura para registrar y gestionar ingestas editoriales.
- 10 migraciones versionadas en `main`, desde `0001` hasta `0010`.
- Memento local opcional instalado, con Codex registrado y datos fuera de Git.

## Parcial o activo

- **Destacada de portada y cambios con IA (local, pendiente de migración):** se
  preparó la migración `20260922122414_noticia_destacada_y_reescritura_ia.sql`.
  La portada deja de elegir implícitamente la última publicación: una persona
  con `contenido.publicar` y MFA puede marcar una sola noticia publicada como
  **Noticia destacada del día**; cambiarla reemplaza la anterior y queda en
  auditoría. La marca no se expone como tabla pública y se retira al archivar o
  reabrir la noticia. En **Solicitar cambios**, la persona revisora puede optar
  por enviar su instrucción una vez a DeepSeek. La IA solo reescribe el
  borrador en `changes_requested`; no aprueba ni publica. Hay una reserva
  idempotente, límite de espera superior al timeout del proveedor y trazabilidad
  privada para evitar cargos duplicados. La migración se aplicó en Supabase el
  2026-09-22 y se verificó la existencia de ambas tablas y RPC principales.
  Falta la prueba funcional con una cuenta MFA antes de habilitarlo en una demo
  remota.

- **HU-ED-09 (preparación editorial automática):** implementación local y SQL
  aplicado en Supabase el 2026-09-19.
  El worker obtiene un catálogo cerrado de secciones, temas y artículos ya
  publicados; DeepSeek solo puede devolver IDs de ese catálogo. Una RPC
  exclusiva del trabajador valida esos IDs, añade hasta tres enlaces internos,
  guarda los temas y pasa únicamente `draft` a `review`. No concede permisos de
  aprobar, programar ni publicar. La migración
  `20260918192005_hu_ed_09_preparacion_editorial_automatica.sql` quedó
  aplicada y se verificaron sus tres RPC y las dos nuevas columnas. Falta hacer
  una ingesta nueva de extremo a extremo con el worker local para certificar el
  comportamiento visual. Si la preparación no se puede completar, el borrador
  se conserva y la bandeja muestra una alerta de intervención editorial en lugar
  de anunciarlo como listo para revisión.
  Desde el 2026-09-23 también puede proponer hasta tres **temas públicos** si
  ninguno existente representa bien el asunto. La migración
  `20260923100000_temas_publicos_automaticos.sql` ya está aplicada y verificada
  en Supabase. La creación se deduplica por nombre/slug con bloqueo transaccional,
  omite temas inactivos y sucede dentro de la misma RPC que lleva el borrador a
  `review`: si falla la preparación no queda un tema huérfano. Solo
  `workerIngesta` tiene la capacidad, y se auditan los IDs creados. No crea
  categorías ni etiquetas internas.

- **HU-ED-08:** propuesta IA de borrador desde evidencia lista, con proveedor DeepSeek solo servidor, contrato Zod, reserva idempotente previa al proveedor, trazabilidad y RPC atómico. La generación es automática tras la evidencia. Cuando falla, un usuario con `ingestas.redactar` y `contenido.crear` dispone de **Reintentar borrador** en la bandeja: confirma el gasto, reutiliza la evidencia y bloquea duplicados mientras existe una reserva activa.
  La bandeja consulta la última traza autorizada de `editorial_ai_generations`: mientras
  está `running` muestra **Generando borrador con IA**, oculta el reintento y refresca
  cada cuatro segundos como respaldo a Realtime. El contrato actual pide 7–10 párrafos
  y 850–1.200 palabras cuando la evidencia lo soporte, con titular atractivo sin inventar;
  la fuente queda en su campo estructurado y no se inserta como párrafo en el cuerpo.
  DeepSeek recibe la evidencia y un catálogo interno, no un servicio de navegación web:
  no hay investigación ni fuentes externas verificadas implementadas todavía.
  El worker y el endpoint usan salida de texto con JSON extraído de forma tolerante,
  en lugar de `response_format: json_object`, porque ese modo puede devolver
  contenido vacío. Para la redacción se desactiva el razonamiento de DeepSeek y
  se reserva el límite de salida para el JSON final; la normalización reconstruye
  únicamente campos trazables de la evidencia antes de validarlos con Zod.
  La migración `20260917101500_recuperar_reservas_ia_interrumpidas.sql` está
  aplicada en Supabase: una reserva `running` de más de dos minutos se marca como
  interrumpida cuando se solicita el siguiente reintento, así nunca bloquea la
  ingesta de forma permanente.
  El worker recupera evidencia pendiente por RPC, limita a tres segmentos de
  contexto y solicita solamente IDs de fundamento al proveedor, evitando que
  una transcripción extensa trunque el JSON. La prueba real del 2026-09-18
  creó el borrador `755e4b0f-e319-4209-af6f-d9ae5e04e1db` desde la ingesta
  `447aee2a-d1a5-4793-8f6c-f87b0055fae6`.

- **HU-ED-07:** se trasladaron a esta rama local la propuesta de cola durable,
  extracción, transcripción, traducción y evidencia. La prueba local alcanzó
  `evidence_ready`; las migraciones `0013` y `0014` ya están aplicadas en
  Supabase remoto, pero falta la certificación funcional completa. Desde el
  2026-09-21 no hay un límite fijo de duración de TikTok: se mantienen la
  validación de duración positiva, máximo de 2.000 segmentos, limpieza, límite
  de recursos y timeout del worker. La migración
  `20260922025410_quitar_limite_duracion_tiktok.sql` quedó aplicada y una
  validación SQL confirmó que una evidencia de 181 segundos es aceptada.
- **Eliminación de ingestas:** el botón aparece a usuarios autorizados para todos
  los estados. La RPC `delete_editorial_ingestion` exige permiso, MFA y
  confirmación; elimina evidencia, historial y borrador automático. Protege
  procesos activos y contenido en revisión o publicado. La migración
  `20260917090000_eliminacion_total_ingestas.sql` se aplicó y su RPC se verificó
  en Supabase el 2026-09-17.
- **Sitio público sin contenido simulado (2026-09-21):** el inicio, listado y
  detalle consumen artículos publicados reales. Se retiraron métricas,
  titulares, especiales, newsletter y enlaces sociales que no correspondían a
  funciones o cuentas reales. La portada conserva solo marca, navegación y
  categorías; si no hay publicaciones, muestra un estado vacío honesto.
- **Acceso editorial (2026-09-21):** se ocultó temporalmente el botón de inicio
  de sesión con Google. El acceso por correo y contraseña permanece disponible;
  no se modificaron cuentas, sesiones ni la configuración remota de OAuth para
  poder reactivarlo sin migraciones cuando haga falta.
- **Flujo del editor:** una revisión ya no queda bloqueada por un autoguardado
  local que no se puede persistir en ese estado. Las decisiones se habilitan si
  no hay cambios editables pendientes; el editor explica cuándo aprobar y cuándo
  solicitar cambios. Los nuevos borradores completan SEO desde título y resumen
  cuando el proveedor lo omite, y la navegación compacta de etapas evita el
  desborde visual en pantallas estrechas. Portada y descripción SEO son
  recomendaciones visibles: no bloquean la aprobación, programación ni
  publicación de una persona autorizada.
  Desde el 2026-09-22, la capacidad de edición combina permiso y estado:
  solamente `draft` y `changes_requested` habilitan cambios. Así la interfaz no
  permite seleccionar portada ni guardar mientras el contenido está en
  `review`, `approved` o estados posteriores, que PostgreSQL ya rechazaba. Si
  el estado cambia en otra sesión durante un guardado, el editor se recarga y
  explica la siguiente acción en vez de dejar el error técnico como bloqueo.
- **Calidad de borradores IA:** el normalizador de DeepSeek y el worker ahora
  preservan los saltos reales de párrafo, consolidan solo fragmentos menores a
  55 palabras y eliminan atribuciones claras de fuente (incluidas URLs y
  créditos de TikTok) del cuerpo. La fuente permanece exclusivamente en los
  campos estructurados de fuente. El prompt exige párrafos desarrollados de
  70–140 palabras normalmente; esto aplica a nuevas generaciones y reintentos,
  no reescribe artículos ya creados.
- **Alineación de producción (2026-09-17):** la migración
  `20260917213028_permitir_publicacion_sin_metadatos_opcionales.sql` quedó
  aplicada en Supabase. Se verificó que el disparador ya no exige portada ni
  descripción SEO; título, resumen, categoría, cuerpo, fuente, permisos y MFA
  continúan siendo obligatorios. El contenido `37722690-209f-4c7e-a0e7-049325d517e7`
  pasó de `review` a `approved` como comprobación funcional.
- **Sitio público (2026-09-17):** la migración
  `20260917214050_restringir_consultas_publicas_a_publicados.sql` quedó
  aplicada en Supabase. Inicio, listado y detalle ya no usan artículos mock;
  las RPC públicas y los enlaces internos resuelven exclusivamente artículos
  con estado `published`.

## Bloqueos

- La última prueba real con `deepseek-flash` devolvió `content` vacío aun con
  razonamiento bajo. El adaptador quedó corregido a `reasoning_effort: none`; falta
  un reintento explícitamente autorizado para certificar el resultado final. La
  reserva que quedó activa por esa falla será recuperada por `0015` antes de ese
  próximo intento.

No hay bloqueos para consolidar los cambios locales validados en la rama de
producción. La certificación extremo a extremo de una nueva ingesta y de la
preparación editorial automática sigue siendo una prueba funcional pendiente,
no un impedimento para este corte.

## Deuda técnica confirmada

- Memento es un MVP externo instalado desde commits oficiales porque
  `memento-multiagent` no está publicado en PyPI.
- CI instala dependencias en cuatro jobs; se conserva para mantener checks independientes.
- `npm audit` reporta 14 vulnerabilidades en dependencias (5 moderadas, 8 altas
  y 1 crítica); requieren revisión separada, sin aplicar arreglos automáticos.
- Funciones `security definer` y usos históricos de `auth.role()` requieren auditoría SQL.
- Falta un entorno Python reproducible para el worker de TikTok.
- El estado remoto de RLS, Storage, Cron y migraciones no está certificado.
- Varias ramas `codex/*` antiguas siguen en remoto.

## Siguiente paso recomendado

Registrar una fuente real desde `/admin/ingestas` y esperar la generación
automática. Si la IA falla, revisar el código de error y usar **Reintentar
borrador** solo con autorización explícita del responsable editorial.

## Última validación conocida

**Atajo de portada (2026-09-23):** se añadió la migración
`20260923020009_portada_rapida_sin_cambiar_estado.sql`, ya aplicada y
verificada en Supabase mediante la función
`update_editorial_article_cover_fast(uuid,integer,uuid)`. En la presentación
del editor, **Cambiar portada** funciona también en `review`, `approved`,
`scheduled` y `published` cuando el usuario tiene el permiso correspondiente.
Actualiza exclusivamente la imagen y conserva el estado editorial; para
programados/publicados exige AAL2 y, al estar publicado, actualiza el snapshot
público. No habilita cambios de texto, SEO, etiquetas ni la eliminación de la
portada fuera de estados editables.

El 2026-09-17 pasaron lint de archivos cambiados,
`tests/unit/ingestasEditoriales.test.ts` (13 pruebas), `npm.cmd run typecheck`
y `git diff --check`. La interfaz local verificó botón, confirmación y bloqueo
durante la llamada; los errores de acciones ahora se muestran solo con la alerta
global. La migración `0015` devolvió éxito en Supabase. El servidor de desarrollo
está en `http://127.0.0.1:3001`.

## Documentos posiblemente desactualizados

- `docs/ARQUITECTURA_INICIAL.md`: conserva el diseño de la primera etapa y no
  sustituye el estado verificado de este documento.
