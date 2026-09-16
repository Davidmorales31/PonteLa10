# Diseño SQL revisable — futura 0013

Fecha inicial: 2026-09-10. Aislado el 2026-09-15 sobre `ff28d4c` (`origin/main`).
Fuente histórica del diseño: `358f7d6793bf64b188ca51a9300119564c2d5b6d`.

Documento de planeación. NO es una migración ejecutable ni autoriza aplicarla. Nombre reservado: `0013_ingesta_worker_durable.sql`; ese archivo no se crea todavía. El esquema remoto no está verificado; todos los cambios requieren contraste con B0/T-01.

## 1. Alcance e invariantes

HU-ED-07 termina en `evidence_ready`, sin insertar, actualizar ni eliminar artículos. Traducción de inglés pertenece a esta HU; redacción, vínculo idempotente con artículo y finalización de borrador pertenecen a HU-ED-08. Conservar los `article_id` y `draft_created` históricos sin reinterpretarlos.

Invariantes del protocolo 2:

1. Como máximo una reserva vigente en el piloto; cada ingesta tiene como máximo un intento activo.
2. Solo el usuario técnico activo dueño del intento, su instancia y su token vigente pueden modificarlo.
3. El reloj PostgreSQL decide la vigencia. Un lease vencido nunca se renueva ni resucita.
4. El resultado aceptado se persiste atómicamente con su terminal; repetir la misma finalización devuelve el recibo sin duplicar evidencia.
5. Tokens y recibos privados no se exponen en listados, auditoría, navegador ni tablas con SELECT general.
6. `requested_by` permanece como responsable humano. `auth.uid()` identifica al actor técnico; no se suplanta al humano.
7. Ni los errores ni los reencolados borran evidencia válida o historial de intentos.

## 2. Fuente de verdad local y transición

0010 tiene índice único de `normalized_url` para `pending/queued/processing`, `attempts` entre 0 y 20, RLS de lectura por `ingestas.ver` e INSERT restringido a `pending`. 0011/0012 tienen claim por ID y ventana fija de 15 minutos; sus complete/fail no verifican token. 0003 implementa roles con CHECK tanto en `user_roles` como en `editorial_role_permissions`; `has_editorial_permission` consulta roles activos. No existe tabla de roles que pueda extenderse solo con una fila.

La futura 0013 será aditiva en datos, pero cambia el protocolo de escritura: requiere una ventana de activación coordinada con la API y el worker. No es compatible con el endpoint síncrono antiguo en operación. Mantenerlo sin autorización SQL no constituye un mecanismo de recuperación.

## 3. Esquema público propuesto

Extender `public.editorial_ingestions`; nombres SQL en snake_case conservan la convención real. Los contratos JSON de dominio usan camelCase en español.

| Campo nuevo | Tipo y default | Restricción / propósito |
|---|---|---|
| execution_protocol | smallint NOT NULL DEFAULT 1 | CHECK IN (1,2); solo registro nuevo/controlado asigna 2 |
| processing_stage | text NULL | Enumeración por CHECK definida abajo |
| progress_percent | integer NOT NULL DEFAULT 0 | CHECK entre 0 y 100 |
| current_attempt_id | uuid NULL | FK a tabla privada de intentos, ON DELETE RESTRICT; identificador público, NO token |
| lease_expires_at | timestamptz NULL | Espejo de reserva para observabilidad |
| heartbeat_at | timestamptz NULL | Última actividad recibida por DB |
| source_language | text NULL | CHECK IN ('es','en') cuando no nulo |
| retryable | boolean NOT NULL DEFAULT false | Política de error validada por catálogo, no decisión libre del cliente |
| queued_at | timestamptz NULL | Antigüedad de esta entrada a cola, separada de created_at |
| result_version | integer NOT NULL DEFAULT 0 | CHECK >=0; 1 al aceptar evidencia final, no crece por replay |
| retry_cycle_attempts | integer NOT NULL DEFAULT 0 | CHECK entre 0 y 3; se reinicia solo por requeue humano |

