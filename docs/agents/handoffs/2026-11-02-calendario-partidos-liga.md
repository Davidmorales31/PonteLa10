# Handoff

- **Objetivo de la sesión:** Rediseñar el calendario de Liga Colombiana según la referencia y extraer vistas de partido reutilizables.
- **Completado:** El calendario se movió a una sección de ancho completo bajo el bloque principal. Partidos de hoy usan tarjetas en cuadrícula; los siguientes 7 y 30 días usan filas horizontales. Se conservó la respuesta de `/api/liga-colombiana` y sus grupos, fechas, estados, escudos y rutas de partido/equipo.
- **Archivos modificados:** `pages/liga-colombiana.vue`, `types/partidosLiga.ts`, `components/TarjetaPartido.vue`, `components/PartidoFila.vue`, `components/EquipoPartido.vue`, `docs/agents/ESTADO_ACTUAL.md`.
- **Decisiones:** `TarjetaPartido` y `PartidoFila` reciben el mismo `PartidoLiga`; `EquipoPartido` centraliza escudo, fallback y enlace de equipo. La sección calendario queda fuera de la cuadrícula carrusel/tabla para disponer del ancho que requiere el mockup.
- **Validaciones ejecutadas:** ESLint focalizado, `git diff --check` y `npm run build` aprobados.
- **Fallos:** `npm run typecheck` falla por errores ajenos al cambio en `fabrica-landings` (módulos ausentes y conflictos JSX) y en tipos de tests. Build advierte sobre dos sprites editoriales resueltos en runtime y una deprecación en `@vue/shared`.
- **Pendientes:** No se ejecutó suite unitaria ni inspección visual manual responsive.
- **Siguiente acción exacta:** Si se requiere cerrar la matriz UI, inspeccionar la sección a 1440 px, 900 px y 390 px de ancho.
- **Commit base:** `f0d0cda`.
- **Commit final:** sin commit.
