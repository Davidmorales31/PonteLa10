---
name: pont3la10-documental-guion
description: Elige el tema e investiga y escribe el guion del documental de los viernes de Pont3la10 (21–30 min, 16:9, voz narrada en 6 actos y 10–16 capítulos) sobre un futbolista o un suceso histórico, priorizando lo que esté en tendencia esa semana. Lo valida con la rúbrica ejecutable antes de entregarlo.
---

# Guion del documental de los viernes

Fuente de las decisiones: `docs/PLAN_DOCUMENTAL_SEMANAL.md` (7 canales y 196 videos medidos el 2026-11-23).
Parámetros: `config/documental.json`. Banco de temas: `config/bancoDocumentales.json`. Las reglas editoriales de
verificación (fuentes, rumores, salud y vida privada, fotos con crédito) son las de `pont3la10-futbol-colombiano-run`
(secciones 3, 4 y 6) y mandan sobre este skill.

## 1. Elegir el tema (lunes)

1. `node scripts/documental-elegir.mjs --actualizar --noticias --salida <temporal>/eleccion.json`
   Cruza el banco con las tendencias de los últimos 7 días: tendencia 50 %, interés de fondo 30 % y hueco 20 %, más un
   bono por efeméride cercana. Lo ideal es que `--actualizar` corra una vez al día para tener la semana completa.
2. Si en «En tendencia y fuera del banco» aparece una figura con hecho verificable (por ejemplo, un portero que fue
   noticia toda la semana), agrégala al banco con alias, ángulo y etiquetas **antes** de elegir, y vuelve a correr.
3. Cada tema del banco sugiere su **formato** (campo `formato`; ver sección 3). Propón al responsable el primero más dos suplentes, con su pregunta central y su formato. **Él aprueba el tema.** Los temas
   `sensible: true` (muertes, violencia, salud) necesitan su aprobación expresa del enfoque.

## 2. Investigar (martes)

