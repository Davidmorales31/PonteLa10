# Handoff

- **Objetivo de la sesión:** completar y publicar los ajustes aprobados de Liga
  Colombiana, páginas SEO de partidos, carteles y automatización de la tabla.
- **Completado antes de esta continuación:** Production sirve desde
  `dpl_Cj7PybfvXeKeWU68QsugcnHwbnmK` (`READY`), commit `049849b`. Liga A/B
  muestra fixture ordenado, agenda, resultados con escudos y páginas SEO por
  partido. El reproductor tiene un único video promocional en loop con cartel y
  escudos reales; la promoción se abre en los clics 1, 5, 9, etc. Hay 80
  carteles WebP de octubre y la respuesta de resultados refresca partidos.
- **Preparado localmente en esta continuación, aún NO en Production:** lectura
  directa de DIMAYOR para Liga A/B, proyección completa de 20+16 equipos,
  validación de temporada/fases y derechos, escritura atómica con fencing token
  y programación cada 15 minutos en el worker. No consume cuota de API-Football
  ni Goal API; el flujo genérico de snapshots de proveedores se conserva.
- **Archivos modificados:** endpoint y parser DIMAYOR, ruta de clasificaciones,
  worker local, aliases de identidad DIMAYOR, migración y pgTAP, pruebas unitarias,
  HU-FUT-08/09/10, estado factual y este handoff.
- **Decisiones:** DIMAYOR es la fuente pública de posiciones; no se usa fixtures
  inconsistentes para calcular tabla. Se exige conjunto completo y autorización
  dentro de SQL. Una lease de dos minutos con token y cooldown exitoso de 15
  minutos evita ejecuciones superpuestas o vencidas. No se inventan IDs ni se
  agregan llamadas de proveedor.
- **Validaciones ejecutadas:** 4 archivos focalizados/17 pruebas, lint, typecheck,
  suite completa (67 archivos/326 pruebas; la segunda corrida pasó), build y
  `git diff --check`. El build conserva aviso upstream `DEP0155` de `@vue/shared`.
  Un revisor aprobó estáticamente SQL y fencing; pgTAP no se ejecutó.
- **Bloqueo de despliegue:** Supabase MCP devolvió `Unauthorized` tanto para
  `apply_migration` como para consultas de solo lectura. La sesión web del SQL
  Editor abre el proyecto correcto, pero no se ejecutó SQL sin un canal de
  automatización documentado. Vercel lista el proyecto, pero sus endpoints de
  deployments dan 403/404. No se aplicó migración ni se publicó código nuevo. Se
  pidió al usuario que reconecte Supabase cuando despierte; no hacen falta
  nuevas claves.
- **Pendientes exactos:** al reconectar, aplicar
  `20261006064139_hu_fut_tabla_dimayor_atomica.sql`; correr pgTAP en transacción
  y revisar ACL/RLS; llevar el build a Production y confirmar `READY`; arrancar
  servidor y worker del PC; verificar actualización DIMAYOR de 36 filas y
  `checked_at` sin cambio en contadores de APIs. El worker no se reinició porque
  aún no existe el RPC remoto que invoca la ruta nueva.
- **Siguiente acción exacta:** reintentar la migración y el release al
  reautorizar el conector; no afirmar que quedó listo hasta verificar el
  deployment de Production y la primera escritura de posiciones.
- **Commit base:** `6748e489` (`main` al preparar el release).
- **Último commit Production confirmado:** `049849ba5dbd380f2139b1daf17d07d83e9c8f7b`.
