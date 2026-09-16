# B0 — Evidencia de preflight HU-ED-07

Fecha: 2026-09-10. Solo lectura del proyecto y del equipo. Planeación, no implementación.

## Base comprobada

| Comprobación | Resultado |
|---|---|
| Carpeta activa | `C:\PONTE LA 10`; no usar la copia de OneDrive |
| Remoto declarado | `https://github.com/Davidmorales31/PonteLa10.git` |
| Rama | `codex/hu-ed-07-aislada` |
| Base aislada | `ff28d4c` (`origin/main`, 2026-09-15) |
| Fuente del diseño preservada | `358f7d6793bf64b188ca51a9300119564c2d5b6d` |
| Cambios iniciales | Ninguno según `git status --short --branch` |
| Estado remoto Git | No se hizo fetch; la referencia origin local no certifica el servidor |
| Documentos | Leídos completos los nueve solicitados, continuidad y estándares relacionados |
| Esquema local | Migraciones 0001–0013 presentes; revisadas 0010–0012 y fundación de permisos; `0013` aún no se aplica remotamente |
| Esquema Supabase real | NO comprobado; no hay conector Supabase disponible ni se usaron secretos |

## Herramientas y recursos

| Recurso | Evidencia | Diferencia o acción futura |
|---|---|---|
| Node | v24.12.0 | CI declara Node 22; al implementar comparar con CI, sin cambiar Node ahora |
| npm | 11.6.2 | Disponible |
| Python | 3.11.9, 64 bits | `C:\Users\juand\AppData\Local\Programs\Python\Python311\python.exe` |
| Lanzador py | Encuentra 3.11 fuera del entorno restringido | El primer resultado negativo era una limitación del entorno |
| Paquetes Python 3.11 | `find_spec`: yt_dlp=false, faster_whisper=false, imageio_ffmpeg=false | Instalar únicamente durante implementación autorizada |
| `.venv` | No existe | No creada |
| CPU | Intel i5-10300H | Coincide con documentación |
| RAM | 8 419 115 008 bytes, aproximadamente 7,84 GiB | Mantener concurrencia uno |
| GPU | GTX 1650; AdapterRAM 4 293 918 720 bytes | Dato diagnóstico de WMI, no prueba CUDA; usar CPU/int8 como base |
| Disco C | Aproximadamente 219 GiB libres en la consulta inicial | Suficiente para planear; volver a medir antes de descargar modelos |
| Modelo Whisper/FFmpeg | No ejecutados ni descargados | Disponibilidad operativa no certificada |

No se abrió `.env`, no se mostraron valores de variables, no se importaron paquetes Python. La inspección de Python usó `-B` y `importlib.util.find_spec`.

## Configuración declarada y scripts

`package.json`: build=`nuxt build`; dev=`nuxt dev --host 127.0.0.1 --port 3001`; generate=`nuxt generate`; lint=`nuxt prepare && eslint .`; preview=`nuxt preview`; test=`npm run test:unit`; test:unit=`vitest run`; typecheck=`nuxt typecheck`.

`nuxt.config.ts` declara rutas de Python/worker, modelo `base`, clave editorial genérica y configuración pública de Supabase. No declara aún comando worker, sesión técnica ni cliente DeepSeek. `.env.example` contiene los nombres de Supabase, servicios deportivos, sitio, IA editorial y TikTok; no contiene todavía `PONT3LA10_WORKER_EMAIL`, `PONT3LA10_WORKER_PASSWORD`, `DEEPSEEK_API_KEY` ni `DEEPSEEK_MODEL`. Esto describe archivos de ejemplo, no la configuración secreta efectiva.

`.gitignore` no incluye aún `.venv` ni carpetas específicas de temporales/modelos del nuevo worker. Su incorporación pertenece a B2; no se modifica ahora.

## Línea base y límites de la verificación

No ejecutar los scripts completos de lint/typecheck/build en este preflight: Nuxt puede preparar o generar `.nuxt` y `.output`. Vitest puede escribir cachés o archivos de configuración transformada; no se garantiza una corrida sin escrituras con la configuración actual. No se ejecutaron pruebas unitarias ni pruebas reales de TikTok, proveedores o base de datos.

ESLint directo `node node_modules/eslint/bin/eslint.js . --no-cache --no-fix` terminó con código 0, sin diagnósticos y sin `nuxt prepare`. Esta comprobación parcial no equivale a los cuatro scripts obligatorios de B0/T-03. La evidencia histórica de continuidad (84 pruebas) no se presenta como una ejecución actual.

## Decisiones confirmadas durante esta planeación

1. HU-ED-07 entrega metadatos, transcripción y traducción inglesa al español. Redacción y creación de artículos pertenecen a HU-ED-08.
2. Separar `ingestas.registrar` para colaborador, autor, editor y editorJefe, además de propietario/administrador. Reintento y cancelación permanecen en `ingestas.gestionar`, reservado a propietario/administrador.
3. No hay autorización de implementación. Únicamente `/IMPLEMENTAR HU-ED-07` puede abrir ese gate; tampoco autoriza por sí solo migraciones remotas, push o publicación.

## Desviaciones documentales y del código

- PLAN/DESGLOSE anteriores incluían DeepSeek redactor y creación de borrador en HU-ED-07; se sustituyen por el alcance confirmado.
- La arquitectura confundía estados persistidos y etapas. Se propone `status=processing` con etapa separada y nuevo terminal `evidence_ready`.
- BACKLOG señalaba duración/retención como pendientes aunque la HU ya fija 180 s, conserva evidencia y elimina audio.
- El SQL actual solo concede gestión de ingestas a propietario/administrador. La nueva capacidad de registro necesita reflejo SQL y TypeScript futuro, sin ampliar gestión.
- La política INSERT actual acepta solo `pending`. El registro `queued` exige sustituir esa entrada de escritura de manera controlada.
- Las RPC antiguas no usan token, y crear artículo/completar sigue separado. No deben convivir como ruta operativa con el protocolo durable.
- `rules_snapshot.conservarVideo=true` es un default histórico; no autoriza conservar audio/video en HU-ED-07. Conservar snapshots históricos, usar una política efectiva sin retención de medios.

## Estado del gate

B0 PARCIAL: T-00 y diagnóstico local T-02 completados; T-01 remoto pendiente y T-03 completo diferido por la restricción de solo lectura. El diseño SQL se entrega como propuesta contra las migraciones versionadas, no como migración lista para aplicar.

Para cerrar T-01 se necesita un informe de catálogo no sensible: versión PostgreSQL, columnas/defaults/checks, índices, RLS/policies, grants y firmas/cuerpos de RPC de ingestas, roles y helpers. No se necesitan filas editoriales, usuarios, contraseñas ni API keys. Las consultas SELECT están en `DISENO_SQL_0013_HU_ED_07.md`. Contrastar especialmente los cuerpos de 0012, no solo el historial de migraciones. La recopilación remota y cualquier desviación requieren revisión antes de convertir el diseño en SQL ejecutable.
