# Handoff

- **Objetivo de la sesión:** Aplicar el mockup editorial a tarjetas de noticias reutilizables y estandarizarlas por el sitio público.
- **Completado:** Se crearon `TarjetaNoticiaPrincipal` y `TarjetaNoticiaSecundaria` con imagen adaptable, categoría, fecha, resumen opcional, accesibilidad y estilos claro/oscuro. Se migraron portada, home, noticias, Liga Colombiana, Europa, hubs, competiciones, equipos, jugadores, selección editorial y artículos relacionados. Se mantuvieron fuentes, slugs y destinos existentes.
- **Archivos modificados:** Componentes globales nuevos y wrappers de portada; `pages/index.vue`, `pages/liga-colombiana.vue`, `pages/articulos/index.vue`, `pages/colombianos-en-europa.vue`, páginas de equipos y jugadores; componentes públicos de hubs, competiciones y relacionados; `assets/css/main.css`.
- **Decisiones:** Se conserva el carrusel de noticias ya aprobado como componente independiente. Sus transiciones y controles no son tarjetas editoriales estáticas.
- **Validaciones ejecutadas:** ESLint focal y `git diff --check` pasan. `npm.cmd run build` pasa; persisten advertencias de sprites editoriales ausentes y deprecación de `@vue/shared`. Typecheck falla por errores preexistentes de imports/tipos en `fabrica-landings` y `tests/unit/workerFutbolLocal.test.ts`.
- **Fallos:** No hubo errores de compilación. No estuvo disponible el navegador para inspección visual manual.
- **Pendientes:** Inspección visual manual responsive cuando haya navegador disponible; corregir por separado los errores conocidos de typecheck en `fabrica-landings` y tests.
- **Siguiente acción exacta:** Abrir la página de Liga Colombiana y home local en un navegador y revisar la distribución de la tarjeta principal y la cuadrícula secundaria en escritorio y móvil.
- **Commit base:** sin identificar
- **Commit final:** sin commit
