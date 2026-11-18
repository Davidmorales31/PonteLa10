# Pack de assets del video diario (Pont3la10)

Escenas reutilizables de HyperFrames para el video diario (16:9, 1920×1080, 30 fps) y un muestrario que las encadena (`index.html`, 37,6 s). Fase 2 del proyecto; el generador (fase 3) monta estas escenas a partir del `guion.json` de `.agents/skills/pont3la10-video-diario-guion`.

Identidad: azul marino `#08204a`, amarillo `#ffd800`, Montserrat, logo blanco en alta resolución (`assets/logo-blanco.png`, derivado de `public/brand/pont3la10_logo_modo_blanco.png`).

## Reglas del pack

1. **Siempre hay una imagen en pantalla.** Nada de gráficos a pantalla completa con cifras o marcadores: los datos van en tarjetas pequeñas encima de la foto.
2. **Motion graphics pequeños y reutilizables:** rótulo, cifra, marcador de esquina, ticker y suscríbete son superpuestos con fondo transparente.
3. **Un espacio sin foto se ve como «Espacio para imagen»**, para que el editor ponga la suya; nunca se rellena con un gráfico.
4. Cada pieza cambia con variables (textos, fotos, cifras): el agente solo llena datos y no gasta tokens rediseñando.

## Escenas (`compositions/`)

| Escena | Duración | Uso | Variables |
| --- | --- | --- | --- |
| `intro` | 4,1 s | Foto de la noticia principal con tinte azul, bandas diagonales, golpe del logo con anillo y destello, línea y fecha | `fondo`, `kicker`, `fecha` |
| `galeria` | 2–8 s por foto | Hasta 3 fotos, cada una con Ken Burns propio y su crédito; marca de agua arriba a la derecha | `cantidad`, `segundosPorFoto`, `foto1..3`, `credito1..3` |
| `rotulo` | 5 s (superpuesto) | Rótulo inferior de noticiero: etiqueta, titular y fuente | `etiqueta`, `titular`, `fuente` |
| `dato-mini` | 5 s (superpuesto) | Tarjeta pequeña (arriba a la derecha) con una cifra que cuenta hasta su valor | `etiqueta`, `valor`, `sufijo`, `descripcion`, `fuente` |
| `marcador-mini` | 5 s (superpuesto) | Marcador de esquina estilo transmisión (arriba a la izquierda) | `local`, `visita`, `golesLocal`, `golesVisita`, `estado` |
| `ticker` | 5 s (superpuesto) | Franja de «Última hora» con titulares en desplazamiento | `etiqueta`, `texto` |
| `suscribete` | 4,5 s (superpuesto) | Tarjeta del canal; el cursor pulsa Suscríbete y la campana | `nombre`, `lema` |
| `cara` | 3 s | Marcador de posición de la toma a cámara (el editor lo reemplaza por el clip grabado) | `duracion`, `guion` |
| `cierre` | 6 s | Foto con tinte y zonas para la pantalla final de YouTube (2 videos y suscripción) | `fondo`, `web` |
| `transicion-barrido` | 1 s (superpuesta) | Cortinilla de bandas con el isotipo; el corte va en 0,5 s | — |
| `transicion-flash` | 0,6 s (superpuesta) | Destello de cámara; el corte va en 0,3 s | — |

La escena `galeria` dura `cantidad × segundosPorFoto`: el host le da ese espacio (`data-duration`) y sus variables con `data-variable-values`.

## Imágenes: de dónde salen y licencias

En orden, y siempre con el crédito exacto en pantalla:

1. Las portadas de los artículos del día (ya acreditadas en `media_files.credit`).
2. Otras fotos de la misma noticia en las fuentes del artículo, con su crédito («Fotógrafo (vía medio)»), igual que en el sitio.
3. Wikimedia Commons u Openverse, solo con licencia CC0, CC BY o CC BY-SA y atribución completa (autor, licencia).
4. Si no hay foto apta, el espacio queda vacío para que Juan ponga la suya.

Nunca: imágenes generadas por IA, ilustraciones, montajes con logos, capturas de transmisiones ni resultados de buscadores sin licencia identificada.

## Sonido (`assets/sonidos/`)

Efectos incluidos en HyperFrames (`media-use`, fuente «bundled»): `whoosh-a` y `whoosh-b` (la segunda es una variante grave de la primera) para cortes, `pop` para etiquetas y cifras, `clic` para el cursor e `impacto` (subida y golpe) para el logo. En el muestrario el pico de cada efecto cae un cuadro después de su imagen. No hay cama musical: no hay catálogo musical sin cuenta de HeyGen ni MusicGen local instalado.

## Uso

```bash
cd videos/pack-pont3la10
npx hyperframes preview     # editar y ver en vivo
npx hyperframes check       # validar
npx hyperframes render --output renders/muestrario-pack.mp4
```

Las fotos de ejemplo (`assets/foto-a.jpg`, `assets/foto-b.jpg`) no se versionan: son portadas de artículos con crédito de agencia. Para probar el muestrario, coloca dos fotos con esos nombres.

## Límites conocidos

- Una misma escena no se puede montar dos veces en una composición sin duplicar ids; el generador debe crear una copia por instancia con ids con sufijo.
- El ticker desplaza los titulares más rápido de lo que alcanza a leerse en 5 s; en el video real debe durar más o llevar menos texto.
- `check` avisa que el primer cuadro es la intro (opaca): es intencional, la miniatura se sube aparte.
