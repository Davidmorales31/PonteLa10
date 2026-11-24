# Estudio de competencia ampliado (2026-11-24)

Segunda pasada del estudio de `docs/ESTUDIO_COMPETENCIA_VIDEO_DIARIO.md`, pedida por el responsable para profundizar la
competencia y sacar más estrategias. **Muestra:** 32 canales de fútbol en español y unos 1.200 videos largos (los últimos
40 de cada canal), medidos el 2026-11-24 con `yt-dlp` (solo metadatos públicos y los subtítulos automáticos de 6 videos
para leer cómo abren; no se descargó audio ni video). Se repite con `python scripts/competencia-medir.py` (lista de canales
en `config/competenciaYoutube.json`; la primera medición quedó en `docs/datos/competencia-2026-11-24.json`).

## Límites (leer antes de usar las cifras)

- Son **vistas acumuladas**: un video de hace dos días tiene menos que uno de hace un año. No hay fecha por video, así que
  los canales que publican mucho salen perjudicados. Todo se compara contra la **mediana del propio canal**, no entre canales.
- **No hay retención, porcentaje visto ni tiempo de visualización** (solo los ve el dueño del canal).
- La clasificación por formato es por palabras del título: casi la mitad de los videos cae en «otros». Es una pista, no una prueba.
- Correlación no es causalidad: un formato que «rinde» puede ser solo el que usan los canales buenos.
- Los suscriptores salen de YouTube el mismo día y son aproximados.

## Qué encontramos

1. **El formato casi no explica nada.** Frente a la mediana de su propio canal, los formatos quedan entre 0,97 y 1,32 (la
   mayoría en 1,00 ± 0,10): análisis y táctica 1,18 (49 videos), curiosidades y datos 1,32 (12), en vivo 1,10 (27),
   documental e historia 0,98 (84), «cómo queda» 0,99 (84), previa y pronóstico 1,00 (40), polémica 0,97 (49), fichajes 1,00 (46).
   **Corrección de lo que dijimos antes:** con 1.200 videos ya no se sostiene que «en vivo» rinda 1,65 veces ni que el
   «cómo queda» tenga ventaja; quedan como hipótesis a probar, no como regla.
2. **Los éxitos son pocos y se concentran.** En el canal típico, los 3 mejores videos de 40 dan el 28 % de todas las vistas
   (si fueran parejos serían el 7,5 %). En ZEUZINK y Qué Gran Historia dan el 74 %; en Pedro el Ingeniero, el 63 %. Un
   video suyo pasó por 55 veces su mediana. Se gana **probando muchos ángulos y duplicando los que explotan**.
3. **El protagonista famoso, solo, no garantiza.** Con una superestrella en el título el relativo es 1,02 y sin ella 1,00.
   Lo que explota es la **pregunta o la tensión** sobre esa persona, no el nombre.
4. **Duración:** menos de 4 minutos rinde menos (0,82); de 4 a 40 minutos es neutro (0,98 a 1,05); de 40 a 70 minutos, 1,10; y
   los de más de 70 minutos, 3,3, pero son partidos completos y transmisiones de medios con derechos: no aplica.
5. **Títulos** (1.196 videos): llevar un número rinde algo más (1,05 frente a 0,97); el « | » también (1,02 frente a 0,96); los
   títulos de 45 caracteres o menos rinden menos (0,84); el emoji (0,95) y el «¿» (0,95) no ayudan; las mayúsculas no cambian nada.
6. **Los canales pequeños que despegaron lo hicieron con relato, no con volumen.** ZEUZINK (unos 9 mil suscriptores) tiene
   mediana de 64 mil vistas, con piezas de historia de superestrellas entre 0,6 y 1,9 millones; sus videos recientes de otros
   temas, 3 a 6 mil. Tomás Fernández (unos 13 mil suscriptores) hace **documentales de clubes colombianos de 20 a 75 minutos**
   y tiene mediana de 25 mil, con picos de 93 a 149 mil. Del otro lado: AS Colombia (unos 63 mil suscriptores y decenas de
   publicaciones diarias) tiene mediana de 600 vistas; Gol Caracol, 2,7 mil; La Pizarra Táctica (12 mil suscriptores), 1,5 mil.