Conservar `source_metadata`, `processing_result`, `attempts`, `next_attempt_at`, `started_at`, `finished_at`, errores y `article_id`. `attempts` sigue siendo contador total monotónico hasta 20; jamás reiniciarlo para eludir el límite. Al llegar a 20, no reencolar; mostrar intervención requerida.

Estados permitidos: los seis existentes más `evidence_ready`. Etapas: NULL, `validating_source`, `reading_metadata`, `downloading_audio`, `transcribing`, `translating`, `persisting_evidence`, `completed`. Redacción y `research_pending` no son etapas de HU-ED-07; la corroboración pendiente es un dato editorial.

Fragmentos de restricciones a incorporar en el futuro DDL (no ejecutar ahora):

```sql
CHECK (execution_protocol IN (1, 2));
CHECK (progress_percent BETWEEN 0 AND 100);
CHECK (source_language IS NULL OR source_language IN ('es', 'en'));
CHECK (retry_cycle_attempts BETWEEN 0 AND 3);
CHECK (result_version >= 0);
CHECK (processing_stage IS NULL OR processing_stage IN (
  'validating_source', 'reading_metadata', 'downloading_audio',
  'transcribing', 'translating', 'persisting_evidence', 'completed'));
CHECK (execution_protocol = 1 OR
  (article_id IS NULL AND status <> 'draft_created'
   AND result_version IN (0,1)));
CHECK (execution_protocol = 1 OR
  ((status = 'evidence_ready') = (result_version = 1)));
CHECK (execution_protocol = 1 OR (
  (status = 'processing' AND current_attempt_id IS NOT NULL
    AND lease_expires_at IS NOT NULL AND heartbeat_at IS NOT NULL
    AND started_at IS NOT NULL AND finished_at IS NULL
    AND processing_stage IS NOT NULL AND processing_stage <> 'completed'
    AND progress_percent < 100)
  OR
  (status <> 'processing' AND current_attempt_id IS NULL
    AND lease_expires_at IS NULL)
));
CHECK (execution_protocol = 1 OR status <> 'evidence_ready' OR (
  result_version = 1 AND processing_stage = 'completed'
  AND progress_percent = 100 AND source_language IS NOT NULL
  AND finished_at IS NOT NULL AND article_id IS NULL
));
CHECK (execution_protocol = 1 OR status NOT IN ('failed','cancelled')
  OR finished_at IS NOT NULL);
```

El validador de evidencia debe comprobar JSON requerido con `IS TRUE`/rechazo explícito de NULL: un CHECK que resulta NULL no basta. Ningún CHECK debe usar `now()` para intentar verificar vigencia: el tiempo cambia sin escribir la fila. La coherencia entre tablas y el DAG de etapas se verifican dentro de RPC transaccionales; no mediante CHECK con subconsultas.

Índices:

- Conservar `idx_editorial_ingestions_active_url` sin ampliar a terminales: RN05 habla de ingestas activas, no deduplicación eterna.
- Nuevo índice parcial `(queued_at, id) WHERE status='queued' AND execution_protocol=2 AND source_platform='tiktok'`; filtrar vencimiento de `next_attempt_at` en consulta.
- Nuevo índice parcial `(lease_expires_at,id) WHERE status='processing' AND execution_protocol=2`.
- Índice único privado por `(ingestion_id, attempt_number)`; token único; `(worker_user_id, worker_instance_id, claim_request_id)` único.
- La relación futura uno-a-uno con artículos no se agrega en 0013. HU-ED-08 deberá diseñar una relación estable que sobreviva a replays y definir comportamiento ante eliminación del artículo; `article_id ON DELETE SET NULL` por sí solo no lo garantiza.

## 4. Tablas privadas de ejecución

Usar schema `private`, no expuesto por PostgREST. No conceder USAGE ni privilegios directos a anon/authenticated. RLS habilitada sin políticas cliente; propietario de funciones administrado por migraciones. No cambiar globalmente privilegios de otros módulos.

### private.editorial_ingestion_attempts

