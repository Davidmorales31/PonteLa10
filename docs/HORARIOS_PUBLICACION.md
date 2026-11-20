# Horarios de publicación de Reels y Shorts

La regla vive en `config/horariosPublicacion.json` y la lee `scripts/video-horarios.mjs`. El estudio la usa para poner la hora
por defecto de cada Reel en «Ver Reels»; Juan siempre puede cambiarla. Los agentes que propongan o programen horas leen
ese archivo, no inventan horarios.

## Regla (hora de Bogotá, UTC-5)

- **Franjas:** 7:30, 12:30, 16:30 y 19:30.
- **Noticia del día:** sale en la primera franja libre de hoy; solo pasa a mañana si ya no queda ninguna.
- **Separación** de al menos 2 horas entre Reels, **máximo 4 por día**, nunca entre las 23:00 y las 5:30, y siempre a más de
  15 minutos desde ahora (la API de redes pide más de 10).
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
