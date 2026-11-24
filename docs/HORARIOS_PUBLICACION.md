# Horarios de publicación de Reels y Shorts

La regla vive en `config/horariosPublicacion.json` y la lee `scripts/video-horarios.mjs`. El estudio la usa para poner la hora
por defecto de cada Reel en «Ver Reels»; Juan siempre puede cambiarla. Los agentes que propongan o programen horas leen
ese archivo, no inventan horarios.

## Regla (hora de Bogotá, UTC-5)

- **Franjas:** 7:30, 12:30, 16:30 y 19:30.
- **Noticia del día:** sale en la primera franja libre de hoy; solo pasa a mañana si ya no queda ninguna.
- **Video largo:** franjas propias, 12:30 y 18:30. Desde 2026-11-24 cada edición tiene las suyas (`franjasPorEdicion` en `config/horariosPublicacion.json`): Latinoamérica 12:30 y 18:30, internacional 14:30 y 21:30, y el documental solo los viernes a las 18:30; Colombia (edición histórica) sigue con las del video largo. El estudio elige según el guion (`edicion` o `tipo: documental`). Son hipótesis hasta medir con datos propios.
- **Separación** de al menos 2 horas entre publicaciones, **sin tope por día** (decisión del responsable: «lo que salga»), nunca
  entre las 23:00 y las 5:30, y siempre a más de 15 minutos desde ahora (la API de redes pide más de 10).
- Las horas ya programadas cuentan: no se choca con ellas.

## Mismo día (decisión del responsable, 2026-11-22)

- **Noticias en redes:** salen el **mismo día** que se publican. `--auto` de `redes-publicar-articulo.mjs` ya no se encola detrás de la última
  programada (eso las empujaba hasta dos días después cuando los Reels llenaban la cola): toma la primera hora libre a más de 12
  minutos, a 15 minutos o más de cualquier publicación, fuera de 23:00–5:30, y solo pasa a la mañana si ya no queda día.
- **Reels:** el video diario sale de noche y **todos sus Reels salen el día siguiente**, sean 5 o 30. Primero se usan las franjas; si no
  alcanzan, se llena ese mismo día cada media hora (`reglas.relleno` en `config/horariosPublicacion.json`) antes de pasar al otro día.
  El video largo conserva sus dos franjas.

## De dónde sale (y qué tan firme es)

| Fuente | Qué dice |
| --- | --- |
| [SchedPilot](https://schedpilot.com/mejor-hora-para-publicar-en-instagram/) | Única con horas para Colombia: Reels 12:00–13:30 y 19:00–21:00. |
| [Buffer, 9,6 M de publicaciones](https://buffer.com/best-time-to-post-on-instagram) | Instagram: jueves 9 a. m., miércoles 12 m. y 6 p. m. (global). |
| [Buffer, 1,8 M de videos de YouTube](https://buffer.com/resources/best-time-to-post-on-youtube/) | Shorts: mejor viernes a las 4, 6 y 7 p. m. |
| [SocialPilot](https://www.socialpilot.co/insights/best-time-to-post-on-youtube) | Shorts: viernes 16–19 h; evitar 3–7 a. m. |
| [Sprout Social](https://sproutsocial.com/insights/best-times-to-post-on-instagram/) | Instagram: lunes a jueves, del mediodía a la tarde; fines de semana flojos. |

Los estudios se contradicen (Later dice madrugada, Metricool dice domingo), son globales y miden interacción, no vistas. Es una
**hipótesis inicial**. El fútbol además tiene su propio ritmo: partidos y noticias que mandan sobre cualquier tabla.

## Cómo se corrige con datos propios

Cuando haya unos 30 Reels publicados, comparar vistas y retención por franja (YouTube Studio y el panel de redes) y editar
las franjas del JSON. Hasta entonces, la regla manda.

## Piloto automático (Reels, Shorts y video largo)

Autorizado por el responsable el 2026-11-20 (primero «al menos los shorts»; luego también los videos largos y sin tope por día;
queda anotado en `AGENTS.md`). Código en `scripts/video-autopiloto-reels.mjs`; se enciende en «Ver Reels» y su estado vive en
`videos/diario/autopiloto-reels.json`.

- Cada minuto, el estudio local mira los proyectos de los últimos 3 días.
- Cuando **todas las tomas de voz** están grabadas y pasaron 10 minutos desde la última (margen para corregir una toma o
  una foto), lo arma y lo renderiza (con la música elegida y el control de que la voz quedó dentro del video).
- **Reel o Short:** al terminar lo **programa** en la primera franja libre. Nunca lo publica al instante: queda al menos 15
  minutos y se puede cancelar desde «Ver Reels» o desde el panel de redes.
- **Video largo:** lo sube a YouTube como privado con el primer título de la prueba A/B, le pone la primera miniatura que haya
  en `renders/miniaturas/` (si no hay, YouTube elige un fotograma) y lo programa con `publishAt` en una franja del video largo.
  Se cancela o cambia en YouTube Studio (también desde el celular). Solo actúa sobre videos que el propio piloto renderizó y que no
  tienen un video de YouTube ya vinculado: nunca sube videos viejos ni los que subiste a mano.
- **Short en YouTube (2026-11-20):** cuando el piloto programa un Reel en Facebook e Instagram, sube también el MP4 a YouTube como privado
  y lo programa con `publishAt` a la **misma hora** (si ya queda a menos de 6 min, a los 6 min). Solo para Reels que programó el piloto.
- **Video largo en Facebook (2026-11-21):** tras programar el largo en YouTube, el estudio lo sube **directo a la página** (Graph API, subida
  reanudable por trozos, `scripts/video-facebook-directo.mjs`) y lo deja programado (`published=false` + `scheduled_publish_time`) a la misma
  hora que YouTube. No pasa por Supabase (límite de 50 MB por archivo hacia la API de redes). Usa el token de página del `.env` de la raíz
  (`NUXT_META_FACEBOOK_PAGE_ACCESS_TOKEN`), por decisión y responsabilidad del responsable; no se imprime ni se registra. Se cancela o cambia
  en Facebook (Meta Business Suite). **Instagram no recibe el 16:9:** solo admite Reels, y el largo ya se cuenta allí con los Reels recortados.
- Las horas del video largo en YouTube cuentan como ocupadas para Reels y Shorts (y al revés): no se pisan.
- Si falla Facebook o el Short, YouTube / Facebook e Instagram del Reel siguen programados y el motivo queda en el registro.
- Un Reel que ya tiene estado de publicación (programado, publicado o cancelado a mano) no se vuelve a tocar.
- Si el render falla se reintenta una vez; si falta la llave de redes o YouTube rechaza algo, no sigue y lo anota. Los avisos
  quedan en el registro del archivo y el último se ve en el diálogo. Si YouTube bloquea el video por apps sin auditar
  (ver `docs/ESTUDIO_YOUTUBE.md`), queda privado.
- La prueba A/B de títulos y miniaturas de YouTube no se crea sola (la API no lo permite); el piloto usa el primer título.
- Requiere el estudio abierto (la ventana negra) y el PC encendido.