| Campo | Tipo / regla |
|---|---|
| id | uuid PK generado por DB |
| ingestion_id | uuid NOT NULL FK public.editorial_ingestions ON DELETE RESTRICT |
| attempt_number | integer NOT NULL, 1–20 |
| attempt_token | uuid NOT NULL UNIQUE, gen_random_uuid(), nunca sale al panel |
| worker_user_id | uuid NOT NULL FK auth.users ON DELETE RESTRICT |
| worker_instance_id | uuid NOT NULL; nuevo al iniciar un proceso |
| claim_request_id | uuid NOT NULL; estable al repetir una petición de claim |
| status | text CHECK active/completed/failed/expired |
| started_at / heartbeat_at / lease_expires_at | timestamptz NOT NULL |
| deadline_at | timestamptz NOT NULL; máximo absoluto de duración del intento |
| finished_at | timestamptz NULL; obligatorio si terminal |
| error_code / error_stage | text NULL, catálogo / etapas válidas |
| final_payload | jsonb NULL, copia exacta normalizada del resultado aceptado |
| final_receipt | jsonb NULL; respuesta estable de complete/fail |
| last_sequence | bigint NOT NULL DEFAULT 0; monotónico por intento |
| last_heartbeat_payload / last_heartbeat_receipt | jsonb NULL; deduplicación del último heartbeat |

CHECK: active implica finished_at NULL; terminal implica finished_at NOT NULL. `deadline_at > started_at`, lease entre inicio y deadline. La FK circular desde current_attempt_id se agrega después de crear ambas tablas. Insertar el intento antes de asociarlo a la ingesta dentro de la misma transacción.

### private.editorial_ingestion_slot

Una fila fija `id smallint PRIMARY KEY CHECK(id=1)` y `attempt_id uuid NULL REFERENCES private.editorial_ingestion_attempts(id) ON DELETE RESTRICT`. Su bloqueo serializa asignación de reservas, sin mantener una transacción abierta mientras corre Python. El slot referencia el intento; las fechas/identidad se leen desde ese intento.

### private.editorial_ingestion_requeue_receipts

`request_id uuid`, `actor_id uuid REFERENCES auth.users ON DELETE RESTRICT`, `ingestion_id uuid REFERENCES public.editorial_ingestions ON DELETE RESTRICT`, `receipt jsonb NOT NULL`, `created_at timestamptz NOT NULL`; PK `(actor_id,request_id)`. Retener recibos en el piloto para evitar que un retry HTTP reencole otra vez tras una transición posterior. Reusar request_id para otra ingesta produce conflicto.

## 5. Identidad, grants y RLS

Agregar `workerIngesta` a ambos CHECK de roles. Crear únicamente capacidades técnicas `ingestas.worker.reclamar`, `ingestas.worker.reportar`, `ingestas.worker.finalizar`, asignadas solo a workerIngesta. No repetir el CROSS JOIN de 0003 que daría capacidades nuevas a roles humanos. La RPC exige capacidad técnica Y rol workerIngesta activo Y ausencia de otro rol editorial activo. Asignación de cuenta fuera de 0013, sin password ni usuario real embebido.

Crear `ingestas.registrar` para los seis roles humanos. No agregar `ingestas.gestionar` a roles básicos. Las RPC humanas rechazan una cuenta workerIngesta incluso si una asignación errónea le añadiera otra capacidad.

| Actor | Registrar | Consultar | Cancelar/requeue | claim/reportar/complete/fail | Escribir artículos |
|---|---|---|---|---|---|
| anon / autenticado sin rol | No | No ingestas | No | No | Según políticas públicas existentes, sin nuevas escrituras |
| colaborador / autor | Sí | Sus propias ingestas por registrar + requested_by=uid | No | No | Sin cambios a capacidades editoriales existentes |
| editor / editorJefe | Sí | Lectura existente por ingestas.ver | No | No | Sin cambios |
| propietario / administrador | Sí | Lectura existente por ingestas.ver | Sí | No | Sin cambios |
| workerIngesta exclusivo | No | Solo trabajo reclamado y recibos por RPC | No | Sí, según capacidad/propiedad | No |

La identidad técnica aún puede heredar lecturas públicas y su propio perfil de authenticated; no se promete aislamiento de datos que ya son públicos. No se le otorga lectura editorial general, panel, equipo, Storage ni publicación.

