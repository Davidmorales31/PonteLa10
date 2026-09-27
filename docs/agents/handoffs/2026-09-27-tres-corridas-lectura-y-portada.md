# Handoff: tres corridas, lectura mínima y portada con imagen

- **Fecha:** 2026-09-27.
- **Rama:** `codex/editorial-three-runs-three-minute-latest-photo`, creada desde
  `origin/main` en `88e25f3`.
- **Automatización Codex:** se actualizó la existente
  `pont3la10-propuestas-editoriales-diarias`; permanece `ACTIVE`, local, mismo
  proyecto/modelo/esfuerzo, ahora corre 3 veces al día a las 06:05, 14:05 y
  20:05 COT. El prompt preserva revisión humana: no aprueba ni publica. También
  carga las credenciales privadas desde el `.env` del repositorio vía la CLI;
  nunca inspecciona ni muestra sus valores.
- **Longitud editorial:** 660 palabras de cuerpo mínimo (3 minutos reales con
  el estimador del sitio de 220 palabras/minuto). El prompt de DeepSeek, el
  esquema de la API, la Skill `pont3la10-daily-editorial-run` y el envío local
  aplican el mismo límite. `scripts/codex-editorial-submit.mjs propuesta ...`
  rechaza la propuesta antes de llamar a Producción si `body` queda corto.
  Mantiene el objetivo editorial previo de 850–1.200 cuando la evidencia lo
  soporte y prohíbe rellenar o contar metadata.
- **Inicio / lectura pública:** `/api/articulos/destacada` consultará un RPC que
  devuelve el artículo publicado más reciente con imagen de tipo `image/*`,
  bucket público y objeto presente en Storage. El RPC de lista añade minutos de
  lectura calculados desde el `body_json` publicado; se retiraron los “4 min”
  quemados en Inicio y Noticias. La destacada refresca en caché cada 30 s.
- **Fallo de la última tarea programada:** el proceso nuevo no heredó variables
  del PowerShell interactivo, aunque ambas claves estaban presentes en el
  `.env` local. El preflight antiguo se detuvo antes de llamar a Producción;
  generó 0 borradores y no consumió DeepSeek. Se corrigieron el CLI, las Skills
  y el prompt de la tarea para cargar `.env` silenciosamente.
- **Supabase:** aplicada la migración remota
  `20260927131539_latest_public_home_feature_and_reading_time`; el servidor
  asignó esa versión al aplicarla. Verificados los dos RPC, el acceso público
  permitido al selector de portada y el acceso denegado al helper de lectura.
  El advisor añadió la advertencia esperada de función `SECURITY DEFINER`
  ejecutable por `anon`/`authenticated`: solo expone metadatos de artículos ya
  publicados; usa `search_path = ''` y privilegios explícitos.
- **Validación:** 130 pruebas unitarias, `typecheck`, `build`, `git diff --check`
  y ESLint aprobados; ESLint ignoró únicamente `.codex/`, artefactos locales
  no versionados que dan seis errores y no entrarán en el PR. La CLI de lint de
  Supabase requiere Docker, que no está disponible.
- **Límites preservados:** no se generaron borradores, no se ejecutó la corrida,
  no se aprobó/publicó contenido y no se tocó TikTok ni su worker. El código aún
  requiere PR y deploy a Vercel. La migración ya está aplicada en Producción;
  el nuevo Inicio queda apagado hasta desplegar el código.
