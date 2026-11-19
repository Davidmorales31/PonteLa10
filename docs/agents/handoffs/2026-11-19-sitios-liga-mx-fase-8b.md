# Handoff: sitios Colombia/México, fase 8B (idioma por sitio y Partidos de hoy de México), 2026-11-19

- Páginas comunes (artículos, autores, resultados, legales) usan idioma y zona horaria del sitio (#189).
- `pages/partidos-hoy.vue` pasa a ser un selector: México muestra `PublicoPartidosHoyMexico` (agenda de Liga MX y Femenil
  del día en hora de Ciudad de México, desde `/api/liga-mx`, con refresco cada minuto y «próximos» si hoy no hay partidos);
  Colombia conserva la página general movida SIN cambios a `PublicoPartidosHoyGeneral` (renombre). Las pruebas que leían
  `pages/partidos-hoy.vue` apuntan al componente.
- Motivo: la agenda general prioriza Colombia, Europa y las cinco grandes; Liga MX no entra en los fixtures diarios, así
  que sin esto el «Partidos de hoy» de México no tendría sus partidos.
- Menú de México: «Mexicanos en el exterior» pasa a «Más» y la insignia se acorta a «MX» entre 1021 y 1180 px para no tapar
  el primer enlace (verificado a 1024 y 1440 px).
- `docs/PLAN_LIGA_MX.md` lleva una tabla de avance por fase.

Verificado: lint, 935 pruebas, typecheck, build; revisión visual con datos de ejemplo temporales (eliminados).
Pendiente: los datos reales de México siguen ocultos hasta confirmar derechos de publicación; lanzamiento (ver handoff 8A).