- **Fuentes:** mínimo 5, de 3 medios distintos. Prioridad: biografías y archivos oficiales (clubes, FIFA, UEFA,
  federaciones); prensa de referencia (Marca, AS, El País, El Tiempo, BBC, The Guardian, L'Équipe, Clarín, Olé);
  entrevistas publicadas; Wikipedia solo para orientarse, no como única fuente de un dato.
- **Datos:** cada cifra, fecha, marcador o cita debe estar en una fuente leída completa. Si dos fuentes se contradicen,
  se dice («hay versiones…») o se omite.
- **Nada de diálogos inventados.** Si dramatizas, dilo: «imagina…».
- **Fotos:** reales con crédito (Wikimedia Commons, agencias vía medio, cuentas oficiales), al menos en la mitad de
  los capítulos.
- **Imágenes de transmisiones:** no se usan, porque dan reclamos de Content ID y le quitan la monetización a todo el
  video.

## 3. Formatos y estructura (medida en los documentales que funcionan)

Hay **cuatro formatos**, que se declaran con `"formato"` en el guion (si falta, es `biografia`). La rúbrica valida el largo,
los actos y los capítulos de cada uno (`config/documental.json` → `formatos`). Todos abren con `pregunta` y terminan
volviendo a la pregunta central con sus palabras.

| `formato` | Largo | Actos, en orden | Capítulos | Para qué |
|---|---|---|---|---|
| `biografia` | 21–30 min (3.300–4.800 palabras) | pregunta, origen, ascenso, crisis, resolucion, legado | 10–16 | Un jugador o un suceso grande (la de siempre). |
| `historia-corta` | 8–11 min (1.250–1.800) | pregunta, origen, ascenso, giro, legado | 5–9 | «La Historia de [jugador]»: ascenso o giro de identidad (nació en un país y juega por otro, regresó, casi lo deja). Salen 2 por semana si funciona. |
| `epoca-club` | 18–30 min (2.900–4.800) | pregunta, origen, ascenso, apogeo, caida, legado | 9–16 | Época de un club o clásico («Era dorada de…», «¿Por qué X perdió su trono?»). |
| `explicador` | 12–18 min (1.900–2.900) | pregunta, contexto, evidencia, explicacion, respuesta | 6–11 | Un «¿por qué?» con datos, mapas, fichas y líneas de tiempo; sin jugadas ajenas ni análisis sin dato. |

**Apertura estándar (en los cuatro):** en los primeros ~40 s, un **dato con número y su fuente**, lo que no cuadra y la
**promesa** de qué se va a explicar. Es el patrón de los videos que más rinden en la competencia (aviso de la rúbrica, no error).

Lo que sigue describe la `biografia`; en los otros formatos cambian los actos y el largo de la tabla de arriba.

**Biografía:** entre 3.300 y 4.800 palabras a 160 palabras por minuto (21–30 min), en **6 actos en este orden** y de **10 a 16
capítulos** de 100–520 palabras (cada capítulo se graba de una vez).

| Acto (`id`) | ~Tiempo | Qué hace |
|---|---|---|
| `pregunta` | ≤ 45 s, ≤ 130 palabras | La paradoja o la escena más fuerte y la **pregunta central**. Nunca empieza con «hola», «bienvenidos» ni «en este video». |
| `origen` | ~4 min | Infancia o contexto: la herida, la carencia, el lugar. |
| `ascenso` | ~6 min | Logros con un antagonista o una duda viva. |
| `crisis` | ~6 min | La caída, la polémica, el día que todo cambió. |
| `resolucion` | ~5 min | La respuesta a la pregunta con datos. |
| `legado` | ~3 min | Qué nos deja; **vuelve a la pregunta del inicio** con sus palabras. |

- Al menos 4 de los 5 actos tienen una pregunta al público («¿ustedes qué creen…?»).
- Cierra con `preguntaFinal` (para comentar) y un `cierre` de ≤ 80 palabras (suscripción y «nos vemos el viernes»).
- Voz cercana de Juan, frases cortas y verbos fuertes. Un dato duro cada 30–40 segundos.

## 4. Títulos y miniatura

Molde medido: **CONFLICTO en mayúsculas | Nombre | Documental**. Ejemplos de la competencia: «Lo TACHARON de
ARROGANTE | Cristiano Ronaldo | Documental» y «¿Lo que lo hizo GRANDE… lo DESTRUYÓ? | Diego Maradona».

Escribe 2 o 3 títulos distintos para la prueba A/B (usa `pont3la10-titulos-clickbait`), de máximo 100 caracteres.
La miniatura lleva la cara del protagonista y 1–4 palabras del conflicto.

## 5. Formato del archivo

`videos/documentales/<AAAA-MM-DD>-<tema>/guion.json`. Los visuales tienen estos tipos:

- `foto`: `imagen` https y `credito`.
- `linea-tiempo`, `mapa`, `ficha` y `titular`: titular de época recreado con diseño propio.
- `cita`: texto atribuido.
- `clip-oficial`: solo de cuentas oficiales, con `credito`.
- `video`: clip con `video` (URL https de Commons u otra fuente libre), `desde`, `duracionMaxima`, `credito` y `licencia`. Si es alguien
  hablando a cámara (una entrevista), márcalo `"entrevista": true`: **no rellena tiempo**, la historia la cuenta el narrador.
- `testimonio` (máximo 3 por documental, de hasta 12 s): `video`, `desde`, `hasta`, `credito`, `licencia`, `quien` y `texto` (el
  subtítulo en español). Suena la voz real de la persona y el narrador calla.
- `stock`: `busqueda` (Pixabay o Pexels, si hay llave).

```json
{
  "tipo": "documental",
  "formato": "biografia",
  "tema": "<id del banco>",
  "protagonista": "Nombre",
  "preguntaCentral": "¿…?",
  "revisionSensible": false,
  "titulos": ["CONFLICTO | Nombre | Documental", "…"],
  "miniatura": { "texto": "1–4 palabras" },
  "actos": [
    { "id": "pregunta", "titulo": "…", "capitulos": [
      { "id": "c00", "titulo": "Para los capítulos de YouTube", "voz": "Texto del teleprompter",
        "fuentes": ["f1"],
        "visuales": [{ "tipo": "foto", "imagen": "https://…", "credito": "Autor (vía medio)" }] }
    ] }
  ],
  "preguntaFinal": "¿…?",
  "cierre": "…",
  "fuentes": [{ "id": "f1", "url": "https://…", "titulo": "…", "medio": "…" }]
}
```

## 6. Validar y entregar (miércoles)

`node scripts/documental-rubrica.mjs videos/documentales/<carpeta>/guion.json` debe dar **APROBADO**. La rúbrica
revisa:

- largo, orden de los actos (los de su `formato`) y apertura sin saludo; avisa si la apertura no trae un dato con número, su fuente y la promesa;
- capítulos con fuentes que existan;
- citas atribuidas;
- fotos con crédito;
- preguntas al público;
- que el final vuelva a la pregunta central;
- títulos con el molde y miniatura;
- revisión de los temas sensibles.

También imprime los **capítulos de YouTube** para la descripción.

Después de publicado, marca `publicado` (fecha) en el tema del banco para no repetirlo en un año.
