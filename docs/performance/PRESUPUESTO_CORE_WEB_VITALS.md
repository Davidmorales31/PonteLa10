# Presupuesto inicial de Core Web Vitals

## Objetivo

Medir las rutas públicas clave en móvil, guardar reportes comparables y frenar
regresiones grandes en los checks de CI. Los objetivos de campo definidos por
la HU son LCP ≤ 2,5 s, INP ≤ 200 ms y CLS ≤ 0,1 en el percentil 75, segmentado
por dispositivo. Lighthouse CI es una medición de laboratorio: no reemplaza
CrUX ni demuestra por sí solo que esos objetivos de campo se cumplan.

## Baseline de laboratorio

Muestra exploratoria de Production tomada el 2026-10-08 en `/` con Edge
154.0.4258.37 y Lighthouse 12.6.1, emulación móvil, una ejecución:

| Ruta | Performance | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: |
| `/` | 0,69 | 4 056 ms (4,056 s) | 0 | 395 ms |

Es una sola ejecución, no un percentil ni una medición representativa de todos
los usuarios. La referencia repetible por ruta empieza con el artefacto LHCI de
tres ejecuciones medianas que produzca CI.

La API de PageSpeed Insights respondió HTTP 429: la cuota del proyecto está en
cero y no se recibió su bloque de experiencia de campo CrUX. Por ello no se
afirma tener un baseline CrUX ni un valor real de INP. Lighthouse de laboratorio
no expone INP observado; TBT se usa únicamente como señal de bloqueo del hilo
principal, no como sustituto numérico de INP.

## Rutas y controles

CI mide `/`, `/partidos-hoy`, `/liga-colombiana` y
`/colombianos-en-europa` en viewport y perfil móvil, con tres ejecuciones por
ruta. Los reportes se conservan como artefactos de GitHub Actions durante 90
días. Un workflow semanal repite la muestra contra Production cada martes a las
09:17, hora de Colombia.

Los límites duros iniciales de laboratorio son performance ≥ 0,65, LCP ≤ 4,5 s,
CLS ≤ 0,1 y TBT ≤ 500 ms. El límite LCP/TBT deja margen frente a la muestra
local de una sola ejecución y detecta deterioros importantes; **no significa
que se haya alcanzado el objetivo ideal de campo**. Los reportes muestran los
valores medianos para que el equipo pueda bajar los límites gradualmente sin
ocultar una regresión.

La cuota actual impide consultar la API de PageSpeed Insights desde este
entorno. La medición de INP de usuarios reales debe añadirse cuando exista una fuente de
campo autorizada y se pueda mantener el consentimiento de analítica existente;
esta HU no habilita telemetría nueva ni recoge datos de usuarios por otro canal.

No se agrega un slot de publicidad en esta HU: un recurso comercial adicional
podría empeorar LCP o estabilidad visual, que son precisamente los indicadores
que se están presupuestando. Los anuncios ya existentes no se modifican.
