# Handoff

- **Objetivo de la sesión:** priorizar Liga BetPlay y Colombianos en Europa;
  buscar fotografía con fuente/crédito antes de IA y bloquear toda entrega
  Codex sin portada persistida.
- **Completado:** heartbeat actualizado en el mismo chat y con los mismos
  tres horarios. Skills coordinadora, investigación, escritura y portadas
  alineadas. Se admite fotografía documentada mediante campos existentes de
  crédito/fuente del CMS, sin inventar licencias. Cliente y esquema API exigen
  portada y exactamente un tipo: credited_photo_cover, licensed_photo_cover
  o ai_generated_cover. Migración aplicada en Producción: helper privado y
  validación del RPC de propuestas, más reparación acotada de portadas faltantes.
- **Archivos modificados:** cinco skills editoriales versionadas; CLI, contrato
  y helper de fotografías; esquemas/API media/cover; migración
  20261014002150_exigir_portada_codex_y_fotos_acreditadas.sql; tres pruebas,
  estado y este handoff. Se incluye cierre factual local de la reparación previa.
- **Decisiones:** Liga BetPlay primero y Colombianos en Europa segundo; usar
  categorías/temas reales del catálogo. Foto pertinente con crédito verificado
  y URL de procedencia primero; ilustración IA divulgada si esa vía falla. Si
  ambas fallan, texto solo en checkpoint local y ninguna entrega de artículo.
  La regla actual sustituye la portada opcional del flujo anterior.
- **Validaciones ejecutadas:** lint; suite 113 archivos/585 pruebas; typecheck;
  build; diff; 24 pruebas de portadas/esquemas y prueba focal del helper final.
  Revisor sin P0–P2. Base objetivo rechaza portada nula/medio inexistente;
  ACL niega anon/authenticated y permite solo service_role. Advisors conservan
  cuatro avisos anteriores, sin nuevos atribuibles a este cambio.
- **Fallos:** ninguno bloqueante. La fecha de versión remota de la migración
  difiere de la creación inicial CLI; el archivo se renombró a la versión real
  20261014002150 para mantener paridad. No se reabrió ni redrafteó el run parcial.
- **Pendientes:** PR/CI/despliegue de la API; subir y asignar la foto al borrador
  Codex propio sin portada; confirmar crédito, fuente, permisos, rechazos y replay.
- **Siguiente acción exacta:** desplegar el diff validado, subir la foto preparada
  por media y usar portada/cover con versión1 del artículo propio; conservar
  la propuesta original y guardar recibo de reparación separado.
- **Commit base:** 3f449d96285cc5b3c87a138afb03a6a74797a3ae.
- **Commit final:** pendiente.

## Seguridad y evidencia

Funciones security invoker con search_path vacío y EXECUTE solo a service_role.
La API conserva firma HMAC y validación estricta. La reparación exige artículo
Codex en review sin edición humana, aprobación ni versión pública; toma locks,
comprueba versión, no reemplaza una portada existente y deja auditoría. No
modifica ingestas TikTok, publicación manual, RLS, MFA ni secretos.

Un único borrador Codex en review carecía de portada: artículo
13891b80-9eb1-488b-aacf-3d83334c26af, lock_version1 y last_saved_by null.
Foto elegida: fachada General Santander, archivo2011, autor Hekas2, CC0 1.0,
4000×2165, 553115 bytes. Crédito: Hekas2 · CC0 1.0 · Wikimedia Commons.
Ficha: https://commons.wikimedia.org/wiki/File:General_Santander_DSC01853.jpg
Se inspeccionó el original y se conserva su encuadre/texto; no se presenta como
partido de2026. Artefactos en .codex/artifacts/editorial-portadas-20261013/ y
checkpoint portada del candidato original. No repetir propuesta/redacción ni
cambiar su clave idempotente: la asignación y su replay van solo por cover.

Reversibilidad: la definición original de submit está guardada como evidencia
privada; revertir requiere una migración revisada que restituya solo su bloque
de portada. Las nuevas funciones no elevan privilegios ni alteran tablas/RLS.
