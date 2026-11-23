# Plan: documental semanal de los viernes

Pedido del responsable (2026-11-23): todos los viernes, un video tipo documental de **20 a 30 minutos** sobre un futbolista
(«la historia detrás de CR7») o un suceso histórico («la Mano de Dios»), elegido de un banco de temas que **prioriza a
quien esté en tendencia esa semana** (si la semana pasada un portero fue noticia, el viernes va la historia de ese portero).

Estado (2026-11-23): fases 1 y 2 hechas. Están el banco (`config/bancoDocumentales.json`, 32 temas), el selector (`scripts/documental-elegir.mjs`), la rúbrica (`scripts/documental-rubrica.mjs` + `config/documental.json`) y el skill `pont3la10-documental-guion`, con pruebas en `tests/unit/documental.test.ts`. Faltan las fases 3 a 7.

## 1. Diagnóstico: qué funciona en el formato (medido el 2026-11-23)

### Muestra

Con `yt-dlp` (solo metadatos públicos y subtítulos automáticos para estructura; nada se descargó para reutilizar):

- **Búsquedas:** 8 búsquedas de YouTube en español del tipo «la historia de…», «la mano de dios», «la triste historia del
  futbolista», con 196 videos únicos.
- **Canales:** los últimos 40 videos de 7 canales de referencia.
- **Detalle:** metadatos completos de 9 documentales destacados y la estructura de 4 de ellos.

| Canal | Suscriptores | Mediana de vistas (40 últimos) | Duración mediana | Lo destacado |
|---|---|---|---|---|
| Dieck Docs (ES) | 4,7 M | 3,4 M | 39 min | Maradona 73 min: 6,9 M; Neymar 54 min: 5,3 M |
| Farid Dieck (ES) | 13,8 M | 2,1 M | 34 min | «Lo TACHARON de ARROGANTE \| Cristiano Ronaldo \| Documental»: 23,2 M |
| FDOR (EN) | 1,4 M | 0,93 M | 6 min (con series) | «The Full Story of Cristiano Ronaldo» 91 min: 49 M |
| Qué Gran Historia (ES) | 263 K | 378 K | 12 min | Messi 12 min: 18,7 M; «Vio a su PADRE LLORAR…» 16 min: 13,4 M |
| EmmaHavokOscuro (ES) | 2,75 M | 271 K | 12 min | Oliver Kahn: 12,9 M; Lev Yashin: 7,4 M (porteros) |
| Memorias del Fútbol (ES) | 1,8 M | 127 K | 18 min | Película del Mundial 2026 (98 min): 890 K |
| HENCHART (ES) | **11 K** | 2,6 K | 26 min | «así el MUNDO se rindió ante CRISTIANO RONALDO…» 32 min: **1,4 M** |

### Por duración

En la muestra de búsqueda, la mediana de vistas por duración fue:

| Duración | Videos | Mediana de vistas |
|---|---|---|
| Menos de 10 min | 78 | 297 K |
| 10 a 20 min | 44 | 635 K |
| 20 a 30 min | 15 | 509 K |
| 30 a 60 min | 31 | 679 K |
| Más de 60 min | 28 | 576 K |

Hay ruido (la muestra incluye videos musicales), pero la señal es clara: **lo largo no castiga**. Los 20–30 minutos pedidos
están dentro de lo que funciona; el líder del género en español (Dieck) vive entre 34 y 73 minutos.

### Interacción

Los documentales top tienen entre 1,1 % y 2,4 % de me gusta por vista y entre 0,03 % y 0,09 % de comentarios por vista. El
mejor es Farid CR7, con 2,31 % y 0,091 %.

### Hallazgos

1. **El tema manda más que el canal.** HENCHART, con 11 mil suscriptores, sacó 1,4 M con Cristiano y 1,1 M con Messi,
   mientras el resto de sus videos ronda las 3 mil vistas. Figuras mundiales (CR7, Messi, Maradona, Neymar) y porteros
   míticos (Kahn, Yashin) son los temas que despegan.
2. **El título es una tesis emocional, no un resumen.** El molde que se repite es [CONFLICTO o PARADOJA en mayúsculas] |
   Nombre | Documental. Ejemplos:
   - «Lo TACHARON de ARROGANTE | Cristiano Ronaldo | Documental»
   - «¿Lo que lo hizo GRANDE… lo DESTRUYÓ? | Diego Maradona»
   - «El PRÍNCIPE que nunca quiso ser REY | Neymar»

   Variante historia de vida: «No podía CRECER, un día se convirtió en el MEJOR JUGADOR DEL MUNDO».
