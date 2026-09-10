# Desglose ejecutable — HU-ED-07

## Propósito

Este documento divide el plan técnico de HU-ED-07 en unidades pequeñas, verificables y reversibles. Complementa `HU_INGESTA_ASISTIDA.md` y `PLAN_HU_ED_07.md`; no autoriza implementación.

## Reglas de ejecución

- Una tarea no comienza si sus dependencias no están cerradas.
- Cada tarea debe incluir pruebas o evidencia proporcional al riesgo.
- Ningún secreto, audio temporal ni credencial entra a Git.
- Ninguna etapa publica artículos.
- La migración se prepara primero y se aplica únicamente después de revisión.
- Con 8 GB de RAM, las pruebas pesadas se ejecutan de forma secuencial.

## Mapa de entregas

| Bloque | Resultado verificable | Dependencia |
|---|---|---|
| B0 | Entorno y esquema remoto comprobados | Ninguna |
| B1 | Cola durable y permisos mínimos definidos | B0 |
| B2 | Transcriptor reproducible y seguro | B0 |
| B3 | Redacción DeepSeek validada mediante contrato | B0 |
| B4 | Worker procesa una ingesta sin navegador | B1, B2, B3 |
| B5 | Borrador único, trazable y recuperable | B4 |
| B6 | Panel observable y reintentos controlados | B5 |
| B7 | QA integral y preparación del piloto | B6 |

## B0 — Preflight y evidencia del entorno

### T-00 — Confirmar rama y estado del repositorio

- Verificar rama `codex/enlaces-internos-compartir` y cambios locales del propietario.
- No sobrescribir trabajo no relacionado.
- **Salida:** registro del commit base de implementación.

### T-01 — Verificar esquema Supabase

- Confirmar existencia y firmas de las RPC de migraciones 0010–0012.
- Confirmar columnas, índices, RLS y grants de `editorial_ingestions`.
- Comparar el esquema remoto con los archivos versionados.
- **Salida:** lista de coincidencias y desviaciones antes de redactar 0013.
- **Intervención del propietario:** ejecutar consultas en Supabase si el conector no permite inspección directa.

### T-02 — Confirmar herramientas locales

- Comprobar Node/npm y Python 3.11.
- Consultar VRAM solo como dato diagnóstico; no bloquea el MVP.
- Comprobar espacio libre suficiente para modelos y temporales.
- **Salida:** matriz de versiones y recursos.
- **Intervención del propietario:** ejecutar comandos en `C:\PONTE LA 10`.

### T-03 — Establecer línea base

- Ejecutar lint, typecheck, pruebas unitarias y build antes de modificar.
- Separar fallos preexistentes de regresiones nuevas.
- **Salida:** informe de línea base.

## B1 — Cola durable, identidad y permisos

### T-10 — Diseñar migración 0013

- Agregar etapa, progreso, token de intento, lease, heartbeat, idioma y recuperabilidad.
- Añadir restricciones de rango y coherencia entre estado y campos de ejecución.
- Mantener compatibilidad con filas `pending` existentes.
- **Salida:** SQL revisable, todavía no aplicado.

### T-11 — Crear identidad técnica mínima

- Añadir un rol interno `workerIngesta` al modelo de roles de base de datos.
- No conceder `panel.acceder`, lectura general, edición humana, aprobación, programación ni publicación.
- Otorgar solamente las capacidades necesarias para reclamar, reportar progreso y finalizar mediante RPC restringidas.
- Evitar operaciones directas sobre tablas cuando exista una RPC específica.
- **Salida:** matriz exacta de grants y pruebas negativas.

### T-12 — Reclamar siguiente trabajo

- Implementar `claim_next_editorial_ingestion` con `FOR UPDATE SKIP LOCKED`.
- Priorizar `queued` por antigüedad y recuperar `processing` solo con lease vencido.
- Generar un token distinto en cada intento.
- **Salida:** dos reclamadores simultáneos nunca reciben la misma fila.

### T-13 — Heartbeat y propiedad del intento

- Actualizar etapa/porcentaje y renovar lease únicamente con token vigente.
- Rechazar heartbeat de intento anterior o ingesta terminada.
- **Salida:** pruebas de token válido, inválido y vencido.

### T-14 — Fallo y reencolado

- Diferenciar fallo permanente y recuperable.
- Limitar intentos automáticos; el MVP no reintenta indefinidamente.
- El reintento desde el panel vuelve a `queued` sin borrar historial ni evidencia.
- **Salida:** tabla de códigos de error y siguiente acción.

### T-15 — Cancelación sin carrera

- Permitir cancelar `pending` o `queued`.
- Si el worker ya reclamó la fila, devolver conflicto claro.
- **Salida:** cancelación y reclamación simultáneas producen un solo estado válido.

## B2 — Procesamiento local de TikTok

### T-20 — Entorno Python reproducible

- Crear `.venv` con Python 3.11.
- Fijar versiones compatibles de `yt-dlp`, `faster-whisper` e `imageio-ffmpeg`.
- Ignorar `.venv`, modelos y temporales en Git.
- **Salida:** instalación limpia desde `workers/requirements.txt`.

