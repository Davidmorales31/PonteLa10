---
name: pont3la10-reels-guion
description: Escribe los guiones de Reels y Shorts propios de Ponte la 10 (3 a 5 por día, 25–55 s, 9:16) a partir de las noticias del video diario: gancho de 3 capas, beats encadenados con un visual cada uno (foto con zoom, dato, lista, cita, marcador…), re-gancho, un solo llamado a la acción y bucle. Lo valida con la rúbrica ejecutable y crea los proyectos del estudio.
---

# Guiones de Reels y Shorts propios

Investigación y reglas de fondo: `docs/REELS_PROPIOS.md`. Números: `config/reelsDiario.json`. Reglas editoriales
(fuentes, rumores, fotos reales con crédito, nada de IA): las de `pont3la10-futbol-colombiano-run`, que mandan.

## Qué produces

`videos/diario/<fecha>/guion-reels.json` que pase `node scripts/video-rubrica-reels.mjs <archivo>` con **APROBADO**, y
luego los proyectos del estudio con `node scripts/video-generar-reel.mjs <fecha>`. Juan graba la voz de cada Reel (gancho,
desarrollo y cierre) en el estudio; el resto lo arma código. No publiques nada.

## Elegir las historias (3 a 5)

1. Parte del `guion.json` del video del día (mismas historias, ya verificadas) y de sus artículos.
2. Elige las que funcionan solas en 30 s: una cifra fuerte, un nombre famoso, un giro, una polémica sana, una previa.
   Una historia por Reel, clubes distintos, la más fuerte primero.
3. Formatos (varíalos en el día): `bomba` (el hecho en el gancho), `dato` (la cifra manda), `polemica` (pregunta al
   final), `top` (lista de 3), `previa` (versus y hora), `emocion` (el partidazo).

## Molde de cada Reel (25–55 s a 170 palabras por minuto ≈ 70–150 palabras)

| Pieza | Reglas |
| --- | --- |
| `gancho.texto` (hablado) | ≤ 14 palabras, se resuelve antes del segundo 3, con nombre propio o cifra. Nunca «hola», «bienvenidos», «en este video», «hoy les traigo», «sabías que». La promesa debe ser exactamente lo que el Reel cuenta. |
| `gancho.pantalla` | 3–7 palabras en MAYÚSCULAS que se lean sin sonido; `resaltar` = una de ellas (va en amarillo). No repite el título. |
| `beats` (4–9) | Una idea por beat, ≤ 28 palabras. Encadenados con «pero / por eso / entonces / así que / y ojo». El segundo dato más fuerte arriba; el más fuerte como recompensa. La fuente se nombra en la voz («según Infobae»). |
| `rehook` | Si pasa de 30 s, un beat con `"rehook": true` («pero aquí viene lo complicado…»). |
| `cierre` | Un solo llamado a la acción, ≤ 22 palabras («Sigue a Ponte la 10…»). Ideal: la última frase engancha con la primera (`"bucle": true`). Ningún otro beat pide seguir o comentar. |
| `titulo` | 25–70 caracteres, nombre propio al principio, fiel al contenido. |

Voz cercana como en el video diario («les cuento», «miren», «ojo», «para mí»), frases cortas, números legibles en voz alta.
Los rumores van como rumor («según X, sin confirmación oficial») y con `"rumor": true` (el video lleva el sello RUMOR).

## El visual de cada beat (`visual.tipo`)

`punch` (foto con golpe de zoom; `pantalla` = palabra clave opcional, `foco` = "x% y%" si la cara no está arriba al centro),
`paneo` (recorre una foto horizontal), `tarjeta` (foto entera; `imagen2` cae encima), `dividida` (dos fotos con `nombre1` y
`nombre2`), `dato` ({etiqueta, valor, prefijo, sufijo, descripcion}), `lista` ({titulo, items[≤3]}), `cita` ({texto textual,
autor}), `marcador` ({competencia, local, golesLocal, visita, golesVisita, estado}), `versus` ({equipo1, equipo2, detalle}),
`pregunta` (texto).

- Al menos 3 tipos distintos por Reel y nunca dos gráficos iguales seguidos. Alterna fotos y gráficos.
- Las fotos de foto (`punch`, `paneo`, `tarjeta`) duran ≤ 4 s: el generador parte un beat largo en varios planos y
  rota las fotos que le des (`imagen`, `imagen2` y las que Juan suba), así que da 2 fotos a los beats largos.
- **Solo fotos reales con crédito exacto**: las del artículo (URL de `media_files`) o las que ya encontró el buscador del
  video largo, citadas como `"origen:assets/fotos/<archivo>.jpg"` con el crédito que tiene en `estudio.json`
  (`fotosExtra`). Nunca IA, ilustraciones, logos ni montajes. Cifras, citas y marcadores solo si están en la fuente.

## Formato

```json
{
  "fecha": "2026-11-19",
  "reels": [
    {
      "id": "r1", "formato": "bomba", "articuloSlug": "…", "club": "Deportivo Pasto", "fuente": "Infobae", "rumor": false,
      "alerta": "opcional: OFICIAL o ÚLTIMA HORA (nunca en un rumor)",
      "gancho": { "texto": "…", "pantalla": "SOLO LE QUEDAN 3", "resaltar": "3", "imagen": "https://…", "credito": "Colprensa (vía Infobae)" },
      "beats": [
        { "id": "v1", "texto": "Según Infobae, …", "visual": { "tipo": "dato", "dato": { "etiqueta": "PLANTEL", "valor": 22, "sufijo": "SALIDAS", "descripcion": "De 25 inscritos, solo quedan 3" } } },
        { "id": "v2", "texto": "Pero ojo …", "rehook": false, "visual": { "tipo": "punch", "imagen": "origen:assets/fotos/auto-b1-x.jpg", "credito": "Vanguardia", "pantalla": "SIN SUELDO" } }
      ],
      "cierre": { "texto": "Sigue a Ponte la 10 …", "cta": "Sigue a Ponte la 10", "bucle": true },
      "titulo": "…", "descripcion": "…", "hashtags": ["#DeportivoPasto", "#LigaBetPlay"]
    }
  ]
}
```

## Validar y crear los proyectos

1. `node scripts/video-rubrica-reels.mjs videos/diario/<fecha>/guion-reels.json` hasta **APROBADO** (no maquilles el JSON
   para que pase; corrige el guion).
2. `node scripts/video-generar-reel.mjs <fecha>`: crea `videos/diario/<fecha>-reel-<n>` con el teleprompter, las escenas
   verticales del pack (`reel-*`) y los efectos.
3. Opcional: `npx hyperframes check` dentro de un Reel (los avisos de TikTok se ignoran: no es plataforma del plan).

**Edición internacional:** el archivo va en `videos/diario/<fecha>-internacional/guion-reels.json` con
`"edicion": "internacional"` en la raíz; las fotos «origen:» salen de ese proyecto; se crean con
`node scripts/video-generar-reel.mjs <fecha>-internacional` y quedan como `<fecha>-internacional-reel-<n>`.

## Entrega

Informa: los Reels con su club, formato, duración estimada y puntaje; qué historias del día descartaste y por qué; y que
Juan debe grabar gancho, desarrollo y cierre de cada uno en el estudio (proyectos «Reel N · Club»).

## Horas de publicación

Si propones o programas horas, usa solo `config/horariosPublicacion.json` (explicado en `docs/HORARIOS_PUBLICACION.md`): la noticia del día sale en la primera franja libre de hoy. Programar sigue requiriendo la aprobación de Juan.
