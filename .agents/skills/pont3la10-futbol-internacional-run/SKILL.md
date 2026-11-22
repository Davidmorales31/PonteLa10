---
name: pont3la10-futbol-internacional-run
description: Corrida editorial de fútbol internacional de Pont3la10 (categoría Fútbol mundial): fase de tendencias del momento (Google Trends por país + radar de noticias con URL real), selección de 10 a 20 historias de ligas europeas, copas, selecciones y figuras, redacción por el agente, foto real con crédito y aprobación IA por la API privada. Es la gemela de pont3la10-futbol-colombiano-run para el resto del mundo.
---

# Corrida editorial de fútbol internacional

Pedido del responsable (2026-11-21): replicar en el fútbol internacional lo que ya funciona en el colombiano
(noticias del sitio → video diario → Reels/Shorts → miniaturas), con una **fase de tendencias** al inicio para
saber qué se está buscando y comentando en ese momento, y con muchas noticias (mínimo 10; ideal 20).

Este skill **no cambia la mecánica** de la corrida de Colombia: lee `pont3la10-futbol-colombiano-run/SKILL.md` y
aplica sus secciones 3 a 6 y 8 (fuentes, verificación, títulos, fotos y seguridad) con las diferencias de aquí.
Si algo choca, manda este archivo.

## 0. Nicho y límites

- **Categoría `futbol-mundial`** (Fútbol mundial): Champions, Europa League, Premier League, LaLiga, Serie A,
  Bundesliga, Ligue 1, MLS, Liga Saudí, Copa Libertadores y Sudamericana, ligas de Argentina y Brasil, selecciones
  y figuras mundiales. Los colombianos en el exterior también entran aquí (y siguen siendo prioridad si hay noticia).
- **No** produce fútbol colombiano (lo cubre su propia corrida) ni Liga MX (sitio de México). En la agenda, las
  demás categorías van con `omittedReason`: «Fuera del enfoque de esta corrida: solo fútbol internacional
  (categoría Fútbol mundial).»
- **Tope compartido.** La corrida vive en el sitio de Colombia (`co`): comparte el tope de **seis identidades por
  fecha de Bogotá** con las cuatro corridas diarias de Colombia y el de **12 artículos por corrida**. Por eso, en un
  día normal hay espacio para **dos corridas internacionales** (hasta 24 artículos). Antes de reservar, mira en la
  salud cuántas corridas lleva el día; si se alcanzó el tope, informa y termina sin forzar.
- **Meta por día:** mínimo 10 y máximo 20 artículos nuevos. Si en una corrida no caben, reserva la segunda.

## 1. Fase de tendencias (obligatoria, antes de elegir historias)

```bash
node scripts/tendencias-futbol-internacional.mjs --salida <temporal>/tendencias.json
```

Junta señales públicas sin claves: **Google Trends** diario de CO, MX, ES, AR y US (`config/fuentesFutbolInternacional.json`
→ `tendencias.paises`), el **radar de Google Noticias** por competición, club y figura (último día) y, para los
15 primeros temas, **notas con URL real** del RSS de Bing Noticias (campo `notas`). Filtra lo que no es fútbol
internacional (Liga MX, Liga BetPlay y otros deportes como la NBA) y ordena por un puntaje de interés.

- El puntaje **solo sirve para elegir**: no es una métrica publicable. Solo se escribe «lo más buscado» si se cita
  la medición con fecha y ámbito (por ejemplo, «tendencia en Google en Argentina el 21 de noviembre»).
- Un tema de Trends no es una historia: busca el **hecho concreto** detrás (resultado, lesión, declaración,
  fichaje) y léelo completo en la nota original. Los enlaces de Google Noticias son opacos: usa las `notas` de Bing
  o el sitio del medio. **Un titular no es una fuente.**
- Si necesitas más notas de un tema, el mismo radar sirve para cualquier consulta:
  `https://www.bing.com/news/search?q=<consulta>&format=rss&setlang=es&cc=CO` (el enlace trae `url=` con la URL real).

## 2. Elegir las historias (10–20)

Orden de preferencia: (1) lo que está en tendencia y tiene hecho verificable; (2) la mayor consecuencia deportiva
(títulos, liderato, eliminaciones, lesiones graves confirmadas por el club); (3) figuras (Messi, Cristiano, Mbappé,
Haaland, Kane, Yamal…) y colombianos en el exterior; (4) previas de partidos grandes del día siguiente.
Variedad obligatoria: no más de 3 piezas de una misma liga en la corrida y una historia por club mientras se pueda.
Lee `config/fuentesFutbolInternacional.json` (competiciones, clubes de mayor interés, figuras y medios).