7. **Quién se lleva los resúmenes de partido:** los medios con derechos (Win Sports llega a 13 a 19 veces su mediana con
   resúmenes de cuadrangulares; ESPN Fans y TUDN tienen picos de 25 a 57 veces). Es un terreno que no podemos pisar.
8. **Quién domina cada formato:**

   | Formato | Quiénes | Mediana de vistas del canal |
   | --- | --- | --- |
   | Documental | Dieck Docs, Memorias del Fútbol, EmmaHavok, ZEUZINK | 3,45 M, 128 mil, 268 mil, 64 mil |
   | Historia de un jugador de 8 min | Leo Salinas | 34 mil (sus 3 mejores: 268 a 384 mil) |
   | Explicador táctico o «por qué» | Cristian Nieto, Pedro el Ingeniero | 592 mil, 42 mil (picos de 2,3 y 4,9 M) |
   | Opinión y reacción | Davoo Xeneize Plus | 646 mil |
   | Compilaciones | Dosis de Fútbol | 1,55 M (necesita metraje con derechos) |
   | Noticias diarias | Cracks, La Gambeta, Jugada Deportiva, Camilo MD | 236 mil, 82 mil, 43 mil, 37 mil |

## Cómo abren los que más rinden (los primeros 40 a 50 segundos)

Leídos en los subtítulos automáticos de seis videos de los canales de arriba. Cuatro maneras distintas, ninguna empieza con saludo:

- **Anomalía con dato y fuente:** una cifra que contradice lo esperable («el 64 % de lo que recorrió fue caminando, según la
  FIFA»), una frase que la nombra como anomalía y la promesa de explicarla. (Pedro el Ingeniero, 2,3 M.)
- **Una jugada o escena concreta**, una frase de sorpresa y el narrador como investigador en primera persona («decidí investigar…»).
  (Cristian Nieto, 4,9 M.)
- **Una escena situada** (un lugar, una edad, dos detalles que no cuadran) y la promesa de un final que valdrá la pena, con el
  pedido de suscripción a los 30 s. (Qué Gran Historia, 18 M.)
- **Arco de «pequeño a grande»** con tono mítico: lo que era el club, cuándo casi desaparece y cómo se levantó. (Tomás Fernández, 93 mil.)

El de itinerario («en este video te mostraré todo sobre… desde su infancia») rinde menos que los demás y lo usa la serie de 8 minutos.
El documental de Vozinha ya abre con una escena situada y una pregunta; le conviene sumar un dato duro con fuente en los primeros 40 s.

## Estrategias nuevas (de más a menos prioridad)

Cada una trae su evidencia y cómo se prueba. **Todas son hipótesis hasta medir con retención propia** (ver `docs/MEJORAS_VIDEO_Y_FUENTES_2026-11-24.md`, punto 2).

1. **Serie «La Historia de [jugador]» de 8 a 10 minutos**, con jugadores latinoamericanos en ascenso o con un giro de
   identidad (nació en un país y juega por otro, regresó, casi lo deja). *Evidencia:* los 3 mejores de Leo Salinas rinden de
   8 a 11 veces su mediana y los de mayor alcance llevan un giro de nacionalidad. *Producción:* el generador del documental
   con una estructura corta (4 actos). *Prueba:* 4 episodios; seguir si 2 pasan 2 veces la mediana del canal.
2. **Documentales de épocas, clubes y clásicos** («Era dorada de…», «¿Por qué X perdió su trono?», historia de un clásico),
   empezando por Colombia y Latinoamérica. *Evidencia:* Tomás Fernández con pocos suscriptores y casi sin competencia en ese
   nicho. *Hueco propio:* el banco de documentales no tiene ni una época de club ni un clásico (solo jugadores y sucesos).
   Candidatos para el banco, a validar con fuentes: la época dorada de América de Cali y la de Atlético Nacional (1989),
   el Ballet Azul de Millonarios, el Once Caldas campeón de 2004, el Superclásico Boca–River, Colo-Colo en 1991, Peñarol.
3. **Una apertura estándar «dato + anomalía + promesa»** en documentales y diarios (primeros 40 s: un dato concreto con su fuente, lo
   que no cuadra y qué se va a explicar), sin saludo ni itinerario. Se añade a la rúbrica de documentales y a la del video diario.
