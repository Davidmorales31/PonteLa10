# Plan HU-ED-10 — Tercera vía editorial con Codex

Fecha: 2026-09-26
Estado: planificación aprobada por el responsable; implementación local autorizada.
Base técnica: ingesta TikTok HU-ED-07/08/09 y flujo de publicación HU-ED-05.

## Avance de implementación (2026-09-26)

Rama local `codex/hu-ed-10-contenido-programado`, basada en `main` (`39acbb2`).
HU-ED-11 tiene un primer hito vertical: API privada para cargar portadas
ilustrativas y registrar propuestas en `review`, contratos estrictos, HMAC con
nonce de un uso, límites de cuerpo, idempotencia concurrente, RPC con validación
de categoría y temas públicos, fuentes/afirmaciones estructuradas y trazabilidad
visible en el CMS. Se añadieron Skills de investigación, redacción e imagen.

HU-ED-10 tiene su primer hito durable: API privada de contexto con categorías
activas, noticias publicadas recientes y agenda/checkpoints reanudables; RPC para
guardar oportunidades con señales, puntuación explicable, deduplicación de 30
días y motivo cuando faltan cinco hallazgos por categoría. Máximo siete. El
mismo contexto expone los temas públicos activos y metadatos mínimos de las
propuestas ya entregadas para que una corrida reanudada las salte sin volver a
redactar/generar su portada. La migración local adicional es
`supabase/migrations/20260926082738_hu_ed_10_codex_agenda_checkpoints.sql`.

HU-ED-13 añade heartbeat independiente del worker (60 s), ventana de frescura de
120 s y endpoint privado firmado de solo lectura con resumen de worker, cola,
agenda Codex, publicaciones vencidas y última ejecución de Cron si su catálogo
está disponible. Incluye edad de cola/evidencia y atraso de la publicación
vencida más antigua; omite mensajes crudos de Cron. El cliente permite consultar
esta ruta con `salud`. La Skill `pont3la10-operational-monitor` define su lectura
sin mutaciones. No reintenta ni altera contenido. La ausencia de migración,
caídas y permisos se distinguen sin exponer mensajes internos; el worker sigue
procesando cuando la nueva señal aún no está instalada. Validación del primer
hito HU-ED-13: lint, typecheck, build, suite (19 archivos, 103 pruebas), sintaxis
del worker y `git diff --check` pasaron. Validación global más reciente, tras el
monitor CRM y los checkpoints: suite (22 archivos, 109 pruebas), lint, typecheck,
build y `git diff --check` pasan. Revisión estática de seguridad final sin
hallazgos bloqueantes. La auditoría estática confirmó firma ligada a método/ruta/
requestId, nonce de un uso, streaming con límite, bloqueo de deduplicación
concurrente y fallo cerrado en adaptador sin streaming. Las RPC existentes son
`SECURITY INVOKER`; la consulta de salud es invoker, solo con `EXECUTE` para
`service_role`; el heartbeat es una RPC estrecha con `SECURITY DEFINER`,
`search_path=''`, actor técnico exclusivo y ACL revocada para roles públicos.
No se depende de `auth.role()`. La clave service-role queda solo en servidor.
No se aplicaron migraciones, ni configuraron secretos, ni se creó/activó tarea ni
hubo deploy. SQL y llamadas RPC siguen sin
validación de integración contra PostgreSQL/Supabase local. Un revisor detectó
el conteo no acumulativo entre lotes; quedó corregido con total persistido por
corrida/categoría, máximo acumulado de siete y motivo condicionado al total. La
revisión final no reporta riesgo funcional; sigue pendiente prueba de integración
de lotes y rollback en PostgreSQL. La propuesta
requiere `NUXT_CODEX_EDITORIAL_API_SECRET` y `NUXT_SUPABASE_SERVICE_ROLE_KEY`
privados.

Se añadieron `scripts/codex-editorial-checkpoint.mjs` y la Skill coordinadora
`pont3la10-daily-editorial-run`. El checkpoint local guarda etapas append-only
por corrida/categoría/huella; conserva la portada por hash de contenido, limita
el payload de carga al directorio del candidato y rechaza campos de credenciales.
La orquestación lee y reutiliza estados guardados, puede enumerar los checkpoints
de una corrida, evita generar otra portada para propuestas ya entregadas y se
detiene si no dispone de investigación, imagen o API. La Skill de seis horas
permite una recuperación técnica idempotente de una entrega ya preparada (máximo
un replay por revisión); no reencola ingestas, no vuelve a llamar modelos y no
publica. El CLI exporta etapas exactas a archivos locales ignorados, sin imprimir
contenido privado, y valida cualquier replay file preexistente antes de usarlo.
El CRM incluye `/admin/operacion`, consulta de solo lectura
protegida por `configuracion.ver`, alertas globales y proyección limitada a
estados, fechas y conteos; roles propietario/administrador. El inicio describe
los tres flujos editoriales vigentes. Revisión de seguridad sin bloqueantes.
Suite completa (22 archivos, 109 pruebas), lint, typecheck, build y
`git diff --check` pasan.

