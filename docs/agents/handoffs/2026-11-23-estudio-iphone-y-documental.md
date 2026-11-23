# Handoff: estudio en el iPhone, horarios, Reels y documental de los viernes (2026-11-22 y 23)

Leer esto primero en un chat nuevo dedicado al estudio y al documental. Todo está en la rama
`feat/video-reels-horarios-mismo-dia`, PR [Davidmorales31/PonteLa10#225](https://github.com/Davidmorales31/PonteLa10/pull/225),
sin fusionar a `main`. Git, código y pruebas mandan sobre este resumen.

## Decisiones del responsable (en orden)

1. **Redes de noticias el mismo día.** `--auto` ya no se encola detrás de los Reels.
2. **Reels: todos los de un video al día siguiente.** Sin tope por día: se llena el día cada media hora si las franjas no alcanzan.
3. **Reels sin barra de progreso ni etiqueta fija del club.** El video diario va con más clips: patrón clip, clip, foto y hasta 4 clips por noticia.
4. **«Upbeat Corporate» retirada** de la música por un reclamo de Content ID (video de Mbappé). Los clips se dejan como están.
5. **Estudio usable desde el iPhone** (fases 1–3 del plan), con avisos, «Todo seguido», panel de resultados y cámara trasera.
6. **Documental de los viernes.**
   - Formato: 20–30 min sobre un futbolista o un suceso, priorizando lo que esté en tendencia.
   - Visuales: **mitad fotos y mitad video o animación**; nunca 20 minutos de las mismas fotos.
   - Grabación: **la voz la graba el responsable en el estudio.**

## Qué existe

| Tema | Archivos | Estado |
|---|---|---|
| Horarios | `scripts/video-horarios.mjs` (`reglas.relleno`), `scripts/redes-publicar-articulo.mjs` (`horasParaPendientes`), `config/horariosPublicacion.json`, `docs/HORARIOS_PUBLICACION.md` | Hecho y probado |
| Acceso remoto (fase 1) | `scripts/video-estudio-acceso.mjs`, `scripts/video-estudio-clave.mjs` (`npm run video:estudio:clave`), integrado en `scripts/video-estudio.mjs` | Hecho. Clave y host en `~/.pont3la10/estudio/acceso.json`; auditoría en `auditoria.log` |
| PC siempre activo (fase 2) | `scripts/estudio-siempre-activo.ps1`, `scripts/instalar-estudio-siempre-activo.ps1` | Instalado por el responsable (tarea «Pont3la10 Estudio», sin suspensión con corriente) |
| Tailscale | `tailscale serve --bg 4810` → `https://juandavid.tail0f20af.ts.net` (solo red privada; nunca `funnel`) | Activo; el responsable ya entró desde el iPhone |
| Vista iPhone (fase 3) | `scripts/video-estudio/estudio.html` | Hecho: pestañas Tramos/Grabar/Fotos/Publicar, PWA, MP4 de Safari, pantalla encendida al grabar, cámara frontal/trasera, «Sin cámara» al instante, actualización automática entre dispositivos |
| Avisos (Web Push propio) | `scripts/video-estudio-avisos.mjs` (RFC 8291 y VAPID con `node:crypto`), `/sw.js`, `/api/avisos*` | Hecho. Avisa de render listo o fallido, Reel o largo programado y errores. **Falta probarlo en el iPhone real** |
| Todo seguido | botón `#seguido` en `estudio.html` | Hecho |
| Resultados | `estadisticasVideos` en `scripts/video-youtube.mjs`, `/api/resultados`, diálogo «Resultados» | Hecho. Sin retención: falta el permiso de YouTube Analytics |
| Plan del documental | `docs/PLAN_DOCUMENTAL_SEMANAL.md` (7 canales y 196 videos medidos) | Fases 1 y 2 hechas |
| Banco y selector | `config/bancoDocumentales.json` (33 temas, incluye Vozinha), `scripts/documental-elegir.mjs` | Hecho |
| Rúbrica y skill | `config/documental.json`, `scripts/documental-rubrica.mjs`, `.agents/skills/pont3la10-documental-guion/SKILL.md` | Hecho. Exige mitad video, máximo 3 usos por foto y una cita atribuida por frase citada |
| Primer documental | `videos/documentales/2026-11-27-vozinha/guion.json` y `esquema.md` | Guion **APROBADO**: 3664 palabras, unos 23 min, 14 capítulos, 7 fuentes; 25 % fotos, 51 % video, 25 % animación |
| Grabación del documental | `scripts/documental-proyecto.mjs` → `videos/diario/2026-11-27-documental-vozinha/` (15 tramos de voz, sin cámara) | Listo para grabar en el estudio. El piloto **no** lo arma y «Armar» responde 409 hasta que exista el generador |

## Pendiente, en orden

1. **Generador de documentales (fase 3 del plan).** Leer `guion.json` y las tomas grabadas y armar el video 16:9 con
   HyperFrames:
   - escenas nuevas: tarjeta de acto, mapa del recorrido, línea de tiempo, ficha, titular con sello «FALSO», cita y
     contador de seguidores;
   - fotos con paneo lento y clips de video de Commons con su `desde`;
   - búsqueda de los `stock` en Pexels;
   - música de la Biblioteca de audio de YouTube por acto;
   - capítulos de YouTube en la descripción.

   Medir el tiempo de render de unos 23 minutos.
2. **`PEXELS_API_KEY`.** El responsable debe crear la cuenta gratuita y poner la llave en el `.env`; no abrir el `.env`.
   Sin llave, cubrir los `stock` con más tramos de la entrevista y de Mindelo.
3. **Revisar los 7 momentos de la entrevista** (dominio público, TeleSUR e ICL; `desde` 120, 400, 700, 1100, 1400,
   1650 y 1800 s): que se vea a Vozinha.
4. **Publicación del viernes 27 a las 18:30.** YouTube y Facebook, con dos o tres títulos para la prueba A/B, miniatura
   «A LOS 40» y la franja del viernes en `config/horariosPublicacion.json`. Después, marcar `publicado` en el banco.
5. **Tarea programada de los lunes** (`documental-elegir.mjs --actualizar --noticias`), con aviso para aprobar el tema.
6. **Mejoras del radar de tendencias.**
   - Exigir nombre y apellido juntos: hoy cuenta mal casos como Gustavo Álvarez por Julián Álvarez.
   - Agregar búsquedas generales («portero figura», «atajada») para detectar al protagonista sorpresa de la semana.
7. **Pasar la música a la Biblioteca de audio de YouTube** (también la del video diario).
8. **Permiso de YouTube Analytics** para ver retención en el panel de resultados.

## Cuidados

- Nada de imágenes de transmisiones del Mundial: FIFA las reclama y se lleva la monetización de todo el video.
- Fotos y videos solo con licencia y crédito: Commons, agencias vía el medio que las publicó, cuentas oficiales.
- Datos contradictorios entre medios (por ejemplo, los seguidores de Vozinha antes del partido): se atribuyen o se
  omiten, como en `guion.json` → `omitidos`.
- No cambiar ajustes de Windows ni crear cuentas por el responsable: él corre los instaladores y crea las cuentas.
