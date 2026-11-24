# Encargo para Codex: gráficos PNG de los motion graphics de Ponte la 10

> Generado por `node scripts/graficos-codex.mjs --encargo` desde `config/graficosCodex.json`. No lo edites a mano: cambia el catálogo y vuelve a generarlo.

## Qué necesito

Los videos de Ponte la 10 (noticias y documentales de fútbol) se animan con código: HTML y GSAP. Quiero reemplazar los
elementos dibujados con código por **gráficos PNG hechos por ti**, que yo animaré (entrada, salida, zoom, rotación, flotar,
paralaje, brillo) en tres formatos: video diario 16:9 (1920×1080), Reels y Shorts 9:16 (1080×1920) y documental 16:9.

Son **66 gráficos** (33 de prioridad 1 y 33 de prioridad 2). Empieza por los de prioridad 1.

## Reglas duras (no se negocian)

1. **Solo elementos gráficos y abstractos.** Nada de personas, caras, manos reales, multitudes, jugadas, estadios ni escenas.
   Los gráficos de este encargo son decoración y nunca sustituyen una foto de noticia (el pack exige fotos reales para eso).
2. **Cero texto dentro de las imágenes:** ni letras, ni números, ni palabras de relleno. El texto lo escribo yo encima
   (cambia en cada video). Las únicas excepciones son los símbolos «?», «!», «$» y las comillas, cuando el recurso los pide.
3. **Sin marcas ni derechos de terceros:** ningún escudo de club, logo de liga, televisora, patrocinador, fabricante o red
   social; ninguna bandera; ningún trofeo, balón, camiseta ni estadio que copie un diseño real (copa del Mundo, Champions, etc.).
4. **Sin magenta, fucsia ni rosa intenso** en ningún píxel visible. El pack usa el magenta #FF00FF como llave de color en el documental: ningún gráfico puede llevar magenta, fucsia ni rosa intenso (tampoco en destellos, glitch ni confeti).
5. **Ante la duda, lo más simple:** si una descripción deja un detalle abierto, elige la opción más limpia y anótalo en tu reporte final.
6. No hagas commit ni push, no toques ningún otro archivo del repositorio y no borres nada.

## Estilo

- **Paleta de marca:** azul marino `#08204a`, amarillo `#ffd800`, blanco `#ffffff`; de apoyo,
  rojo alarma `#e5202e`, verde `#1fb15a` y cian `#19c6e6`. Si un recurso pide un color, úsalo exacto.
- **Estética:** deportiva y editorial de noticiero: formas limpias y de buen tamaño, contornos gruesos, brillos y sombras
  cortas suaves. Las anotaciones y sellos son «hechos a mano» (trazo de marcador, tinta desgastada), no vectores perfectos.
- **Legible en pequeño:** cada gráfico debe entenderse a un tercio de su tamaño. Evita detalles finos que se pierdan.
- **Consistencia:** todos deben parecer de la misma familia (mismo grosor de contorno, mismo tipo de sombra y de brillo).
- **Bordes limpios:** sin halos blancos ni verdes alrededor del contorno; borde suavizado (antialias) sobre transparencia real.

## Transparencia (lo más importante)

- Entrega **PNG RGBA con canal alfa real**. Lo «transparente» debe tener alfa 0; **nunca pintes el cuadriculado gris y blanco**
  de los editores ni un fondo blanco o negro.
- Si tu generador de imágenes puede hacer fondo transparente, úsalo. Si no, genera el recurso sobre un **verde croma puro
  `#00FF00`** (que no aparezca en el diseño) y quita ese fondo con un script (por ejemplo Pillow o `ffmpeg colorkey`),
  limpiando el borde para que no queden halos verdes. Comprueba el resultado sobre un fondo azul oscuro.
- **Excepción:** los dos fondos `fondo-azul-textura-*` van opacos a propósito. Los **sellos** y el **marco polaroid** llevan
  el interior vacío y transparente.
- Los overlays de grano, viñeta, partículas y similares usan transparencia gradual (alfa parcial); es lo esperado.

## Entrega

- **Carpeta:** `videos/pack-pont3la10/assets/graficos/<categoría>/<id>.png` (la ruta exacta de cada uno está en las tablas de abajo).
- **Tamaño exacto** en píxeles, como dice la tabla. Si tu generador entrega otro tamaño, reescala sin deformar y deja
  transparente el sobrante; no recortes el dibujo.
