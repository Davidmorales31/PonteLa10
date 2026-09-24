# HU-ED-07 — Procesar una ingesta de TikTok

Última actualización: 2026-09-10

Esta especificación sustituye como alcance vigente la fase inicial de bandeja de
ingestas. La bandeja, las validaciones de URL, las capacidades y las migraciones
existentes continúan siendo la base técnica. El MVP actual se limita a TikTok y
añade procesamiento observable; otras fuentes permanecen fuera de alcance.

## Historia

Como colaborador interno autorizado,

quiero registrar un enlace público de TikTok y que su procesamiento comience
automáticamente,

para obtener metadatos y una transcripción verificable que pueda utilizarse en
la creación de un artículo.

## Descripción funcional

El usuario registra un TikTok público de máximo tres minutos. El sistema valida
y normaliza la URL, evita duplicados y crea una ingesta. Un trabajador
independiente extrae temporalmente el audio, detecta si está en español o inglés
y genera la transcripción.

Para contenido en inglés se conservan la transcripción original y su traducción
al español. El audio temporal se elimina al finalizar. Esta HU entrega evidencia
procesada; la redacción con DeepSeek y la creación del borrador corresponden a `HU-ED-08`.

Confirmación del propietario el 2026-09-10: terminal propuesto `evidence_ready`,
sin artículos. DeepSeek participa únicamente como proveedor de traducción en esta
HU; redacción se documenta como frontera futura. Ver `PLAN_HU_ED_07.md`,
`DISENO_SQL_0013_HU_ED_07.md` y `CONTRATOS_HU_ED_07.md`. Planeación, no implementación.

## Reglas de negocio

- **RN01:** solo se procesan enlaces públicos de TikTok.
- **RN02:** no hay un límite fijo de duración; el worker conserva sus límites
  de recursos, limpieza y tiempo de ejecución para proteger el equipo local.
- **RN03:** la ingesta comienza automáticamente después de registrarse.
- **RN04:** solo se procesa una ingesta a la vez en el equipo local.
- **RN05:** no puede existir más de una ingesta activa para la misma URL normalizada.
- **RN06:** cada intento debe tener identificador, reserva y heartbeat.
- **RN07:** un intento vencido no puede modificar el resultado de uno posterior.
- **RN08:** se aceptan videos hablados en español o inglés.
- **RN09:** para inglés se guardan transcripción original y traducción al español.
- **RN10:** se conservan URL, metadatos, transcripción, idioma, modelo, duración y trazabilidad.
- **RN11:** el audio y los archivos temporales se eliminan al finalizar o fallar.
- **RN12:** ningún resultado de esta HU publica contenido.
- **RN13:** los hechos utilizados posteriormente deberán corroborarse con al menos una fuente independiente.
- **RN14:** los errores deben identificar la etapa sin exponer secretos.
- **RN15:** el procesamiento debe ser idempotente.

## Criterios de aceptación

### CA01 — Registro válido

- **DADO** un usuario con permiso para gestionar ingestas
- **CUANDO** registra un TikTok público válido de hasta tres minutos
- **ENTONCES** se crea la ingesta y queda encolada automáticamente.

### CA02 — Procesamiento exitoso en español

- **DADO** un TikTok hablado en español
- **CUANDO** finaliza el trabajador
- **ENTONCES** se guardan metadatos y transcripción, y la ingesta queda lista para generar un borrador.

### CA03 — Procesamiento exitoso en inglés

- **DADO** un TikTok hablado en inglés
- **CUANDO** finaliza el trabajador
- **ENTONCES** se guardan la transcripción original y su traducción al español.

### CA04 — Duración excedida

- **DADO** un video público de más de tres minutos
- **CUANDO** se conoce su duración
- **ENTONCES** el procesamiento continúa sujeto a los límites técnicos del
  worker; no se rechaza solo por su duración.

### CA05 — Duplicado

- **DADO** que una URL normalizada ya tiene una ingesta activa
- **CUANDO** se intenta registrarla nuevamente
- **ENTONCES** el sistema rechaza el duplicado y muestra la ingesta existente.

### CA06 — Fallo recuperable

- **DADO** un error de descarga o transcripción
- **CUANDO** el trabajador falla
- **ENTONCES** la ingesta pasa a `failed`, conserva la evidencia disponible y permite una nueva ejecución controlada.

### CA07 — Idempotencia

- **DADO** que se reintenta una ingesta
- **CUANDO** ya existe un resultado válido
- **ENTONCES** el sistema lo reutiliza o informa su existencia, sin generar duplicados.

### CA08 — Limpieza

- **DADO** que el procesamiento termina, falla o se cancela
- **CUANDO** finaliza el intento
- **ENTONCES** se eliminan el audio y los archivos temporales.

### CA09 — Seguridad

- **DADO** un enlace con protocolo inválido, credenciales, IP literal, host local o redirección hacia una red privada
- **CUANDO** se intenta procesar
- **ENTONCES** se rechaza sin realizar la descarga.

## Validaciones

- URL HTTP/HTTPS y plataforma TikTok.
- Host público y redirecciones seguras.
- Video accesible sin autenticación.
- Duración máxima de tres minutos.
- Idioma español o inglés.
- Transcripción no vacía.
- Salida del trabajador validada mediante esquema.
- Límites de tiempo, tamaño, búfer e intentos.
- Espacio y memoria disponibles antes de comenzar.

## Roles y permisos

- `ingestas.registrar`: colaborador, autor, editor, editorJefe, propietario y administrador registran e inician automáticamente una ingesta.
- Colaborador/autor consultan sus ingestas; editor/editorJefe conservan lectura por `ingestas.ver`.
- `ingestas.gestionar`: solo propietario/administrador cancelan antes del claim y reencolan fallos recuperables.
- `workerIngesta`: RPC técnicas exclusivas; sin panel, gestión humana ni creación/publicación de artículos.
- Usuario público: sin acceso.
- Autorización comprobada tanto en servidor como mediante RLS.

Separación confirmada por el propietario el 2026-09-10. Roles humanos del código
actual; `ingestas.registrar` y el rol técnico son adiciones propuestas. Mantener
autorización mediante capacidades centralizadas.

## Estados de interfaz

- Registrando.
- En cola.
- Extrayendo.
- Transcribiendo.
- Traduciendo.
- Completado.
- Vacío.
- Error recuperable.
- Error no recuperable.
- Cancelado.
- Trabajador local desconectado.

## API relacionada

- Registro de ingesta.
- Consulta de listado y detalle.
- Consulta de estado y progreso.
- Cancelación permitida.
- Reprocesamiento controlado.
- Heartbeat y finalización utilizados exclusivamente por el trabajador.

El endpoint de procesamiento no debe mantener abierta una petición durante toda
la descarga y transcripción.

## Datos relacionados

- `editorial_ingestions`.
- URL original y normalizada.
- Plataforma y host.
- Estado y etapa actual.
- Intento, lease y heartbeat.
- Metadatos del TikTok.
- Duración e idioma.
- Transcripción original.
- Traducción al español cuando corresponda.
- Modelo de Whisper.
- Fechas, errores y usuario solicitante.
- Futuro `article_id`.

## Casos límite

- Video eliminado o privado.
- Restricción regional o por edad.
- TikTok sin voz.
- Música o ruido que impide transcribir.
- Video mezclando español e inglés.
- Redirecciones inesperadas.
- Pérdida de Internet.
- Cierre de Nuxt o del trabajador.
- Falta de memoria.
- Primera descarga incompleta del modelo.
- Ingesta reservada cuyo proceso desaparece.
- Cancelación mientras se descarga.
- Resultado válido cuya finalización en Supabase falla.

## Dependencias

- Migraciones `0010`, `0011` y `0012`.
- Supabase Auth, PostgreSQL y RLS.
- Python reproducible.
- `yt-dlp`.
- `faster-whisper`.
- FFmpeg.
- Trabajador local independiente.
- Conexión a Internet.
- Equipo con 8 GB de RAM.

## Riesgos

- Cambios en TikTok pueden romper la extracción.
- El video puede contener información falsa.
- La traducción puede alterar nombres o contexto.
- Los reintentos pueden crear duplicados si no son idempotentes.
- Whisper y Nuxt pueden competir por memoria.
- Descargar contenido puede implicar restricciones legales o contractuales que
  deberán revisarse antes del despliegue.

## Fuera de alcance

- Redacción con DeepSeek.
- Investigación y corroboración automática.
- Generación de imágenes.
- Publicaciones sociales.
- Videos de más de tres minutos.
- Idiomas distintos de español e inglés.
- Publicación automática.
- Procesamiento concurrente.

## Definition of Ready

- [x] Objetivo claro.
- [x] Usuario definido.
- [x] Flujo entendido.
- [x] Reglas de negocio.
- [x] Criterios de aceptación.
- [x] Validaciones.
- [x] Permisos.
- [x] Dependencias.
- [x] Datos.
- [x] Casos límite.
- [ ] Confirmación técnica de migraciones `0010` y `0011`.
- [ ] Entorno Python reproducible identificado.
- [ ] Estrategia exacta de worker, lease y heartbeat diseñada.

## Definition of Done

- [ ] Registro inicia el procesamiento automáticamente.
- [ ] La petición HTTP responde sin esperar la transcripción.
- [ ] Trabajador independiente con concurrencia uno.
- [ ] Progreso observable por etapas.
- [ ] Español e inglés probados.
- [ ] Traducción al español probada.
- [ ] Idempotencia y recuperación verificadas.
- [ ] Archivos temporales eliminados.
- [ ] Permisos, RLS y auditoría verificados.
- [ ] Tests unitarios y de integración.
- [ ] Prueba real con TikTok corto.
- [ ] Lint, typecheck y build correctos.
- [ ] Documentación actualizada.
- [ ] Sin regresiones conocidas.