Entrada nueva: `register_editorial_ingestion(p_payload jsonb) RETURNS jsonb`. SECURITY DEFINER; verifica ingestas.registrar, rol humano, URL/campos y genera requested_by con auth.uid(). Inserta `queued`, protocolo 2, attempts=0, queued_at/next_attempt_at=hora DB; article/result/token no son parámetros. Validar taxonomía existente/activa si se recibe. El cliente no puede suministrar URLs de medios descargables ni conservarVideo=true como instrucción efectiva. Resolver normalización compartida antes de activar; no confiar solo en validación de Nitro para evitar duplicados vía RPC directa. Validación DNS queda en worker, no en SQL.

Revocar INSERT de tabla a authenticated y sustituir el flujo por esa RPC. Mantener SELECT humano RLS: `has_editorial_permission('ingestas.ver') OR (has_editorial_permission('ingestas.registrar') AND requested_by=auth.uid())`, excluyendo identidad técnica. No hay política UPDATE/DELETE cliente. Los secretos del intento viven en private, por lo que el SELECT público no puede filtrarlos accidentalmente.

Funciones públicas nuevas: `SECURITY DEFINER SET search_path=''`, referencias completamente calificadas, sin SQL dinámico ni parámetros para elegir usuario/tabla/rol. `REVOKE ALL ... FROM PUBLIC, anon, authenticated` seguido de `GRANT EXECUTE ... TO authenticated`, con autorización interna obligatoria: authenticated incluye tanto humanos como la cuenta técnica. Helpers privados no reciben EXECUTE cliente. DDL y revocación en la misma transacción para evitar ventana de acceso por default.

Revocar EXECUTE de las firmas antiguas de claim/complete/fail a PUBLIC/anon/authenticated y reemplazar sus cuerpos por error estable `LEGACY_PROCESSING_DISABLED` durante el corte; no dejar overload ambiguo para PostgREST. Retirar las firmas antiguas al verificar dependencias. Cancelación existente se sustituye con guardas y recibo, conservando firma `(target_ingestion_id uuid)`.

Mantener trigger updated_at. Sustituir solo el trigger de auditoría de ingestas por uno específico: auditar registro, claim, cambio de etapa, checkpoint, recuperación, finalización, fail, requeue y cancelación. Heartbeats sin cambio de etapa no insertan una fila cada 20 s. Actor=auth.uid(); metadata solo IDs de intento (no token), estado, etapa, código y contador. No adjuntar payload, transcripción, rutas ni secretos. No modificar audit_editorial_change para otros dominios.

## 6. RPC: firmas y comportamiento exacto

Todas retornan JSON versión 1 del documento de contratos. Parámetros SQL `p_...`; IDs/tokens nunca opcionales. Excepciones de autenticación usan SQLSTATE 42501 con mensaje seguro. Conflictos de dominio retornan `{ok:false,error:{codigo,...}}`; infraestructura/constraint inesperada hace rollback y se traduce fuera de DB sin exponer texto crudo. No retornar éxito cuando falta la fila.

```sql
claim_next_editorial_ingestion(p_worker_instance_id uuid, p_request_id uuid)
heartbeat_editorial_ingestion(p_ingestion_id uuid, p_attempt_token uuid,
  p_worker_instance_id uuid, p_sequence bigint, p_stage text,
  p_percent integer, p_checkpoint jsonb DEFAULT NULL)
complete_editorial_ingestion(p_ingestion_id uuid, p_attempt_token uuid,
  p_worker_instance_id uuid, p_payload jsonb)
fail_editorial_ingestion(p_ingestion_id uuid, p_attempt_token uuid,
  p_worker_instance_id uuid, p_code text, p_stage text,
  p_retryable boolean)
requeue_editorial_ingestion(p_ingestion_id uuid, p_request_id uuid)
```

La nueva firma complete tiene `(uuid,uuid,uuid,jsonb)`, distinta de `(uuid,uuid,jsonb,jsonb)` legacy. No aceptar `article_id`. Fail genera el mensaje desde catálogo; no recibe una traza arbitraria. `p_retryable` se exige igual a la clasificación del código, no puede convertir URL peligrosa en error reintentable.

### Orden de bloqueo común

