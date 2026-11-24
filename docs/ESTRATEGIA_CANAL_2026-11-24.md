# Estrategia del canal (2026-11-24)

Resume lo decidido y lo recomendado a partir de `docs/MEJORAS_VIDEO_Y_FUENTES_2026-11-24.md` y
`docs/ESTUDIO_COMPETENCIA_AMPLIADO_2026-11-24.md`. Separa **lo que ya existe** de **lo propuesto** (hipótesis a medir con
retención propia). Decisión de fondo del responsable: el canal deja de ser solo de fútbol colombiano.

## 0. Estado de lo que faltaba (actualizado el 2026-11-24, tarde)

**Hecho y probado** (pruebas automáticas; ninguno se ha usado todavía en un video real):

| Pendiente | Qué se hizo |
| --- | --- |
| Video de noticias de 8 a 20 min | `config/videoDiario.json`: mínimo 480 s, máximo 1.200 s, hasta 16 bloques. |
| 4 estructuras para noticias | `directa`, `historia-a-fondo`, `top`, `pregunta-del-dia` con su regla en la rúbrica, el rótulo «PUESTO N» y la skill. |
| Rotación de estructura | `node scripts/video-estructura.mjs --fecha … --edicion …`: sorteo con pesos, sin repetir las últimas 2. |
| 4 formatos de documental | `biografia`, `historia-corta` (8–11 min), `epoca-club`, `explicador`: rúbrica, actos, antetítulo de la tarjeta y skill. |
| Apertura estándar | Aviso si faltan el dato con número, la fuente o la promesa en los primeros 40 s. La apertura de Vozinha ya la cumple. |
| Temas nuevos en el banco | 13: 9 de épocas, clubes y clásicos (2 con vínculos al narcotráfico, marcados «sensible») y 4 de historias cortas y Mundial 2026. El selector propone el formato. |
| Shorts y Reels | 5 estructuras nuevas con regla propia (`leyenda`, `donde-estan`, `dato-no-cuadra`, `antes-despues`, `versus`); de 1 a 5 Reels por día. |
| Banco de leyendas | `node scripts/documental-shorts.mjs <guion.json>`: hechos con fuente, citas, fotos y estructuras propuestas de cada documental. |
| Sin repetir entre videos | `video-latam.mjs` quita lo que usó el video de la otra edición. |
| Fuentes y radar | El selector de documentales lee también las tendencias de Latinoamérica; el radar internacional ya no usa The Guardian (403), Marca ni AS. |
| Métricas propias | Permiso opcional de Analytics y `node scripts/video-metricas.mjs` (rendimiento por estructura y qué duplicar). Ver `docs/ESTUDIO_YOUTUBE.md`. |
| Marca visible | «Ponte la 10» en la tarjeta de suscripción y en el titular del documental. |

**Depende de ti:** conectar YouTube con Analytics; la llave de Pixabay; grabar la voz de Vozinha y renderizar; el sitio (Vercel o
VPS); Meta; el nombre del canal; revisar los 2 temas sensibles antes de escribir sus guiones.

**Pendiente por esperar o por decidir:** los PNG de Codex y la muestra en los tres formatos; una corrida editorial de
Latinoamérica con notas de fuera de Colombia; cuentas oficiales por país (verificación manual); duración y aperturas de los Shorts
de la competencia (API de YouTube con llave); programar `fuentes-salud` cada semana.

## 1. Un solo canal, tres tipos de video y un motor de Shorts

| Pieza | Qué es | Estado |
| --- | --- | --- |
| **Video diario de Latinoamérica** (Colombia incluida) | Resumen de 8 a 10 min, franjas 12:30 y 18:30 | Código listo (`edicion: latam`); falta la fuente de notas no colombianas |
| **Video diario internacional** | Resumen de 8 a 10 min, franjas 14:30 y 21:30 | Funciona (corrida internacional) |
| **Documental semanal** | 20 a 30 min, viernes 18:30 | Generador listo; falta la voz de Vozinha y el render final |
| **Shorts y Reels** | Alcance y suscriptores | Hoy: noticias con guion propio (6 etiquetas, 1 esqueleto) y cortes del video diario |