4. **Explicadores «¿Por qué…?» de 12 a 18 minutos hechos con datos y gráficos**, no con jugadas (no tenemos metraje con
   derechos): fichas, líneas de tiempo y mapas que ya genera el pack. *Evidencia:* Pedro el Ingeniero (55 veces su
   mediana) y Cristian Nieto (mediana de 592 mil). *Riesgo:* exige análisis original; sin él no sirve. *Prueba:* 2 piezas.
5. **Apuestas múltiples con regla de decisión.** Como los éxitos se concentran, publicar 2 o 3 ángulos por semana, registrar
   cada resultado y, si un video pasa 3 veces la mediana propia a las 72 horas, sacar un segundo ángulo en 7 días. Necesita
   las métricas de retención.
6. **Títulos:** con un número o un nombre concreto, de 46 caracteres en adelante, sin emoji, « | » si hay dos ganchos y 3
   títulos para la prueba A/B. **No copiar fórmulas literales de otros canales** (ZEUZINK repite casi palabra por palabra
   un título de Dieck Docs): YouTube evalúa el canal entero por contenido repetitivo.
7. **Ventana del Mundial 2026:** las retrospectivas y las historias del torneo siguen rindiendo (Memorias del Fútbol: 894 mil
   para una película de 98 minutos y 549 mil para los 13 mejores partidos). Un banco de «historias del Mundial que nadie
   contó» (debutantes como Cabo Verde, héroes inesperados) con 3 a 5 temas, sin usar imágenes de la transmisión.
8. **Opinión con cara y pregunta provocadora**, a pequeña escala y en Reels (Davoo Xeneize: «¿X es el padre de Y?», de 1 a 2
   millones). Solo con tu cara y fotos con crédito; nada de clips ajenos.
9. **Cuatro estructuras para rotar el video diario** (hoy hay una): «lo que debes saber hoy» (la actual); «una historia a
   fondo y tres rápidas»; «top del día o de la semana»; «la pregunta del día» (un «¿por qué?» con datos). Evidencia débil
   (análisis 1,18; lista 1,04): sirven sobre todo para no parecer producción en serie.

**Descartado con evidencia:** compilaciones tipo Dosis de Fútbol (viven de metraje con derechos), resúmenes de partido (los
ganan los medios con derechos) y publicar decenas de piezas al día (AS Colombia y Gol Caracol).

## Shorts y Reels (medido después, el mismo día)

Todo lo de arriba son videos largos: en la primera pasada se descartaron a propósito los de menos de 61 segundos, así que
**las estrategias anteriores no cubrían Shorts ni Reels**. Se midieron después con `python scripts/competencia-medir.py --shorts`.

**Muestra y límites:** 1.027 Shorts de 27 canales (3 no tienen pestaña de Shorts); los formatos y rasgos de título salen de
los 823 Shorts de los 22 canales con mediana de Shorts mayor de 3.000. Solo hay **vistas y título**: la lista de Shorts no
trae duración ni fecha, y pedirlos uno por uno hizo que YouTube pidiera «confirmar que no eres un bot» (no se intentó
saltar). Sin duración, ritmo ni aperturas medidas, esos puntos se apoyan en `docs/REELS_PROPIOS.md`. Mismas advertencias de
vistas acumuladas y de clasificación por palabras del título (casi dos tercios caen en «otros»).

**Qué encontramos**

1. **Los Shorts son otro juego, no un resumen del largo.** En el canal típico, la mediana de un Short es 0,6 de la de su
   video largo, pero depende del canal: donde el largo es fuerte (Cracks 0,07; Memorias del Fútbol 0,13; Tomás Fernández
   0,05) los Shorts rinden mucho menos; donde el largo es débil (POST UNITED 4,0; TNT Sports Argentina 6,2; Gol
   Caracol 2,3), el Short es el que da el alcance. Dosis de Fútbol tiene mediana de 948 mil en Shorts.
2. **Los éxitos se concentran todavía más:** los 3 mejores de 40 dan el 37 % de las vistas del canal típico (28 % en largos).
3. **Formato** (relativo a la mediana de Shorts de su canal): gol y jugada 1,68 (53 Shorts; **necesita metraje con
   derechos**); top y lista 2,00 (solo 6, poca prueba); curiosidad 1,16; fichaje 1,13; emoción 1,09; duelo o versus 1,06; dato
   o récord 0,90; **pregunta en el título 0,84**; cita 0,75; polémica 0,70.
