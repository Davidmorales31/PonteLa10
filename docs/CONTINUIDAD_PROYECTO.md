# Continuidad de Pont3la10

Documento de traspaso preparado el 9 de septiembre de 2026. Es una fotografia
del estado conocido, no una certificacion del despliegue ni del estado remoto
de Supabase. Contrastar siempre con Git y las migraciones realmente aplicadas.

## Proyecto y acceso

- Carpeta activa: `C:\PONTE LA 10`. NO usar la copia antigua de OneDrive.
- Repositorio: https://github.com/Davidmorales31/PonteLa10
- Rama de continuidad: `codex/enlaces-internos-compartir`.
- El respaldo de este traspaso se hace en esa rama, sin fusionar lo experimental con main.
- Stack: Nuxt 3, Vue 3, TypeScript, Supabase Auth/PostgreSQL/Storage, Vitest.
- Puerto local: 3001; comando `npm.cmd run dev`.
- El cambio de cuenta de Codex no requiere cambiar GitHub, Supabase ni el usuario del panel.
- `.env` permanece local y excluido de Git; `.env.example` contiene los nombres de configuracion.
- No incluir claves, cookies, tokens, contrasenas ni codigos MFA en prompts o commits.
- Mantener los accesos de GitHub y Supabase y el autenticador MFA del propietario.

## Orden de lectura

1. `AGENTS.md`: reglas persistentes, seguridad, idioma y SEO.
2. Este documento.
3. `docs/HU_INGESTA_ASISTIDA.md`: alcance original de la HU-ED-07.
4. `docs/ESTANDARES_DESARROLLO.md`, `docs/CONVENCIONES_CODIGO.md` y `docs/ESTANDARES_GITHUB.md`.
5. `docs/CONFIGURACION_CMS_EDITORIAL.md` y `docs/CONFIGURACION_SUPABASE.md`.
6. Las HU especificas de editor, multimedia, publicacion y distribucion cuando se toquen esos dominios.

## Decisiones que deben conservarse

- Espanol y camelCase para dominio, PascalCase descriptivo para componentes Vue.
- Reutilizar los componentes, utilitarios y patrones existentes; cambios acotados.
- Sitio publico navegable sin login; panel privado protegido en servidor y con RLS.
- Capacidades centralizadas; MFA en acciones sensibles. No usar service_role como atajo.
- No publicar automaticamente contenido generado. Siempre revision humana.
- Mantener el flujo de futbol aprobado; no simplificarlo por compartir UI con otros deportes.
- Sin datos mock como sustituto silencioso de resultados deportivos no disponibles.
- Seguimiento deportivo en tiempo real aplazado por decision del usuario.
- SEO tecnico y social desde el inicio; noindex en panel y contenido no indexable.
- No forzar deporte ni menciones a Pont3la10 en noticias ajenas a esos temas.
- Imagenes ajustadas al tema real; conservar fuente, creditos y trazabilidad de IA.
- Identidad: navy #08204A, azul #174EA6, amarillo #FFD800, fondo #F4F7FB.
- El usuario prefiere avances autonomos, pocos permisos y verificaciones reales.

## Base existente

En el repositorio ya hay home, login opcional, recuperacion/MFA, 404, resultados
deportivos, centro editorial por pasos, biblioteca multimedia, taxonomias,
revision/publicacion, eliminacion de contenidos, enlaces internos y tarjetas
para compartir. El usuario ha validado partes del flujo editorial previamente.
No asumir que esa validacion cubre todos los cambios posteriores ni cada API.

## HU activa: ingesta TikTok

Prioridad de la V1: SOLO TikTok y videos. Objetivo: recibir enlace, transcribir,
redactar al estilo editorial y crear un borrador listo para revision/publicacion.
La bandeja original permite otras fuentes, pero eso NO significa que sus
adaptadores esten implementados. WhatsApp y otras entradas quedan para despues.

### Implementado en codigo

- `/admin/ingestas`: registro, filtros, reglas, permisos y cancelacion de fuentes.
- Fase 1 respaldada originalmente en `24340c0`.
- Boton de procesamiento TikTok y endpoint
  `server/api/admin/ingestas/[id]/procesar.post.ts`.
- Metadatos por oEmbed en `server/utils/tiktok/clienteTikTok.ts`.
- Ejecucion de Python en `server/utils/tiktok/procesadorTikTok.ts`.
- `workers/transcribir_tiktok.py`: yt-dlp, extraccion de audio y faster-whisper
  con modelo base, CPU/int8 e idioma espanol.
- Creacion de borrador con parrafos de transcripcion, fuente y creditos.
- Reserva de ingesta y funciones de finalizacion/fallo en SQL.

### Estado real y limitaciones

- EXPERIMENTAL: no hay prueba completa confirmada de TikTok a borrador.
- El procesamiento es una peticion HTTP sincrona larga; no existe cola duradera
  ni trabajador independiente con heartbeat y progreso por etapa.
- El cliente Python tiene timeout de 10 minutos, pero eso no garantiza que
  todos los subprocesos terminen ni que se guarde el estado tras caer Node.
- El cuerpo actual copia la transcripcion. NO hay modelo de redaccion instalado
  o integrado, ni aplicacion completa de reglas/instrucciones a la generacion.
