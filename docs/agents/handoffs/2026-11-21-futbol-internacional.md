# Handoff

- **Objetivo de la sesión:** replicar para el fútbol internacional el flujo de Colombia (noticias en el sitio → guion
  del video diario → Reels/Shorts → miniaturas), con una fase de tendencias al inicio y de 10 a 20 noticias.
- **Completado:**
  - Fase de tendencias `scripts/tendencias-futbol-internacional.mjs` (Google Trends CO/MX/ES/AR/US, radar de Google
    Noticias por competición, club y figura, y notas con URL real del RSS de Bing Noticias para los primeros temas).
    Filtra Liga MX, Liga BetPlay y otros deportes; el puntaje solo sirve para elegir.
  - `config/fuentesFutbolInternacional.json` (competiciones, clubes de mayor interés con sitio oficial, figuras,
    medios, RSS, países de Trends y exclusiones).
  - Skill `.agents/skills/pont3la10-futbol-internacional-run` (nicho, tope compartido, tendencias, selección,
    mecánica exacta de la API con agenda v2, fotos, video y reporte). Ajustes en los skills de Colombia (límite
    de `futbol-mundial`), del video diario y de Reels (sección «Edición internacional»).
  - `scripts/video-edicion.mjs` y su uso en generador, buscador de fotos, descripciones de YouTube y Reels y encargo
    de miniaturas: `"edicion": "internacional"` → `videos/diario/<fecha>-internacional` y Reels
    `<fecha>-internacional-reel-N` (el estudio ya los agrupa como familia).
  - Ejecución real del 2026-11-21: 20 artículos internacionales aprobados por IA y programados en dos corridas
    (`0f2a25fa-061d-4722-8a57-983c11895184`: 12; `fe0b394c-ccbd-45b9-bc70-f94bddb556cf`: 8), publicación de 20:41 a
    21:19 de Bogotá. Guion, proyecto y Reels del video internacional: ver el reporte de la sesión.
- **Archivos modificados:** `scripts/video-generar-proyecto.mjs`, `scripts/video-buscar-fotos.mjs`,
  `scripts/video-descripcion.mjs`, `scripts/video-reels.mjs`, `scripts/video-generar-reel.mjs`,
  `scripts/video-encargo-miniaturas.mjs`, skills de Colombia, video diario y Reels, `docs/agents/ESTADO_ACTUAL.md`.
  Nuevos: `scripts/video-edicion.mjs`, `scripts/tendencias-futbol-internacional.mjs`,
  `config/fuentesFutbolInternacional.json`, skill internacional, `tests/unit/videoEdicion.test.ts`,
  `tests/unit/tendenciasFutbolInternacional.test.ts`, este handoff.
- **Decisiones:** misma categoría `futbol-mundial` y mismo sitio `co` (no se creó categoría ni sitio nuevos); la
  edición es un campo del guion, no un fork del generador; sin el campo todo sigue igual para Colombia.
- **Validaciones ejecutadas:** `npm run lint` (tras corregir un `no-useless-assignment`), `npm run test:unit`
  (170 archivos, 1016 pruebas), `npm run typecheck` (tras corregir dos conversiones de tipo en la prueba nueva),
  pruebas relacionadas y `git diff --check`. Build no aplica: solo scripts y documentación, sin páginas ni rutas Nuxt.
- **Fallos:** agenda v1 rechazada con 422 (se pasó a v2); WebSearch no indexaba lo del día (se usó Bing News RSS).
- **Automatización (pedida por el responsable):** tareas programadas `pont3la10-corrida-futbol-internacional`
  (10:00 y 16:00 Bogotá, una identidad por activación dentro del tope de seis) y `pont3la10-video-internacional`
  (19:00: guion, proyecto `<fecha>-internacional`, fotos revisadas y 3–5 Reels). La de Colombia sigue a las 18:00.
  Video internacional del 2026-11-21 ya armado (guion 100/100, 513 s, 26 tramos; 4 Reels 100/100).
- **Redes (2026-11-22):** el responsable decidió publicar las piezas internacionales en Facebook e Instagram.
  `redes-publicar-articulo.mjs` ganó `--categoria futbol-mundial` y `--excluir`; el skill y la tarea de la corrida
  incluyen el paso (borradores → revisión de la hoja → `--auto` con exclusiones). Las 20 piezas del 2026-11-21 quedaron
  programadas el 2026-11-22 entre 09:22 y 14:07 Bogotá.
- **Formatos (2026-11-22):** a pedido del responsable, todos los formatos usan la foto desenfocada de fondo (sin azul ni
  amarillo de marca) y llevan «WWW.PONT3LA10.COM» al pie (`fondoBorroso`, `fotoSobreBorroso`, `conSitio`). El
  publicador acepta `--categoria futbol-mexicano` (sitio mx, sin enlace mientras el dominio no esté en línea). Las
  corridas de Claude (Colombia, internacional y México) y la de Codex (paso 8 de su automatización; respaldo
  `automation.toml.bak-2026-11-22`) usan el paso nuevo: `--pendientes` → hoja revisada → `--auto` con `--excluir`.
  Hallazgo: la corrida de Claude de Colombia corre con Haiku y sus dos últimas activaciones cerraron sin artículos.
- **Formatos v3 (2026-11-22, tarde):** se quitó el fondo borroso: la foto se ve completa y nítida sobre fondo neutro casi negro
  (`fotoSobreNegro`), con mejora de nitidez `mejorarFoto` (Lanczos3 al tamaño exacto + enfoque suave) y JPG 95 sin submuestreo de color.
  El selector ya no tiene tope por formato ni por día (`MAXIMO_POR_DIA` eliminado); `impacto-desenfocado` salió del selector. Las 20 piezas
  ya programadas ese día NO se regeneraron: la llave solo permite 50 programaciones por 24 h (audit log) y ya llevaba cerca de ese tope.
- **Cuota de redes (2026-11-22, preparada sin aplicar):** migración `20261122120000_cuota_programaciones_agentes_redes_200.sql`
  (constraint 0–200 y la llave «Sin limites» de 50 a 200), `maxProgramacionesDia` hasta 200 en `index.post.ts` y `agentes.vue`, y su prueba
  en `tests/sql/agentesRedes.integration.mjs` (51 comprobaciones en PGlite, lint, typecheck y 22 pruebas unitarias en verde). Falta, con
  autorización: commit/PR/despliegue y aplicar la migración en Supabase de producción (antes del código, que no la necesita para funcionar).
- **Pendientes:** primera ejecución real de las tareas nuevas; decidir el modelo de la corrida de Claude de Colombia.
- **Siguiente acción exacta:** revisar el reporte de la corrida de las 10:00 del 2026-11-22; commit y PR de estos
  cambios cuando el responsable lo autorice (hay cambios ajenos sin commitear en el árbol).
- **Commit base:** 6d8263d
- **Commit final:** sin commit
