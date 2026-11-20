# Formatos de imagen en redes: Cracks y La Gambeta (2026-11-20)

Observación visual en Chrome (con la sesión de Instagram del responsable) de `@cracks_ig` (1,2 M seguidores) y
`@lagambetasports` (1,5 M). Se miró la cuadrícula (≈16 piezas de Cracks, ≈8 de La Gambeta), una pieza de Cracks abierta y un
carrusel completo de La Gambeta (3 diapositivas). **Límites:** sin métricas de alcance, sin conteo de formatos por frecuencia;
lo que sigue describe patrones repetidos, no una muestra estadística. Ver también `docs/METRICAS_MINIATURAS_COMPETENCIA.md`
(miniaturas de YouTube de los mismos canales).

## Qué hacen

| | Cracks | La Gambeta |
| --- | --- | --- |
| Lienzo | Vertical 4:5 (1080×1350), casi todo pieza única | Vertical 4:5; muchos **carruseles** («DESLIZA» con mano y 5 estrellas) |
| Pieza base | Jugador recortado grande + escudo o motivo gigante detrás; **una palabra** en blanco, condensada ultragruesa, abajo (BLINDADO, HISTÓRICO, SOÑADO, IMPOSIBLE, «EL MEJOR») | Foto del protagonista + título de 2–3 líneas arriba o abajo; **banda roja** con el titular completo en la parte inferior |
| Texto | Una palabra o frase corta; debajo, una línea fina y un subtítulo en mayúsculas pequeñas | Titular + banda; datos en infografías |
| Marca | «CRACKS» pequeño, arriba al centro | Escudo «LG» arriba a la derecha; «presentado por» (patrocinador) arriba a la izquierda |
| Acentos | Círculos con borde blanco (contexto o segunda foto), X roja sobre el escudo, comillas grandes | Círculos con destello, marcas rojas (círculo sobre la jugada), ✓ verde y ✗ rojo, «VS» |
| Color | Negro/azul profundo con una foto saturada; blanco + un acento | Rojo, negro, blanco, dorado en títulos de infografía |

## Formatos que se repiten

1. **Portada de impacto (Cracks):** recorte del protagonista + palabra gigante abajo + línea fina + subtítulo.
2. **Cita:** foto (a veces dos paneles) + comillas grandes + frase de 3–4 líneas + autor en versalitas. En La Gambeta, tarjeta
   blanca con comillas rojas sobre la foto.
3. **Carrusel de 3–4 diapositivas (La Gambeta):** 1) portada con «DESLIZA», 2) infografía (llave de eliminatorias, ranking, tabla),
   3) cierre «Duelo final»/versus con ✓ y ✗.
4. **Versus / duelo:** dos fotos enfrentadas con «VS» y veredicto.
5. **Dato o ficha:** foto + nombre + concepto pequeño + cifra grande (ej.: «Tchouameni · CONTRACT EXTENSION · 2032» en dorado).
6. **Contexto con círculo:** foto principal + círculo con borde blanco (el árbitro, el rival, el trofeo).
7. **Jugada anotada:** captura con círculo rojo y la palabra «CONTRA»/«¿Difícil de creer?».

## Textos de la publicación (caption)

- Cracks: titular con 1–2 emojis («¡TCHOUAMÉNI HASTA 2032! ⚪️✍️»), 2 datos cortos, a veces con emoji de viñeta. Sin hashtags.
- La Gambeta: titular en mayúsculas con 2–3 emojis, 3–4 párrafos de una o dos líneas, **una pregunta al final**
  («¿Estás de acuerdo con Carvajal? 👇») y 4–5 hashtags.

## Qué adaptamos a Pont3la10 (y qué no)

Marca propia: azul `#08204a`, amarillo `#ffd800`, blanco y el logo Pont3la10. No se copian escudos de clubes, logos de televisoras
ni patrocinios de terceros; las fotos siguen siendo reales y acreditadas.

| Formato propio | Base | Qué necesita el compositor |
| --- | --- | --- |
| Portada de impacto | Cracks 1 | Fuente condensada ultragruesa; línea fina y subtítulo; palabra de 1–2 términos que sale del titular |
| Carrusel de la noticia | La Gambeta 3 | Diapositiva 1 con «DESLIZA»; diapositiva de dato o ranking; cierre con pregunta |
| Cita | Cracks 2 / Gambeta | Elemento de comillas grandes y autor en versalitas |
| Versus | Gambeta 4 | Plantilla de dos fotos con «VS» central y ✓/✗ |
| Ficha / dato | Cracks 5 | Cifra grande en amarillo y concepto pequeño |
| Contexto con círculo | Cracks 6 | Recorte circular con borde blanco |

Hoy el compositor (`utils/editorial/publicacionesPropias.ts`) admite fotos en celdas, texto en tres colores con banda o degradado
y el logo: alcanza para la portada de impacto básica, no para comillas, círculos, VS ni «DESLIZA».

## Flujo local de noticia a imagen (sin agentes) — estado

Decisión del responsable (2026-11-20): todo corre en su PC y no depende de agentes ni de modelos de lenguaje.

1. Detectar notas publicadas sin publicación social (programador local; hoy `--pendientes --auto` de `scripts/redes-publicar-articulo.mjs`).
2. Elegir formato por reglas (cita, versus, dato, carrusel o portada de impacto) con orden estable por nota. **Pendiente.**
3. Preparar la foto: `scripts/redes_recortar.py` recorta al protagonista con `rembg` (modelo u2net, ~176 MB, se descarga en
   la primera ejecución; instalado con `python -m pip install --user "rembg[cpu]"`).
4. Dibujar: `scripts/redes-imagen-impacto.mjs` (sharp + opentype.js, tipografía Anton con licencia OFL en `public/fonts/`).
   **Hecho: portada de impacto** (palabra gigante, línea fina, subtítulo, logo). `node scripts/redes-imagen-impacto.mjs <slug>`.
5. Medir contra rangos por formato (capturas de Cracks y La Gambeta). **Pendiente.**
6. Subir la imagen y programar con la API de redes. **Pendiente.**
