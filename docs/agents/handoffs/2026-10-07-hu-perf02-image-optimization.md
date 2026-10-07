# Handoff

- **Objetivo:** Completar HU-PERF-02 con variantes responsivas para medios CMS
  existentes/nuevos, sin sobrescribir originales ni habilitar transforms/plan
  de pago; preparar publicación sobre la base actual de Production.
- **Completado:** 164 variantes WebP locales para recursos estáticos/escudos y
  `srcset` público; nueva escritura CMS con variantes 320/640/960; `srcset`
  seguro para páginas públicas; ancho/alto intrínsecos; control de carreras de
  inserción, fallo parcial y rollback. El backfill se aplicó a 121 medios y
  creó 456 sidecars (24.994.820 bytes), con `upsert:false` y sin borrar ni
  reemplazar originales. No hubo migración SQL ni cambio de plan.
- **Archivos:** scripts, helpers de imagen y Storage, componente público
  reusable, páginas/componentes públicos, pruebas y variantes locales; las
  rutas precisas se ven en `git status` del worktree.
- **Validaciones:** `npm run test:unit -- --testTimeout=10000` (93 archivos,
  475 pruebas), `npm run lint`, `npm run typecheck`, `npm run build`,
  `node --check scripts/generar-variantes-medios-editoriales.mjs`,
  `git diff --check`. Smoke del build servido: `/`, `/partidos-hoy`,
  `/articulos`, `/liga-colombiana` HTTP 200. Agregados de Storage después del
  backfill: 577 objetos/45.766.870 bytes; las 121 filas originales y 456
  sidecars concilian. El build conserva el warning upstream `[DEP0155]`.
- **Incidencias resueltas:** una prueba de checkpoint excedió 5s bajo carga en
  la primera corrida; pasó al aislarla y la suite completa pasó con timeout de
  10s. Se corrigió una carrera que podía borrar el original que una solicitud
  concurrente estaba registrando y se añadieron pruebas para comprobar limpieza
  segura de rutas UUID y conservación de rutas compartidas.
- **Estado de publicación:** Vercel Dashboard muestra proyecto `ponte-la10`,
  rama de producción `main` y deployment actual basado en `48482071`. El
  dashboard indica desplegar empujando a `main`. El CLI no está instalado; el
  Vercel MCP devuelve 404/403 al consultar proyecto/deployments. No se afirmó
  que este código ya esté en producción. El remoto Git consultado todavía tenía
  `main` en `48482071`.
- **Pendiente exacto:** confirmar el diff, guardar los cambios en Git y
  publicarlos por la rama `main`, ya que ese es el flujo configurado; luego
  esperar deployment READY y repetir smoke del dominio de producción.
- **Commit base:** `48482071e3fb5aef5824a8030d16da4c85a86c52` (Production/PR #99).
- **Commit final:** pendiente del corte de producción.