3. **Los primeros 30 segundos plantean una pregunta central, no una biografía.** El Maradona de Dieck abre con una sola
   pregunta (por qué lo seguían amando a pesar de todo) más archivo sonoro, y solo después dice «vamos a empezar por su
   infancia». El CR7 de Farid abre con la tesis polarizante («si no lo amas, lo odias») que el video va a desmontar. El
   canal que abre con frases genéricas de contexto (EmmaHavok, 2019) es el más viejo y el que menos crece hoy.
4. **La estructura es en actos, no en orden de Wikipedia:**
   - *Pregunta:* el enigma.
   - *Origen:* la herida o la carencia de la infancia.
   - *Ascenso:* los logros con un antagonista claro.
   - *Crisis:* la caída o la polémica.
   - *Resolución:* responde la pregunta.
   - *Legado:* qué nos deja.

   El cierre vuelve a la pregunta del inicio.
5. **Ritmo:** voz narrada continua, sin cortes a cámara, con música por acto y archivo (fotos, titulares, audio).
6. **Sin capítulos de YouTube** en los 9 analizados. Agregarlos es una ventaja nuestra en búsqueda («Momentos clave» en
   Google).

### Lo que tenemos y lo que falta

| Ya existe | Falta |
|---|---|
| Estudio de grabación con teleprompter, «Todo seguido» y grabación desde el iPhone | Grabar 25 minutos por capítulos sin perderse (lista de capítulos, avance por capítulo) |
| Generador 16:9 (fotos, clips, rótulos, música por bloque) y render con HyperFrames | Tipo «documental»: tarjetas de acto, línea de tiempo, mapa, ficha de datos, titular de época, cita en pantalla y capítulos |
| Radar de tendencias internacional (`tendencias-futbol-internacional.mjs`) | Banco de temas con puntaje y selector semanal que cruce tendencias de 7 días |
| Piloto automático que sube a YouTube y Facebook y programa | Franja del viernes y Reels derivados del documental durante la semana |
| Rúbrica de guion del video diario | Rúbrica de documental: pregunta central, actos, fuentes por dato, nada inventado |

**Riesgos:**
- **Derechos.** Un documental de 25 minutos con transmisiones de partidos es el blanco perfecto de Content ID, y el
  reclamo se come la monetización de todo el video. El archivo debe ser sobre todo fotos acreditadas, gráficos propios
  y voz. La música, solo de la Biblioteca de audio de YouTube; el reclamo de «Upbeat Corporate» lo demuestra.
- **Carga de grabación.** Son unas 4.000 palabras, entre 25 y 30 minutos de voz por semana, en capítulos de 1–3 min.
- **Tiempo de render.** Hay que medir cuánto tarda HyperFrames en 25 minutos de 1080p; probablemente 1–2 horas en el PC.
- **Temas sensibles.** En casos como Andrés Escobar o salud mental: nada de morbo, fuentes de primer nivel y respeto.
  Las mismas reglas de verificación de la corrida editorial.

## 2. Banco de temas y regla de tendencia

`config/bancoDocumentales.json` tendrá dos listas: **futbolistas** y **sucesos**. Cada tema lleva:

- nombre y alias (para cruzarlos con las tendencias);
- tipo (futbolista, suceso o club);
- ángulo (la pregunta central);
- fuentes base;
- disponibilidad de fotos con crédito;
- sensibilidad;
- fecha de efeméride (aniversarios);
- si ya se publicó.

**Semilla inicial:**

| Tipo | Temas |
|---|---|
| Figuras mundiales | Cristiano Ronaldo, Messi, Maradona, Neymar, Ronaldinho, Zidane, Mbappé, Haaland, Pelé, Ronaldo Nazário |
| Colombianos (nuestro diferencial) | René Higuita (el escorpión), Carlos Valderrama, Falcao, James Rodríguez, Luis Díaz, Faustino Asprilla, el 5-0 a Argentina en 1993, Andrés Escobar (sensible) |
| Porteros | Higuita, Kahn, Yashin, Buffon, Casillas, Chilavert, Dibu Martínez |
| Sucesos | la Mano de Dios, el Maracanazo, el cabezazo de Zidane, el Calciopoli, el «Aguante» de Estambul 2005, el 7-1 de Brasil 2014, la Superliga |

**Selector semanal** (lunes): `scripts/documental-elegir.mjs` cruza el banco con las tendencias de los últimos 7 días
(Google Trends CO, MX, ES, AR y US, más el radar de noticias). El puntaje combina:

- **tendencia de la semana: 50 %**, que manda;
- **interés de fondo: 30 %** (vistas de los documentales que ya existen sobre ese tema, medidas con `yt-dlp`);
- **hueco: 20 %** (cuánto hace que nadie en español hizo su historia, y que nosotros no la hayamos hecho).

Si el protagonista de la semana no está en el banco, se agrega con sus fuentes antes de elegirlo. Las efemérides (por
ejemplo, el aniversario de la Mano de Dios el 22 de junio) suman.

## 3. Formato del documental

**Duración:** 22–28 minutos, entre 3.500 y 4.500 palabras a unas 160 palabras por minuto. Se graba en 10–14 capítulos.

| Acto | Tiempo | Qué pasa |
|---|---|---|
| 0. Pregunta | 0:00–0:45 | La paradoja o el enigma, con la escena más fuerte; sin saludo ni «en este video» |
| 1. Origen | ~4 min | La infancia o el contexto, con la herida o la carencia |
| 2. Ascenso | ~6 min | Los logros, con un antagonista o una duda en el aire |
| 3. Crisis | ~6 min | La caída, la polémica o el día que todo cambió |
| 4. Resolución | ~5 min | La respuesta a la pregunta del inicio, con datos |
| 5. Legado y cierre | ~3 min | Qué nos deja, la pregunta al público y el cierre |

**Reglas del guion:**
- Cada dato lleva su fuente.
- Nada de diálogos inventados: si se dramatiza, se dice «imagina…».
- Una pregunta al público por acto.
- Capítulos de YouTube en la descripción.

**Título:** el molde medido (conflicto o paradoja en mayúsculas | Nombre | Documental), probado con el skill de títulos
clickbait y con dos variantes para la prueba A/B.

**Miniatura:** cara del protagonista, más dos o tres palabras del conflicto.

**Visual:** fotos con efecto de cámara lenta (paneo), tarjetas de acto, línea de tiempo animada, mapa del origen, fichas de
números, titulares de época recreados con diseño propio y citas en pantalla. Clips solo de cuentas oficiales.

**Música:** una pista por acto, solo de la Biblioteca de audio de YouTube.

## 4. Calendario semanal

| Día | Qué | Quién |
|---|---|---|
| Lunes | El selector propone el tema más dos suplentes, y se aprueba | Agente y tú (un toque en el iPhone) |
| Martes | Investigación: fuentes, fechas, cifras y fotos con crédito | Agente |
| Miércoles | Guion y rúbrica; lo revisas en el estudio | Agente y tú |
| Jueves | Grabas los capítulos (con «Todo seguido», desde el iPhone o el PC) y se renderiza de noche | Tú y el PC |
| Viernes 18:30 | Publicación programada en YouTube y Facebook | Piloto automático |
| Sábado a jueves | 3–5 Reels y Shorts sacados del documental, para llevar gente al largo | Piloto automático |

## 5. Fases de implementación

1. **Banco y selector.** `config/bancoDocumentales.json`, `scripts/documental-elegir.mjs` y pruebas.
2. **Guion.** Skill `pont3la10-documental-guion` y rúbrica `scripts/documental-rubrica.mjs`: pregunta en los primeros
   45 s, actos, largo, fuentes por dato y nada inventado.
3. **Generador.** Tipo `documental` en el generador: escenas nuevas (tarjeta de acto, línea de tiempo, mapa, ficha,
   titular, cita), capítulos de YouTube en la descripción y música por acto.
4. **Estudio.** Vista de capítulos para grabar 25 minutos: progreso por acto y tiempo restante. Medir el render y
   optimizarlo.
5. **Automatización.** Tarea del lunes (elegir e investigar), aviso al iPhone para aprobar, franja de los viernes en
   `config/horariosPublicacion.json` y Reels derivados.
6. **Música segura.** Pasar la biblioteca a pistas de la Biblioteca de audio de YouTube, sin Content ID. Recomendado
   también para el video diario.
7. **Métricas.** Panel con retención por acto; requiere el permiso de YouTube Analytics. Revisar los primeros 4
   documentales y ajustar.

**Metas de los primeros 4 viernes** (hipótesis):
- superar 5 veces la mediana de vistas de nuestros videos largos actuales;
- retención de al menos 35 % a los 3 minutos;
- me gusta por vista de al menos 1,5 % (los referentes rinden entre 1,1 y 2,4 %).

## 6. Modelos recomendados

- **Opus** para investigar y escribir el guion: precisión de datos, estructura narrativa y temas sensibles.
- **Sonnet** para el código de las fases 1, 3 y 4.
- **Haiku** solo para tareas pequeñas.