Funciones que afectan un intento: slot fila 1 → ingesta → intento. Requeue/cancel solo bloquean ingesta y no toman slot posteriormente. El reaper usa el orden común. Evitar ciclos de locks. Capturar `v_now := clock_timestamp()` después de obtener los locks y antes de evaluar lease; `now()` al inicio de una transacción que esperó un lock podría aceptar un token ya vencido. Las RPC deben ser breves y tener límites de lock/statement durante implementación.

### Claim

1. Autorizar cuenta. Bloquear slot (`FOR UPDATE SKIP LOCKED`); si ocupado devolver `ocupado`, sin espera activa.
2. Buscar recibo por actor+instancia+request_id: si su intento sigue vigente devolver la misma asignación, sin incrementar attempts. Si expiró o terminó, devolver `solicitud_consumida`; el proceso debe generar otra petición. Nunca reusar esa petición para otra ingesta.
3. Si slot referencia intento vigente, devolver `ocupado`; no reclamar otra fila, incluso con otra instancia/cuenta técnica.
4. Si venció, cerrar intento como expired. Limpiar slot y reserva de ingesta. Si quedan <3 intentos en ciclo y <20 totales, reencolar con next_attempt_at=DB+60 s; de lo contrario failed con `ATTEMPTS_EXHAUSTED`, recuperable solo manualmente si total<20. Esta recuperación no lanza excepción después de actualizar: debe poder commit incluso si luego no hay trabajo.
5. Seleccionar una TikTok protocolo 2 queued, article_id NULL, result_version=0, attempts<20, ciclo<3 y next_attempt_at<=v_now, ordenada por queued_at,id: `FOR UPDATE SKIP LOCKED LIMIT 1`. Filas pending/protocolo 1 nunca se reclaman automáticamente.
6. Crear UUID de intento y token NUEVOS en DB, incremento total y de ciclo; started_at/heartbeat=v_now, deadline=v_now+15 min, lease=min(v_now+90 s,deadline). Asociar slot e ingesta, estado processing/validating_source/0 %. Devolver solo fuente, checkpoint válido y campos de control necesarios.

Parámetros 90 s lease, 20 s heartbeat, 15 min deadline, 3 intentos/ciclo y espera 60 s son propuestas operativas revisables; 180 s de video y tope histórico 20 no son nuevos supuestos. Deadline impide un proceso bloqueado que envíe heartbeats para siempre. Si worker no está ejecutándose no hay reaper: la UI debe identificar lease vencido y el siguiente arranque recuperará. No prometer que la DB cambia estados sola.

### Heartbeat y checkpoint

Comprobar cuenta+instancia+token+estado activo+ingesta processing+reserva del slot; lease y deadline deben ser estrictamente posteriores a v_now. En caso contrario `LEASE_LOST`, sin escribir nada. `p_sequence` empieza en 1. Menor que last_sequence: `STALE_HEARTBEAT`; igual: devolver recibo solo si payload es idéntico, sin extender lease ni sobrescribir; mayor: validar transición/progreso y aplicar.

La etapa puede permanecer o avanzar: validating_source→reading_metadata→downloading_audio→transcribing→translating (solo en)→persisting_evidence. Para es, transcribing→persisting_evidence. Recuperación con checkpoint de original permite saltar extracción/transcripción únicamente si su evidencia es íntegra, mismo video/URL/versión y validada; el salto se registra. No permitir retroceder porcentaje dentro del mismo intento; sí reiniciarlo al reclamar uno nuevo.

Heartbeat aceptado fija heartbeat_at=v_now y lease_expires_at=min(v_now+90 s,deadline_at) tanto en intento como en ingesta. No recibe duración de lease del cliente. Checkpoint de original fija source_language desde su idioma validado; un heartbeat sin checkpoint no lo altera.

Checkpoint admite dos objetos discriminados: `metadatos` y `transcripcion`. Validar sus esquemas en DB y Zod; tamaño máximo 1 MiB. Guardar metadatos en source_metadata y original validado en processing_result bajo contrato versionado. No borrar un checkpoint más avanzado si llega uno menor. No guardar audio/URL firmada de descarga. Es un guardado durable antes de llamar traducción: un fail de proveedor conserva original. Heartbeat sin checkpoint no reescribe el JSON grande.

