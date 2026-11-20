---
name: pont3la10-video-diario-guion
description: Escribe el guion del video diario de Pont3la10 (mínimo 8 min, 16:9, voz cercana) a partir de los artículos publicados hoy: gancho, bloques por noticia con fuente, tomas breves con cara, planos con foto acreditada, pregunta final y cierre. Lo valida con la rúbrica ejecutable antes de entregarlo.
---

# Guion del video diario

Fuente de las decisiones: `docs/ESTUDIO_COMPETENCIA_VIDEO_DIARIO.md` (11 canales, 440 videos). Parámetros numéricos: `config/videoDiario.json`. Reglas editoriales (fuentes, rumores, fotos): las de `pont3la10-futbol-colombiano-run`, que mandan sobre este skill.

## Qué produces

Un archivo `guion.json` para el día (fecha de Bogotá) que pase `node scripts/video-rubrica-guion.mjs guion.json` con estado **APROBADO**. Juan lee el teleprompter y graba; el resto del video lo arma código. No inventes datos: todo sale de los artículos ya publicados en el sitio y de sus fuentes.

## Antes de escribir

1. Lista los artículos del día: `https://www.pont3la10.com/api/articulos?categoria=futbol-colombiano&limite=50`, filtrados por la fecha de Bogotá (UTC−5, no confíes en la variable TZ del shell).
2. Elige 8 a 12 historias (el video dura **mínimo 8 minutos**). Cubre muchos clubes, no solo la Selección: usa los artículos del día y, si faltan, los de la noche anterior que no salieron en el video de ayer. Orden de preferencia: la de mayor consecuencia deportiva, una primicia o dato nuevo, un «cómo queda» (tabla, cruces, cuadrangulares), después el resto. Una historia por club mientras sea posible. No repitas la del día anterior.
3. Lee de cada artículo el cuerpo completo y sus fuentes (`sources`); el guion se apoya en ellas, no en el titular.
4. Una historia sin foto real con crédito no entra al video.

## Estructura (8–10 minutos: 450–600 s a 155 palabras por minuto, unas 1.250 palabras)

| Pieza | Reglas |
|---|---|
| `gancho` (cara) | La noticia más fuerte del día en ≤ 28 palabras, con cifra, cita o fuente. **Nunca** empieza con saludo («hola», «bienvenidos»…). |
| `presentacion` | Saludo corto y cercano, invitación a suscribirse (en pantalla entra la animación de suscríbete justo aquí) y los 3 temas fuertes que vienen. |
| `bloques` (8–12) | Cada uno cuenta una noticia en 80–160 palabras de voz, con este molde: dato duro → fuente nombrada («según Win Sports», «informó el club») → contexto en una o dos frases → qué implica. Un `caraBreve` (≤ 30 palabras) que Juan dice a cámara al abrir el bloque. |
| `preguntaFinal` | Una pregunta que invite a comentar sobre la historia más discutible del día. |
| `cierre` (cara) | ≤ 45 palabras: recordatorio de suscripción y campana, y despedida personal. |

Cada bloque lleva `articuloSlug`, `fuente`, `rumor` (true/false) y `planos`: un plano o zoom por cada 8 segundos de bloque (un bloque de 45 s necesita 6). Cada plano usa una foto real del artículo con su `credito` exacto (el de `media_files.credit`). Nada de imágenes de partidos ni de video ajeno, ni ilustraciones, ni montajes con logos.

## Formato de `guion.json`

```json
{
  "fecha": "2026-11-18",
  "tituloVideo": "(el primero de titulos)",
  "titulos": ["…", "…", "…"],
  "miniatura": { "texto": "2 a 5 palabras", "resaltar": "una de esas palabras" },
  "gancho": { "texto": "…", "fuente": "…" },
  "presentacion": { "texto": "…" },
  "bloques": [
    {
      "id": "b1",
      "articuloSlug": "…",
      "club": "…",
      "fuente": "Win Sports",
      "rumor": false,
      "caraBreve": "…",
      "voz": "…",
      "planos": [{ "imagen": "https://…", "credito": "Colprensa (vía X)", "movimiento": "zoom-in" }],
      "titular": "opcional: rótulo del bloque (si falta, se usa el titular de portada del artículo)",
      "marcador": { "local": "CHI", "visita": "COL", "golesLocal": "0", "golesVisita": "0", "estado": "FINAL" },
      "dato": { "etiqueta": "FASE REGULAR", "valor": 40, "sufijo": "PTS", "descripcion": "Nacional terminó primero" }
    }
  ],
  "preguntaFinal": "…?",
  "cierre": { "texto": "…" }
}
```

