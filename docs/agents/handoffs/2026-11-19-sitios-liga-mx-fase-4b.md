# Handoff: sitios Colombia/México, fase 4B (páginas de Liga MX), 2026-11-19

Plan: `docs/PLAN_LIGA_MX.md`. Rama `feat/sitio-liga-mx-paginas`.

## Qué cambia
- `pages/index.vue` es ahora un selector: `mx` muestra `PublicoPortadaMexico`; Colombia muestra
  `PublicoPortadaColombia`, que es el `index.vue` anterior movido SIN cambios (git lo ve como renombre).
  Las pruebas que leían `pages/index.vue` apuntan al componente.
- Portada de México: noticias recientes, bloque Liga MX (tabla top 8, próximos partidos, últimos
  resultados), secciones por tema (liga-mx, seleccion-mexicana, mexicanos-en-el-exterior) y categorías.
- `/liga-mx`: tabla (Liga MX y Femenil, selector de torneo), próximos y últimos resultados y calendario
  por jornada. `/futbol-mexicano`: hub editorial. Ambas con estado "estamos verificando los datos"
  mientras `/api/liga-mx` no devuelva datos.
- `middleware/sitio-rutas.global.ts` + `utils/rutasPorSitio.ts`: 404 en `mx` para las páginas solo de
  Colombia (liga, selección, colombianos en Europa, equipos, jugadores, competiciones, jornadas,
  partidos, cómo quedó, dónde ver) y 404 en Colombia para `/liga-mx` y `/futbol-mexicano`.
- Tarjetas de noticias y hub usan el idioma/zona del sitio (es-MX / Ciudad de México en México).
- Migración `20261119180000_taxonomia_mexico.sql` (YA aplicada): categoría `futbol-mexicano` y temas
  `liga-mx`, `seleccion-mexicana`, `mexicanos-en-el-exterior` (site `mx`).

## Verificación
lint, 920 pruebas, typecheck y build pasan. Revisión visual con `mx.localhost` (escritorio y 375 px) y
datos de ejemplo servidos por un middleware temporal que se eliminó antes de commitear (las filas reales
siguen no públicas). Colombia: portada idéntica (verificada por HTML). 

## Pendiente
- Los datos reales no se ven hasta confirmar los derechos de publicación (`is_public`).
- `/partidos-hoy`, `/resultados/*`, `/articulos` y los artículos siguen con textos/fechas es-CO; se ajustan
  antes del lanzamiento. Páginas de equipos, jugadores y competiciones de México: fase 4C/5.
- Las categorías son compartidas: "Fútbol mexicano" también aparece en el panel de Colombia.
- Sitemaps de México siguen vacíos (sitio no lanzado).
- `ESTADO_ACTUAL.md` no se tocó (cambios sin commitear de otro agente).