### Complete

Primero autorizar. Si existe intento completed del mismo usuario/instancia/token, comparar p_payload normalizado con final_payload jsonb; igualdad devuelve final_receipt, incluso después de expirar el antiguo lease. Payload distinto → `IDEMPOTENCY_CONFLICT`. Token distinto/antiguo no obtiene replay ni modifica nada.

Para primer cierre exigir todas las guardas de vigencia. Validar evidencia completa (incluido original no vacío, duración<=180, es/en, traducción en→es cuando procede, limpieza exitosa y versiones). Fuente de payload debe corresponder a ingesta/checkpoint; no permitir cambiar solicitante ni URL arbitrariamente.

En UNA transacción: persistir evidencia, source_language y result_version=1; status=evidence_ready, etapa completed/progreso100, finished_at=v_now, limpiar current_attempt_id/lease, retryable=false/errores NULL; cerrar intento completed con payload y recibo; liberar slot; auditar. Nunca tocar articles. Caída antes del commit no deja cierre parcial; pérdida de respuesta se resuelve repitiendo exactamente la solicitud.

### Fail

Mismas guardas de intento vigente. Mismo fail de intento terminal devuelve su recibo; código/etapa/clasificación distintos → conflicto. Un fail tardío tras complete no degrada el resultado. Guardar failed, error de catálogo, finished_at, retryable y evidencia previa intacta; cerrar intento y liberar slot. Los errores explícitos no se reintentan automáticamente en MVP. Solo expiración inesperada permite recuperación automática acotada. Si fail no llega a DB, el vencimiento posterior ofrece recuperación.

### Requeue y cancel

Requeue exige ingestas.gestionar, cuenta humana y recibo idempotente por p_request_id. Solo failed/retryable, article_id NULL, result_version=0 y attempts<20; también permite promoción explícita de pending TikTok legacy una vez revisada la URL. Una ingesta evidence_ready devuelve `RESULT_ALREADY_EXISTS` sin encolarla. Requeue reinicia solo contador de ciclo, limpia error visible/reserva/finished_at, fija queued_at/next_attempt_at=DB, conserva evidencia e historial. El índice de URL activa puede rechazar 23505 si hay otra solicitud; traducir a `ACTIVE_URL_CONFLICT` sin perder el estado previo.

Cancelación exige ingestas.gestionar y lock de fila: pending/queued→cancelled. Si claim ganó y ya está processing, conflicto sin enviar señal a un proceso ajeno. Repetir cancel sobre cancelled devuelve el mismo terminal. No hay cancelación humana en vuelo en HU-ED-07; el apagado local es otra operación, que aborta subprocesos y falla o deja vencer lease.

## 7. Preparación, datos legacy y corte

1. Inspeccionar catálogo remoto, pendientes/procesamientos y resultados legacy sin exponer contenido. Confirmar firmas y nombres reales de CHECK antes de DROP/ADD; no asumir nombres derivados.
2. Detener entrada de procesamiento legacy y confirmar que no hay procesos antiguos vivos; preservar tablas/artículos/evidencia. Esto pertenece a futura implementación coordinada.
3. Crear estructuras/funciones/grants en transacción. Mantener protocolo 1 por defecto para filas históricas. Ninguna fila cambia a evidence_ready solo por tener JSON no vacío.
4. Reportar processing legacy como incidencia a revisar; una operación administrativa futura podrá marcarlos failed `LEGACY_REVIEW_REQUIRED`, sin borrar datos ni crear borradores. No sintetizar historial como si el worker nuevo los hubiera procesado.
5. Actualizar registro nuevo a protocolo 2. Pending antiguos solo se promueven por requeue autorizado y validación. Conservar draft_created/article_id históricos, sin imponer nuevas restricciones que invaliden datos no inspeccionados.
6. Revocar y deshabilitar RPC legacy. Activar API de registro/panel compatibles y worker únicamente después de pruebas; no aplicar 0013 aislada al código actual.

## 8. Rollback lógico

