# Handoff: sitios Colombia/México, fase 7 (redes por sitio), 2026-11-19

Rama `feat/sitio-mx-redes`. Plan: `docs/PLAN_LIGA_MX.md`.

Decisión asumida (el responsable dijo «todo el contenido a la misma cuenta»): México publica en las MISMAS páginas
de Facebook, Instagram y X; solo cambia el enlace y el dominio de la pieza.

- `server/utils/origenSocialPorSitio.ts`: el origen que se promociona sale del sitio del artículo (`articles.site`):
  Colombia conserva la dirección social configurada; México usa `https://mx.pont3la10.com`.
- Se aplica en el compositor de una noticia (`contextoPublicacionSocial`), en la programación en lote (`cola.post.ts`) y en
  el worker que publica (`procesarColaSocial`). El pie de la imagen y el enlace de cada pieza llevan el dominio de México.
- Si no se puede leer el sitio, se usa Colombia (nunca frena un envío).

## Límites / pendiente
- `scripts/redes-publicar-articulo.mjs` (agentes) sigue leyendo el feed de `www`; las corridas de México NO publican en
  redes todavía (el skill lo prohíbe) hasta que el feed de México exista (lanzamiento) y se pruebe de punta a punta.
- La vista previa del compositor (`VistaPreviaTarjetaSocial.vue`) sigue mostrando `pont3la10.com`.
- Las llaves de agentes no tienen alcance por sitio.
- No se probó una publicación real: necesita un artículo de México publicado y aprobación humana.

Verificado: lint, 931 pruebas, typecheck, build. `ESTADO_ACTUAL.md` no se tocó.
