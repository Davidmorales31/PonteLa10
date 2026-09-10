# Decisiones técnicas

Última actualización: 2026-09-10

## ADR-001 — Mantener un monolito modular Nuxt

**Contexto:** existe una aplicación Nuxt con dominios públicos e internos.

**Alternativas:** monolito modular, microservicios o funciones independientes.

**Decisión:** conservar el monolito modular.

**Razones:** menor costo y complejidad para un operador único.

**Consecuencias:** reforzar límites internos y extraer únicamente procesos pesados.

## ADR-002 — Separar la ingesta del ciclo HTTP

**Contexto:** la implementación experimental espera descarga y Whisper dentro de
una petición larga.

**Alternativas:** mantener petición síncrona o usar un trabajador independiente.

**Decisión:** la API solo encola y un trabajador procesa en segundo plano.

**Consecuencias:** se requieren estados, lease, heartbeat y observabilidad.

## ADR-003 — Usar Supabase PostgreSQL como cola durable inicial

**Alternativas:** PostgreSQL, Redis, RabbitMQ o un servicio administrado.

**Decisión:** extender `editorial_ingestions` y sus RPC transaccionales.

**Razones:** ya existe, respeta el presupuesto y evita nueva infraestructura.

**Consecuencias:** las funciones de reserva e idempotencia deben diseñarse bien.

## ADR-004 — Ejecutar Whisper localmente y de forma secuencial

**Contexto:** i5-10300H, GTX 1650 y 8 GB de RAM.

**Decisión:** una ingesta a la vez, con archivos temporales y límites estrictos.

**Consecuencias:** menor costo, pero el worker solo funciona cuando el PC está
encendido y la capacidad es limitada.

## ADR-005 — Crear un entorno Python reproducible

**Contexto:** solo se identificó Python 3.11 global y no contiene yt-dlp,
faster-whisper ni imageio-ffmpeg.

**Decisión:** crear `.venv` propio y versionar dependencias del trabajador.

**Consecuencias:** instalación inicial adicional y ejecución predecible.

## ADR-006 — Usar DeepSeek mediante una interfaz intercambiable

**Contexto:** no es viable ejecutar simultáneamente un LLM local en el equipo y
el presupuesto máximo es USD 25 mensuales.

**Decisión:** DeepSeek será el proveedor inicial de `proveedorRedaccion`.

**Consecuencias:** registrar tokens, costo, modelo y errores; permitir cambiar de
proveedor sin modificar el flujo editorial.

## ADR-007 — Mantener aprobación humana obligatoria

**Decisión:** la IA puede sugerir, transcribir, traducir, redactar y diseñar, pero
no publicar sin aprobación explícita.

**Consecuencias:** MFA, capacidades, auditoría y estados de revisión son parte del
flujo, no controles opcionales.

## ADR-008 — Priorizar SEO y contenido original

**Decisión:** el volumen no justifica contenido de relleno. Todo artículo debe
aportar valor, conservar fuentes y corroborar hechos antes de aprobación.

**Consecuencias:** la meta de tres artículos diarios se reduce cuando no haya
fuentes o calidad suficientes.
