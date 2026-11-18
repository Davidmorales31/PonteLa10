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

Efectos incluidos en HyperFrames (`media-use`, fuente «bundled»): `whoosh-a` y `whoosh-b` (la segunda es una variante grave de la primera) para cortes, `pop` para etiquetas y cifras, `clic` para el cursor e `impacto` (subida y golpe) para el logo. En el muestrario el pico de cada efecto cae un cuadro después de su imagen. La cama musical va aparte (sección «Música, títulos y miniaturas»).

## Uso

```bash
cd videos/pack-pont3la10
npx hyperframes preview     # editar y ver en vivo
npx hyperframes check       # validar
npx hyperframes render --output renders/muestrario-pack.mp4
```

Las fotos de ejemplo (`assets/foto-a.jpg`, `assets/foto-b.jpg`) no se versionan: son portadas de artículos con crédito de agencia. Para probar el muestrario, coloca dos fotos con esos nombres.

## Generador (fase 3)

`node scripts/video-generar-proyecto.mjs <guion.json> [--salida <dir>] [--repetir-fotos] [--sin-red]` arma el video del día en `videos/diario/<fecha>/` con estas escenas: copia cada escena por instancia (ids con sufijo, p. ej. `gal3-slot-1`), descarga las fotos del guion y las pasa a JPG, toma el titular de portada de cada artículo para el rótulo y escribe `teleprompter.txt` y `manifiesto.json`. Con `--repetir-fotos` reutiliza las fotos del bloque en lugar de dejar espacios vacíos.

## Estudio local (fase 4)

```bash
npm run video:estudio      # abre http://localhost:4810 en Chrome o Edge
```

Trabaja sobre `videos/diario/<proyecto>/` en este equipo (solo escucha en 127.0.0.1 y rechaza peticiones de otros orígenes):

1. **Tramos:** gancho, presentación, toma a cámara y voz de cada noticia, pregunta y cierre, con su estado.
2. **Teleprompter:** texto grande con desplazamiento a la velocidad elegida (110–210 ppm), tamaño de letra y modo espejo.
3. **Grabar** (barra espaciadora): cuenta 3-2-1, graba con cámara (tramos CARA) o solo micrófono (tramos VOZ), deja revisar la toma y la guarda. El servidor la convierte (H.264 con un cuadro clave por segundo; voz normalizada a −16 LUFS) y mide su duración.
4. **Fotos por noticia:** subir fotos reales con crédito obligatorio; llenan los espacios «Espacio para imagen».
5. **Armar video:** vuelve a generar el proyecto con las tomas (duración real), la voz y las fotos (`estudio.json`). **Renderizar:** `renders/final.mp4`.

## Reels (fase 5)

En el estudio, **Crear Reels** (se habilita al terminar el render) o por comando: `node scripts/video-reels.mjs <proyecto> [--bloques b1,b3] [--max 5]`.

- **Qué elige:** hasta 5 noticias del video final con duración de 20 a 75 s, priorizando las que tienen dato o marcador, sin rumores y de clubes distintos. Cada Reel es una noticia completa (toma a cámara + voz).
- **Formato:** vertical 1080×1920, 30 fps, H.264/AAC. El video 16:9 va centrado sobre su propio fondo desenfocado, con el logo y la etiqueta del club arriba y subtítulos grandes abajo (la palabra que dices en amarillo, una sola línea a la vez).
- **Subtítulos:** `scripts/video-transcribir.py` transcribe la voz con faster-whisper (modelo `small`, en este equipo y sin red) y da el tiempo de cada palabra.
- **Salida:** `videos/diario/<proyecto>/renders/reels/` con los MP4 y `reels.json`, que trae por Reel la descripción lista para pegar (titular, resumen, enlace a la nota, crédito de la foto y etiquetas). El estudio los muestra en una ventana con «Copiar texto» y «Descargar».
- **Publicar y programar:** en la ventana de Reels cada uno trae su fecha y los botones **Programar**, **Solo borrador** y **Cancelar programación**, más **Programar todos** (primer Reel y un intervalo de 2 a 24 h). Pide confirmación antes de programar. Publica en Facebook e Instagram (Reel) con la misma API de agentes de redes y el mismo programador que las fotos: `scripts/video-publicar-reels.mjs` sube el MP4, crea una publicación de tipo «video», la valida y la programa (entre 10 minutos y 30 días). La llave `PONT3LA10_AGENTES_REDES_KEY` se lee del `.env` en el servidor local y nunca llega a la página; sin ella la ventana avisa y deja solo copiar y descargar. El estado (borrador, programada, publicada, falló) queda en `renders/reels/publicaciones.json` y se refresca desde la API al abrir la ventana. Cada llave tiene un máximo de programaciones por día.
- **Instagram:** el texto no lleva el enlace completo (no es clicable); dice «Nota completa en pont3la10.com». Facebook conserva el enlace.
- **Lo que no hace:** YouTube (Shorts) todavía no.