Bloqueo operativo para programar Codex: el único proyecto guardado apunta a
`C:\Users\juand\OneDrive\Documentos\PONTE LA 10`, no al árbol canónico
`C:\PONTE LA 10`. No vincular una tarea recurrente al proyecto equivocado.
Verificar además acceso de ImageGen y manejo de archivos en una ejecución piloto.
Continúan pendientes HU-ED-11 end-to-end, recuperación completa HU-ED-13,
pruebas reales de SQL/API, validación visual del monitor con sesión y
configuración externa autorizada.

HU-ED-12 tiene un primer flujo local de ruta explícita “Aprobar y programar”, MFA,
ambos permisos, confirmación y versión de bloqueo; su RPC bloquea la reserva,
usa el siguiente intervalo libre de 60 minutos (America/Bogota) y registra la
transición y auditoría en una sola transacción. Un trigger serializa y valida
también las programaciones manuales y evita colisiones simétricas; el conflicto
manual se devuelve como HTTP 409. Si se agotan los slots, el contenido queda
aprobado (sin marcarlo como programado) y se informa. La revisión SQL confirmó
el uso del bloqueo compartido, permisos, MFA y atomicidad. Suite completa,
typecheck, lint y build pasan. La prueba PostgreSQL y una interfaz administrativa
para cambiar la política de slots siguen pendientes; no se aplicó esta migración.

## Objetivo

Incorporar una tercera vía de creación de contenido: automatizaciones locales de
Codex investigan tendencias, construyen expedientes verificables, redactan y
generan ilustraciones editoriales; una API privada de Pont3la10 registra cada
pieza completa y la deja únicamente en revisión. El responsable conserva la
decisión de aprobar. Después de esa aprobación, el sistema asigna el siguiente
horario libre y Supabase Cron publica la pieza programada.

Esta vía es distinta de la ingesta TikTok y del editor manual. No crea
ingestas ficticias ni reutiliza la transcripción como evidencia.

## Decisiones confirmadas

- Ejecutar como **Codex Automation local** en el proyecto; no como tarea de
  ChatGPT Work en la nube. Requiere que el PC esté encendido, conectado y que la
  automatización pueda ejecutarse.
- Objetivo diario de 5–7 propuestas por categoría activa. La cuota no es una
  obligación de fabricar páginas: si no hay hallazgos con suficiente evidencia
  y aporte editorial, registrar por qué no se alcanzó.
- Cubrir todas las categorías activas consultadas desde el catálogo real.
  El seed actual contempla Fútbol mundial, Fútbol colombiano, Tecnología
  deportiva, Gaming deportivo, Tendencias, Especiales y Opinión; no asumir que
  todas siguen activas en la base remota.
- Especiales y Opinión pueden tener borrador, pero llevan una advertencia
  visible de enfoque humano. No inventar postura, autor, firma, experiencia ni
  cobertura de Pont3la10.
- Generar portadas desde las tareas de Codex. Deben ser ilustraciones editoriales
  atractivas y pertinentes, no evidencia fotográfica fabricada de personas,
  equipos o eventos reales. Mostrar “Ilustración editorial” donde corresponda y
  conservar los metadatos de generación para revisión.
- La persona responsable aprueba cada artículo. La aprobación puede asignar el
  próximo espacio disponible de programación. Nunca programar/publicar contenido
  aún en `review`.
- Verificar operación cada seis horas; publicar vencidos con el cron existente
  cada minuto. Reintentos con idempotencia, límites y auditoría.
- Skills versionadas en `.agents/skills/` del repositorio: investigación de
  tendencias, redacción investigada y portadas. No editar Skills globales. Las
  Skills guían Codex; no reemplazan el contrato, validadores ni autorización de
  la API.

## Investigación y calidad

1. Descubrir señales en Google Trends Colombia, comenzando por su feed RSS de
   “Tendencias actuales” y complementando con fuentes públicas. El feed es una
   señal de interés, no evidencia de los hechos. La API oficial de Trends sigue
   siendo alfa de acceso limitado; no depender de ella.
2. Investigar cada tema por separado. Conservar URL, título, editor, fecha de
   publicación/consulta, tipo de fuente y qué afirmaciones sustenta. Priorizar
   fuente primaria/oficial y corroboración independiente cuando el hecho lo
   permita. No copiar artículos ni inventar corroboración.
