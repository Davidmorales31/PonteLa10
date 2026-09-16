# Contexto del proyecto — Pont3la10

Última actualización: 2026-09-10

## Nombre

Pont3la10.

## Problema

Producir contenido periodístico original y distribuirlo con suficiente velocidad
y constancia requiere demasiado trabajo manual para un operador único.

## Usuarios

- Lectores jóvenes y adultos jóvenes hispanohablantes de alcance global.
- Operador editorial único durante el piloto.
- Futuros colaboradores internos básicos y responsables superiores.
- Futuros anunciantes y marcas.

## Objetivo

Construir audiencia y capacidad publicitaria mediante SEO, contenido de calidad
y crecimiento coordinado en Instagram, TikTok, Facebook y X. Automatizar al
máximo sin eliminar la verificación y aprobación humanas.

## Estado actual

Producto existente con sitio público, autenticación opcional, panel editorial,
Supabase, flujo de revisión/publicación, biblioteca multimedia, taxonomías,
resultados deportivos e ingestas. La ingesta TikTok es experimental y aún no
tiene validación completa de extremo a extremo.

## Stack

Nuxt 3, Vue 3, TypeScript, Nitro, Supabase Auth/PostgreSQL/Storage, Python 3.11,
yt-dlp, FFmpeg, faster-whisper y Vitest. DeepSeek fue elegido para la futura
redacción asistida.

## Arquitectura resumida

Monolito modular Nuxt y Supabase. El procesamiento pesado debe salir del ciclo
HTTP y ejecutarse en un trabajador local independiente, secuencial y respaldado
por una cola durable en PostgreSQL. Proveedores de IA detrás de interfaces
intercambiables.

## Integraciones

- Actuales: Supabase y TikTok oEmbed/extracción mediante yt-dlp.
- Aprobada para NEXT: DeepSeek.
- Futuras: APIs oficiales de Instagram, TikTok, Facebook y X; RSS; analítica y
  monetización.

## Reglas importantes

- SEO es el principal canal de adquisición.
- Meta piloto: tres artículos diarios, siete días por semana, durante 90 días,
  sin producir contenido de relleno.
- Ningún contenido generado se publica sin aprobación humana.
- MFA, capacidades, RLS y auditoría para acciones sensibles.
- TikTok MVP: máximo tres minutos, español o inglés.
- En inglés se conservan transcripción original y traducción al español.
- Conservar metadatos y transcripción; eliminar audio temporal.
- Corroborar los hechos con al menos una fuente independiente antes de aprobar.
- No reutilizar videos ajenos como contenido propio.

## Restricciones

- Un operador, 30–60 minutos diarios.
- Presupuesto operativo máximo de USD 25 mensuales.
- Desarrollo local; despliegue público posterior.
- Equipo: Intel i5-10300H, GTX 1650 y 8 GB de RAM.
- Python global 3.11 sin las dependencias TikTok instaladas; crear `.venv` propio.

## HU terminadas

El repositorio contiene funcionalidades editoriales, autenticación, multimedia,
SEO y distribución interna previamente implementadas. Ver documentos de HU y
Git para el detalle; no asumir validación de cambios posteriores.

## HU actuales

- `HU-ED-07`: planeación hasta evidencia y traducción, sin artículo. Diseño SQL/JSON
  propuesto; B0 parcial (remoto y línea base completa pendientes). Ver preflight.
- `HU-ED-08`: redacción con DeepSeek. Bloqueada por HU-ED-07.
- `HU-ED-09`: revisión/publicación del artículo proveniente de ingesta.

## Bugs conocidos

- Procesamiento TikTok síncrono y potencialmente largo.
- Riesgo de estado `processing` indefinido.
- Riesgo de borrador huérfano o duplicado al fallar la finalización.
- Salida del worker insuficientemente validada.
- Competencia de memoria entre Nuxt y Whisper.

## Decisiones pendientes

- Revisar worker, lease e idempotencia propuestos en `DISENO_SQL_0013_HU_ED_07.md`
  y `CONTRATOS_HU_ED_07.md`.
- Modelo exacto de DeepSeek tras pruebas.
- Hosting público y trabajador después del piloto local.
- Sistema visual y acceso API de redes sociales.
- Analítica, atribución y metas tras obtener línea base.

## Riesgos

Cambios de TikTok, desinformación de fuentes, derechos de uso, traducción
incorrecta, límites de hardware, dependencia de APIs y crecimiento de alcance
antes de estabilizar calidad y operación.

## Próximo paso recomendado

Revisar artefactos SQL/JSON y contrastar el catálogo remoto. No crear entorno ni
procesar fuentes reales en planeación. Solo `/IMPLEMENTAR HU-ED-07` autoriza
comenzar implementación; redacción y borrador permanecen en HU-ED-08.
