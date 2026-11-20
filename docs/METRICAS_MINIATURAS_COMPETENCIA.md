# Métricas de miniaturas: La Gambeta y Cracks

Estudio del 2026-11-20 sobre las **20 miniaturas más recientes de cada canal** (videos de noticias diarias de fútbol, los
mismos canales de `docs/ESTUDIO_COMPETENCIA_VIDEO_DIARIO.md`). Todas a 1280×720. No se guardan las imágenes en el
repositorio (son de terceros): solo estas medidas, en `config/miniaturasReferencia.json`.

## Cómo se midió

- **Automático** (reproducible con `node scripts/video-medir-miniatura.mjs <imagen>`): brillo, contraste, saturación, color
  por familias, densidad de bordes, peso, y la banda de texto de La Gambeta (píxeles claros con contorno oscuro).
- **Conteo visual** (no había detector de caras en este equipo): caras, círculos, escudos, cifras y palabras, mirando las 40.
  Tienen un margen de ±1 por miniatura.

## Dos estilos distintos

| | La Gambeta | Cracks |
|---|---|---|
| Estructura | **2 paneles 50/50** (20 de 20), línea blanca fina en el centro | **Un solo cuadro** (20 de 20), collage de protagonistas |
| Dónde está el texto | **Titular en cada panel**: son los dos primeros ganchos del título | **Casi sin titular**: solo cifras o marcadores («7-0», «2-3», «300M») y la marca |
| Título del video | 2–3 ganchos con «\|», 98–100 caracteres | 3–4 ganchos con «\|», 84–100 caracteres |
| Caras | 1 principal por panel (28 de 40 paneles); 2–3 en 12 | 3 grandes (rango 2–4) + 2 círculos (0–3); ≈5 caras en total |
| Elementos extra | Escudo grande en 14 de 40 paneles; signo «?» o cara tapada en 5 de 40 | Escudos de club en ≈12 de 20; cifra o marcador en ≈8 de 20 |
| Marca | Logo «GN News» abajo a la izquierda, en todas | Sello neón de sección a la izquierda y «CRACKS» abajo al centro |

## Texto (La Gambeta, 40 paneles)

- **2 líneas** por panel, **mediana 6 palabras** (p10 = 3, p90 = 7, rango 2–9); ≈ 11 palabras en toda la miniatura.
- **Bloque de texto**: alto = **18 %** del lienzo (p10 9 %, p90 21 %), de **y = 60 % a 78 %** (centro al 69 %), ancho = **91 %**
  del panel (p10 72 %). Siempre en el tercio inferior, sobre el sujeto.
- **Color**: 28 de 40 paneles usan **una línea blanca y otra de acento** (amarillo 16 líneas, rojo 10, cian 2); 12 de 40 van todo en blanco.
  Cuando hay acento va más en la **segunda** línea (18 de 28).
- Mayúsculas, letra **condensada ultragruesa**, contorno oscuro grueso y sombra.
- El texto **no repite el título entero**: toma el primer gancho para el panel izquierdo y el segundo para el derecho, recortado.

## Cracks: tamaños

- Cabezas grandes de **35–45 %** del alto del lienzo, solapadas de lado a lado; expresión fuerte (manos en la cara, grito, mirada de lado).
- Círculos con borde blanco grueso: grandes de **40–43 %** del alto y pequeños de **18–25 %**, a la derecha y arriba, con el
  entrenador, el periodista o el rival de la noticia.
- Marcador/cifra: ≈10 % del alto. «CRACKS» abajo al centro: ≈7 % del alto y ≈28 % del ancho.

## Color y luz (40 miniaturas; terna = p10 · mediana · p90)

| Métrica | La Gambeta | Cracks | Rango de las 40 |
|---|---|---|---|
| Brillo medio (0–1) | 0,34 · **0,42** · 0,48 | 0,34 · **0,43** · 0,52 | 0,29 – 0,54 |
| Contraste (desv. del brillo) | 0,28 · **0,31** · 0,33 | 0,23 · **0,26** · 0,28 | 0,20 – 0,34 |
| Saturación media | 0,42 · **0,49** · 0,57 | 0,40 · **0,50** · 0,59 | 0,36 – 0,62 |
| Píxeles casi negros | 11 % · **19 %** · 29 % | 3 % · **7 %** · 14 % | 2 % – 31 % |
| Píxeles blancos | 5 % · **9 %** · 16 % | 2 % · **5 %** · 9 % | 1 % – 18 % |
| Amarillo saturado | 2 % · **4 %** · 7 % | 0,2 % · **1 %** · 10 % | 0,1 % – 18 % |
| Rojo | 2 % · **4 %** · 9 % | 1 % · **7 %** · 16 % | 0,4 % – 22 % |
| Azul | 3 % · **7 %** · 13 % | 5 % · **11 %** · 20 % | 0,5 % – 23 % |
| Densidad de bordes (lleno) | 0,16 · **0,20** · 0,26 | 0,16 · **0,19** · 0,20 | 0,13 – 0,28 |
| Peso del JPG | 252 · **270** · 317 KB | 305 · **413** · 435 KB | 209 – 450 KB |

Lectura: **ni oscuras ni lavadas** (brillo ≈ 0,43), **muy saturadas** (≈ 0,50) y **llenas** (bordes ≈ 0,19). La Gambeta
mete más negro por los contornos del texto; Cracks, más azul/rojo por las camisetas y un toque de magenta neón.

## Las nuestras frente a esto (2026-11-18 y 2026-11-19)

Medidas con el mismo programa: las 3 del 18 salen **«vacías»** (bordes 0,08–0,10 frente a ≥ 0,13) y oscuras (brillo 0,26–0,27);
las del 19 quedan justo en el borde (bordes 0,11). A la vista: un solo bloque de texto, el sujeto pequeño y la mitad del
lienzo en azul liso. Lo que falta, según lo medido: **sujetos más grandes y en más cantidad, texto en el tercio inferior
sobre el sujeto y menos fondo liso**.

## Límites

- Son 20 miniaturas por canal, de **una sola semana**; sirven para fijar el estilo de este nicho, no para probar qué
  miniatura gana. Eso lo decide la prueba A/B de YouTube.
- No se midió CTR (no es público). Se asume que lo que repiten dos canales grandes durante semanas funciona.
- Ambos canales usan **escudos, logos de clubes y fotos de agencia**; en Pont3la10 no (ver `pont3la10-miniaturas-codex`).
