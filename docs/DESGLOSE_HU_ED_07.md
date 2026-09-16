# Desglose ejecutable — HU-ED-07

Actualización: 2026-09-10. Planeación exclusivamente. Sustituye tareas antiguas de redacción/borrador por evidencia y traducción, según decisión explícita del propietario. Referencias: PLAN_HU_ED_07.md, DISENO_SQL_0013_HU_ED_07.md y CONTRATOS_HU_ED_07.md.

## Coordinación futura

Solo después de `/IMPLEMENTAR HU-ED-07`: principal delimita → un implementador escribe → QA prueba sin corregir → auditor revisa en solo lectura → principal consolida y corrige problemas confirmados → repetir pruebas/auditoría necesarias → mostrar resultado → commit pequeño cuando el bloque esté aprobado.

No escritores simultáneos sobre archivos, no mezclar bloques, no commit con fallos sin autorización, no push/merge/PR/migración/publicación automática. Esta planeación no inicia ese ciclo ni crea commits.

## Entregas

| Bloque | Resultado | Dependencia |
|---|---|---|
| B0 | Entorno, catálogo y línea base | Ninguna; actualmente parcial |
| B1 | Cola/identidad/RPC de evidencia | B0 cerrado para implementar |
| B2 | Transcriptor seguro/reproducible | B0 y contrato aprobado |
| B3 | Traducción en→es | B0 y contrato aprobado |
| B4 | Worker independiente secuencial | B1, B2, B3 |
| B5 | Evidencia única/trazable/recuperable | B4 |
| B6 | Panel y registro por capacidades | B5 |
| B7 | QA/runbook/gate piloto | B6 |

## B0 — Preflight

- T-00: Git/rama/HEAD/cambios ajenos. Comprobado sobre 358f7d6, limpio inicialmente.
- T-01: catálogo remoto/RPC 0010–0012, columnas/índices/RLS/grants. PENDIENTE; sin conector y sin secretos. Diseño provisional.
- T-02: Node/npm/Python3.11/CPU/RAM/GPU/disco. Comprobado, diferencias en PREFLIGHT_HU_ED_07.md.
- T-03: cuatro scripts. Diferido cuando generen archivos; ESLint directo es diagnóstico parcial.

No cerrar B0 solo por leer migraciones o por confirmación histórica del remoto.

## B1 — Cola e identidad

- T-10: convertir diseño revisado en 0013; evidence_ready, protocolo, intentos/slot/recibos privados y validadores. No crear SQL ejecutable ahora.
- T-11: workerIngesta en ambos CHECK y capacidades técnicas; ingestas.registrar humana; pruebas negativas de rol mixto, RLS y escritura directa.
- T-12: claim con locks/request idempotente/token nuevo/reserva única; recuperación acotada.
- T-13: heartbeat secuenciado y checkpoint; rechazar cuenta/instancia/token ajenos o vencidos.
- T-14: fail seguro y requeue manual idempotente; propuesta 3/ciclo, histórico 20 totales; evidencia intacta.
- T-15: carrera cancel/claim; desactivar firmas legacy sin token en corte coordinado.

Salida: pruebas PostgreSQL reales concurrentes, permisos mínimos y rollback ensayado. Aplicación remota requiere revisión/acción separada.

## B2 — Python

- T-20: .venv Python3.11/requirements fijado e ignorados, modelo preparado fuera de tarea; únicamente al implementar.
- T-21: entrada JSON/eventos JSONL v1 estrictos, IDs/secuencia/límites/errores.
- T-22: hosts/puertos/DNS/IP/redirecciones y peticiones CDN; validar solo entrada es insuficiente.
- T-23: 180 s antes de descarga completa y verificación real; bytes/tiempo limitados.
- T-24: original es/en, segmentos; casos sin voz/idioma no soportado/mixto.
- T-25: limpieza éxito/error/señales y barrido seguro tras kill, sin afectar directorios ajenos/activos.

Salida: fixtures, red segura, límites y residuos comprobados. Sin TikToks reales durante planeación.

## B3 — Traducción

- T-30: interfaz traducir independiente; redactar solo frontera HU-ED-08.
- T-31: correspondencia completa de segmentos y original intacto.
- T-32: traduccion-v1, fidelidad y fuente como datos no instrucciones.
- T-33: DeepSeek worker/server configurable, timeout y una corrección por JSON inválido; mocks.
- T-34: checkpoint original antes del proveedor; recuperación manual tras fallo.
- T-35: tokens/latencia/modelo/costo conocido o desconocido; presupuesto IA dentro de USD25 global.

Salida: traducción en→es validada sin redacción ni escrituras en artículos. Esquema de borrador/prompt editorial/regeneración/finalización pasan a HU-ED-08.

## B4 — Worker

- T-40: comando y sesión técnica renovable/preflight; no navegador ni service_role.
- T-41: polling propuesto 1–30 s, exclusión local y un árbol pesado; slot DB no mata procesos.
- T-42: etapas/heartbeat independiente, abortar al perder lease.
- T-43: reinicio/red/expiración/deadline/checkpoint y apagado ordenado.

Salida: dos procesos accidentales no crean cargas simultáneas; cierre de Python/FFmpeg huérfanos comprobado.

## B5 — Evidencia

- T-50: complete atómico evidencia/terminal/recibo/slot, cero artículos.
- T-51: replay exacto, conflicto de payload y versión estable.
- T-52: requested_by humano, auditoría técnica sin tokens.
- T-53: metadatos/original/traducción/limpieza y verificación pendiente.

Salida: evidence_ready es/en y rollback ante fallo intermedio. Exactamente un artículo queda en HU-ED-08.

## B6 — Panel

- T-60: ingestas.registrar y queued rápido, sin proceso pesado HTTP.
- T-61: etapa/progreso/intentos/actividad, sin afirmar desconexión sin evidencia.
- T-62: gestión superior, lectura de evidencia lista y draft_created histórico diferenciado.
- T-63: mensajes seguros y accionables.

Salida: roles básicos registran/consultan lo propio sin gestionar ni ampliar lectura; regresión de permisos actuales.

## B7 — QA/piloto

- T-70: lint/typecheck/unitarias/build e integración SQL/RLS, sin cargas pesadas simultáneas.
- T-71: con autorización, es/en cortos, largo, URL inválida, traducción caída/reinicio; tres ingestas sin duplicados/bloqueos.
- T-72: runbook PowerShell de preparación/arranque/limpieza/recuperación; secretos locales.
- T-73: seguridad/recursos/costo/rollback y habilitación explícita del piloto, sin publicación.

## Trazabilidad

| Criterio | Tareas |
|---|---|
| CA01 registro | T-11, T-22, T-60 |
| CA02 español | T-21, T-24, T-50, T-53 |
| CA03 inglés | T-24, T-30–T-35, T-50 |
| CA04 duración | T-23 |
| CA05 duplicado | T-10, T-14, T-60 |
| CA06 recuperación | T-12–T-14, T-43, T-62 |
| CA07 idempotencia | T-12, T-13, T-50, T-51 |
| CA08 limpieza | T-25, T-40–T-43 |
| CA09 seguridad | T-11, T-22, T-70 |

Catálogo/matriz de contratos en CONTRATOS_HU_ED_07.md. Faltan contraste remoto, revisión del diseño y autorización explícita. No solicitar credenciales ni preparar entorno durante planeación.
