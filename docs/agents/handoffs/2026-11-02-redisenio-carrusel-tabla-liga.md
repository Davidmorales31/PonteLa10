# Handoff

- **Objetivo de la sesión:** Reestructurar la sección principal de Liga Colombiana según la referencia adjunta, construida con contenido real.
- **Completado:** La fila de competiciones va seguida de un módulo a dos columnas: carrusel manual de cinco noticias y vista previa de los primeros cinco puestos de la fase vigente.
- **Archivos modificados:** `components/publico/CarruselNoticiasLiga.vue`, `pages/liga-colombiana.vue`, `docs/agents/ESTADO_ACTUAL.md`.
- **Decisiones:** La referencia se interpreta como estructura, no como imagen de fondo. No se inventan noticias ni posiciones; la clasificación viene de la API existente. El carrusel no avanza automáticamente.
- **Validaciones ejecutadas:** ESLint focalizado aprobado; `git diff --check` aprobado; `npm run typecheck` aprobado; `npm run build` aprobado.
- **Fallos:** Sin fallos de validación. El build conserva warnings sobre dos sprites editoriales con resolución runtime y una deprecación de resolución de módulos en `@vue/shared`.
- **Pendientes:** No se ejecutó la suite unitaria ni se hizo comprobación visual manual en varios tamaños de pantalla.
- **Siguiente acción exacta:** Revisar el resultado responsive en navegador y ajustar el punto de quiebre si la tabla pierde legibilidad.
- **Commit base:** `f0d0cda`.
- **Commit final:** sin commit.

## Seguimiento 2026-11-02

- La captura reveló que el carrusel no se montaba: Nuxt autoimporta `components/publico/CarruselNoticiasLiga.vue` como `PublicoCarruselNoticiasLiga`. Se corrigió la etiqueta de la página y el build confirma que el código del componente está incluido en el bundle SSR.
- La altura de la tarjeta ya no depende de la imagen activa; usa altura responsive acotada, titular con máximo de cinco líneas y resumen de dos. La etiqueta, CTA, icono y puntos siguen la composición del mockup.
- Validación de seguimiento: ESLint focalizado y `git diff --check` aprobados; build aprobado. El typecheck global falla en rutas de `fabrica-landings` y tipos de tests preexistentes; inspeccionar su configuración si se requiere cerrar esa validación.
