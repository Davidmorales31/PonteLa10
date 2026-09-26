# HU-ED-12 — Aprobación humana y programación en el siguiente espacio

## Historia

Como editor responsable, quiero aprobar una pieza completa desde el CRM y que,
solo entonces, el sistema reserve el siguiente horario disponible, para evitar
publicaciones sin mi autorización y no tener que programarlas en una segunda
operación manual.

## Alcance y regla de estado

- Entrada únicamente desde un artículo completo `review`.
- La acción explícita del usuario se presenta como **Aprobar y programar** y
  exige el permiso editorial y MFA/AAL2 requeridos.
- Una RPC transaccional valida `lock_version`, aprobación humana, calidad mínima,
  disponibilidad del espacio y transición; graba aprobación/auditoría y fija
  `scheduled_at`/estado `scheduled` sin ventana en la que otra tarea pueda
  publicar un artículo todavía no aprobado.
- Slots definidos por política editorial en `America/Bogota`; el primer valor de
  piloto es un intervalo configurable de 60 minutos. Se busca el primer bloque
  libre futuro, sin desplazar las programaciones manuales. El monitor de seis
  horas no determina la cadencia de publicación.
- Si no hay un horario válido, conservar `approved` y explicar el conflicto; no
  publicar sin programación ni hacer downgrade.
- La reserva automática y la manual comparten un bloqueo global y una validación
  de separación mínima; un slot ocupado no se pisa.
- Supabase Cron existente `pont3la10-publicar-programadas` continúa ejecutando
  `publish_due_editorial_articles()` cada minuto. El worker local y Codex no
  ejecutan publicación.

## Criterios de aceptación

- Codex no puede ejecutar ni simular la acción de aprobación.
- Sin MFA, permiso, consentimiento explícito o versión vigente, la acción falla
  íntegra; estado y horario permanecen intactos.
- Una aprobación válida deja registro auditado y reserva el próximo slot de
  manera atómica, sin colisiones en aprobaciones simultáneas.
- El slot se conserva visible en `/admin/revision` y en el detalle de contenido.
- El cron publica una sola vez; repetición del job/reintento no duplica efectos.
- El fallback de error preserva el artículo aprobado para volver a programar.

## Fuera de alcance

- Autoaprobar, cambiar contenido después de aprobación, redes sociales o un
  calendario de publicación sin acción humana.