`movimiento` admite `zoom-in`, `zoom-out`, `paneo-izquierda`, `paneo-derecha` y `fijo`; alterna para no repetir el mismo en dos planos seguidos.

**Regla visual (decisión de Juan):** nunca gráficos a pantalla completa. Los planos son **solo fotos reales**; las cifras van en `dato` (tarjeta pequeña sobre la foto) y los resultados en `marcador` (marcador de esquina), ambos opcionales y solo con datos que estén en la fuente. **Las imágenes las consigue el agente, no Juan (decisión de Juan, 2026-11-18, criterio de licencia bajo):** por cada noticia busca de 4 a 6 fotos reales más de la misma noticia o de sus protagonistas en cualquier medio (sitios de noticias, cuentas oficiales de clubes, Wikimedia Commons) y añádelas como planos con su crédito («Fotógrafo (vía medio)» o el nombre del medio), o pon las URLs de las notas de otros medios sobre la noticia en `fuentesFotos` del bloque (páginas, no imágenes: el buscador saca su foto principal con el crédito del medio). Después revisa la hoja de contactos (`--hoja`) y quita con `--quitar` gráficos, logos, montajes y fotos de otro club. Después del generador, `scripts/video-buscar-fotos.mjs` completa lo que falte y, si aun así faltan, el video repite las fotos de la noticia: nunca queda un hueco. Siempre fotos reales: nunca imágenes generadas por IA, ilustraciones, gráficos, tablas ni montajes.

**Regla de repetición (decisión de Juan, 2026-11-20):** ninguna foto ni clip aparece más de 3 veces en todo el video (intro, presentación, bloques y cierre). El generador lo hace cumplir: si a una noticia le faltan fotos, alarga sus planos en vez de repetir. Por eso cada noticia necesita de 3 a 6 fotos distintas: búscalas.

**Fotos y clips de redes (decisión de Juan, 2026-11-20):** en `fuentesFotos` puedes poner, además de notas de otros medios, URLs de publicaciones de X (`https://x.com/<cuenta>/status/<id>`) de los clubes, los protagonistas, la Dimayor, la Federación o periodistas, siempre que sean de esa misma noticia. El buscador también lee las publicaciones que las notas traen incrustadas. De ahí salen fotos (las verticales entran con fondo desenfocado) y clips de video sin sonido (máximo 2 por noticia, recortados a 15 s) con crédito «@cuenta en X (vía Medio)». Nunca clips de partidos ni de canales con derechos de transmisión (Win Sports, ESPN, DSports, Caracol, RCN…): YouTube los reclama con Content ID. Prefiere clips de entrenamientos, llegadas, firmas, ruedas de prensa y celebraciones publicadas por el propio club o protagonista. Revisa en la hoja de contactos los marcados `[VIDEO]` y quita los que no sirvan.

## Estilo de locución: cercano y de confianza

Juan le habla a su gente como un amigo que sabe de fútbol, no como un noticiero. La rúbrica exige voz cercana en al menos el 60 % de los bloques.

- Primera persona y hablándole al público: «les cuento», «miren esto», «ojo con este dato», «para mí», «la verdad», «imagínense», «vamos con…».
- Opiniones sí, pero marcadas como opinión («yo creo que…», «para mí…») y separadas del dato con su fuente. Nunca opiniones sobre salud, vida privada o acusaciones.
- Expresiones colombianas con naturalidad y sin exagerar; nada de groserías ni burlas a hinchadas o personas.
- Reacciones breves que suenen reales («¡qué partidazo!», «esto se puso bueno») solo cuando el hecho lo justifica.
- Transiciones conversadas entre bloques («y hablando de cuadrangulares…», «cambiemos de ciudad…»).
- Frases cortas, una idea por frase; Juan lo lee en voz alta a 150–165 palabras por minuto.
- Números y siglas legibles en voz alta («tres a dos», «Dimayor»). Marcadores y fechas solo si están en la fuente.
- Los rumores se cuentan como rumor («según X, sin confirmación oficial»). Si dos fuentes se contradicen, no afirmes el dato.
- Nada de salud, vida privada ni acusaciones sobre personas reales sin fuente de primer nivel.
- Sin relleno: si un bloque queda corto, añade contexto real del artículo o cambia de historia.

