# Handoff: mínimo 15 propuestas y portada opcional

- **Objetivo de la sesión:** elevar a 15 el objetivo de propuestas diarias y
  permitir borradores editoriales completos sin foto licenciada disponible.
- **Completado:** actualizada la automatización diaria existente (06:00,
  `gpt-6-sol`, reasoning high, destino local) para 15 propuestas por corrida en
  total, sin obligación de llenar cuotas; si las candidatas sólidas se agotan,
  reporta corrida parcial. Sigue prohibido aprobar, programar o publicar.
  La foto es opcional: si no hay una pertinente y verificable, se omiten
  `portada`/`media`, se usa `coverMediaId: null` y no se añade
  `licensed_photo_cover`.
- **Archivos modificados:** esquema de API Codex, checkpoint CLI, progreso y
  aviso del editor, comprobación SEO social, Skills de agenda/investigación/
  redacción/fotos, HU-ED-10/11, pruebas unitarias y una migración para actualizar
  la RPC existente de forma transaccional sin cambiar ACL ni estados.
- **Decisiones:** no confundir “objetivo mínimo 15” con 15 por categoría ni con
  permiso para inventar o duplicar contenido. Las propuestas válidas quedan en
  `review`; solo Juan aprueba y programa. La noticia sin portada se muestra sin
  hueco de imagen y SEO marca la ausencia como recomendación, no como error.
- **Supabase:** el proyecto `ykjithahavncswlfgsqa` se consultó en solo lectura.
  `articles.cover_media_id` permite NULL, la RPC usa invoker y el fragmento de
  transformación fue simulado: se retira el requisito de foto cuando el ID es
  NULL, y se mantienen licencia/atribución obligatorias para ID no nulo.
  La migración aún no se ha aplicado.
- **Validaciones ejecutadas:** suite unitaria: 23 archivos/117 pruebas; lint;
  build de producción; `git diff --check`; consulta SQL read-only de
  verificabilidad del fragmento. `npm.cmd run typecheck` pasó secuencialmente.
  Una ejecución paralela inicial de typecheck falló al competir con la
  generación de tipos Nuxt; al repetirla sola pasó. No se ejecutó un apply a
  Supabase ni una prueba que cree contenido real.
- **Fallos:** ninguno pendiente en los cambios locales.
- **Pendientes:** revisar el diff final; solicitar autorización explícita antes
  de commit/push/PR o aplicar la migración en producción. Una vez desplegado el
  cambio, reanudar el `runId` vigente y completar hasta 15 propuestas, si las
  fuentes actuales sostienen esa cantidad. Ningún artículo debe autoaprobarse,
  programarse o publicarse.
- **Siguiente acción exacta:** revisar esta rama, y después de autorización,
  integrar/desplegar código y migración antes de reanudar la corrida diaria.
- **Commit base:** `6511d88` (main local; contiene el PR #14 mergeado).
- **Commit final:** sin commit.
