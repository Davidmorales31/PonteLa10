# Handoff: portadas obligatorias en la tarea editorial Codex

Fecha: 2026-09-29
Repositorio canónico: `C:\PONTE LA 10`
Rama aislada: `codex/require-editorial-covers`, basada en `origin/main` (`b6b865e`)

## Diagnóstico

- La corrida reciente `3b39393b-8709-4aa7-b8ae-0d5922fb07eb` no contiene
  checkpoints `portadaIA`, recibos `media` ni archivos de imagen.
- La corrida anterior `bd4ad640-dec7-4560-8720-ba757d89b496` sí conserva 56
  artefactos de imagen, por lo que el pipeline de generación y persistencia sí
  puede funcionar.
- La instrucción de la automatización activa contradijo el flujo esperado:
  indicaba continuar sin portada si no se encontraba una foto licenciada. La
  Skill diaria y el contrato API también trataban la portada como opcional.

## Cambios aplicados

- Se actualizó la automatización existente `Pont3la10 · propuestas editoriales
  diarias`: mantiene estado activo, tres ejecuciones diarias, modelo, proyecto y
  entorno local; ahora exige ImageGen, inspección, checkpoint, carga `media-ia`
  y asociación antes de enviar cada propuesta.
- El contrato local del submitter bloquea propuestas sin `coverMediaId` UUID y
  sin exactamente una clasificación de portada.
- El esquema del endpoint privado Codex ya no acepta `coverMediaId: null` y
  valida exactamente una de `ai_generated_cover` o `licensed_photo_cover`.
- Las Skills de corrida y de imagen ahora prohíben enviar texto sin portada; si
  ImageGen falla o la imagen no es segura, se omite ese candidato, se sigue con
  los demás y se informa cualquier déficit.
- Se aclara HU-ED-11. El bloqueo solo afecta propuestas nuevas del endpoint
  privado Codex; no cambia TikTok, cargas manuales ni la nulabilidad general de
  `articles.cover_media_id`. No se necesita migración.

## Validaciones

- `npm ci`: completado; reportó 15 vulnerabilidades preexistentes en las
  dependencias (no se modificaron).
- `npm.cmd run lint`: pasa.
- `npm.cmd run test:unit`: 29 archivos, 146 pruebas pasan.
- `npm.cmd run typecheck`: pasa.
- `npm.cmd run build`: pasa.
- `git diff --check`: pasa.
- Las primeras pruebas Nuxt requieren definir la variable pública no secreta
  `NUXT_PUBLIC_SITE_URL=https://www.pont3la10.com`.

## Pendiente

- Crear/integrar PR y confirmar Vercel Production en `READY`.
- No se lanzó otra corrida ni se generaron imágenes durante la reparación.
- Tras el próximo ciclo programado normal, verificar que los recibos `media-ia`
  y los borradores `review` comparten el mismo ID de portada. Si ImageGen falla,
  el resultado correcto es un candidato omitido y un reporte parcial, nunca un
  borrador sin imagen.
