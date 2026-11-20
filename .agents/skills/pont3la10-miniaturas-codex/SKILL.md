---
name: pont3la10-miniaturas-codex
description: Diseña las 3 miniaturas de YouTube (1280×720) del video diario de Ponte la 10 con las medidas de las 20 últimas miniaturas de La Gambeta y de Cracks: doble panel con dos titulares, collage de protagonistas con círculos y cifras, o protagonista + cara de Juan. Usa solo fotos reales del encargo y comprueba el resultado con el medidor.
---

# Miniaturas con el generador de imágenes de Codex

Medidas y metodología: `docs/METRICAS_MINIATURAS_COMPETENCIA.md`. Rangos ejecutables: `config/miniaturasReferencia.json`.
El encargo del día (`videos/diario/<fecha>/renders/miniaturas/ENCARGO-CODEX.md`) trae los títulos, el texto de miniatura y
las fotos en `insumos/`. Este skill dice **cómo** componerlas; las reglas de abajo mandan sobre cualquier estilo.

## Reglas duras (no se negocian)

1. **Solo las fotos reales de `insumos/`.** Puedes recortar, aclarar, desenfocar el fondo, componer y poner formas y texto.
   **No generes ni inventes** caras, personas, escenas, jugadas, escudos, camisetas ni logos; no cambies lo que pasó en la foto.
2. Sin escudos de clubes, marcas ni logos de televisoras (La Gambeta y Cracks sí los usan; nosotros no). Los clubes se
   nombran con **texto**. Único logo: `insumos/logo-blanco.png`, pequeño.
3. La miniatura **no promete nada que el video no cuente** y no afirma un rumor como hecho (un rumor lleva «¿…?» o «Según …»).
4. Ortografía perfecta y con tildes («¿», «ñ», «ç» solo si es el nombre propio). Texto en español de Colombia.
5. Créditos de las fotos: van en la descripción del video, no en la imagen.

## Lienzo y calidad

- **1280×720**, JPG, **< 2 MB**.
- Objetivos medidos: brillo medio **0,43** (0,34–0,50), saturación **0,50** (0,40–0,58), contraste **0,28** (0,24–0,33),
  píxeles casi negros **≈ 11 %**, bordes (qué tan llena está) **≈ 0,19** (0,14–0,26). Es decir: **ni oscura ni lavada,
  muy saturada y llena**. Nada de fondos lisos grandes: si sobra espacio, agranda el sujeto.
- Se debe leer a **168×94 px** (la lista lateral de YouTube): reduce la imagen y compruébalo.

## Receta A — Doble panel con dos titulares (la de La Gambeta)

Es la receta **por defecto** del video diario: el video trae varias noticias y cada panel cuenta una.

- **Dos paneles 50/50** con una línea divisoria blanca de 6–10 px (o una diagonal amarilla `#ffd800` leve).
- **Un sujeto por panel** (la foto más fuerte de cada noticia), ocupando **55–75 %** del alto del panel; la cabeza en el tercio
  superior (y 8–45 %). Si la foto tiene 2–3 personas, recorta al protagonista.
- **Titular de cada panel = la noticia de su foto, recortada** (el encargo la trae junto a cada foto como «Noticia: …»; si el título tiene ganchos con «|», el izquierdo es el gancho 1 y el derecho el 2). Nunca el título entero.
- **Texto**: mayúsculas, condensado ultragrueso (Anton, Bebas Neue, Oswald Bold o equivalente), **2 líneas**, **3–7 palabras
  por panel (mediana 6)**, bloque de **18 % del alto** entre **y = 60 % y 78 %**, **91 % del ancho del panel**, centrado.
  Contorno oscuro de 4–6 px + sombra suave. **Línea 1 blanca y línea 2 amarilla `#ffd800`** (o la que lleva el dato en
  amarillo); rojo `#e5202e` o cian solo para una palabra de alarma. Una sola línea de acento por panel.
- **Sello**: logo Pont3la10 abajo a la izquierda del panel izquierdo, ≈ 22 % del ancho del panel.
- Etiqueta del club o del tema en texto sobre una cinta azul `#08204a` arriba del panel (opcional, ≤ 2 palabras).

## Receta B — Collage de protagonistas (la de Cracks)

Úsala cuando la noticia gira en torno a varias personas (cruce, fichaje, polémica) o hay un marcador.

- **2–4 caras grandes** (mediana 3): cabeza de **35–45 % del alto**, solapadas, repartidas de lado a lado; expresión fuerte
  (manos en la cara, grito, mirada de lado). Recorte limpio con borde de luz fino.
- **1–3 círculos** con borde blanco de 6–8 px: uno grande (**40 % del alto**) y otros de **18–25 %**, arriba y a la derecha, con el
  entrenador, el periodista o el rival de la noticia (fotos de `insumos/`).
- **Cifra o marcador solo en texto** (ej. «2-0», «$80 M»), ≈ **10 % del alto**, blanco con contorno oscuro, junto al sujeto.
  Sin escudos ni banderas dibujadas.
- **Texto mínimo**: ≤ 3 palabras o la cifra; el título del video dice lo demás. Acento amarillo en una palabra.
- Sello pequeño de sección («NOTICIAS») a la izquierda y logo Pont3la10 abajo al centro (≈ 28 % del ancho, 7 % del alto).

## Receta C — Protagonista + cara de Juan

Para el video con toma de cara (`insumos/cara.jpg`). Foto del protagonista a la izquierda (≈ 60 % del ancho), cara de Juan a
la derecha con expresión clara (cabeza de 40 % del alto), texto de miniatura de 2–5 palabras abajo (misma regla de texto
que la receta A, una sola caja de 2 líneas).

## Qué variante va en cada letra

- `miniatura-a.jpg` → **receta A** (doble panel con las noticias de `foto-1` y `foto-2`).
- `miniatura-b.jpg` → **receta B** (collage con la noticia más fuerte).
- `miniatura-c.jpg` → **receta C** si hay `cara.jpg`; si no, la receta A con otras dos noticias (fotos 2 y 3).

## Cómo pedírselo al generador de imágenes

Pasa las fotos como imágenes de entrada y escribe el pedido con medidas, no con adjetivos:

> Compón una miniatura de YouTube 1280×720 con las fotos adjuntas (no inventes ni cambies a nadie). Dos paneles 50/50 con línea
> blanca de 8 px. Panel izquierdo: foto 1, sujeto al 65 % del alto, cabeza en el tercio superior; texto en 2 líneas «…» y «…»,
> mayúsculas condensadas ultragruesas, bloque del 60 % al 78 % del alto, 90 % del ancho del panel, línea 1 blanca y línea 2
> amarilla #ffd800, contorno oscuro de 5 px. Panel derecho: …  Logo adjunto abajo a la izquierda, 22 % del ancho del panel.
> Colores saturados, brillo medio, sin fondos lisos, sin escudos ni logos de clubes.

## Comprobación antes de entregar (obligatoria)

1. `node scripts/video-medir-miniatura.mjs <carpeta>/miniatura-a.jpg <carpeta>/miniatura-b.jpg <carpeta>/miniatura-c.jpg`
   Si dice **REVISAR**, corrige lo que indica («vacía», «muy oscura», «chillona»…) y repite. No cambies los rangos para que pase.
2. Mira cada una a 168×94 px: el texto o la cifra deben leerse.
3. Revisa a ojo: sin escudos ni logos ajenos, sin personas inventadas, tildes bien, el titular sale del título.
4. Entrega las 3 con los nombres del encargo y avisa qué receta usaste en cada una.
