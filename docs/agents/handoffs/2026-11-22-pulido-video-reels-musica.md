# Handoff

- **Objetivo de la sesión:** pulir el video largo, los Reels y la música con métricas medidas de la competencia.
- **Completado:** medición de 55 videos de 6 canales; música automática por noticia y audible; Reels sin gráficos a pantalla completa, con clips primero, subtítulos más bajos y créditos sin caja; estructura directa del largo (sin intro ni toma por noticia) con rúbrica y skills actualizados.
- **Archivos modificados:** scripts/video-musica.mjs, scripts/video-estudio.mjs, scripts/video-estudio/estudio.html, scripts/video-reels.mjs, scripts/video-generar-reel.mjs, scripts/video-generar-proyecto.mjs, scripts/video-descripcion.mjs, scripts/video-rubrica-guion.mjs, scripts/video-rubrica-reels.mjs, config/videoDiario.json, config/reelsDiario.json, videos/pack-pont3la10/compositions/reel-{clip(nuevo),cta,foto-punch,foto-paneo,gancho,subtitulos,alerta}.html, skills pont3la10-video-diario-guion y pont3la10-reels-guion, pruebas videoDescripcionMusica, videoReelsPropios, videoFuentesYClips, videoGenerarProyecto, videoRubricaGuion.
- **Decisiones:** música 100 % automática en el largo (la elegida a mano solo vale en Reels); cama a −24 LUFS con sidechain threshold 0.05 / ratio 2.5; Reels con planos de ≤ 2,2 s; `noticia_directa` obligatorio en la rúbrica; escenas prohibidas en `ESCENAS_PROHIBIDAS` (los archivos siguen en el pack, sin uso).
- **Validaciones ejecutadas:** npm run lint (ok), npm run typecheck (ok), vitest completo 170/1027 (ok); Reel de prueba renderizado en una copia temporal; mezcla del largo del 2026-11-21 medida (voz −14,2 LUFS, cama −30,1 al hablar, −23,1 sin voz).
- **Fallos:** ninguno abierto. Se corrigió un import duplicado (`duracionDe`) que habría impedido arrancar el estudio.
- **Pendientes:** solo 8 pistas de música (hacen falta 4–6 más para no repetir; descargar requiere aprobación); Reels con pocas fotos no llegan a 40 cambios/min (el tope de 3 usos por foto alarga los planos); los Reels recortados del largo (`video-reels.mjs`) no se tocaron salvo el inicio de la noticia.
- **Siguiente acción exacta:** reiniciar el estudio y revisar el primer video y los Reels que arme la tarea de las 19:00 con la estructura directa.
- **Commit base:** 44543e1
- **Commit final:** sin commit
