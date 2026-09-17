# Estado actual de Pont3la10

- **Actualizado:** 2026-09-17
- **Commit base:** `ff28d4c` (`origin/main`)
- **Estado general:** HU-ED-07 y HU-ED-08 operan desde `C:\PONTE LA 10`. La ingesta durable genera el borrador automáticamente y no existen disparadores manuales de IA en la bandeja.
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

- **HU-ED-08:** propuesta IA de borrador desde evidencia lista, con proveedor DeepSeek solo servidor, contrato Zod, reserva idempotente previa al proveedor, trazabilidad y RPC atómico. La generación es automática tras la evidencia y se bloqueó el endpoint manual para impedir cobros duplicados. DeepSeek vacío o truncado se registra sin reintento automático.
  El worker usa salida de texto con JSON extraído de forma tolerante, en lugar de
  `response_format: json_object`, porque ese modo puede devolver contenido vacío.

- **HU-ED-07:** se trasladaron a esta rama local la propuesta de cola durable,
  extracción, transcripción, traducción y evidencia. La prueba local alcanzó
  `evidence_ready`; las migraciones `0013` y `0014` ya están aplicadas en
  Supabase remoto, pero falta la certificación funcional completa.
- **Eliminación de ingestas:** el botón aparece a usuarios autorizados para todos
  los estados. La RPC `delete_editorial_ingestion` exige permiso, MFA y
  confirmación; elimina evidencia, historial y borrador automático. Protege
  procesos activos y contenido en revisión o publicado. La migración
  `20260917090000_eliminacion_total_ingestas.sql` se aplicó y su RPC se verificó
  en Supabase el 2026-09-17.
- La portada usa datos mock en parte; una pantalla o mock no certifica una función.

## Bloqueos

- La prueba funcional final de DeepSeek requiere una fuente real con transcripción
  sustancial; no lanzar reintentos manuales porque cada uno puede cobrar al proveedor.

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
automática. Si DeepSeek retorna vacío o un contrato inválido, revisar el código
de error en la bandeja sin reencolar ni llamar manualmente a la IA.

## Última validación conocida

El 2026-09-17 pasaron `tests/unit/ingestasEditoriales.test.ts` (13 pruebas),
`npm.cmd run typecheck`, lint de los archivos cambiados, `git diff --check` y la
verificación remota segura de la RPC. El servidor de desarrollo está en
`http://127.0.0.1:3001`.

## Documentos posiblemente desactualizados

- `docs/ARQUITECTURA_INICIAL.md`: conserva el diseño de la primera etapa y no
  sustituye el estado verificado de este documento.
