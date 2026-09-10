# Plan técnico de implementación — HU-ED-07

## Estado

- **Historia:** ingesta de TikTok a borrador editorial revisable.
- **Fase:** diseño técnico previo a implementación.
- **Prioridad:** máxima del MVP.
- **Rama de trabajo:** `codex/enlaces-internos-compartir`.
- **Implementación funcional:** no iniciada.

## Resultado esperado

Al registrar un TikTok válido, Pont3la10 lo deja en una cola durable y un proceso local independiente lo recoge automáticamente. El proceso valida que el video dure como máximo tres minutos, obtiene metadatos, transcribe español o inglés, traduce al español cuando corresponda, redacta una propuesta con DeepSeek y crea exactamente un borrador. Ninguna ingesta publica contenido.

El operador puede cerrar el navegador durante el procesamiento. Mientras la aplicación y el worker local permanezcan encendidos, el trabajo continúa. Si el equipo o el worker se reinician, la ingesta queda recuperable sin duplicar el artículo.

## Diagnóstico del flujo actual

| Área | Evidencia actual | Cambio requerido |
|---|---|---|
| Registro | `POST /api/admin/ingestas` inserta con estado `pending` | Insertar directamente en `queued` o encolar atómicamente después de validar |
| Inicio | El panel llama manualmente `POST /api/admin/ingestas/:id/procesar` | El worker debe reclamar automáticamente el siguiente trabajo |
| Ejecución | La descarga, transcripción y creación del borrador viven dentro de una petición HTTP | Mover la orquestación a un worker local de concurrencia 1 |
| Reserva | El bloqueo vence por `started_at` fijo a 15 minutos | Usar token de intento, lease renovable y heartbeat |
| Progreso | Solo existen estados generales | Registrar etapa, porcentaje y última actividad |
| Idioma | Whisper fuerza `es` | Detectar `es`/`en`; conservar original y traducir inglés |
| Duración | No hay límite previo | Rechazar videos de más de 180 segundos antes de transcribir |
| Redacción | El borrador es prácticamente la transcripción | Añadir proveedor de redacción DeepSeek detrás de una interfaz |
| Finalización | Crear artículo y completar ingesta son operaciones separadas | Crear/finalizar en una operación idempotente y transaccional |
| Recuperación | Un intento atascado se reclama solo por antigüedad | Recuperar lease vencido y conservar historial mínimo de intentos |
| Seguridad URL | La URL inicial se valida, pero faltan defensas en redirecciones/descarga | Validar host y resolución en cada salto; limitar tiempo y tamaño |

## Diseño propuesto

### 1. Componentes

1. **Panel Nuxt:** registra, consulta progreso, cancela antes de iniciar y abre el borrador terminado.
2. **PostgreSQL/Supabase:** fuente de verdad para cola, leases, resultados y relación con el artículo.
3. **Worker Node local:** reclama una ingesta por vez, coordina las etapas y renueva el lease.
4. **Proceso Python:** descarga audio temporal y ejecuta `faster-whisper`; devuelve JSON estructurado.
5. **Proveedor IA:** interfaz común con implementación DeepSeek para traducción y redacción.

No se incorporarán Redis, Kafka, contenedores obligatorios ni microservicios en el MVP.

### 2. Estados y etapas

Estados públicos conservados:

- `queued`: lista para ser reclamada.
- `processing`: tiene un intento vigente.
- `draft_created`: terminó con un único borrador.
- `failed`: requiere corrección o reintento manual.
- `cancelled`: se canceló antes de comenzar.

`pending` se mantiene temporalmente por compatibilidad con registros existentes, pero las nuevas ingestas TikTok deben entrar en `queued`.

Etapas internas propuestas:

- `validating_source`
- `reading_metadata`
- `downloading_audio`
- `transcribing`
- `translating`
- `research_pending`
- `drafting`
- `creating_draft`
- `completed`

`research_pending` no significa que la IA corroboró hechos. El borrador debe quedar marcado para verificación humana con al menos una fuente independiente antes de aprobarse.

### 3. Cola durable y concurrencia

La migración `0013` debe añadir como mínimo:

- `processing_stage text`
- `progress_percent integer`
- `attempt_token uuid`
- `lease_expires_at timestamptz`
- `heartbeat_at timestamptz`
- `source_language text`
- `retryable boolean`

RPC restringidas:

