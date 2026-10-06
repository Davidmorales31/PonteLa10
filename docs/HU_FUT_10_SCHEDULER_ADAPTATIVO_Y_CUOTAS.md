# HU-FUT-10: Scheduler adaptativo por partidos y franjas horarias

## Estado

La implementación adaptativa, la prioridad horaria y la publicación de
resultados están desplegadas desde `049849b` (2026-10-06). En el primer ciclo
correcto del worker local no había partidos en la franja: calendario y fixtures
se aplazaron hasta las 06:00 COT con cero llamadas externas. Esto verifica el
camino de inactividad, no la cadencia en una jornada en vivo. El worker local
y su servidor se detuvieron para liberar archivos del build y deben reanudarse
al finalizar la publicación.

Las cuotas duras de Production permanecen en 80 API-Football/900 Goal API y la
base rechaza intervalos menores de 5/15 minutos. La medición agregada del
2026-10-06 cerca de las 00:55 COT fue 1/80 y 44/900, sin atribuirla a un proceso
concreto. Para Liga A/B se añadió una ruta DIMAYOR separada que lee las tablas
oficiales, exige cobertura exacta de todos los equipos/fases autorizados de la
temporada activa y los escribe en una sola transacción. No llama API-Football ni
Goal API. El worker la programa cada 15 minutos; una lease con token descarta
ejecuciones superpuestas o vencidas. DIMAYOR devolvió 20 filas para Liga A y 16
para Liga B; el proyector local cubrió las 36 filas autorizadas de Production.
La migración `20261006064139_hu_fut_tabla_dimayor_atomica.sql` y la ruta pasaron
revisión estática, lint, typecheck, suite y build locales, pero aún no se
desplegaron: el conector Supabase devolvió `Unauthorized` y requiere
reautorización. pgTAP remoto, actualización inicial y observación de jornada
activa siguen pendientes.

La versión desplegada sirve carteles mensuales pre-generados (80 WebP de
octubre). La generación sigue siendo manual y no hay un MP4 personalizado por
encuentro.

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
