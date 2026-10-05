# HU-FUT-10: Scheduler adaptativo por partidos y franjas horarias

## Estado

La versión anterior está desplegada en Production (`main`, `fc13d9e`,
2026-10-02). Los ajustes del worker en esta rama son candidatos a release, no
desplegados aún. Las pruebas cubren presupuesto y cálculo de próxima ejecución;
siguen pendientes una ventana operativa en vivo y el cambio de fecha con el
worker real. La automatización semanal del calendario DIMAYOR hacia la tabla
pública de Liga es un flujo distinto y todavía no está implementado.

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
- Las reservas diarias siguen siendo atómicas y nunca exceden 90 peticiones de
  API-Football ni 950 de Goal API. Las bandas operativas buscadas son 60–90 y
  900–950 cuando el calendario y la cuota lo justifiquen; no se gastan llamadas
  solo para alcanzar un mínimo.
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
