# Reels y Shorts con guion propio

Estado (2026-11-19): construido. Cada Reel tiene su propio guion, su propia toma de voz, sus propias escenas verticales
(1080×1920) y subtítulos sincronizados con la voz. Ya no es solo un recorte del video largo: el «Crear Reels» antiguo
(divisor) sigue disponible, pero el camino principal es este.

## 1. Lo que dice la investigación (noviembre de 2026)

Fuentes: skills abiertas [vyralcontent/content-skills](https://github.com/vyralcontent/content-skills) (MIT; hooks,
short-form, Reels y Shorts, construidas sobre más de 200.000 videos), el análisis de [Little Dot Studios sobre 1.430 Shorts
deportivos](https://www.svgeurope.org/blog/headlines/the-only-way-is-up-unlocking-the-secret-to-sports-on-youtube-shorts/),
las guías de HyperFrames para vertical y subtítulos, y blogs de herramientas de edición (Opus, CapCut; sus cifras exactas
son de marketing y no se toman como dato). Otras skills revisadas: `viral-reel-generator` (cc-skills) y `viral-reels`
(felikc-m, en ruso).

| Tema | Regla que aplicamos | Por qué |
| --- | --- | --- |
| Gancho | Se resuelve antes del segundo 3. Tres capas a la vez: imagen del cuadro 0, frase hablada (≤ 14 palabras) y texto en pantalla de 3–7 palabras. Nombre propio o cifra concreta. Nada de «hola», «bienvenidos», «en este video», logos ni intros. | Las plataformas deciden en 1,5–3 s si siguen repartiendo el video; muchos lo ven sin sonido. |
| Promesa = entrega | El gancho no promete lo que el Reel no cuenta. | El clic engañoso baja la satisfacción y la distribución. |
| Estructura | Gancho → escalada → recompensa → un solo llamado a la acción. Los beats se unen con «pero / por eso / entonces», no con «y luego». | Las tres fallas típicas: gancho débil, sin escalada (se desangra) y recompensa enterrada. |
| Re-gancho | Si pasa de 30 s, un beat hace de re-gancho («pero ojo», «aquí viene lo complicado»). | Evita la caída de la mitad. |
| Ritmo | Cambio de plano cada 2–4 s; golpe de zoom (punch-in) para enfatizar, empuje lento para tensión; cortes secos. Sin silencios ni muletillas al principio. | Los planos estáticos son donde más se abandona. |
| Subtítulos | Siempre; 2–3 palabras por grupo, la palabra dicha resaltada; el texto exacto del guion (Whisper se equivoca con nombres). | Se ve mucho sin sonido; la jerga del fútbol se entiende peor sin texto. |
| Zona segura | Nada de texto en los 168 px de arriba ni bajo los ~1.250 px (pie, usuario y botones); margen derecho de 180 px por la barra de botones. | Lo tapa la interfaz de Instagram y Shorts. |
| Duración | 25–55 s. En Shorts deportivos rindieron mejor los de 51–60 s que retienen; en Reels el punto dulce es más corto. Nunca rellenar. | La duración vista pesa más que el largo. |
| Cierre | Un solo llamado a la acción; ideal que la última frase enganche con la primera (bucle). | El bucle sube las re-vistas; dos pedidos se anulan. |
| Shorts | Decir en voz alta las palabras clave (club, jugador): YouTube indexa lo hablado. Título fuerte; «la nota completa» en la descripción. | Los Shorts siguen sumando búsquedas por meses. |
| Formato propio | Hecho para vertical, no un 16:9 encogido. | Lo hecho para la plataforma rinde mucho más que lo reciclado. |

## 2. Cómo se aplica en Ponte la 10

1. **Guion** (`guion-reels.json` junto al video del día): lo escribe la tarea de las 6 p. m. con la skill
   `.agents/skills/pont3la10-reels-guion/SKILL.md` y lo valida `node scripts/video-rubrica-reels.mjs guion-reels.json`
   (reglas numéricas en `config/reelsDiario.json`). 3 a 5 Reels por día, uno por historia, con formatos distintos
   (bomba, dato, polémica, top, previa, emoción).
2. **Proyectos**: en el estudio, en el video del día, botón **«Reels con guion propio (N)»**, o
   `node scripts/video-generar-reel.mjs <fecha>`. Crea `videos/diario/<fecha>-reel-1…N`, en modo «Sin cámara» por
   defecto.
3. **Grabar**: cada Reel tiene 3 tramos en el teleprompter: **Gancho**, **Desarrollo** (todos los beats de una sola toma)
   y **Cierre**. Se puede activar la cámara para que el gancho y el cierre lleven tu cara.
4. **Armar**: cada toma se transcribe una sola vez (faster-whisper local). Los cortes de imagen caen en la palabra donde
   empieza cada beat y los subtítulos usan el texto del guion con los tiempos de tu voz.
5. **Renderizar**: sale `renders/final.mp4` vertical. El Reel queda en «Ver Reels» para Facebook e Instagram, y se puede
   subir como Short desde «Títulos y miniaturas → Subir video a YouTube» (lleva `#Shorts`).

   **Jerarquía:** el video del día es el proyecto principal y cada Reel (`<fecha>-reel-N`) es su subproyecto. «Ver Reels»
   abre lo mismo desde el principal o desde cualquier Reel: todos los Reels de la familia (los de guion propio, aunque
   falten por grabar, y los cortes del video). Cada uno tiene su casilla y su hora; «Repartir horas» pone una distinta
   a cada marcado y «Programar los marcados» usa la hora de cada tarjeta.

## 3. Escenas reutilizables (pack `videos/pack-pont3la10/compositions/reel-*`)

Todas 1080×1920, con variables editables en el desktop de HyperFrames y dentro de la zona segura de Instagram y Shorts.

| Escena | Para qué |
| --- | --- |
| `reel-gancho` | Cuadro 0 = miniatura: foto con golpe de zoom y temblor, texto grande con la palabra clave en amarillo, etiqueta del club. Con `soloTexto` va encima de tu toma a cámara. |
| `reel-foto-punch` | Foto vertical con punch-in de entrada, empuje y segundo golpe a mitad (cambio de patrón); palabra clave opcional. |
| `reel-foto-paneo` | Recorre una foto horizontal completa de lado a lado. |
| `reel-foto-tarjeta` | Foto entera en tarjeta sobre su fondo desenfocado; una segunda foto cae encima a mitad. |
| `reel-foto-dividida` | Dos fotos en diagonal con nombres (dos clubes, antes y después). |
| `reel-dato` | Cifra gigante que cuenta hasta su valor con anillo que estalla (los años no llevan punto). |
| `reel-cita` | Cita textual palabra por palabra con su autor. |
| `reel-lista` | Hasta 3 puntos numerados que entran uno a uno. |
| `reel-marcador` | Marcador vertical con goles que golpean. |
| `reel-versus` | Previa: dos nombres que chocan con un VS. |
| `reel-pregunta` | Burbuja de pregunta para comentar. |
| `reel-etiqueta` | (Retirada del generador el 2026-11-22: el Reel ya no lleva etiqueta fija del club.) |
| `reel-fuente` | Sello «Según …» cuando la voz nombra el medio. |
| `reel-alerta` | Sello OFICIAL / ÚLTIMA HORA; RUMOR en rojo (un rumor nunca lleva OFICIAL). |
| `reel-progreso` | (Retirada del generador el 2026-11-22: el Reel ya no lleva barra de progreso.) |
| `reel-subtitulos` | Subtítulos de 2–3 palabras, la palabra dicha en amarillo con un pop. |
| `reel-cta` | Cierre: logo, un llamado a la acción, la web y la flecha de bucle. |
| `reel-golpe`, `reel-barrido`, `reel-glitch` | Transiciones: destello con rayos, barrido azul y amarillo, falla digital (re-gancho). |

Sonidos nuevos del pack (generados aquí, sin licencias de terceros): `golpe`, `subida`, `tic`, `swoosh`. El logo blanco del
pack ya dice «Ponte la 10» (`node scripts/generar-logos-marca.mjs`).

## 4. Límites conocidos

- La zona segura cubre Instagram y YouTube Shorts; TikTok (fuera del plan) tiene la barra derecha más ancha y sigue
  avisando en `hyperframes check`.
- Las fotos siguen siendo reales con crédito: el guion usa las de los artículos y las que encontró el buscador del video
  largo (`origen:assets/fotos/...`). Una foto mala se cambia subiendo otra en ese beat.
- Un beat de gráfico (dato, lista, cita…) no se parte: si dura más de 5 s, conviene acortar su texto.
- Sin probar todavía con una toma real grabada para un Reel (sí con una toma del video largo: transcripción, alineación y
  subtítulos funcionan).

Horas de programación: salen de la regla `config/horariosPublicacion.json` (ver `docs/HORARIOS_PUBLICACION.md`); no se improvisan.