- `claim_next_editorial_ingestion(worker_id)`: toma una fila con `FOR UPDATE SKIP LOCKED`, incrementa intentos y devuelve token.
- `heartbeat_editorial_ingestion(id, token, stage, percent)`: renueva el lease solo para el intento vigente.
- `complete_editorial_ingestion(id, token, payload...)`: finaliza solo si el token coincide.
- `fail_editorial_ingestion(id, token, code, message, retryable)`: registra un fallo seguro.
- `requeue_editorial_ingestion(id)`: reintento manual autorizado sin borrar evidencia.

El token evita que un intento antiguo complete o falle una ingesta ya reclamada por otro proceso. El índice de URL activa debe incluir `queued` y `processing` y seguir permitiendo una nueva ingesta cuando la anterior terminó.

### 4. Identidad del worker

El worker usará una cuenta técnica de Supabase con permisos mínimos y sesión renovable, configurada localmente. No se expondrá ni utilizará `service_role` como atajo general. La cuenta solo podrá ejecutar las RPC de procesamiento y la operación controlada que crea el borrador.

Variables previstas:

- `PONT3LA10_WORKER_EMAIL`
- `PONT3LA10_WORKER_PASSWORD`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL`
- `NUXT_TIKTOK_PYTHON_PATH`
- `NUXT_TIKTOK_WORKER_PATH`
- `NUXT_TIKTOK_WHISPER_MODEL`

Los secretos reales no entran al repositorio.

### 5. Transcripción y archivos temporales

- Crear `.venv` dentro del proyecto con Python 3.11.
- Versionar dependencias fijadas en `workers/requirements.txt`.
- Validar metadatos y duración antes de descargar el audio completo.
- Límite: 180 segundos; límites adicionales de tiempo y bytes.
- Whisper detecta idioma, pero solo acepta español o inglés en el MVP.
- En español: conservar transcripción original.
- En inglés: conservar original y generar traducción al español.
- El audio vive únicamente en un directorio temporal y se elimina tanto en éxito como en error.
- No descargar ni conservar el video como archivo propio; se preserva URL, metadatos, autoría y créditos.

### 6. Redacción con DeepSeek

Crear una interfaz `ProveedorRedaccionEditorial` para evitar acoplar el dominio al proveedor. La respuesta deberá validarse con Zod y entregar, como mínimo:

- título propuesto;
- resumen;
- cuerpo estructurado;
- título SEO y descripción SEO;
- afirmaciones que requieren corroboración;
- datos insuficientes o dudas;
- fuente original y créditos.

El prompt debe prohibir inventar hechos, citas, resultados, fechas o fuentes. Si la respuesta no cumple el esquema, se permitirá un reintento controlado; después, la ingesta queda `failed` y corregible.

### 7. Corroboración editorial

La automatización puede señalar afirmaciones y proponer búsquedas, pero el MVP no aprobará automáticamente la veracidad. El artículo creado debe incluir un indicador de verificación pendiente. La transición editorial a aprobación debe exigir que un responsable superior registre al menos una fuente independiente.

Esta regla afecta el flujo de aprobación del artículo; su cierre funcional puede requerir una historia complementaria si el modelo actual de fuentes no permite diferenciar la fuente original de la corroboración.

### 8. Interfaz del panel

- Tras registrar: mensaje “Fuente registrada y en cola”.
- Eliminar la necesidad de pulsar “Procesar TikTok”.
- Actualizar la bandeja periódicamente mientras existan filas `queued` o `processing`.
- Mostrar etapa, porcentaje aproximado, intentos y última actividad.
- Ofrecer `Reintentar` solo para fallos recuperables y a usuarios autorizados.
- Permitir que otras filas sigan visibles y operables; no bloquear globalmente la interfaz durante todo el procesamiento.
- Mantener enlace directo al borrador cuando termine.

## Archivos previstos

### Modificar

- `server/api/admin/ingestas/index.post.ts`
- `server/utils/repositorioIngestasEditoriales.ts`
- `server/utils/repositorioContenidoEditorial.ts`
- `server/utils/tiktok/procesadorTikTok.ts`
- `workers/transcribir_tiktok.py`
- `types/ingestaEditorial.ts`
- `utils/editorial/ingestas.ts`
- `components/admin/FormularioNuevaIngesta.vue`
- `components/admin/TablaIngestasEditoriales.vue`
- `pages/admin/ingestas/index.vue`
- `.env.example`
- `package.json`
- `tests/unit/ingestasEditoriales.test.ts`

### Crear

- `supabase/migrations/0013_ingesta_worker_durable.sql`
- `workers/worker_ingestas.ts`
- `workers/requirements.txt`
- `server/utils/ia/proveedorRedaccionEditorial.ts`
- `server/utils/ia/proveedorDeepSeek.ts`
- pruebas unitarias del proveedor, estado/lease y salida del transcriptor.

Los nombres finales podrán ajustarse a la estructura real al implementar, sin cambiar las responsabilidades descritas.

## Orden de implementación

1. **Base durable:** migración `0013`, permisos mínimos, token de intento, lease, heartbeat y reintento.
2. **Contrato de dominio:** tipos, esquemas Zod, errores y mapeo de progreso.
3. **Transcriptor:** `.venv`, dependencias fijadas, duración, idiomas y limpieza comprobable.
4. **Proveedor DeepSeek:** interfaz, cliente, validación estricta, límites y manejo de coste/error.
5. **Worker:** autenticación técnica, polling moderado, concurrencia 1, heartbeat y apagado seguro.
6. **Finalización atómica:** creación idempotente del borrador y vínculo con la ingesta.
7. **Panel:** inicio automático, progreso, reintentos y apertura del borrador.
8. **Pruebas y documentación operativa:** instalación, arranque, recuperación y diagnóstico.

Cada bloque debe quedar verificable antes de avanzar al siguiente.

## Estrategia de pruebas

### Unitarias

- normalización y rechazo de URLs peligrosas;
- límite de 180 segundos;
- detección `es`/`en` y rechazo de idioma no soportado;
- validación de salida DeepSeek y rechazo de contenido incompleto;
- mapeo de estados/etapas;
- clasificación de fallos recuperables y permanentes.

### Integración

- dos workers no reclaman la misma fila;
- un token vencido no puede finalizar;
- heartbeat extiende el lease;
- reinicio recupera una ingesta abandonada;
- reintento no crea un segundo artículo;
- fallo de DeepSeek conserva transcripción y evidencia permitida;
- audio temporal desaparece tras éxito y fallo;
- permisos impiden a usuarios básicos aprobar o ejecutar acciones superiores.

### Validación manual del MVP

1. TikTok en español menor a tres minutos → borrador.
2. TikTok en inglés menor a tres minutos → original + traducción + borrador español.
3. TikTok superior a tres minutos → fallo comprensible sin descargar/transcribir completamente.
4. Cerrar navegador durante procesamiento → el worker continúa.
5. Detener worker y volverlo a iniciar → recuperación sin duplicado.
6. DeepSeek no disponible → fallo visible y reintentable.
7. El borrador no puede aprobarse sin fuente independiente registrada.

Comandos mínimos al cerrar implementación: `npm run lint`, `npm run typecheck`, `npm run test:unit` y `npm run build`.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cambios o bloqueo de TikTok | Adaptador aislado, errores claros y prueba real antes de liberar |
| Equipo con 8 GB de RAM | Concurrencia 1, modelo Whisper pequeño/base y no ejecutar LLM local |
| Proceso largo o reinicio | Cola PostgreSQL, lease, heartbeat y token de intento |
| Duplicación de artículos | Restricción/operación idempotente y finalización transaccional |
| Alucinaciones del modelo | Salida estructurada, prompt restrictivo y aprobación humana con corroboración |
| Coste inesperado | Límite de tokens, máximo de reintentos y registro de consumo por ingesta |
| Exposición de secretos | Variables locales, cuenta técnica mínima y ningún secreto en logs o repositorio |
| SSRF/descarga abusiva | Lista de dominios TikTok, validación por salto, límites de bytes y tiempo |

## Retroceso

- La migración será aditiva y conservará los registros existentes.
- El endpoint manual actual no se elimina hasta validar el worker; puede quedar temporalmente como recuperación administrativa.
- La activación automática podrá controlarse con una variable de entorno durante el piloto.
- Ante fallo grave se detiene el worker; la cola queda persistida y el sitio público/editor siguen disponibles.

## Definition of Ready para implementar

- [x] Product Brief, flujos, requisitos y arquitectura aprobados.
- [x] HU-ED-07 documentada y aprobada.
- [x] Límites de duración, idiomas, retención y corroboración definidos.
- [x] DeepSeek elegido como proveedor principal.
- [x] Python 3.11 identificado en el equipo.
- [x] Migraciones 0010–0012 declaradas como aplicadas por el operador.
- [ ] Verificar técnicamente el esquema remoto antes de aplicar `0013`.
- [ ] Crear `.venv` e instalar dependencias durante la implementación.
- [ ] Configurar cuenta técnica mínima y clave de DeepSeek en el entorno local.

## Condición para comenzar

La implementación debe comenzar únicamente cuando el responsable indique explícitamente **`/IMPLEMENTAR HU-ED-07`**. Hasta entonces, este documento es el contrato técnico de alcance y no autoriza cambios funcionales.