### T-21 — Contrato JSON del transcriptor

- Definir entrada y salida versionadas.
- Incluir metadatos, duración, idioma, segmentos y advertencias.
- Validar la salida en TypeScript con Zod.
- **Salida:** fixtures válidos e inválidos.

### T-22 — Validación previa de TikTok

- Aceptar exclusivamente hosts oficiales previstos.
- Revalidar redirecciones, protocolo, DNS/IP y URL final.
- Rechazar recursos privados/locales y credenciales embebidas.
- **Salida:** pruebas de URLs válidas y maliciosas.

### T-23 — Límite de duración y recursos

- Leer metadatos antes de descargar audio completo.
- Rechazar duración mayor a 180 segundos.
- Definir timeout y límite máximo de bytes.
- **Salida:** video largo falla en etapa de metadatos.

### T-24 — Transcripción bilingüe

- Permitir detección automática de Whisper.
- Aceptar `es` y `en`; fallar claramente para otros idiomas.
- Conservar segmentos y texto original.
- **Salida:** fixture español e inglés con idioma explícito.

### T-25 — Limpieza garantizada

- Usar directorio temporal único por intento.
- Eliminar audio en éxito, excepción, timeout y señal de cierre.
- **Salida:** prueba que no deja archivos residuales.

## B3 — Traducción y redacción con DeepSeek

### T-30 — Contrato del proveedor

- Definir `ProveedorRedaccionEditorial` independiente de DeepSeek.
- Separar traducción, redacción y metadatos de consumo.
- **Salida:** proveedor simulado usable en pruebas.

### T-31 — Esquema de borrador

- Validar título, resumen, documento, SEO, créditos, dudas y afirmaciones por verificar.
- Aplicar los límites reales del modelo editorial existente.
- **Salida:** Zod rechaza campos ausentes, longitudes inválidas y documento vacío.

### T-32 — Instrucciones editoriales versionadas

- Español global, lenguaje claro y tono compatible con Pont3la10.
- Prohibir hechos, citas, fuentes, fechas o resultados inventados.
- Evitar copia extensa de la transcripción.
- Marcar inferencias y elementos por corroborar.
- **Salida:** prompt versionado y casos de evaluación.

### T-33 — Cliente DeepSeek

- Llamar solo desde el worker/servidor.
- Configurar modelo, timeout, límites de tokens y un reintento por salida inválida.
- No registrar API key ni texto sensible innecesario.
- **Salida:** pruebas con respuestas simuladas de éxito, 429, timeout y JSON inválido.

### T-34 — Traducción de inglés

- Mantener transcripción original.
- Generar traducción española diferenciada y trazable.
- No traducir nombres propios ni citas sin señalarlas.
- **Salida:** original y traducción permanecen separados.

### T-35 — Medición de coste

- Registrar proveedor, modelo, tokens de entrada/salida, duración y coste estimado por intento.
- Definir advertencia al aproximarse al presupuesto mensual, sin bloquear silenciosamente.
- **Salida:** consumo visible y sumable.

## B4 — Worker independiente

### T-40 — Proceso y autenticación

- Crear comando npm dedicado para iniciar el worker.
- Iniciar sesión con cuenta `workerIngesta` y renovar sesión.
- Fallar al arrancar si faltan variables obligatorias.
- **Salida:** el worker no requiere una sesión abierta del navegador.

### T-41 — Bucle de trabajo

- Polling moderado con pausa creciente cuando la cola esté vacía.
- Concurrencia fija en uno.
- Detención ordenada ante Ctrl+C o cierre del proceso.
- **Salida:** consumo en reposo bajo y sin solicitudes agresivas.

### T-42 — Orquestación por etapas

- Metadatos → descarga → transcripción → traducción si aplica → redacción → borrador.
- Heartbeat independiente durante operaciones largas.
- **Salida:** cada etapa deja progreso y error identificables.

### T-43 — Recuperación

- Simular cierre del worker a mitad del proceso.
- Esperar vencimiento del lease y recuperar con token nuevo.
- Impedir que el intento antiguo finalice.
- **Salida:** recuperación sin bloqueo ni duplicado.

## B5 — Borrador único y trazabilidad

### T-50 — Finalización transaccional

- Crear una RPC dedicada que, con token vigente, cree el artículo y complete la ingesta en una transacción.
- Reutilizar restricciones, triggers de versión y auditoría existentes.
- **Salida:** no puede quedar artículo huérfano por fallo entre operaciones.

### T-51 — Idempotencia

- Imponer como máximo un artículo por ingesta mediante relación/restricción estable.
- Si se repite la finalización, devolver el artículo existente o un resultado idempotente.
- **Salida:** repetir la misma solicitud no aumenta el número de artículos.

### T-52 — Autoría del borrador

- Conservar `requested_by` como responsable humano del borrador.
- Registrar al worker como actor técnico de procesamiento en auditoría.
- **Salida:** la cuenta técnica no aparece como autor editorial.

### T-53 — Evidencia y verificación