## Títulos (3 para la prueba A/B de YouTube) y texto de miniatura

YouTube permite probar hasta 3 títulos y 3 miniaturas; gana el de más tiempo de visualización, no el de más clics. Escribe **3 títulos distintos** en `titulos` (el primero también va en `tituloVideo`):

- **45–75 caracteres** (en la muestra de 389 títulos de canales de fútbol, los de 51–70 rinden 1,3 veces la mediana del canal). Lo clave (nombre propio y hecho) en los **primeros 40**, que es lo que se ve en el celular.
- Molde que más rinde: **reacción o gancho + nombre propio + hecho concreto** (cifra o dato si lo hay). Ejemplos de forma: «¡Once da el golpe! …», «Así fue la tapada de Vigouroux en el penal a Colombia», «La dolorosa lesión de … en …».
- Un ángulo distinto por título: (1) el dato o la primicia, (2) la reacción o emoción, (3) la pregunta o la polémica.
- Máximo 2 palabras en MAYÚSCULAS para énfasis, como mucho 1 emoji, una sola exclamación. Usa « | » solo si hay 3 o 4 historias de peso.
- Nunca prometas lo que el video no cuenta: el título debe ser fiel al contenido (la prueba A/B premia la retención, no el clic).

**Miniatura** (`miniatura`): 2 a 5 palabras en mayúsculas que **sumen** al título sin repetirlo (máx. 32 caracteres) y la palabra a resaltar en amarillo. Las miniaturas las diseña Codex desde el estudio («Títulos y miniaturas» → «Preparar encargo para Codex») con las fotos reales del día y la cara de Juan; nunca con imágenes generadas de personas o escenas.

## Rúbrica (obligatoria)

Ejecuta `node scripts/video-rubrica-guion.mjs guion.json` y corrige hasta **APROBADO** (puntaje ≥ 85 y sin fallos en los criterios obligatorios): duración total (450–600 s), gancho sin saludo, fuente atribuida en cada bloque, crédito en cada foto y rumores atribuidos. Informa el puntaje y los criterios que fallaron si no llegas a aprobar; no maquilles el JSON para que pase.

## Armar el proyecto de video

Con el guion aprobado, ejecuta:

```bash
node scripts/video-generar-proyecto.mjs guion.json
```

Crea `videos/diario/<fecha>/` (no se versiona) con el proyecto de HyperFrames armado con el pack `videos/pack-pont3la10`: intro, huecos de toma a cámara con la frase de cada uno, galerías de fotos (un espacio cada ~7 s; los que no tienen foto quedan marcados), rótulo con el titular de portada, marcador y cifra pequeños, transiciones y efectos de sonido. También deja `teleprompter.txt` (con tiempos, CARA/VOZ) y `manifiesto.json`. Valida con `npx hyperframes check` desde esa carpeta. No renderices ni publiques: Juan abre el estudio local (`npm run video:estudio`, http://localhost:4810), graba su voz y su cara tramo por tramo, sube fotos con crédito a los espacios vacíos, pulsa «Armar video» y aprueba el render.

## Entrega

Reporta: fecha, historias elegidas con su club, duración estimada, puntaje de la rúbrica, ruta del proyecto generado, cuántos espacios de foto quedaron por llenar y qué historias descartaste con su motivo. No publiques nada: la publicación la decide y aprueba Juan.

## Métricas después de publicar (lectura semanal)

Vistas a 24 h y 7 días frente a la mediana propia; me gusta/vistas (meta ≥ 2,5 %); comentarios/vistas (meta ≥ 0,1 %); retención a 30 s y media desde YouTube Analytics; visitas al sitio por UTM (`utm_source=youtube`). Sirven para ajustar este skill, no para inventar cifras en el guion.