**Por qué un solo canal:** las horas de reproducción (lo que decide la monetización) se suman en un solo lugar; el estudio solo
conecta un canal; YouTube evalúa el canal entero, y mezclar documentales, diarios y Shorts lo hace menos repetitivo; y dos
canales dividen el tiempo de producción. Se ordena con listas de reproducción. Se reevalúa cuando haya 8 a 10 documentales
medidos y un público claramente distinto.

## 2. Estructuras: cuántas hay y cuántas se proponen

| Tipo | Hoy | Propuestas (a probar) | Total |
| --- | --- | --- | --- |
| **Video de noticias** | 1 («directa»: gancho con la noticia, 8 a 12 bloques de tamaños alternados, pregunta cada 3, cierre) | «una historia a fondo y tres rápidas»; «top del día o de la semana»; «la pregunta del día» (un «¿por qué?» con datos) | 4 |
| **Documental / narrativo** | 1 (6 actos: pregunta, origen, ascenso, crisis, resolución, legado; 20 a 30 min) | «La Historia de [jugador]» de 8 a 10 min (4 actos); épocas, clubes y clásicos («Era dorada de…», «¿Por qué X perdió su trono?»); explicador de datos de 12 a 18 min | 4 |
| **Shorts y Reels** | 1 esqueleto con 6 etiquetas (bomba, dato, polémica, top, previa, emoción) y cortes del video | la leyenda en 45 s; ¿dónde están ahora?; el dato que no cuadra; antes y después; versus con pregunta hablada; noticia corta | 6 nuevas |

**Estado:** las 4 estructuras de noticias, los 4 formatos de documental y las 5 estructuras nuevas de Shorts ya existen en el
código y en las rúbricas (sección 0). Para no parecer producción en serie, los diarios rotan estructura y cada documental cambia de apertura y de ritmo.

## 3. Shorts y Reels: no «cambiar» sino reordenar

Evidencia (1.027 Shorts): los de noticias del día rinden poco; los mejores son mini-historias y curiosidades de leyendas.
Los Shorts no suman horas de monetización: sirven de alcance. Por eso se propone:

1. **Prioridad 1: «banco de leyendas».** Cada documental y cada tema del banco (`bancoDocumentales.json`) da de 8 a 10
   Shorts con la misma investigación, fuentes y fotos con crédito. Es un banco que crece y no caduca. Falta un generador que
   proponga los guiones de Shorts a partir del `guion.json` de un documental.
2. **Prioridad 2: cortes del video diario.** Son automáticos y casi gratis: se conservan, pero sin invertir tiempo.
3. **Prioridad 3: Reels de noticia con guion propio.** Son los que más tiempo de grabación cuestan (3 tramos, de 3 a 5 al día)
   y los de peor evidencia: bajar a 1 al día (el más fuerte) hasta medir retención.

Sin jugadas ni imágenes de transmisión (lo que más rinde en Shorts, el gol, es lo que no podemos usar).

## 4. Calendario semanal propuesto (a ajustar a la capacidad de grabación de Juan)

- Lunes a viernes: video diario de Latinoamérica; internacional (diario o 3 veces por semana si el tiempo no alcanza).
- Viernes 18:30: documental (la pieza que más horas suma).
- Una vez por semana: «La Historia de…» de 8 a 10 minutos (prueba de 4 episodios).
- Todos los días: 1 o 2 Shorts, la mayoría del banco de leyendas.

**Riesgo de capacidad:** son dos narraciones de 8 a 10 min al día más el documental de 23 min a la semana. Los datos de la
competencia dicen que publicar mucho solo funciona con marca grande o derechos (AS Colombia: mediana de 600 vistas).
Si el tiempo no alcanza, se recorta el internacional, no el documental.

## 5. Cómo se sabe si funciona

- Plazo: desde el 2027-02-01 los canales nuevos necesitan 8.000 horas (hoy 4.000) para monetizar; revisar en Studio.
- Medir retención con YouTube Analytics (pendiente: requiere reconectar la cuenta) y registrar cada apuesta a 24 h, 72 h y 7 días.
- Regla de decisión: un video que pasa 3 veces la mediana propia a las 72 h genera un segundo ángulo en 7 días.
- Cada mes: `python scripts/competencia-medir.py` y `--shorts`.
