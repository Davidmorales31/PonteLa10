# Estado actual de Pont3la10

- **Actualizado:** 2026-09-21
- **Commit base:** `3b2ec84` (`codex/hu-ed-08`)
- **Estado general:** HU-ED-07 y HU-ED-08 operan desde `C:\PONTE LA 10`. La ingesta durable genera el borrador automáticamente; la bandeja se actualiza en tiempo real y anuncia con una alerta global cuando el borrador queda listo.
- **Árbol de trabajo:** `C:\PONTE LA 10`. Los respaldos locales están ignorados por Nuxt para no duplicar el escaneo del proyecto.

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

El 2026-09-17 pasaron lint de archivos cambiados,
`tests/unit/ingestasEditoriales.test.ts` (13 pruebas), `npm.cmd run typecheck`
y `git diff --check`. La interfaz local verificó botón, confirmación y bloqueo
durante la llamada; los errores de acciones ahora se muestran solo con la alerta
global. La migración `0015` devolvió éxito en Supabase. El servidor de desarrollo
está en `http://127.0.0.1:3001`.

## Documentos posiblemente desactualizados

- `docs/ARQUITECTURA_INICIAL.md`: conserva el diseño de la primera etapa y no
  sustituye el estado verificado de este documento.
