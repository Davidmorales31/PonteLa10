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

## Cómo se mide de aquí en adelante

- Cada mes: `python scripts/competencia-medir.py` y comparar el resumen con el anterior (`docs/datos/`). Añadir a
  `config/competenciaYoutube.json` los canales nuevos que vayan apareciendo (México, Argentina, Brasil en español).
- Propio: pedir el permiso de YouTube Analytics para medir retención, duración media y CTR de miniaturas por video, y
  registrar cada apuesta (ángulo, duración, título, resultado a 24 h, 72 h y 7 días).