- **Peso:** menos de 2500 KB por archivo (optimiza el PNG si hace falta).
- **Nombres:** exactamente el `id` de la tabla, en minúsculas y con guiones.
- **No dejes subcarpetas ni archivos extra** (ni variantes, ni previsualizaciones) en esa carpeta.

## Verifica antes de terminar

Cuando termines (o cada vez que entregues una tanda), ejecuta desde la raíz del repositorio:

```bash
node scripts/graficos-codex.mjs --revisar
```

Corrige todo lo que marque en **rojo (error)** y revisa los avisos. Reporta al final: cuántos archivos entregaste, cuáles
faltan y por qué, y cuáles quedaron con aviso. También puedes pedir una hoja de contactos con `--contacto`.

## Lista de gráficos

### Overlays (capas que van encima de fotos y video)

| Archivo | Tamaño (px) | Qué dibujar | Lo usan |
| --- | --- | --- | --- |
| `overlays/grano-16x9.png` | 1920×1080 | Grano de película muy fino, gris claro y blanco sobre transparente, que cubre todo el lienzo de forma pareja (sin manchas ni rayas). Opacidad baja: se debe ver como textura sutil al ponerlo encima de una foto. | intro, doc-acto, cierre |
| `overlays/grano-9x16.png` | 1080×1920 | El mismo grano de película, en vertical. | reel-gancho, reel-foto-punch |
| `overlays/vineta-16x9.png` | 1920×1080 | Viñeta: bordes y esquinas en azul marino #08204a que se funden suavemente hacia el centro, que queda totalmente transparente. | intro, galeria, cierre, doc-acto |
| `overlays/vineta-9x16.png` | 1080×1920 | La misma viñeta azul marino, en vertical. | reel-gancho, reel-foto-punch, reel-cta |
| `overlays/destello-estrella.png` | 1600×1600 | Destello de lente: núcleo blanco brillante en el centro, con 4 y 8 rayos finos blanco y amarillo cálido que se desvanecen hacia los bordes. Centrado, simétrico. | transicion-flash, intro, reel-golpe |
| `overlays/rayos-radiales-amarillo.png` | 2400×2400 | Rayos radiales (sunburst) amarillo #ffd800 que salen del centro, de grosor alterno, con opacidad media y desvanecidos hacia los bordes. Pensado para girar lentamente detrás de un texto. | reel-golpe, intro, doc-acto |
| `overlays/particulas-luz-16x9.png` | 1920×1080 | Partículas de luz tipo bokeh y polvo: círculos suaves blancos y amarillo cálido de distintos tamaños y opacidades, repartidos de forma irregular. | intro, doc-acto, cierre |
| `overlays/particulas-luz-9x16.png` | 1080×1920 | Las mismas partículas de luz, en vertical. | reel-gancho, reel-cta |
| `overlays/lineas-velocidad-16x9.png` | 1920×1080 | Líneas de velocidad horizontales blancas, finas y largas, de distinta longitud y opacidad, concentradas en las franjas superior e inferior; el centro queda limpio. | transicion-barrido, doc-titular |
| `overlays/lineas-velocidad-9x16.png` | 1080×1920 | Líneas de velocidad verticales blancas, finas y largas, concentradas en los bordes izquierdo y derecho. | reel-barrido, reel-golpe |
| `overlays/halftone-amarillo.png` | 1920×1080 | Trama de puntos de semitono (halftone) amarillo #ffd800 en la esquina inferior derecha, con puntos grandes que se achican y desaparecen en diagonal hacia el centro. | doc-acto, doc-ficha, reel-dato |
| `overlays/glitch-franjas.png` | 1080×1920 | Franjas horizontales de falla digital (glitch): tiras desplazadas con separación de color solo en cian #19c6e6, amarillo #ffd800 y blanco (sin magenta ni rosa), más líneas de escaneo finas. Entre franjas, transparente. | reel-glitch |
| `overlays/bandas-diagonales.png` | 3000×1200 | Cuatro o cinco bandas diagonales anchas, paralelas, en azul marino #08204a, amarillo #ffd800 y blanco, con bordes nítidos; el resto transparente. Pensadas para cruzar la pantalla en una cortinilla. | transicion-barrido, intro, reel-barrido |

### Marcos, papeles y cintas