Fuentes: una identificable basta (medios de la lista, sitios oficiales de clubes y ligas, agencias). Cada pieza
lleva **al menos dos fuentes leídas** en `sources`. Si dos fuentes se contradicen en un dato (minuto, asistencia,
número de títulos, nombre del estadio), **no lo afirmes**: omítelo o atribúyelo. Nada de salud ni vida privada sin
comunicado oficial del club (una lesión confirmada por el club sí; un diagnóstico neurológico filtrado, no).

## 3. Mecánica de la API (lo que exige el servidor)

1. `salud` → `contexto` con un UUID nuevo (`{"runId": "<uuid>"}`; sitio `co`, sin campo `site`).
2. **Agenda v2** con estado `in_progress`. Cada oportunidad lleva `scores` v2 (`demandSignal`, `clusterProximity`,
   `existingEntity`, `novelty`, `searchConsoleOpportunity`, `differentialValue`, `updateability`, `priorityScore`)
   y `assessment` v2 (`recommendation: "create"`, `targetUrl: null`, `entityMatch: null`, `cannibalizationRisk`,
   `similarArticleIds`, `addsNewValue: true`, `noveltyRationale`, `differentiator`, `searchConsoleEvidence: null`).
   El servidor **rechaza el formato v1** en corridas nuevas y exige `priorityScore` =
   round((demand·25 + cluster·20 + entity·10 + novelty·15 + differential·15 + updateability·5) / 90) cuando no hay
   Search Console; sin entidad del contexto, `existingEntity` = 0; con `create`, `updateability` < 60.
   La huella de cada historia (`fingerprint`) es un SHA-256 estable de `futbol-mundial|<clave de la historia>`.
3. Por pieza: foto (sección 4) → `media` → `propuesta-automatica` con `{proposal, briefSeo, review}`;
   `review.writer = "agent"`, `review.model` = tu identificador, `editorialFlags: ["credited_photo_cover"]`,
   `tagIds` solo del catálogo del contexto y hasta 3 `newTopics` (no repitas en la misma corrida un tema nuevo que
   otra pieza ya propuso: úsalo desde el catálogo en la corrida siguiente). Piso: 300 palabras de cuerpo.
4. Al final, cierra la agenda (`completed`; el servidor puede registrar `partial` porque las demás categorías
   quedan sin oportunidades, y no es un error).

## 4. Fotos

Igual que Colombia: foto real del protagonista, con crédito exacto del pie de foto o del medio («Getty Images (vía
Goal)», «EFE (vía El Espectador)», «Medio (imagen de la nota)»), revisada a ojo antes de subirla. Descarta
gráficos, montajes, collages, escudos y fotos de otro equipo. Una foto de archivo se marca como tal en el pie.

## 5. Después de la corrida: el video internacional

Cuando los artículos estén publicados, el video diario y los Reels se hacen igual que en Colombia, pero con la
**edición internacional** (ver `pont3la10-video-diario-guion`, sección «Edición internacional»): `"edicion":
"internacional"` en el guion, proyecto en `videos/diario/<fecha>-internacional` y Reels en
`videos/diario/<fecha>-internacional-reel-N`.

## 6. Redes sociales

Decisión del responsable (2026-11-22): las piezas internacionales **sí** van a Facebook e Instagram, como las de
Colombia. Al **inicio** de cada activación (para lo que ya esté publicado de la corrida anterior) y al final si
quedaron piezas publicadas:

1. Borradores: `node scripts/redes-publicar-articulo.mjs --pendientes --categoria futbol-mundial --horas 24
   --borrador --carpeta <temporal>/redes`. Junta las previsualizaciones en una hoja y ábrela.
2. Revisa cada imagen: foto del protagonista, logo y titular legibles, y que la palabra grande del formato no
   engañe (por ejemplo, «VICTORIA» en un empate). Anota los slugs que no pasan.
3. Programa el resto: el mismo comando con `--auto` en lugar de `--borrador` y `--excluir <slug1,slug2>` con los que
   no pasaron (quedan como borrador para que una persona los revise; repórtalos). `--auto` reparte una pieza cada
   15 minutos después de lo ya programado y salta la madrugada. Las **previas** deben salir antes del partido: si el
   orden automático las deja tarde, exclúyelas y repórtalas.
4. Si la API responde 429 `limite_excedido`, detente, no insistas y reporta los slugs pendientes.

## 7. Reporte

Corridas usadas, artículos programados por liga y club con título y hora, temas de tendencia que se convirtieron
en pieza y los que se descartaron (con motivo), datos omitidos por contradicción entre fuentes y bloqueos.