- Se investigaron opciones locales gratuitas como Ollama/Qwen; son propuestas,
  no configuraciones funcionales. No necesitan licencia de API pagada para
  ejecutarse localmente, pero requieren recursos de hardware y verificacion.
- La primera descarga de Whisper puede tardar; anteriormente se encontro una
  descarga incompleta. No se ha confirmado que el modelo este listo actualmente.
- Faltan limites de duracion/tamano, validacion robusta de salida del worker,
  proteccion de redirecciones/IP al descargar y progreso observable por etapas.
- Crear articulo y finalizar ingesta son operaciones separadas: hay riesgo de
  borrador huerfano/duplicado si falla la finalizacion y luego se reintenta.
  Comprobar contenidos antes de repetir. Pendiente transaccion/idempotencia real.
- La reserva no tiene token de intento; revisar carreras de intentos vencidos.
- No presentar este respaldo como version lista para produccion.

## Ultimo incidente y correcciones

El usuario reporto ingestas durante mas de una hora en processing. El log
aportado incluye `setCookie is not defined` en el plugin SSR al renovar sesion,
y posteriormente un fallo de memoria de Node. Esto no demuestra que Whisper
fuera la causa de la falta de memoria ni identifica por si solo su etapa lenta.

Correcciones locales realizadas:

- Import explicito de setCookie desde h3 en `plugins/supabase.server.ts` y
  `server/utils/clienteSupabaseEditorial.ts`.
- Prueba de regresion en `tests/unit/cookiesSupabase.test.ts` que simula renovar
  la sesion y comprueba escritura de cookie y estado del usuario.
- Endpoint comprueba errores/retorno de las RPC de finalizacion y fallo.
- `0012_corregir_estados_ingesta.sql`: parametros SQL calificados para evitar
  ambiguedad con columnas, fecha de reserva renovada en cada intento y limpieza
  de fechas/errores al cambiar estado.

## Pendiente inmediato

1. Confirmar que se aplico `0010_editorial_ingestion_queue.sql` y luego `0011_tiktok_processing.sql`.
2. Aplicar `supabase/migrations/0012_corregir_estados_ingesta.sql` en SQL Editor.
   El usuario todavia NO ha confirmado su ejecucion al preparar este documento.
3. Verificar Python configurado, paquetes, FFmpeg y descarga del modelo sin
   exponer secretos. En este PC se instalaron paquetes en el Python de Codex:
   `C:\Users\juand\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`.
   Esa ruta es local y no portable; queda pendiente un entorno propio reproducible.
4. Arrancar/verificar el servidor en 3001 y acceder con el usuario autorizado.
5. Elegir un TikTok publico corto. Medir metadatos, descarga, audio, carga de modelo,
   transcripcion, insercion y finalizacion por separado para encontrar el bloqueo.
6. Verificar un solo borrador enlazado, estado draft_created, fuente y creditos;
   probar tambien error sin dejar processing indefinidamente.
7. Resolver idempotencia/cola/progreso antes de integrar redaccion automatica.

No ejecutar el archivo `supabase/20260805_articulo_orden_cronologico_mcu.sql`
como migracion de infraestructura. Es un guion editorial historico de contenido
con autor concreto; puede duplicar o alterar datos y requiere revision separada.

## Configuracion local

Variables de TikTok (no son claves privadas):

```dotenv
NUXT_TIKTOK_PYTHON_PATH=<ruta al ejecutable Python de este equipo>
NUXT_TIKTOK_WORKER_PATH=workers/transcribir_tiktok.py
NUXT_TIKTOK_WHISPER_MODEL=base
```

Paquetes usados: yt-dlp, faster-whisper, imageio-ffmpeg. No hay requirements
versionado todavia. No reinstalar todo ni borrar caches a ciegas.
Mantener las demas variables del `.env` existente. No sustituirlo por el ejemplo.

## Verificacion conocida

Antes de este traspaso finalizaron correctamente: lint, typecheck y build;
83 pruebas existentes y una nueva prueba de renovacion SSR (84 en total,
ejecutadas en dos corridas). Esto valida codigo, no las RPC contra Supabase ni
la ingesta real. La build emitio una advertencia de deprecacion de dependencia.
Los cambios de este traspaso son documentacion y respaldo; no amplian esa prueba.

Comandos desde la carpeta activa:

```powershell
git status --short --branch
git log -5 --oneline
npm.cmd run dev
# Verificaciones cuando haya cambios de codigo:
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:unit
npm.cmd run build
```

Evitar compilar y desarrollar simultaneamente si comparten `.nuxt`; no borrar
salidas de una instancia activa. Revisar el proceso del puerto antes de arrancar
otro servidor y no terminar procesos ajenos.

## Cambio de cuenta y recuperacion

En el mismo PC basta conservar esta carpeta y abrirla con la nueva sesion.
El historial de conversacion no debe ser la unica copia del contexto.
La sesion de Codex es distinta de las credenciales de GitHub y Supabase.

En otro PC: clonar el repo, seleccionar la rama de continuidad, instalar con
`npm.cmd ci`, configurar `.env` por canal privado e instalar un Python propio.
Git no respalda filas de Supabase, objetos de Storage, modelos descargados,
credenciales ni sesiones; conservar el acceso al mismo proyecto de Supabase.
No se ha generado un backup independiente de la base de datos en este traspaso.

Primer mensaje sugerido: ver `docs/PROMPT_REANUDAR.md`.