| Archivo | Tamaño (px) | Qué dibujar | Lo usan |
| --- | --- | --- | --- |
| `marcos/marco-esquinas-visor.png` | 1920×1080 | Cuatro esquinas de visor de cámara (corchetes en L) blancas, finas, a 60 px del borde, sin texto ni puntos de grabación; todo lo demás transparente. | doc-clip, galeria, doc-cita |
| `marcos/marco-neon-amarillo.png` | 1920×1080 | Marco fino de esquinas redondeadas en amarillo #ffd800 con resplandor suave (neón), a 40 px del borde; el interior queda completamente transparente. | galeria, doc-titular |
| `marcos/marco-neon-amarillo-vertical.png` | 1080×1920 | El mismo marco neón amarillo, en vertical. | reel-foto-tarjeta, reel-foto-punch |
| `marcos/cinta-adhesiva-a.png` | 800×300 | Trozo de cinta adhesiva de papel (masking tape) color crema semitransparente, ligeramente girado, con bordes dentados y textura de papel. Sin sombra pesada. | doc-titular, doc-ficha, reel-foto-tarjeta |
| `marcos/cinta-adhesiva-b.png` | 800×300 | Otro trozo de cinta adhesiva, translúcida y grisácea, girado en sentido contrario. | doc-titular, doc-ficha |
| `marcos/marco-polaroid.png` | 1000×1200 | Marco de foto instantánea (polaroid) blanco crema con sombra suave. La ventana de la foto debe ser un hueco TRANSPARENTE (para poner una foto real debajo), de unos 840×840 px, con el borde inferior más grueso. | galeria, doc-linea, reel-foto-tarjeta |
| `marcos/papel-rasgado-blanco.png` | 1800×500 | Tira de papel blanco rasgado, horizontal, con bordes irregulares de fibra arriba y abajo y una textura de papel muy leve. El interior sin texto ni líneas, para escribir encima. | rotulo, doc-titular, reel-etiqueta |
| `marcos/papel-rasgado-amarillo.png` | 1800×500 | La misma tira de papel rasgado, en amarillo #ffd800. | rotulo, reel-etiqueta |
| `marcos/chincheta-roja.png` | 300×300 | Chincheta roja de plástico vista de frente y ligeramente desde arriba, con brillo y sombra corta. Fondo transparente. | doc-linea, doc-titular |

### Anotaciones dibujadas a mano

| Archivo | Tamaño (px) | Qué dibujar | Lo usan |
| --- | --- | --- | --- |
| `anotaciones/flecha-amarilla-curva.png` | 1000×1000 | Flecha curva dibujada a mano con marcador grueso amarillo #ffd800, con trazo irregular natural y contorno oscuro fino. Sin texto. | reel-dato, reel-foto-punch, doc-ficha |
| `anotaciones/flecha-amarilla-recta.png` | 1000×400 | Flecha recta horizontal dibujada a mano con marcador amarillo, apuntando a la derecha. | reel-dato, doc-linea |
| `anotaciones/flecha-roja-curva.png` | 1000×1000 | Flecha curva a mano con marcador rojo #e5202e. | reel-dato, doc-titular |
| `anotaciones/circulo-resaltador-rojo.png` | 1200×800 | Óvalo dibujado a mano con marcador rojo #e5202e, trazo grueso e irregular, que no cierra del todo (el final se cruza con el principio). Interior transparente. | reel-foto-punch, doc-titular, doc-cita |
| `anotaciones/circulo-resaltador-amarillo.png` | 1200×800 | El mismo óvalo a mano, con marcador amarillo #ffd800. | reel-foto-punch, doc-ficha |
| `anotaciones/subrayado-pincel-amarillo.png` | 1600×200 | Subrayado de pincel seco horizontal en amarillo #ffd800, con bordes rugosos y extremos que se afinan. Sin texto. | doc-acto, rotulo, reel-gancho, doc-contador |
| `anotaciones/subrayado-pincel-blanco.png` | 1600×200 | El mismo subrayado de pincel seco, en blanco. | doc-acto, reel-pregunta |
| `anotaciones/equis-roja.png` | 600×600 | Equis roja #e5202e dibujada a mano con dos trazos gruesos de marcador. | doc-titular, reel-versus |
| `anotaciones/check-verde.png` | 600×600 | Marca de verificación (check) verde #1fb15a dibujada a mano con un trazo grueso de marcador. | doc-titular, reel-versus |
| `anotaciones/signo-pregunta-amarillo.png` | 600×800 | Signo de interrogación «?» grande, grueso, amarillo #ffd800 con contorno azul marino y sombra corta; estilo cómic. | reel-pregunta, doc-cita |
| `anotaciones/signo-exclamacion-rojo.png` | 400×800 | Signo de exclamación «!» grande, grueso, rojo #e5202e con contorno blanco y sombra corta; estilo cómic. | reel-alerta, doc-titular |
| `anotaciones/comillas-amarillas.png` | 700×600 | Comillas de apertura « “ » enormes y gruesas en amarillo #ffd800, estilo tipográfico editorial, sin ningún otro texto. | doc-cita, reel-cita |

