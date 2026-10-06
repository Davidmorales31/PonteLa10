# HU-FUT-08: Identidad única y deduplicación de partidos

## Estado

La implementación actual está desplegada en Production desde el commit
`049849b` (2026-10-06). El calendario público respondió con 99 fixtures y las
rutas canónicas `/como-quedo` y `/donde-ver` respondieron 200. Las pruebas de
identidad, precedencia y rutas SEO pasaron. La comprobación de esos nueve pares
históricos concretos no se repitió individualmente después del despliegue.

## Objetivo

Mostrar y mantener una sola representación pública de cada encuentro aunque
API-Football y Goal API asignen identificadores distintos al mismo partido.

## Contexto verificado

El 2 de octubre de 2026 se encontraron nueve pares de UEFA Nations League en
Production con los mismos equipos y hora, pero dos `fixture_id` canónicos: una
fila de API-Football y otra de Goal API. En cinco pares el estado más reciente
era `live` mientras la otra fila seguía `scheduled`. La clave única actual
protege el identificador externo dentro de un proveedor; no prueba que dos
identificadores de proveedores distintos representen partidos diferentes.

## Reglas

- La identidad compara deporte, competencia, equipos local/visitante y hora de
  inicio normalizada; usa mappings canónicos cuando están disponibles. La
  etiqueta de temporada no separa una misma identidad: los proveedores pueden
  representar el mismo ciclo como `2026` o `2026/2027`.
- Los alias conocidos de equipos y competencias se normalizan sin cambiar el
  texto que se muestra a las personas.
- Si hay dos snapshots del mismo encuentro, se devuelve uno: una diferencia de
  frescura mayor de tres minutos hace prevalecer la captura más reciente; con
  capturas cercanas se prioriza el estado en vivo sobre el previo. La
  preferencia del proveedor principal solo desempata snapshots equivalentes.
- Los eventos, alineaciones y estadísticas se toman de la misma fuente elegida;
  no se mezclan silenciosamente datos de proveedores diferentes.
- El deduplicador de respuesta corre antes del límite público de hasta 1.000
  partidos del día y conserva un `id` que resuelve al detalle del partido
  elegido; fútbol no usa el límite histórico de 32 partidos de otros deportes.
- No se borran mappings ni snapshots por una coincidencia ambigua. Los derechos
  de publicación continúan sometidos a los gates existentes.

## Criterios de aceptación

- Los nueve pares detectados se presentan una sola vez en `/api/resultados`.
- Una discrepancia `live`/`scheduled` de capturas cercanas no degrada el
  marcador en vivo; un estado terminal reciente sí reemplaza uno en vivo que
  lleve más de tres minutos desactualizado.
- Dos partidos reales de una misma competencia, con equipos distintos, no se
  fusionan; una coincidencia dudosa se conserva y se informa para revisión.
- API-Football y Goal API siguen siendo fuentes independientes con fallback;
  nunca se hace fan-out accidental para una misma actualización.
- La consulta no publica snapshots cuando el gate vigente de derechos no lo
  permite.
- Hay pruebas para identidad exacta, alias, orden de precedencia, colisión
  ambigua y límite aplicado después de deduplicar.

## Validación

Pruebas unitarias de normalización/lectura, suite completa, typecheck, build y
lectura pública de producción tras el despliegue. Cualquier corrección directa
de datos existentes debe preservar filas fuente y quedar respaldada por una
verificación previa de mappings.
