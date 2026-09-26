# HU-ED-13 — Salud cada seis horas y recuperación segura

## Historia

Como responsable de Pont3la10, quiero una comprobación cada seis horas del
worker local, los lotes de Codex y las publicaciones vencidas, con reintentos
controlados y avisos útiles, para no descubrir la cola detenida durante una demo.

## Alcance

- La automatización local de Codex consulta el endpoint privado de salud cada
  seis horas; puede reanudar categorías/artículos no terminados mediante
  checkpoints e idempotencia.
- El worker existente informa presencia de instancia/heartbeat incluso cuando
  está ocioso, separado del heartbeat de cada ingesta. La vigencia se define en
  configuración y el dashboard no presenta un proceso antiguo como activo.
- Revisar: heartbeat de worker, edad/cantidad de pendientes, lotes Codex fallidos,
  artículos `scheduled` vencidos y última ejecución de Cron.
- La respuesta de salud debe incluir la edad de la cola y de la evidencia más
  antigua, antigüedad de la publicación vencida más atrasada y la hora del último
  fallo de ingesta. Debe omitir mensajes crudos de Cron y cualquier secreto.
- Reintentar solo etapas técnicas explícitamente reintentables y con clave de
  idempotencia; no repetir una llamada de modelo/imagen ya completada ni
  reintentar indefinidamente una noticia de fuentes insuficientes.
- Si el worker no reporta heartbeat, marcar “PC/worker desconectado”, conservar
  cola y esperar al reinicio/encendido. No afirmar que Codex puede despertar el
  equipo.
- La publicación utiliza Supabase Cron independiente y puede repetirse sin
  doble publicación. Alertar si el job o la publicación vencida siguen fallando.
- Registrar salida resumida y etapa, emitir alerta global del CRM y permitir
  inspeccionar trazabilidad sin exponer llaves/prompts secretos.

## Criterios de aceptación

- Cada chequeo registra hora, componente y resultado; estado “desconocido” no se
  confunde con “activo”.
- Trabajador apagado no deja ingestas como si estuvieran progresando ni se
  reencola con un lease aún vigente.
- Lote fallido se puede reanudar desde el último checkpoint completado.
- Un reintento no duplica artículo, imagen, tema, reserva de horario ni
  publicación.
- Fallos permanentes de fuente/calidad requieren atención humana y no entran en
  ciclo automático.
- Al iniciar el PC/worker, el procesamiento pendiente continúa sin intervención
  de Codex sobre el contenido ya guardado.
- La monitoría de seis horas no cambia aprobaciones ni crea contenido nuevo.

## Fuera de alcance

- Despertar equipo apagado, arreglar internet del hogar o garantizar ejecución
  local 24/7 con el PC desconectado.
