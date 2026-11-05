# Handoff

- **Objetivo:** Usar el PNG proporcionado por Juan en el banner de Selecci?n Colombia y mantener la interacci?n funcional.
- **Completado:** El banner de escritorio usa el arte original recortado para que James sobresalga por encima de la franja; m?vil usa un recorte PNG que conserva el escudo, textos y CTA. El CTA est? cubierto por un enlace accesible a #calendario. Se retiraron los banners generados que ya no se usan.
- **Archivos:** pages/seleccion-colombia.vue; public/images/seleccion-colombia/la-tricolor-original.png; public/images/seleccion-colombia/banner-la-tricolor.png; public/images/seleccion-colombia/banner-la-tricolor-movil.png; docs/agents/ESTADO_ACTUAL.md.
- **Decisi?n:** Mantener el arte PNG proporcionado y una capa de enlace HTML transparente sobre el CTA. Encabezados y navegaci?n contin?an siendo HTML.
- **Validaciones:** ESLint focal y git diff --check pasaron; `npm.cmd run build` complet? y gener? cliente, servidor y recursos p?blicos. Se mantienen advertencias conocidas de sprites editoriales y deprecaci?n de `@vue/shared`. La imagen se inspeccion? directamente; no hubo navegador para validar la ruta en viewport real.
- **Pendientes:** Comprobaci?n visual responsive en navegador cuando est? disponible.
- **Pruebas unitarias:** No ejecutadas.
- **Commit:** Sin commit.

## Correccion de ancho compartido

- Se quitaron todos los overrides de ancho/margen: incluso width: 100% pisaba el maximo compartido. La pagina hereda directamente pagina-publica-medio, centrada y limitada a 1240 px como Liga Colombiana. El espacio superior hereda los 26 px compartidos; se conserva la proporcion del arte PNG. ESLint y git diff --check pasan; build aprobado; se mantienen advertencias conocidas de sprites editoriales y deprecacion de @vue/shared.

## Separacion del titulo y el arte del banner

- El recorte de escritorio sobresale hacia arriba; se reservo el espacio correspondiente para que no tape el titulo. El recorte movil no tiene ese saliente y conserva margen superior cero. ESLint, git diff --check y build pasan; build conserva warnings conocidos de sprites editoriales y deprecacion de @vue/shared.

## Redise?o de noticias principales y secundarias

- HubEditorialPublico permite reemplazar la presentacion editorial mediante un slot opcional con principal, recientes y cantidad; los otros hubs permanecen en el fallback existente. Seleccion Colombia usa las tarjetas globales con una principal panoramica y un carrusel desplazable de secundarias horizontales, mantiene el espacio publicitario y expone foco/scroll de teclado.
- ESLint focal y git diff --check aprobados; build Nuxt aprobado con warnings conocidos de sprites editoriales y deprecacion de @vue/shared. Typecheck falla globalmente en fabrica-landings/tests por problemas preexistentes; no hubo diagnosticos de los archivos modificados. No se ejecutaron pruebas unitarias ni inspeccion visual manual en navegador.

## Contraste del titular de noticias

- El titulo y enlace de la tarjeta principal quedan en blanco incluso con tema claro. ESLint focal, git diff --check y build pasan; permanecen warnings conocidos de sprites y deprecacion de @vue/shared.

## Convocatorias redise?adas con ilustraciones (2026-11-04)

- Se implement? en pages/seleccion-colombia.vue la franja institucional, encabezado, filtros Masculina/Femenina/Archivo y tarjetas basadas en el mockup. Los rivales se derivan de los partidos existentes dentro de las fechas de cada convocatoria; los botones despliegan la lista completa y los enlaces apuntan a comunicados FCF. Archivo queda seleccionado porque las dos ventanas est?n finalizadas al 04/11/2026.
- Se generaron ilustraciones an?nimas (no retratos documentales) y optimizadas a WebP: public/images/seleccion-colombia/convocatoria-masculina-ilustracion.webp y convocatoria-femenina-ilustracion.webp; el cr?dito visible dice Ilustraci?n editorial.
- ESLint focal, git diff --check y build pasan. Typecheck global sigue fallando en fabrica-landings/tests; un filtro de salida confirm? que no hay diagn?sticos en pages/seleccion-colombia.vue ni components/publico/HubEditorialPublico.vue. No se ejecutaron pruebas unitarias ni hubo navegador disponible para inspecci?n visual.

## Calendario de partidos y resumen de agenda (2026-11-04)

- **Objetivo:** Redisenar la seccion Calendario de Seleccion Colombia conforme al mockup enviado.
- **Completado:** Se reemplazo la lista plana por un panel de calendario con filtros funcionales Todos/Masculina/Femenina y panel lateral con conteos, proximas ventanas y aviso FCF. Las filas reutilizan `TarjetaPartidoSeleccion`, ahora admite chips de seleccion/competencia y etiqueta de fuente/destino. El layout se adapta a movil y conserva modos de tema.
- **Archivos:** `pages/seleccion-colombia.vue`; `components/TarjetaPartidoSeleccion.vue`; `docs/agents/ESTADO_ACTUAL.md`.
- **Decisiones:** Mantener la fuente oficial y las fechas/horas del modelo existente; resumen derivado de los mismos cuatro partidos proximos. Enlaces llevan a la ficha interna si existe; de lo contrario, a la fuente FCF.
- **Validaciones ejecutadas:** ESLint focal, `git diff --check` y `npm.cmd run build` pasan. El typecheck global falla por errores ajenos en `fabrica-landings` y `tests/unit`; no aparecen diagnosticos en los archivos de esta seccion.
- **Fallos:** Typecheck global no verde debido a problemas preexistentes de alias/JSX en `fabrica-landings` y `NODE_ENV` en tests. Build muestra warnings conocidos de dos sprites editoriales y deprecacion de `@vue/shared`.
- **Pendientes:** No se ejecutaron pruebas unitarias. No hubo inspeccion visual responsive, pues el host de navegador reporta indisponibilidad.
- **Siguiente accion exacta:** Cuando este disponible el navegador, abrir `/seleccion-colombia#calendario` y comprobar escritorio/movil y los tres filtros.
- **Commit base:** Sin commit base identificado.
- **Commit final:** sin commit.