### Sellos de tinta (interior vacío)

| Archivo | Tamaño (px) | Qué dibujar | Lo usan |
| --- | --- | --- | --- |
| `sellos/sello-rectangular-rojo.png` | 1400×600 | Sello de tinta rectangular rojo #e5202e: doble borde grueso, esquinas redondeadas y textura desgastada (tinta irregular). El INTERIOR VA VACÍO Y TRANSPARENTE, sin letras, porque el texto («FALSO», «CONFIRMADO»…) se escribe después. | doc-titular, reel-alerta |
| `sellos/sello-rectangular-verde.png` | 1400×600 | El mismo sello rectangular, en verde #1fb15a y con interior vacío. | doc-titular, reel-alerta |
| `sellos/sello-rectangular-amarillo.png` | 1400×600 | El mismo sello rectangular, en amarillo #ffd800 con borde oscuro, para «RUMOR», y con interior vacío. | doc-titular, reel-alerta |
| `sellos/sello-circular-rojo.png` | 1000×1000 | Sello de tinta circular rojo #e5202e con doble aro y textura desgastada. Interior vacío y transparente, sin letras ni estrellas. | doc-titular, reel-alerta |
| `sellos/sello-circular-azul.png` | 1000×1000 | Sello circular azul marino #08204a con doble aro y textura desgastada, interior vacío y transparente. | doc-ficha, doc-contador |

### Iconos y objetos

