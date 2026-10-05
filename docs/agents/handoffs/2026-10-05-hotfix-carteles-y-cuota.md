# Handoff

- **Objetivo de la sesión:** corregir el HTTP 500 de imágenes sociales que se
  detectó después de integrar el hero/escudos; unirlo al diagnóstico del consumo
  diario de Goal API y describir exactamente qué falta para reactivar el worker.
- **Completado:** el hotfix sustituye la carga incompatible `import.meta.glob`
  por lectura de assets Nitro bajo allowlist; incluye tests de almacenamiento y
  de renderizado. Un build local de producción devolvió PNG 200 en OG, horizontal
  y vertical para un fixture real. Lectura agregada de la auditoría de Supabase
  confirmó Goal API 950/950 el 2026-10-04 y 636 de 804 leases con ventanas de un
  minuto; el checkout local anterior reservaba Goal API a 60 s. El código de
  `main` actual ya fija 300 s. No se llamó a Goal API/API-Football ni se
  modificaron datos de Production.
- **Archivos modificados:** `server/api/partidos-seo/[slug]/imagen.get.ts`,
  `server/utils/cartelPartidoSeo.ts`, `server/utils/escudosPartidoSeo.ts`, sus
  pruebas, `docs/agents/ESTADO_ACTUAL.md` y este handoff.
- **Decisiones:** leer solo escudos WebP incluidos y allowlisted; si falta un
  asset, mostrar iniciales. Mantener en loop la capa visual genérica y mostrar
  la identidad real del fixture en HTML/PNG. No usar el GIF de referencia como
  imagen específica sin datos fiables de equipo y hora. Separar el estado de
  deploy web del estado del worker local: Production no actualiza datos diarios
  si el PC/worker local no está levantado.
- **Validaciones ejecutadas:** `npm.cmd run lint` (pasa),
  `npm.cmd run test:unit` (59 archivos/291 pruebas, pasa),
  `npm.cmd run typecheck` (pasa), `npm.cmd run build` (pasa; aviso existente
  `DEP0155` de `@vue/shared`), smoke del build Production con OG/wide/story (3×
  HTTP 200, `image/png`), `git diff --check` pendiente tras esta documentación.
- **Fallos:** primer lanzamiento de lint/test/typecheck en paralelo chocó al
  borrar `.nuxt`; al repetir en serie suite, lint y typecheck pasaron. No fue un
  fallo de producto.
- **Pendientes:** ejecutar `git diff --check`, commit y push solo del diff aislado;
  abrir PR #56, esperar CI/preview, integrar y comprobar en
  `www.pont3la10.com` que OG/wide/story responden 200 PNG. Después, actualizar o
  reiniciar el servidor Nuxt local del PC desde el código actualizado y
  confirmar de forma segura que el secreto del worker está configurado antes de
  activar su sincronizador. No afirmar que la cuota diaria está recuperada hasta
  observar un día completo de consumo bajo las ventanas de cinco minutos. La
  sincronización DIMAYOR y el video social por fixture siguen pendientes.
- **Siguiente acción exacta:** terminar `git diff --check`; revisar y commitear
  solo los siete archivos indicados; enviar PR #56 a `main`; tras merge, hacer
  smoke en Production.
- **Commit base:** `cbc0200590a082ca6a26c578f857a9219b49aa52` (PR #55 integrado).
- **Commit final:** pendiente.