No borrar columnas, tablas, evidencias, artículos ni historial. Deshabilitar registro automático mediante configuración futura y detener worker; revocar EXECUTE de RPC técnicas y desactivar asignación workerIngesta por procedimiento autorizado. Esperar vencimiento o cerrar reservas por operación administrativa auditada; conservar queued y evidence_ready. Mantener SELECT humano y sitio/editor existentes.

No restaurar el procesador síncrono ni las RPC sin token sobre filas protocolo 2. Una reversión de aplicación necesita versión de panel que entienda evidence_ready o deje solo lectura; no ocultar estado como draft_created. Guardar un registro compensatorio para cualquier cambio de estado. Corregir hacia delante en otra migración, tras diagnóstico y autorización. El retroceso de estructura solo se diseñará si se demuestra que no hay consumidores ni datos nuevos; queda fuera de este rollback lógico.

## 9. Consulta de catálogo propuesta para T-01

Solo SELECT, sin filas de usuarios ni datos de ingesta. Ejecutar mediante acceso administrado existente cuando se coordine la comprobación; no pedir claves por chat.

```sql
select version();
select table_schema, table_name, column_name, data_type,
       is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name in ('editorial_ingestions','user_roles',
                    'editorial_role_permissions')
order by table_name, ordinal_position;

select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity,
       k.conname, pg_get_constraintdef(k.oid) as definition
from pg_class c join pg_namespace n on n.oid=c.relnamespace
left join pg_constraint k on k.conrelid=c.oid
where n.nspname='public' and c.relname in
 ('editorial_ingestions','user_roles','editorial_role_permissions');

select schemaname, tablename, indexname, indexdef from pg_indexes
where schemaname='public' and tablename='editorial_ingestions';
select * from pg_policies where schemaname='public' and tablename in
 ('editorial_ingestions','user_roles','editorial_role_permissions');
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in
 ('editorial_ingestions','user_roles','editorial_role_permissions');

select p.oid::regprocedure as signature, p.prosecdef, p.proconfig,
       p.proacl, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and
 (p.proname like '%editorial_ingestion%'
  or p.proname in ('has_role','has_editorial_permission',
                   'audit_editorial_change'));
```

Complementar con triggers de la tabla, grants por columna, default privileges y versión de PostgREST/schema expuestos. Revisar resultados localmente antes de compartirlos; reportar coincidencias/desviaciones, no credenciales. La inspección SQL de catálogo no sustituye pruebas de autorización con sesiones reales de staging.

## 10. Riesgos y pruebas exigidas

- Dos sesiones: mismo claim request, diferentes request, slot ocupado y lease expirado; nunca dos reservas vigentes.
- Pausar una RPC esperando lock hasta vencer lease: no debe completar con hora antigua.
- Token anterior, otra instancia, otra cuenta, rol retirado, rol técnico mezclado, legacy overload y llamadas directas a tabla: rechazo sin mutación.
- Replay heartbeat antiguo, payload cambiado, complete repetido tras respuesta perdida, fail tras complete y requeue repetido después de otro intento.
- Rollback inyectado en cada escritura de complete; evidencia/terminal/slot/historial siempre juntos.
- Carrera cancel/claim y requeue/duplicado URL; no dejar estados inválidos.
- Cada código de error conserva el checkpoint válido y respeta 3/ciclo y 20/totales.
- Migración ensayada contra dataset legacy; rollback lógico conserva datos y no habilita procesador inseguro.
- Cero escrituras en articles/article_versions por HU-ED-07.

Un lease evita escrituras tardías, pero no mata un proceso que perdió la red. Node debe cortar el árbol Python/FFmpeg antes de su vencimiento con margen y usar exclusión local por proceso; la prueba de cierre abrupto es gate B4/B7. No atribuir al lock de DB la garantía de detener trabajo CPU externo.

Referencias técnicas consultadas: [bloqueos y SKIP LOCKED de PostgreSQL](https://www.postgresql.org/docs/current/sql-select.html) y [SECURITY DEFINER, search_path y permisos de funciones](https://www.postgresql.org/docs/current/sql-createfunction.html). Respaldan los mecanismos SQL; el modelo y límites anteriores son propuestas del proyecto, pendientes de ensayo contra la versión remota.
