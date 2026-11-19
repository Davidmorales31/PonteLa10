# Handoff: sitios Colombia/México, fase 6 (tareas programadas de México), 2026-11-19

Rama `feat/sitio-mx-tareas`. Plan: `docs/PLAN_LIGA_MX.md`.

## Base de datos (YA aplicada en Supabase pont3la10; ensayada antes con rollback)
- `20261119200000_corridas_editoriales_por_sitio.sql`: `editorial_codex_runs.site`; `get_codex_editorial_context(uuid, p_site default 'co')`
  cuenta el tope de seis corridas POR SITIO, crea la corrida en su sitio y filtra temas, artículos recientes y entidades por el
  sitio de la corrida (una corrida existente conserva el suyo); `submit_codex_editorial_proposal` crea artículo, temas nuevos y
  relacionados en el sitio de la corrida. Permisos idénticos (solo service_role).
- `20261119210000_contexto_corrida_devuelve_sitio.sql`: el contexto devuelve `site`.

## Código y configuración
- `POST /api/internal/codex/context` acepta `site` ('co'|'mx') y devuelve la política del sitio de la corrida.
- `config/automatizacionEditorialMx.json` (con interruptor `habilitada: false`), `config/fuentesFutbolMexicano.json`
  (18 clubes del proveedor; SIN cuentas sociales: no se pudieron verificar), `config/bancoEvergreenMx.json`.
- Skill `.agents/skills/pont3la10-futbol-mexicano-run` (hereda la mecánica del de Colombia) y prompt
  `docs/agents/prompts/editorial-futbol-mexicano.md`.

## Tareas programadas distintas de las de Colombia
| Tarea | Hora (Bogotá) | Estado |
| --- | --- | --- |
| Claude `pont3la10-mx-corrida-futbol-mexicano` | 09:30 y 17:30 | creada y PAUSADA (además lee el interruptor) |
| Codex (automatización de México) | 12:30 y 20:30 propuestas | NO creada: la crea quien administre las automatizaciones de Codex con el skill y el prompt de México |
| Sincronización de Liga MX (worker) | cada 3 h | opt-in: `PONT3LA10_FUTBOL_MX_ENABLED=true` en el PC |

Las de Colombia (Claude 11:30 y 19:30, Codex 08:00 y 15:00, video 18:00) no se tocaron.

## Para activar México (en este orden)
1. Decidir los derechos de publicación de los datos de Liga MX y activar el worker de México en el PC.
2. `habilitada: true` en `config/automatizacionEditorialMx.json` y reactivar la tarea de Claude.
3. Fase de redes de México (aún no existe), sitemaps y lanzamiento (`indexable: true`, DNS, Search Console).

## Límites conocidos
- La separación de 15 minutos entre publicaciones programadas es global: los artículos de México y Colombia comparten fila.
- Las comprobaciones de duplicados de la agenda no distinguen sitio.
- La corrida de México no publica en redes (la fase 7 la habilita).

Verificado: lint, 926 pruebas, typecheck, build; SQL ensayada en producción con rollback.
`ESTADO_ACTUAL.md` no se tocó (cambios sin commitear de otro agente).
