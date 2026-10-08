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

## Baseline inicial de CI

La primera corrida de CI (2026-10-08) generó tres muestras Lighthouse por ruta
contra el preview local del build. Sus medianas fueron:

| Ruta | Performance | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: |
| `/` | 0,59 | 8 372 ms | 0,00 | 172 ms |
| `/partidos-hoy` | 0,51 | 7 218 ms | 0,17 | 214 ms |
| `/liga-colombiana` | 0,60 | 6 918 ms | 0,01 | 208 ms |
| `/colombianos-en-europa` | 0,60 | 6 769 ms | 0,06 | 202 ms |

Esta muestra hace visible deuda real: el LCP de laboratorio es alto y
`/partidos-hoy` supera el umbral ideal de CLS 0,1. Los límites de CI son
**guardas iniciales contra regresiones grandes**, calibradas para no bloquear
el desarrollo existente; no son los objetivos de experiencia ni declaran que
las rutas estén optimizadas. El siguiente trabajo de rendimiento debe reducir
LCP y CLS, especialmente en `/partidos-hoy`, y bajar esos límites con nuevas
mediciones repetibles.

La primera ejecución manual del workflow contra Production (2026-10-08) produjo
estas medianas de tres muestras:

| Ruta | Performance | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: |
| `/` | 0,87 | 3 430 ms | 0,00 | 202 ms |
| `/partidos-hoy` | 0,73 | 4 811 ms | 0,20 | 212 ms |
| `/liga-colombiana` | 0,74 | 3 342 ms | 0,01 | 636 ms |
| `/colombianos-en-europa` | 0,90 | 3 161 ms | 0,06 | 150 ms |

La primera corrida post-merge de CI llegó a CLS 0,266 en `/partidos-hoy`; la
medición de Production observó TBT 636 ms en `/liga-colombiana`. Los controles
quedan en performance ≥0,45, LCP ≤9 s, CLS ≤0,30 y TBT ≤800 ms, evaluados por
mediana de tres corridas. Se fija Ubuntu 24.04 para que cambios automáticos de
la imagen `ubuntu-latest` no alteren la referencia de las mediciones. Estos
límites detectan regresiones grandes, no cumplimiento de los Core Web Vitals
ideales; los puntos de deuda anteriores siguen visibles y deben optimizarse.

La verificación final de Production tras integrar los límites (run
`37752052200`) también pasó las assertions y archivó sus reportes:

| Ruta | Performance | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: |
| `/` | 0,71 | 6 903 ms | 0,00 | 187 ms |
| `/partidos-hoy` | 0,70 | 4 216 ms | 0,20 | 245 ms |
| `/liga-colombiana` | 0,75 | 3 347 ms | 0,01 | 580 ms |
| `/colombianos-en-europa` | 0,73 | 5 429 ms | 0,06 | 264 ms |

Estas son mediciones Lighthouse de laboratorio y pueden variar entre corridas;
no equivalen a CrUX, percentil 75 ni a una medición real de INP.

## Rutas y controles

CI mide `/`, `/partidos-hoy`, `/liga-colombiana` y
`/colombianos-en-europa` en viewport y perfil móvil, con tres ejecuciones por
ruta. Los reportes se conservan como artefactos de GitHub Actions durante 90
días. Un workflow semanal repite la muestra contra Production cada martes a las
09:17, hora de Colombia.

Los límites duros iniciales de regresión son performance ≥ 0,45, LCP ≤ 9 s,
CLS ≤ 0,30 y TBT ≤ 800 ms. Se evalúan sobre la mediana de tres ejecuciones por
ruta; **no significan que se haya alcanzado el objetivo ideal de campo**. Los
reportes se conservan para que el equipo pueda bajar los límites
gradualmente sin ocultar una regresión.

La cuota actual impide consultar la API de PageSpeed Insights desde este
entorno. La medición de INP de usuarios reales debe añadirse cuando exista una fuente de
campo autorizada y se pueda mantener el consentimiento de analítica existente;
esta HU no habilita telemetría nueva ni recoge datos de usuarios por otro canal.

No se agrega un slot de publicidad en esta HU: un recurso comercial adicional
podría empeorar LCP o estabilidad visual, que son precisamente los indicadores
que se están presupuestando. Los anuncios ya existentes no se modifican.