| Archivo | Tamaño (px) | Qué dibujar | Lo usan |
| --- | --- | --- | --- |
| `iconos/balon-generico.png` | 800×800 | Balón de fútbol genérico, plano y limpio, blanco con paneles azul marino #08204a, contorno grueso y brillo suave. NO imites la marca ni el diseño de un balón oficial de ningún torneo. | galeria, reel-etiqueta, doc-linea, reel-marcador |
| `iconos/silbato.png` | 800×800 | Silbato de árbitro amarillo y azul marino, estilo plano con contorno grueso, sin cordón largo. | reel-etiqueta, doc-ficha |
| `iconos/guante-portero.png` | 800×800 | Guante de portero genérico, plano y limpio, amarillo y azul marino, sin marcas ni logos. | doc-ficha, reel-dato |
| `iconos/botin-futbol.png` | 800×800 | Botín de fútbol genérico visto de lado, plano, blanco y amarillo, sin marcas, rayas de fabricante ni logos. | doc-ficha, reel-dato |
| `iconos/tarjeta-amarilla.png` | 600×800 | Tarjeta amarilla de árbitro: rectángulo vertical amarillo #ffd800 de esquinas redondeadas, brillo suave y sombra corta. | reel-dato, doc-ficha, reel-alerta |
| `iconos/tarjeta-roja.png` | 600×800 | Tarjeta roja de árbitro, igual que la amarilla pero roja #e5202e. | reel-dato, doc-ficha, reel-alerta |
| `iconos/copa-generica.png` | 900×1200 | Copa de campeón genérica y abstracta, dorada, con dos asas y base, estilo plano con brillo. NO copies ni se parezca al trofeo de la Copa del Mundo, la Champions, la Libertadores ni ningún trofeo real. | doc-ficha, doc-linea, reel-lista |
| `iconos/medalla-oro.png` | 700×900 | Medalla dorada genérica con cinta azul marino y blanca, sin números ni letras en el disco. | doc-ficha, reel-lista |
| `iconos/avion-silueta.png` | 1200×1200 | Silueta de avión comercial vista desde arriba, apuntando a la derecha, blanca con contorno azul marino fino y sombra corta. Sin aerolínea ni logos. | doc-mapa, doc-linea |
| `iconos/pin-mapa-amarillo.png` | 400×600 | Marcador de mapa en forma de gota amarillo #ffd800 con contorno azul marino y un círculo central blanco; la punta hacia abajo; sombra corta. | doc-mapa, doc-linea |
| `iconos/lupa.png` | 800×800 | Lupa con aro azul marino y mango amarillo, lente transparente con un reflejo leve. | doc-mapa, doc-acto |
| `iconos/reloj-simple.png` | 800×800 | Reloj analógico simple: esfera blanca, aro azul marino, manecillas amarillas, sin números ni marcas de fabricante. | doc-linea, reel-progreso |
| `iconos/billete-generico.png` | 1000×500 | Billete genérico y estilizado en verde, con un círculo y un símbolo «$» simple; SIN retratos, escudos ni diseño de ninguna moneda real. | doc-contador, reel-dato |
| `iconos/moneda-dorada.png` | 600×600 | Moneda dorada vista de frente con borde en relieve y un símbolo «$» simple en el centro; brillo suave. | doc-contador, reel-dato |
| `iconos/campana-amarilla.png` | 600×700 | Campana de notificación amarilla #ffd800 con contorno azul marino, brillo suave y badajo visible, estilo plano. | suscribete, reel-cta |
| `iconos/cursor-mano.png` | 500×600 | Cursor de ratón en forma de mano con el dedo índice señalando hacia arriba a la izquierda: blanca con contorno negro fino y sombra corta, estilo interfaz. | suscribete, reel-cta |
| `iconos/corazon-rojo.png` | 600×600 | Corazón rojo #e5202e plano con brillo y contorno blanco fino, sin letras. | reel-cta, suscribete |
| `iconos/pulgar-arriba-amarillo.png` | 600×600 | Pulgar hacia arriba (me gusta) en amarillo #ffd800 con contorno azul marino, plano. No uses el icono de ninguna red social. | reel-cta, suscribete |
| `iconos/rayo-amarillo.png` | 600×900 | Rayo en zigzag amarillo #ffd800 con contorno azul marino, brillo y sombra corta. | reel-versus, reel-golpe, reel-gancho |
| `iconos/llama-fuego.png` | 600×800 | Llama estilizada en amarillo y naranja con un núcleo blanco, estilo plano con contorno suave; para «lo más caliente». | reel-etiqueta, reel-gancho |
| `iconos/estrellas-brillos.png` | 1200×800 | Racimo de cinco destellos en forma de estrella de cuatro puntas, blancos y amarillos, de distintos tamaños, repartidos en diagonal. | doc-ficha, reel-lista, doc-acto |
| `iconos/confeti.png` | 1920×1080 | Confeti cayendo: tiras y cuadros pequeños azul marino, amarillo, blanco, verde y cian, repartidos por todo el lienzo con distintas rotaciones. Sin magenta, rosa ni morado. | cierre, doc-acto |
| `iconos/ticket-entrada.png` | 1000×500 | Entrada de estadio genérica: rectángulo con muescas semicirculares a los lados, amarillo y azul marino, líneas decorativas y SIN texto, números ni logos. | doc-ficha, doc-linea |

### Texturas y fondos

| Archivo | Tamaño (px) | Qué dibujar | Lo usan |
| --- | --- | --- | --- |
| `texturas/cesped-franjas.png` | 1920×500 | Césped visto desde arriba con franjas de corte alternadas verde claro y oscuro, de textura fina. El borde superior se desvanece a transparente. Sin líneas de cancha ni publicidad. | doc-ficha, doc-linea, cierre |
| `texturas/red-porteria.png` | 1920×1080 | Malla de red de portería blanca con hilos finos y cruces, algo de perspectiva y desenfoque en los bordes. Sobre transparente, para ponerla encima de una foto. | doc-ficha, intro |
| `texturas/fondo-azul-textura-16x9.png` | 1920×1080 (opaco) | Fondo azul marino #08204a con degradado sutil hacia un azul algo más claro en una esquina y una trama muy tenue de líneas diagonales o puntos. Es opaco a propósito (como su versión vertical); sin texto ni objetos. | doc-acto, doc-mapa, doc-ficha, doc-contador |
| `texturas/fondo-azul-textura-9x16.png` | 1080×1920 (opaco) | El mismo fondo azul marino con degradado y trama sutil, en vertical. Opaco a propósito. | reel-dato, reel-lista, reel-pregunta, reel-cita |
