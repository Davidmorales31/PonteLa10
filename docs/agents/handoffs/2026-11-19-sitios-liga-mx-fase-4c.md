# Handoff: sitios Colombia/México, fase 4C (clubes de Liga MX), 2026-11-19

Rama `feat/sitio-liga-mx-clubes`. Plan: `docs/PLAN_LIGA_MX.md`.

- `/clubes` y `/clubes/[slug]` (solo México): los 18 clubes salen de la tabla y los partidos del proveedor
  (`clubesDeLigaMx`), sin lista fija: un ascenso o cambio de nombre aparece solo. Ficha: posición, puntos,
  PJ, G-E-P, goles, estadio (el más usado de local), próximos partidos, últimos resultados y noticias
  (`/api/articulos/entidad/team/{slug}`, filtradas por sitio). Slug desconocido: 404.
- La tabla de posiciones enlaza a la ficha. Menú "Más": Clubes.
- Fix GOAL API: el adaptador no leía el estadio (`matchStadium`); ahora lo lee (afecta también al calendario de Colombia: gana estadio).
  Hay que volver a sincronizar México para que los partidos guarden estadio.
- `claveEquipo` pasa a `utils/claveEquipo.ts` (compartida por servidor y páginas).
- Sin escudos ni datos estáticos de clubes (ciudad, fundación, redes): se investigan en la fase 6 junto a las
  fuentes de las corridas (`config/fuentesFutbolMexicano.json`).

Verificado: lint, 922 pruebas, typecheck, build; revisión visual con datos de ejemplo temporales (eliminados).