## Música, títulos y miniaturas (fase 6)

**Música de fondo.** `config/musicaLibre.json` trae 8 pistas con licencia verificada en Openverse (CC BY 3.0 de Jamendo y una CC0 de Freesound), cada una con su atribución. En el estudio se elige en el pie («Música») y se escucha antes. Al renderizar, `scripts/video-musica.mjs` descarga la pista (vuelve a verificar que la licencia siga siendo libre para uso comercial: solo CC0, CC BY o dominio público), la repite hasta cubrir el video y la mezcla sobre `renders/final-voz.mp4` → `renders/final.mp4`: entra y sale con fundido y baja sola cuando hablas (compresión con la voz como llave; medido: −24 LUFS sin voz, unos −36 bajo la voz) y el total se normaliza a −14 LUFS. La atribución se añade sola a la descripción de YouTube y de los Reels. Las pistas descargadas quedan en `videos/musica/` (no se versiona).

- No se usa MusicGen (sus pesos son CC BY-NC: no comercial) ni la Biblioteca de audio de YouTube (solo vale dentro de YouTube, y los Reels van a Meta).
- «Libre de regalías» no garantiza que no salte Content ID: si una pista recibe un reclamo, se quita de la biblioteca.

**Títulos A/B.** El guion trae `titulos` (3, para «Probar y comparar» de YouTube, que elige por tiempo de visualización) y `miniatura { texto, resaltar }`. La rúbrica revisa: 45–75 caracteres, nombre propio en los primeros 40, que sean distintos, máximo 2 palabras en mayúsculas y 1 emoji; y para la miniatura de 2 a 5 palabras (máx. 32 caracteres) que no repitan el título. En el estudio, **Títulos y miniaturas** los muestra con botón de copiar.

**Miniaturas (las hace Codex).** En esa misma ventana, **Preparar encargo para Codex** crea `renders/miniaturas/` con `ENCARGO-CODEX.md` y la carpeta `insumos/`: una foto real por noticia (hasta 3, con su crédito), el logo y un fotograma de tu cara tomado del gancho. El encargo pide 3 variantes de 1280×720 (A: cara + titular, B: foto del protagonista, C: pantalla dividida) y prohíbe generar personas, escenas o escudos. Copias el encargo, se lo das a Codex y luego subes las imágenes (o Codex las deja en la carpeta como `miniatura-a/b/c.jpg`); el estudio las normaliza a JPG 1280×720 de menos de 2 MB.

**Descripción de YouTube.** También en esa ventana, lista para copiar: resumen, capítulos con los tiempos reales del video (desde 0:00, al menos 3 y separados 10 s o más), enlaces a las notas con UTM de YouTube, créditos de las fotos, atribución de la música y etiquetas.

## Límites conocidos

- Una misma escena no se puede montar dos veces sin duplicar ids: por eso el generador crea una copia por instancia.
- El ticker desplaza los titulares más rápido de lo que alcanza a leerse en 5 s; en el video real debe durar más o llevar menos texto.
- `check` avisa que el primer cuadro es la intro (opaca): es intencional, la miniatura se sube aparte.
