# Roadmap verificado de Pont3la10

Última actualización: 2026-09-15. Estado deducido de Git, migraciones, API, UI
y pruebas. Una pantalla o mock por sí solos no cuentan como funcionalidad terminada.

## Terminado en el repositorio

| Capacidad/HU | Migración | API/servidor | UI | Pruebas | Commit principal |
| --- | --- | --- | --- | --- | --- |
| Fundación Nuxt/Supabase | `0001`–`0002` | plugins y cliente Supabase | sitio base | configuración/SEO | `3f7d94a`, `2a4301f` |
| Autenticación editorial | `0003` | contexto/autorización, cookies SSR | login, acceso denegado, seguridad | autenticación, MFA, cookies | `ae1e9a7`, `0442a54` |
| HU-ED-01 CMS seguro | `0003`–`0004` | resumen, contexto, auditoría | panel admin | seguridad editorial | `20e8f38` |
| HU-ED-02 modelo/taxonomía | `0004` | contenidos y taxonomías | bandeja y taxonomías | contenido editorial | `20e8f38` |
| HU-ED-03 editor de borradores | `0005` | editor, guardado, autoguardado y versiones | editor por bloques | editor/contenido | `4506438` |
| HU-ED-04 multimedia | `0006` | API, repositorio y Sharp | biblioteca y selector | media editorial | `bfe8225` |
| HU-ED-05 publicación | `0007` | transición y consultas públicas | revisión y artículo público | flujo editorial | `7e770b8` |
| HU-ED-06 enlaces/distribución | `0008` | resolución pública de enlaces | selector, relacionados y compartir | distribución | `dc6771b` |
| Acciones rápidas/eliminación | `0009` | eliminación autorizada | acciones de bandeja | contenido/seguridad | `7530ad4` |
| Resultados deportivos v1 | no aplica | APIs y clientes deportivos | centro y páginas por deporte | resultados/seguimiento | `ce48174`–`3d8644e` |

“Terminado” significa presente y cubierto localmente; no certifica despliegue,
variables de producción, migraciones remotas ni pruebas manuales recientes.

## Parcialmente terminado

- **Home pública:** experiencia base disponible, pero parte del contenido usa
  `data/landing.mock.ts`.
- **HU-ED-07, ingesta TikTok:** la bandeja y la base de cola están versionadas
  en `0010` (`24340c0`), con UI, API y pruebas unitarias. La extracción,
  transcripción, traducción, evidencia y ejecución durable no están en esta rama;
  tampoco existe validación remota ni prueba real completa.
- **Publicación programada:** función SQL presente en `0007`; activación de Cron
  en el entorno remoto no verificada.
- **Storage/RLS:** definidos en migraciones; aplicación y asesores remotos no verificados.
- **Fase 0 de agentes:** documentación y CI implementados localmente; Memento no
  se instaló por falta de Python/pipx en `PATH`.

## Pendiente

- HU-ED-08: redacción con DeepSeek y creación idempotente de borrador.
- HU-ED-09: revisión/publicación específicamente desde una ingesta.
- HU-SO-01: paquete social completo por red.
- HU-SO-02: aprobación individual o conjunta de piezas.
- HU-SO-03: programación mediante APIs oficiales.
- HU-DI-01: oportunidades editoriales priorizadas.
- HU-AN-01: analítica de audiencia, contenido, redes y monetización.
- Validación operativa completa de autenticación, RLS, Storage, Cron e ingestas.
- Hosting público y observabilidad operativa.

## Fuera de alcance de la Fase 0

- Procesar ingestas o aplicar nuevas migraciones a Supabase.
- Crear HU nuevas, automatizar publicación o activar proveedores de IA.
- Sincronizar memorias con GitHub/Supabase o exponer Memento remotamente.
- Cambiar rulesets, borrar ramas o abrir PR sin autorización.

## Deuda técnica

- Auditar funciones `security definer`, grants y usos históricos de `auth.role()`.
- Crear entorno Python reproducible y fijar dependencias del worker.
- Sustituir datos mock de home solo mediante una HU aprobada.
- Confirmar migraciones remotas y mantener pruebas SQL/RLS.
- Resolver advertencia de dependencia del build sin actualización indiscriminada.
- Revisar y cerrar ramas remotas antiguas después de preservar su historial.

## Orden recomendado

1. Cerrar Fase 0 y activar los cuatro checks de CI en el ruleset.
2. Revisar y validar separadamente el diff local de HU-ED-07.
3. Diseñar y revisar por separado el worker durable y su migración antes de aplicarlos.
4. Solo con aprobación, retomar HU-ED-07; después HU-ED-08 y HU-ED-09.
