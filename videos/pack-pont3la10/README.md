# Pack de assets del video diario (Pont3la10)

Escenas reutilizables de HyperFrames para el video diario (16:9, 1920×1080, 30 fps) y un muestrario que las encadena (`index.html`, 35,6 s). Fase 2 del proyecto; el generador (fase 3) monta estas escenas a partir del `guion.json` de `.agents/skills/pont3la10-video-diario-guion`.

Identidad: azul marino `#08204a`, amarillo `#ffd800`, Montserrat, logo blanco en alta resolución (`assets/logo-blanco.png`, derivado de `public/brand/pont3la10_logo_modo_blanco.png`).

## Escenas (`compositions/`)

| Escena | Duración | Uso | Variables |
| --- | --- | --- | --- |
| `intro` | 4,1 s | Apertura: bandas diagonales, golpe del logo con anillo y destello, línea y fecha | `kicker`, `fecha` |
| `plano-foto` | 8 s | Foto a pantalla completa con Ken Burns que cambia de dirección a los 4 s, marca de agua y crédito | `foto`, `credito` |
| `rotulo` | 5 s (superpuesto) | Rótulo inferior de noticiero: etiqueta, titular y fuente | `etiqueta`, `titular`, `fuente` |
| `tarjeta-dato` | 5 s | Cifra que cuenta hasta su valor, barra de progreso y fuente | `etiqueta`, `valor`, `maximo`, `sufijo`, `descripcion`, `fuente` |
| `marcador` | 5 s | Marcador de partido con estado, nota y fuente | `estado`, `local`, `visita`, `golesLocal`, `golesVisita`, `nota`, `fuente` |
| `ticker` | 5 s (superpuesto) | Franja de «Última hora» con titulares en desplazamiento | `etiqueta`, `texto` |
| `suscribete` | 4,5 s (superpuesto) | Tarjeta del canal; el cursor pulsa Suscríbete y la campana | `nombre`, `lema` |
| `cara` | 3 s | Marcador de posición de la toma a cámara (el editor lo reemplaza por el clip grabado) | `duracion`, `guion` |
| `cierre` | 6 s | Pantalla final con zonas para los elementos de YouTube (2 videos y suscripción) | `web` |
| `transicion-barrido` | 1 s (superpuesta) | Cortinilla de bandas con el isotipo; el corte va en 0,5 s | — |
| `transicion-flash` | 0,6 s (superpuesta) | Destello de cámara; el corte va en 0,3 s | — |

Los superpuestos tienen fondo transparente: van encima de una foto o de la toma a cámara.

## Sonido (`assets/sonidos/`)

Efectos incluidos en HyperFrames (`media-use`, fuente «bundled»): `whoosh-a` y `whoosh-b` (la segunda es una variante grave de la primera) para cortes, `pop` para etiquetas y cifras, `clic` para el cursor e `impacto` (subida y golpe) para el logo. En el muestrario el pico de cada efecto cae un cuadro después de su imagen. No hay cama musical: no hay catálogo musical sin cuenta de HeyGen ni MusicGen local instalado.

## Uso

```bash
cd videos/pack-pont3la10
npx hyperframes preview     # editar y ver en vivo
npx hyperframes check       # validar
npx hyperframes render --output renders/muestrario-pack.mp4
```

Las fotos de ejemplo (`assets/foto-a.jpg`, `assets/foto-b.jpg`) no se versionan: son portadas de artículos con crédito de agencia. Para probar el muestrario, coloca dos fotos con esos nombres; el generador usará las portadas del día con su crédito.

## Límites conocidos

- Una misma escena no se puede montar dos veces en una composición sin duplicar ids; el generador debe crear una copia por instancia con ids con sufijo.
- El ticker desplaza los titulares más rápido de lo que alcanza a leerse en 5 s; en el video real debe durar más o llevar menos texto.
- `check` avisa que el primer cuadro es la intro (opaca): es intencional, la miniatura se sube aparte.