4. **Título:** con un número rinde 1,15 frente a 0,97 (134 Shorts), el doble de efecto que en videos largos; mayúsculas y « | »
   suben 7 %; «?» baja 5 %; emoji y el largo del título no cambian nada.
5. **Los más destacados no son noticias, son mini-historias y curiosidades de leyendas:** «el defensa más temido de la
   historia» (79 veces su mediana, 1,3 M), «el primer partido de Messi como falso 9» (63 veces, 2,5 M), «el gol que desafió a
   la ciencia» (16 veces, 2,6 M), «¿por qué no dispararon?» (25 veces, 1 M), «así evolucionó el fútbol» (22 veces, 855 mil),
   «¿dónde están todos los jugadores del Barça de Luis Enrique?» (17 veces, 469 mil). Fuera de eso solo sobresalen las
   jugadas con derechos (TUDN, 32 veces). Los Shorts de noticias del día rinden poco: los de Cracks, 7 % de su largo.
6. **Para la monetización, los Shorts no suman horas** (el tiempo visto en el feed de Shorts no cuenta); sirven para alcance
   y suscriptores. La vía alterna de 10 millones de vistas en 90 días es irreal con medianas de 5 a 50 mil.

**Estructuras nuevas para Shorts y Reels** (hoy hay 6 etiquetas editoriales, pero un solo esqueleto de gancho, desarrollo y
cierre). Hipótesis a medir con retención propia:

| Estructura | Esqueleto | Escenas del pack | Evidencia |
| --- | --- | --- | --- |
| **La leyenda en 45 s** | Gancho con un rasgo extremo y un nombre → origen → apogeo con un dato → giro o rareza → cierre que engancha con la primera frase (bucle). | `reel-gancho`, `reel-foto-punch`, `reel-dato` | Los de mayor relativo (16 a 79 veces). Sale gratis del documental: cada documental da 8 a 10. |
| **¿Dónde están ahora?** | 4 a 6 nombres de un equipo o torneo famoso, foto y una línea de qué hacen hoy; cierra con pregunta hablada. | `reel-lista`, `reel-foto-tarjeta` | 17 veces su mediana (469 mil). |
| **El dato que no cuadra** | Una cifra, la contradicción y la explicación en una frase; 25 a 35 s. | `reel-dato`, `reel-fuente` | Pedro el Ingeniero: 25 y 63 veces. |
| **Antes y después / evolución** | Dos o tres épocas con fotos y una línea de cambio. | `reel-foto-dividida`, `reel-foto-paneo` | 22 veces (855 mil). |
| **Versus con pregunta hablada** | Dos nombres, un criterio y la pregunta dicha en voz alta (no en el título). | `reel-versus`, `reel-pregunta` | Neutro (1,06); el «?» en el título baja. |
| **Noticia de 25 a 35 s** | La de hoy, solo la más fuerte del día (las demás ya van en el video largo). | las actuales | Evidencia débil: el Short de noticias rinde poco. |

**Reglas que salen de los datos:** número en el título (+15 %); la pregunta va **hablada y en pantalla**, no en el título;
nada de jugadas ajenas (lo que más rinde, 1,68, es justo lo que no podemos usar); reutilizar la investigación del
documental en vez de investigar desde cero. **Pendiente de medir:** duración y ritmo ideales y cómo abren los mejores;
exige pedir videos uno por uno con pausas largas o la API oficial de YouTube con llave.

## Cómo se mide de aquí en adelante

- Cada mes: `python scripts/competencia-medir.py` (largos) y `python scripts/competencia-medir.py --shorts`, y comparar el
  resumen con el anterior (`docs/datos/`). Añadir a
  `config/competenciaYoutube.json` los canales nuevos que vayan apareciendo (México, Argentina, Brasil en español).
- Propio: pedir el permiso de YouTube Analytics para medir retención, duración media y CTR de miniaturas por video, y
  registrar cada apuesta (ángulo, duración, título, resultado a 24 h, 72 h y 7 días).
