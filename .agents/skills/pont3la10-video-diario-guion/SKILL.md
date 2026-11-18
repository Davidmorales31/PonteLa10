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
  "tituloVideo": "…",
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

**Regla visual (decisión de Juan):** nunca gráficos a pantalla completa. Los planos son **solo fotos reales**; las cifras van en `dato` (tarjeta pequeña sobre la foto) y los resultados en `marcador` (marcador de esquina), ambos opcionales y solo con datos que estén en la fuente. Añade más fotos de la misma noticia cuando las encuentres con crédito o licencia CC0, CC BY o CC BY-SA (con atribución); si no hay, el generador deja el espacio marcado para que Juan ponga la suya. Nunca imágenes generadas por IA ni montajes.

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

## Título del video

40–110 caracteres. Un gancho concreto (primicia o dato) y los nombres propios del día. Usa « | » solo si de verdad hay 3 o 4 historias de peso (máximo 4 partes); el estudio mostró que la barra por sí sola no mejora las vistas.

## Rúbrica (obligatoria)

Ejecuta `node scripts/video-rubrica-guion.mjs guion.json` y corrige hasta **APROBADO** (puntaje ≥ 85 y sin fallos en los criterios obligatorios): duración total (450–600 s), gancho sin saludo, fuente atribuida en cada bloque, crédito en cada foto y rumores atribuidos. Informa el puntaje y los criterios que fallaron si no llegas a aprobar; no maquilles el JSON para que pase.

## Armar el proyecto de video

Con el guion aprobado, ejecuta:

```bash
node scripts/video-generar-proyecto.mjs guion.json
```

Crea `videos/diario/<fecha>/` (no se versiona) con el proyecto de HyperFrames armado con el pack `videos/pack-pont3la10`: intro, huecos de toma a cámara con la frase de cada uno, galerías de fotos (un espacio cada ~7 s; los que no tienen foto quedan marcados), rótulo con el titular de portada, marcador y cifra pequeños, transiciones y efectos de sonido. También deja `teleprompter.txt` (con tiempos, CARA/VOZ) y `manifiesto.json`. Valida con `npx hyperframes check` desde esa carpeta. No renderices ni publiques: Juan graba su voz y su cara, y aprueba.

## Entrega

Reporta: fecha, historias elegidas con su club, duración estimada, puntaje de la rúbrica, ruta del proyecto generado, cuántos espacios de foto quedaron por llenar y qué historias descartaste con su motivo. No publiques nada: la publicación la decide y aprueba Juan.

## Métricas después de publicar (lectura semanal)

Vistas a 24 h y 7 días frente a la mediana propia; me gusta/vistas (meta ≥ 2,5 %); comentarios/vistas (meta ≥ 0,1 %); retención a 30 s y media desde YouTube Analytics; visitas al sitio por UTM (`utm_source=youtube`). Sirven para ajustar este skill, no para inventar cifras en el guion.
