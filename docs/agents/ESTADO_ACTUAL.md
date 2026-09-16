# Estado actual de Pont3la10

- **Actualizado:** 2026-09-16
- **Commit base:** `ff28d4c` (`origin/main`)
- **Estado general:** HU-ED-07 está fusionada en `main`. HU-ED-08 está implementada y su migración fue aplicada y verificada en Supabase; falta la prueba funcional autenticada y el cierre Git.
- **Árbol de trabajo:** `C:\PONTE LA 10 HU-ED-08`, rama `codex/hu-ed-08`, basada en `origin/main` `6499b7e`. Las otras copias se preservan.

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

- **HU-ED-08:** propuesta IA de borrador desde evidencia lista, con proveedor DeepSeek solo servidor, contrato Zod, reserva idempotente previa al proveedor, trazabilidad, RLS, RPC atómico y botón en la bandeja. La migración `20260916192944_editorial_ai_drafting.sql` se aplicó en Supabase y se verificó: tabla, RLS, 3 RPC, 5 roles y registro de historial.

- **HU-ED-07:** se trasladaron a esta rama local la propuesta de cola durable,
  extracción, transcripción, traducción y evidencia. La prueba local alcanzó
  `evidence_ready`; las migraciones `0013` y `0014` ya están aplicadas en
  Supabase remoto, pero falta la certificación funcional completa.
- **Limpieza de fallos de ingesta:** implementada localmente con la migración
  `0014`, RPC protegida por permiso y MFA, confirmación explícita y alerta
  global. Solo admite ingestas `failed` sin evidencia ni borrador; se aplicó y
  verificó en Supabase remoto el 2026-09-16.
- La portada usa datos mock en parte; una pantalla o mock no certifica una función.

## Bloqueos

- El 2026-09-16 se verificó en el panel remoto: `0013_ingesta_worker_durable`
  está aplicada (versión `20260911224135`) y `0014_eliminar_ingestas_fallidas`
  se aplicó como versión `20260916110000`. La RPC, permiso, roles y `EXECUTE`
  para `authenticated` fueron verificados en remoto.

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

Probar desde `/admin/ingestas` la eliminación de una ingesta fallida de prueba,
con MFA y la confirmación `ELIMINAR`, antes de crear un commit o PR.

## Última validación conocida

El 2026-09-16 pasaron en la rama limpia lint, typecheck, 15 archivos/86 pruebas
y build. El build emitió una advertencia de dependencia obsoleta.
También pasaron doctor, status, remember, decide, recall, deep-recall y la prueba
HTTP local del dashboard. El servidor de desarrollo actual está levantado en
`http://127.0.0.1:3001`.

## Documentos posiblemente desactualizados

- `docs/ARQUITECTURA_INICIAL.md`: conserva el diseño de la primera etapa y no
  sustituye el estado verificado de este documento.
