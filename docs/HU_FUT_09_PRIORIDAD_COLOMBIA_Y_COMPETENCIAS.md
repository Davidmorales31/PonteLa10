# HU-FUT-09: Cobertura y prioridad de Colombia y competiciones principales

## Estado

La lógica de prioridad está desplegada en Production desde `049849b`
(2026-10-06) y cubierta por pruebas unitarias. El worker del PC completó un
ciclo correcto en una franja sin partidos, por lo que esa corrida confirma el
aplazamiento y el consumo cero, pero no compara una jornada activa de Colombia,
Europa y las cinco grandes ligas. La observación de esa prioridad en vivo queda
pendiente.

## Objetivo

Usar las peticiones disponibles primero para el fútbol colombiano, luego para
competiciones europeas importantes y finalmente para las cinco grandes ligas.

## Prioridad acordada

1. Primera A, Primera B, Copa Colombia, Superliga y partidos de selecciones de
   Colombia cubiertos por el proveedor.
2. Champions League, Europa League, Conference League y otras competiciones
   europeas importantes habilitadas explícitamente.
3. Premier League, LaLiga, Serie A, Bundesliga y Ligue 1.

La prioridad operativa afecta selección de fixtures y detalles; no altera el
orden cronológico que ve la persona dentro de cada lista.

## Reglas

- La clasificación de un encuentro de selección no depende solo del país o
  nombre de la competición: reconoce a Colombia como participante mediante
  mappings/alias de equipo y una allowlist de competiciones.
- Los identificadores externos de Goal API son explícitos, estables y
  verificados; no se descubre el catálogo completo en cada ciclo. Amistosos
  internacionales se consulta mediante el ID oficial de cobertura `356` y se
  filtran por participación de Colombia, no por nombre de torneo solamente.
- Si un dato de torneo o equipo no se puede mapear, se mantiene privado y no se
  presenta como un fixture canónico válido.
- El fallback API-Football → Goal API se conserva; la segunda fuente se intenta
  solo cuando la primera falla o no tiene presupuesto.
- La prioridad nunca autoriza por sí sola la publicación de datos: se mantienen
  las reglas actuales de derechos y los límites diarios.

## Criterios de aceptación

- Los partidos colombianos elegibles preceden a las competiciones europeas y
  estas preceden a las cinco grandes ligas en la cola de actualización.
- Un partido de una selección colombiana reconocida entra en el grupo Colombia
  aunque la competencia tenga país `World`, `International` o similar.
- Un partido de otra selección no se convierte en prioridad colombiana por el
  texto del torneo.
- La ausencia de mappings válidos no produce llamadas fuera del conjunto
  permitido ni filas públicas incompletas.
- Hay pruebas para prioridad, alias de Colombia, competencia internacional,
  no coincidencia por nombre de torneo y fallback.

## Validación

Pruebas unitarias del clasificador y del listado Goal API; suite, typecheck,
build y smoke de `/api/resultados?deporte=futbol` después del despliegue.
