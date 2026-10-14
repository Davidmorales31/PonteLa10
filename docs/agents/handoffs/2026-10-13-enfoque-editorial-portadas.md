# Handoff

- **Objetivo:** priorizar Liga BetPlay y Colombianos en Europa; fotografía con
  crédito/fuente antes de IA y ninguna entrega Codex sin portada persistida.
- **Completado:** heartbeat existente ACTIVE en este chat, mismos tres horarios;
  cinco skills coordinadas y controles en CLI, API y PostgreSQL. Fotografías
  acreditadas usan campos actuales del CMS, sin inventar licencias. IA fallback
  divulgada; si tampoco funciona, solo checkpoint local y ninguna entrega CMS.
- **Entrega:** PR [#135](https://github.com/Davidmorales31/PonteLa10/pull/135)
  integrado. Implementación 3b5cd7b78b8fea69c4609e353cd02bb4bbcb0d12;
  main 4b7d5781b8802a43b5b4a2b20f9372162001b4f8. Vercel
  dpl_MqXX1Emwh1Y1ukiGNNwYNQppX6oa READY, production, alias
  https://www.pont3la10.com/.
- **Migración aplicada:** 20261014002150_exigir_portada_codex_y_fotos_acreditadas.sql.
  Helper de validación, guard obligatorio del RPC de propuestas y reparación
  acotada para borradores propios sin intervención humana.
- **Validaciones:** matriz oficial: lint, 113 archivos/585 pruebas, typecheck,
  build, diff; CI/Lighthouse y Preview pasan. Revisor sin P0–P2. ACL de nuevas
  funciones: anon/authenticated sin EXECUTE, service_role autorizado; funciones
  invoker y search_path vacío. Advisors conservan los mismos cuatro avisos.
- **Prueba real:** fotografía subida por API de Producción, optimizada a WebP
  2400×1299/235714 bytes. Replay de media confirma yaExistia=true y mismo ID.
  CMS con sesión/MFA confirma portada guardada, autor, fuente y pie en preview.
  SQL confirma imagen válida, una auditoría de asignación y cero artículos Codex
  draft/review/approved/scheduled sin portada.
- **Pruebas negativas:** API propuesta sin portada 422; media sin crédito 422;
  cover sin firma 401; cover tras aprobación humana 422. RPC de propuestas
  rechaza portada nula con 22023; helper rechaza medio inexistente.
- **Cambio de estado externo:** el artículo era review/version1 cuando se
  preparó el diff; después fue aprobado y programado por el usuario a version3.
  La reparación privada protegió esa edición. Se usó únicamente el cambio
  rápido de portada del CMS con MFA: scheduled/version4, título y cuerpo con
  hashes idénticos y horario 2026-10-13 19:45 COT conservado; sin versión pública.
  No se aprobaron, programaron ni publicaron historias desde esta sesión.
- **Omisiones justificadas:** no se probó éxito/replay del RPC de reparación
  sobre ese artículo porque dejó de ser un borrador sin intervención humana.
  Se verificó su rechazo real y la vía autorizada del CMS; no se crearon datos
  ficticios para probarlo. No se generó IA porque se consiguió foto pertinente;
  contrato/fallback cubiertos por las pruebas existentes.
- **Pendientes:** ninguno para este objetivo. Próxima corrida: consultar
  contexto vigente, investigar los dos focos primero, conservar dedupe/SEO y
  portada obligatoria. No reabrir el run parcial anterior ni pagar otra redacción.
- **Documentación:** este cierre se integra en una rama de documentación desde
  main. Cambios ajenos del checkout principal permanecen preservados.

## Portada y continuidad

Artículo: 13891b80-9eb1-488b-aacf-3d83334c26af.
Medio: 53b50cb9-584d-4e88-a9d5-afe7077540fd.
Foto de archivo2011 del estadio General Santander, Cúcuta, autor Hekas2.
Crédito guardado: Hekas2 · CC0 1.0 · Wikimedia Commons.
Fuente: https://commons.wikimedia.org/wiki/File:General_Santander_DSC01853.jpg
El pie declara archivo2011 y que no representa un partido de2026; se conserva
el original sin borrar elementos. No es una imagen generada.

Run f3b770e4-2005-45df-a2bb-cf9584cac9fb cerrado partial. El único reintento
pagado autorizado ya se consumió. Mantener intactos propuesta y entrega
originales; no alterar la clave/hash para añadir imagen. Se guardó checkpoint
media y recibo separado de asignación por CMS en el candidato original.

Evidencia privada local: .codex/artifacts/editorial-portadas-20261013/:
media-response.json, media-replay-response.json, rechazos-api.json,
estado-antes-cms.json, estado-despues-cms.json, portada-creditos-cms.jpg,
verificacion-automatizacion.json. Sin credenciales ni contenido de .env.
El código reproducible está en .codex/worktrees/editorial-single-chat-20261013/.

Reversibilidad: la definición anterior de submit está preservada como evidencia
privada. Cualquier reversión SQL exige una migración revisada que cambie solo
el guard de portada; no hubo nuevas tablas ni cambios RLS o privilegios elevados.
