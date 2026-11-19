# Handoff: sitios Colombia/México, fase 4A (datos de fútbol de Liga MX), 2026-11-19

Plan: `docs/PLAN_LIGA_MX.md`. Rama `feat/sitio-liga-mx-datos`. Esta entrega es solo la capa
de datos y la API; las páginas de México son la fase 4B.

## Base de datos (YA aplicada en Supabase pont3la10)
`20261119160000_liga_mx_datos.sql`: tablas genéricas `league_fixtures` y `league_standings`
(con `site`), RLS activa, lectura pública solo de filas `is_public` con derechos
confirmados, escritura solo `service_role`. Colombia conserva `colombian_league_*`.
Probada en PGlite (`tests/sql/ligasMexico.integration.mjs`) y verificada en producción.

## Proveedor
GOAL API (única clave configurada en el PC). Identificadores verificados en su catálogo
(país Mexico): Liga MX `cmr77dvsv008srx06mier6t7r`, Liga MX Femenil `cmr77dvsv008wrx06ukpkmk8u`
(`data/ligaMx.ts`). Copa MX en el proveedor es de la temporada 2019/2020 (obsoleta), no se usa.
Cuota GOAL API: 1000/día; una sincronización gasta ~8 solicitudes.

## Código
- `sincronizadorLigasMexico.ts`: pagina el calendario (más reciente primero, se detiene al
  llegar a temporadas anteriores, tope de 5 páginas), guarda la tabla; cada liga es
  todo-o-nada. Temporada empieza en julio (Apertura jul-dic, Clausura ene-jun).
- `POST /api/internal/futbol/liga-mx` (firma HMAC como el resto, sin parámetros, mismo
  presupuesto diario de cuota que Colombia) y ruta del worker `liga_mx` cada 3 h, **opt-in**
  con `PONT3LA10_FUTBOL_MX_ENABLED=true` (en `.env.example`).
- `GET /api/liga-mx`: calendario (-45/+90 días) y tabla públicos para el sitio `mx`.

## Verificación real
Se ejecutó una sincronización completa por el endpoint firmado: 129 partidos de Liga MX
(jornadas 1-17 del Apertura 2026), 133 de Femenil, tablas de 18 equipos. 912 pruebas, lint,
typecheck y build pasan.

## Pendiente / ojo
- Las filas quedaron NO públicas: `is_public` sale de `NUXT_FUTBOL_DERECHOS_PUBLICACION_CONFIRMADOS`
  del entorno del PC (falso en el local). Mientras no se confirme esa decisión y se vuelva a
  sincronizar, `/api/liga-mx` devuelve `sin_datos` (verificado). No se cambió ese permiso.
- El proveedor no trae la jornada 6 ni parte de 5, 7 y 8 del Apertura 2026 (probablemente
  aplazadas); no es un fallo de la sincronización.
- La tabla de Femenil trae una fase llamada "Current" además de "Apertura"; la página decide cuál mostrar.
- Sin sincronizar aún: Liguilla, Copa MX, Campeón de Campeones, Leagues Cup (no hay IDs vigentes en el proveedor).
- Para activar en el PC: `PONT3LA10_FUTBOL_MX_ENABLED=true` y reiniciar el worker.
- `ESTADO_ACTUAL.md` no se tocó (cambios sin commitear de otro agente).
