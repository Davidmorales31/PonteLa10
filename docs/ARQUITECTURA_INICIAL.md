# Arquitectura de Pont3la10

Última actualización: 2026-09-10

## Principio

Pont3la10 continúa como monolito modular: simple para desarrollar y desplegar,
separado internamente por dominios y sin infraestructura innecesaria.

## Dominios

- `editorial`: artículos, categorías, fuentes, estados, revisión y programación.
- `ingestas`: registro, cola, extracción, transcripción y trazabilidad.
- `media`: imágenes, piezas exportables, licencias y storage.
- `auth`: login, perfiles, capacidades, MFA y auditoría.
- `seo`: metadatos, canonical, slugs, sitemap y datos estructurados.
- `socials`: piezas internas, aprobación, programación y futuras APIs.
- `analytics`: rendimiento editorial, social y comercial.
- `interactive`: resultados y experiencias deportivas.

## Componentes del MVP

1. Nuxt 3 y Vue 3 para sitio público y panel editorial.
2. Nitro para endpoints breves, validación y autorización.
3. Supabase Auth, PostgreSQL, RLS y Storage.
4. PostgreSQL como cola durable inicial.
5. Trabajador local independiente con concurrencia uno.
6. Python, yt-dlp y FFmpeg para extracción temporal.
7. faster-whisper para transcripción local.
8. DeepSeek, detrás de `proveedorRedaccion`, para HU-ED-08.

## Flujo de ingesta

1. El usuario registra un TikTok.
2. La API valida, normaliza, evita duplicados y encola; no espera el proceso.
3. El trabajador reclama una ingesta con token de intento y lease.
4. Registra heartbeat y progreso por etapa.
5. Revalida URL, redirecciones e IP antes de descargar.
6. Extrae audio temporal y comprueba el límite de tres minutos.
7. Transcribe español o inglés; para inglés genera traducción al español.
8. Valida la salida y persiste evidencia; confirma original antes de traducir.
9. Elimina archivos temporales.
10. Finaliza en `evidence_ready` idempotentemente o registra error seguro.
    Redacción y creación de artículo pertenecen a HU-ED-08.

## Estados propuestos

Estados: `pending` legacy, `queued`, `processing`, `evidence_ready`, `failed`,
`cancelled`; conservar `draft_created` histórico. Etapas separadas:
`validating_source`, `reading_metadata`, `downloading_audio`, `transcribing`,
`translating`, `persisting_evidence`, `completed`.

## Idempotencia y recuperación

- Identificador único por intento.
- Lease renovable y heartbeat.
- Un resultado de evidencia por ingesta; artículo único se resolverá en HU-ED-08.
- Un intento vencido no puede finalizar otro intento.
- Evidencia, recibo e intento finalizan en una transacción; creación/finalización
  de artículo es una operación futura distinta de HU-ED-08.
- Reanudar desde la última etapa segura cuando sea posible.

## Uso de recursos

- Procesar una ingesta a la vez.
- No ejecutar un LLM local con 8 GB de RAM.
- Crear `.venv` y versionar dependencias Python.
- Liberar Whisper y archivos temporales al finalizar.
- No ejecutar build y procesamiento pesado simultáneamente.

## Seguridad

- Validar entradas con esquemas.
- Bloquear protocolos, credenciales, IP literales, hosts locales y redes privadas.
- Revalidar cada redirección.
- Claves privadas exclusivamente en runtime server.
- Capacidades en servidor y RLS en base de datos.
- MFA y auditoría para publicación y administración.
- Revisión humana obligatoria.

## Evolución

El sitio público podrá trasladarse a hosting 24/7 mientras Supabase permanece
como núcleo persistente. El trabajador podrá continuar temporalmente en el PC y
migrarse después sin cambiar el contrato de cola ni el modelo editorial.