3. Exigir diferencia útil frente al catálogo ya publicado y frente a los demás
   candidatos del lote; deduplicar por noticia, entidades y ventana temporal.
4. Aplicar el estándar editorial actual de HU-ED-08 cuando la evidencia lo
   soporte: titular específico, contexto, desarrollo completo, SEO y fundamento
   por afirmación. No imponer una longitud para llenar palabras.
5. Si una noticia importante no puede verificarse, no redactarla como hecho:
   guardar el motivo como oportunidad omitida o enviar una alerta de atención.

## Flujo propuesto

```text
Codex Automation local (diario, lotes reanudables)
  -> detectar tendencias + priorizar temas por categoría activa
  -> investigación web + expediente de fuentes/afirmaciones
  -> Skills: redactar + proponer taxonomía + generar portada ilustrativa
  -> API privada: validar firma, esquema, fuentes, categoría, imagen e idempotencia
  -> artículo y trazabilidad guardados -> estado review
  -> responsable revisa y aprueba (MFA)
  -> reservar próximo horario disponible -> scheduled
  -> Supabase Cron existente publica cuando vence

Monitor local cada 6 h -> heartbeat del worker + cola + publicaciones debidas
  -> reanudar/reintentar solo acciones seguras; avisar si el PC está desconectado
```

La automatización debe guardar checkpoints por categoría/artículo. Un lote
interrumpido retoma lo faltante sin volver a cobrar o duplicar piezas ya
registradas. Limitar concurrencia para no competir con Whisper ni saturar el PC.

## HUs y orden

1. [HU-ED-10 — Investigación de tendencias y agenda editorial](HU_ED_10_TENDENCIAS_CODEX.md).
2. [HU-ED-11 — Investigación, redacción, portada y entrega privada al CMS](HU_ED_11_CONTENIDO_DESDE_INVESTIGACION.md).
3. [HU-ED-12 — Aprobación humana y programación en el siguiente espacio](HU_ED_12_APROBACION_Y_PROGRAMACION.md).
4. [HU-ED-13 — Salud del worker, lotes reanudables y recuperación](HU_ED_13_OPERACION_AUTOMATIZADA.md).

Orden de implementación: contratos/tablas mínimas → endpoint privado idempotente
y fuente estructurada → piloto vertical de un contenido/categoría → agenda diaria
reanudable para las categorías activas → aprobación/programación atómica →
monitor y reintentos → piloto con imágenes y cuotas antes de activar el volumen.

## Riesgos/gates

- **SEO y calidad:** 35–49 publicaciones potenciales al día es un volumen alto.
  Google advierte que generar muchas páginas sin valor puede violar la política
  de contenido escalado. Medir valor, duplicación, correcciones y desempeño; no
  completar cupos con contenido débil. Todo lo creado permanece privado en
  revisión hasta autorización humana.
- **Disponibilidad:** una automatización local no puede despertar un PC apagado.
  Reportar heartbeat vencido; al encenderse, reanudar cola. El cron de Supabase
  sí opera publicaciones programadas y no depende del navegador/worker.
- **Credenciales:** no poner secretos en prompts, Skills, Git o archivos
  versionados. Usar secreto de servicio limitado, guardado fuera de Git y
  validación servidor con límite/tamaño/expiración. Nunca aceptar una clave
  `service_role` desde Codex o navegador.
- **Imágenes:** el generador de Codex no es DeepSeek. Verificar que la
  automatización programada disponga de la herramienta de imágenes y que el
  resultado pueda enviarse como archivo antes de activar lotes grandes. Si no,
  dejar el artículo en atención sin inventar una portada.
- **Supabase/Vercel:** se permite preparar código y migraciones locales. Aplicar
  migraciones remotas, añadir secretos a Vercel o activar automatizaciones
  recurrentes de producción requiere comprobar el proyecto destino y realizar
  el cambio con credencial autorizada; el contenido nunca se aprueba solo.
- **Tarea cada seis horas:** el monitor puede informar/reintentar una reserva;
  no puede reiniciar físicamente un equipo apagado ni resolver una caída de red.

## Fuentes de diseño

- Google Trends permite exportar RSS desde Trending Now y explica que estas
  consultas reflejan búsquedas recientes: https://support.google.com/trends/answer/3076011?hl=es
- La API programática oficial de Trends se mantiene en alfa con acceso limitado:
  https://developers.google.com/search/apis/trends
- Google explica riesgos de generar muchas páginas sin valor y recomienda
  contenido original útil para personas:
  https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
  https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Work y Codex son experiencias distintas; las automatizaciones de Codex son
  independientes y locales cuando se ejecutan en este proyecto:
  https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex
