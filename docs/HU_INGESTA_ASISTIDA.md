# HU-ED-07 - Bandeja de ingestas asistidas

## Objetivo

Como integrante autorizado del equipo editorial, quiero registrar una URL y
definir su intención editorial, para que un proceso posterior pueda convertirla
en un borrador verificable sin publicar contenido automáticamente.

## Alcance de la fase 1

- Bandeja privada en `/admin/ingestas`.
- Registro de fuentes web, YouTube, TikTok, Instagram, X y Facebook.
- Normalización de URL y eliminación de parámetros comunes de seguimiento.
- Bloqueo de protocolos, credenciales, direcciones IP y hosts locales.
- Detección de solicitudes activas duplicadas.
- Reglas persistentes para tipo de contenido, créditos, SEO y video.
- Sección sugerida, título de referencia e instrucciones editoriales opcionales.
- Consulta paginada con búsqueda y filtros.
- Cancelación explícita de solicitudes pendientes o en cola.
- Trazabilidad mediante `editorial_audit_log`.
- RLS y autorización por capacidades.

Esta fase no descarga, transcribe, resume ni publica la fuente. Las solicitudes
quedan en `pending` hasta que exista un trabajador de procesamiento.

## Roles y permisos

| Capacidad | Permiso | Roles iniciales |
| --- | --- | --- |
| Consultar bandeja | `ingestas.ver` | propietario, administrador, editor jefe, editor |
| Registrar y cancelar | `ingestas.gestionar` | propietario, administrador |

Los endpoints vuelven a comprobar los permisos en servidor. RLS replica la
autorización para impedir que una llamada directa omita el panel.

## Estados

1. `pending`: solicitud registrada y pendiente de encolado.
2. `queued`: reservada para procesamiento.
3. `processing`: extracción o generación en curso.
4. `draft_created`: borrador editorial creado; nunca equivale a publicado.
5. `failed`: fallo recuperable o intervención requerida.
6. `cancelled`: solicitud detenida antes del procesamiento.

La cancelación solo admite `pending` y `queued`. Se ejecuta mediante
`cancel_editorial_ingestion`, una función de propósito único que no permite
editar arbitrariamente la fila.

## Datos persistidos

La tabla `editorial_ingestions` conserva:

- URL recibida y URL normalizada.
- Dominio y plataforma detectada.
- Estado, intentos y fechas de procesamiento.
- Usuario solicitante, responsable y artículo resultante.
- Reglas editoriales capturadas como fotografía inmutable de la solicitud.
- Metadatos de fuente, resultado y errores para fases posteriores.

Solo una solicitud activa puede existir para cada URL normalizada. Una fuente
cancelada o fallida puede registrarse de nuevo.

## Seguridad de URLs

El registro exige HTTP o HTTPS, convierte la representación canónica a HTTPS,
retira fragmentos y parámetros de campaña, y rechaza hosts no públicos. Cuando
se implemente el trabajador, este deberá repetir la validación después de cada
redirección y comprobar la IP resuelta antes de descargar contenido. La
validación de esta fase no sustituye esa defensa contra SSRF.

## Fases siguientes

### Fase 2 - Procesamiento asíncrono

- Trabajador con reserva atómica, reintentos y tiempo máximo.
- Adaptadores separados por plataforma.
- Extracción permitida por disponibilidad y términos de cada proveedor.
- Transcripción y almacenamiento temporal de evidencia.
- Registro de costo, proveedor y versión del modelo.

### Fase 3 - Generación de borradores

- Creación de `articles` con `source_origin = 'ingesta'`.
- Fuente, créditos y evidencia transferidos al editor.
- Propuesta de estructura, taxonomía y SEO.
- Control humano obligatorio antes de revisión y publicación.

### Fase 4 - Automatizaciones de entrada

- Endpoint firmado para servicios externos.
- Integración con atajos móviles o mensajería interna.
- Límites por usuario, idempotencia y rotación de secretos.

## Criterios de aceptación de la fase 1

- Un usuario sin `ingestas.ver` no puede abrir ni consultar la bandeja.
- Un usuario sin `ingestas.gestionar` no puede registrar ni cancelar.
- Una URL local, con IP literal, credenciales o protocolo distinto a HTTP(S) se rechaza.
- Los parámetros de seguimiento no generan duplicados de la misma fuente.
- Ninguna solicitud crea o publica un artículo en esta fase.
- La navegación solo muestra el módulo cuando el usuario tiene permiso.
- La página privada incluye `noindex, nofollow`.
- La experiencia tiene estados de carga, vacío, error, éxito y paginación.

## Puesta en marcha

Aplicar en Supabase, en orden:

1. `0009_editorial_quick_actions_and_deletion.sql` si aún está pendiente.
2. `0010_editorial_ingestion_queue.sql`.

Después, entrar con un propietario o administrador y abrir
`/admin/ingestas`. No se necesita ninguna API key para esta primera fase.
