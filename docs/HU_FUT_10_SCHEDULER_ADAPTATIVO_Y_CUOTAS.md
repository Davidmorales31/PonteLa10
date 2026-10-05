# HU-FUT-10: Scheduler adaptativo por partidos y franjas horarias

## Estado

PR #58 (`d2ad599`, Production `READY` el 2026-10-05) corrigió la identidad
estable de cruces repetidos: conserva el primer slug simple, agrega
competición/temporada en revancha y preserva URL previas con redirección 301.
La lectura pública ya no fusiona IDs distintos del mismo proveedor con jornada
desconocida y fechas diferentes. No añade llamadas a proveedores ni modifica
las cuotas o el worker.

La protección del presupuesto y la sincronización diaria del calendario
colombiano están desplegadas en Production (`main`, `9066d53`, PR #57). La
migración de calendario carga Liga BetPlay, Torneo BetPlay y Copa Colombia una
vez por día de negocio; el 2026-10-05 guardó 748 fixtures con 11 llamadas de
Goal API. El endpoint público leyó 80 encuentros desde la base de datos.

El 2026-10-04 Goal API llegó al tope previo de 950; el 2026-10-05 a las 06:55
COT el registro agregado marcaba 46/900 Goal API y 1/80 API-Football con los
nuevos topes. Esta medición confirma el límite en funcionamiento, no una
tendencia de varios días ni la cadencia en una jornada completa en vivo. El
worker lo ejecuta el PC del responsable; Vercel no tiene Cron para este flujo.
Los procesos del PC deben arrancarse otra vez manualmente después de reiniciar.

Las pruebas unitarias, lint, typecheck y build del release pasaron. No se pudo
ejecutar pgTAP localmente porque faltan Docker y Supabase CLI; las funciones,
ACL, límites y casos nulos se comprobaron con SQL en la base Production. Queda
pendiente observar varias jornadas y, si se exige por pieza, generar un MP4
personalizado de 6–10 segundos: hoy se sirve el GIF ambiental existente y
posters PNG programáticos.

## Objetivo

Mantener un listado diario de partidos en Bogotá y consumir peticiones de
proveedor cuando un partido priorizado las necesita, concentrando más
actualizaciones en jornadas activas sin superar las cuotas.

## Reglas

- El PC del responsable continúa siendo el scheduler; no se crea un Vercel Cron.
- Al comienzo de cada día de negocio `America/Bogota`, se carga una vez el
  calendario priorizado completo y se persiste para que ciclos posteriores no
  repitan la consulta de listados.
- Entre la 01:00 y las 06:00 de Bogotá no se solicitan datos a los proveedores
  para partidos futuros cuya hora local sea posterior a las 06:00. Se conservan
  las actualizaciones de partidos ya en vivo o cuyo inicio cae dentro de la
  franja. Si el PC inicia en ese intervalo y todavía no cargó el día, la carga
  se difiere hasta las 06:00.
- El intervalo se decide por estado, hora de inicio, prioridad y cuota restante:
  en vivo recibe más frecuencia; prepartido recibe frecuencia intermedia;
  partidos lejanos, finalizados y franjas sin partidos no generan sondeo
  innecesario.
- Las reservas diarias son atómicas y el worker se detiene en 80 peticiones de
  API-Football y 900 de Goal API. Quedan 10/50 solicitudes de margen respecto de
  los máximos operativos de 90/950; no se gastan llamadas para alcanzar mínimos.
- La base rechaza reservas de fixtures con ventanas menores a cinco minutos y de
  clasificaciones menores a quince minutos, incluso si queda vivo un worker
  antiguo con la cadencia previa.
- Se contabiliza el coste real por proveedor: API-Football agrupa fixtures;
  Goal API consulta cada fixture y limita la concurrencia. El fallback no
  duplica llamadas ni saltan las reservas.
- Si el PC o su servidor local están detenidos, la web sirve el último snapshot
  disponible y el worker reanuda de forma escalonada, sin ráfagas de catch-up.

## Criterios de aceptación

- Una carga diaria inicial persiste el listado del día COT y no lo vuelve a
  descargar en cada ciclo.
- El worker no ejecuta llamadas externas entre 01:00–06:00 por un partido que
  empieza después de las 06:00; sí mantiene actualizaciones para partidos en
  vivo o iniciados dentro de la franja. Se prueban las tres situaciones,
  medianoche, inicio retrasado, cambio de día y zona horaria.
- La limpieza de datos de fechas anteriores ocurre antes de diferir la carga
  inicial, sin consumir cuotas de los proveedores.
- En horas con partidos en vivo, la frecuencia observada aumenta respecto de una
  franja vacía y las cuotas duras siguen intactas.
- Un presupuesto agotado reduce/omite consultas no críticas y prioriza Colombia,
  Europa importante y cinco grandes en ese orden.
- El worker conserva firma, endpoint local y latidos existentes; no envía claves
  ni credenciales al navegador.
- Métricas de una corrida muestran proveedor, peticiones consumidas, cuota
  restante, intervalo siguiente y motivo de omisión sin registrar secretos.

## Validación

Pruebas de reloj falso y presupuesto, pruebas del endpoint privado firmado,
suite completa, typecheck, build y una ventana real observada en el PC. El
servicio local solo se reinicia si la nueva versión queda lista y se confirma
que el worker existente puede reanudar sin perder estado.
