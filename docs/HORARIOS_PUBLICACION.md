# Horarios de publicación de Reels y Shorts

La regla vive en `config/horariosPublicacion.json` y la lee `scripts/video-horarios.mjs`. El estudio la usa para poner la hora
por defecto de cada Reel en «Ver Reels»; Juan siempre puede cambiarla. Los agentes que propongan o programen horas leen
ese archivo, no inventan horarios.

## Regla (hora de Bogotá, UTC-5)

- **Franjas:** 7:30, 12:30, 16:30 y 19:30.
- **Noticia del día:** sale en la primera franja libre de hoy; solo pasa a mañana si ya no queda ninguna.
- **Video largo:** franjas propias, 12:30 y 18:30.
- **Separación** de al menos 2 horas entre publicaciones, **sin tope por día** (decisión del responsable: «lo que salga»), nunca
  entre las 23:00 y las 5:30, y siempre a más de 15 minutos desde ahora (la API de redes pide más de 10).
- Las horas ya programadas cuentan: no se choca con ellas.

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
- Un Reel que ya tiene estado de publicación (programado, publicado o cancelado a mano) no se vuelve a tocar.
- Si el render falla se reintenta una vez; si falta la llave de redes o YouTube rechaza algo, no sigue y lo anota. Los avisos
  quedan en el registro del archivo y el último se ve en el diálogo. Si YouTube bloquea el video por apps sin auditar
  (ver `docs/ESTUDIO_YOUTUBE.md`), queda privado.
- La prueba A/B de títulos y miniaturas de YouTube no se crea sola (la API no lo permite); el piloto usa el primer título.
- Requiere el estudio abierto (la ventana negra) y el PC encendido.