- Guardar metadatos y transcripción; no audio.
- Vincular URL, autor y créditos originales.
- Marcar corroboración independiente pendiente.
- **Salida:** el editor puede rastrear el borrador hasta su fuente.

## B6 — Experiencia del panel

### T-60 — Registro automático

- Las nuevas fuentes TikTok válidas entran en `queued`.
- Responder rápidamente; no iniciar Whisper dentro del POST.
- **Salida:** registrar no espera el procesamiento.

### T-61 — Progreso observable

- Mostrar estado, etapa, porcentaje, intentos y última actividad.
- Refrescar solo mientras existan trabajos activos.
- **Salida:** el panel refleja cambios sin bloquear la navegación.

### T-62 — Acciones de recuperación

- Sustituir “Procesar TikTok” por “Reintentar” cuando el fallo sea recuperable.
- Mantener cancelación previa al inicio y enlace al borrador final.
- **Salida:** cada estado ofrece únicamente acciones válidas.

### T-63 — Mensajes operativos

- Traducir códigos de error a instrucciones accionables.
- No mostrar trazas, tokens, rutas sensibles ni respuestas crudas del proveedor.
- **Salida:** catálogo de mensajes revisado.

## B7 — Cierre y piloto

### T-70 — Pruebas automáticas completas

- Ejecutar lint, typecheck, unitarias y build.
- Agregar integración para leases, idempotencia y permisos.
- **Salida:** resultados documentados y sin regresiones nuevas.

### T-71 — Prueba real controlada

- Procesar un TikTok corto en español y otro en inglés.
- Probar video largo, URL inválida, caída de DeepSeek y reinicio del worker.
- **Salida:** evidencia de los siete escenarios del plan técnico.

### T-72 — Runbook local

- Documentar instalación, variables, arranque de Nuxt y worker, actualización de yt-dlp, recuperación y diagnóstico.
- Diseñar comandos compatibles con PowerShell en `C:\PONTE LA 10`.
- **Salida:** operación repetible por una sola persona.

### T-73 — Gate de release

- Revisión de seguridad, regresión editorial y coste.
- Confirmar que ninguna ruta publica automáticamente.
- **Salida:** decisión explícita de habilitar o no el piloto.

## Códigos de error mínimos

| Código | Tipo | Acción esperada |
|---|---|---|
| `TIKTOK_URL_INVALID` | Permanente | Corregir URL y crear nueva ingesta |
| `TIKTOK_VIDEO_TOO_LONG` | Permanente | Elegir un video de hasta tres minutos |
| `TIKTOK_LANGUAGE_UNSUPPORTED` | Permanente | Usar contenido en español o inglés |
| `TIKTOK_UNAVAILABLE` | Recuperable según causa | Revisar disponibilidad y reintentar |
| `TRANSCRIPTION_TIMEOUT` | Recuperable | Reintentar cuando haya recursos |
| `TRANSCRIPTION_FAILED` | Recuperable | Revisar worker/modelo y reintentar |
| `DEEPSEEK_RATE_LIMIT` | Recuperable | Esperar y reintentar manualmente |
| `DEEPSEEK_INVALID_OUTPUT` | Recuperable | Revisar instrucciones/modelo |
| `LEASE_LOST` | Interno | Abortar intento antiguo sin modificar la fila |
| `DRAFT_FINALIZATION_FAILED` | Recuperable | Inspeccionar transacción; no recrear a ciegas |

## Trazabilidad con criterios de aceptación

| Criterio HU-ED-07 | Tareas principales |
|---|---|
| Registro de TikTok válido | T-22, T-60 |
| Inicio automático | T-12, T-40, T-41, T-60 |
| Máximo tres minutos | T-23 |
| Español e inglés | T-24, T-34 |
| Conservación de metadatos/transcripción | T-21, T-53 |
| Eliminación de audio | T-25 |
| Borrador revisable, nunca publicado | T-31, T-50, T-53 |
| Exactamente un artículo | T-50, T-51 |
| Recuperación y reintento | T-13, T-14, T-43, T-62 |
| Progreso visible | T-42, T-61 |
| Corroboración independiente | T-32, T-53 |

## Puntos de intervención del propietario

No deben pedirse todos por adelantado. Se solicitarán justo antes de ser necesarios:

1. Ejecutar comprobaciones de Supabase y compartir resultados no sensibles.
2. Ejecutar comprobaciones de Node, Python, espacio y opcionalmente VRAM.
3. Crear la cuenta técnica siguiendo instrucciones, sin compartir contraseña.
4. Crear/guardar la clave DeepSeek localmente, sin pegarla en el chat.
5. Aplicar la migración revisada cuando llegue el gate correspondiente.
6. Ejecutar pruebas reales de TikTok desde el PC local.

## Próximo gate de planeación

Antes de implementar deben cerrarse dos artefactos adicionales:

- diseño SQL detallado de `0013` con permisos y rollback lógico;
- contrato exacto del worker, transcriptor y proveedor DeepSeek con ejemplos JSON sin datos reales.

Después de esos artefactos, la planeación estará suficientemente detallada para solicitar nuevamente la autorización `/IMPLEMENTAR HU-ED-07`.
