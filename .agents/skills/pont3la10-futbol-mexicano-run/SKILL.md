---
name: pont3la10-futbol-mexicano-run
description: Corrida editorial del sitio de México (mx.pont3la10.com) enfocada en Liga MX, Selección Mexicana y mexicanos en el exterior. Es la gemela de pont3la10-futbol-colombiano-run con otras fuentes, otro sitio, otra categoría y otros horarios; aprueba como IA y programa por la misma API privada auditada, con la corrida declarada como sitio mx.
---

# Corrida editorial de fútbol mexicano

Decisión del responsable (2026-11-19): el mismo sitio y panel sirven a México con un
subdominio y **tareas programadas propias**. Este skill no cambia la mecánica de la
corrida de Colombia: **lee `pont3la10-futbol-colombiano-run/SKILL.md` y aplica todo lo
que allí se dice (secciones 3 a 8: fuentes, verificación, títulos, fotos, flujo,
redes y seguridad) con las diferencias de este archivo.** Si algo choca, manda este.

## 0. Interruptor y diferencias

1. **Interruptor.** Lee `config/automatizacionEditorialMx.json`. Si `habilitada` es
   `false`, **no abras ninguna corrida ni produzcas nada**: responde «México aún no
   está habilitado» y termina. El responsable lo cambia a `true` cuando quiera empezar.
2. **Sitio.** El archivo de `contexto` lleva `"site": "mx"`:
   `{ "runId": "<uuid nuevo>", "site": "mx" }`. Eso crea la identidad de la corrida en el
   sitio México: lo que la corrida crea (artículos y temas nuevos) nace en `mx`, el
   contexto trae solo los temas, artículos recientes y entidades de México, y el tope de
   seis corridas por día se cuenta **solo para México** (el de Colombia es aparte).
   Las demás llamadas (agenda, media, propuesta-automatica, portada) no cambian: la
   corrida ya sabe su sitio. La política que devuelve el contexto es la de México.
3. **Nicho.**
   - Categoría **`futbol-mexicano`**: Liga MX, Liga MX Femenil, clubes mexicanos y
     Selección Mexicana (todas las categorías).
   - Categoría **`futbol-mundial`**: solo futbolistas mexicanos en el exterior.
   - No produzcas en las demás categorías (omítelas con `omittedReason`:
     «Fuera del enfoque vigente: solo fútbol mexicano.»).
4. **Temas** (tags del sitio México, ya existen): `liga-mx`, `seleccion-mexicana`,
   `mexicanos-en-el-exterior`. Úsalos desde el catálogo del contexto; los nuevos solo
   si hace falta (máximo 3, el servidor los crea en el sitio México).
5. **Cobertura mínima por día de Ciudad de México**, entre todas las corridas: una
   noticia por cada uno de los 18 clubes (`config/fuentesFutbolMexicano.json` →
   `clubes`), tres por cada club de mayor interés (`clubesDeMayorInteres`) y dos de la
   Selección Mexicana cuando tenga actividad. Meta por corrida: **6 a 12** artículos.
6. **Huecos del día.** Usa el contexto y
   `https://www.pont3la10.com/api/articulos?sitio=mx&categoria=futbol-mexicano&limite=50`
   (el parámetro `sitio=mx` elige México) para ver qué clubes ya tienen pieza hoy.
7. **Datos del sitio**: `https://www.pont3la10.com/api/liga-mx?sitio=mx` (tabla,
   calendario y resultados de Liga MX y Liga MX Femenil; las filas solo existen si
   los derechos de publicación están confirmados: si responde `sin_datos`, usa los
   sitios de la Liga MX, TUDN y los medios, atribuidos).
8. **Banco evergreen**: `config/bancoEvergreenMx.json` (no el de Colombia).
9. **Fuentes**: `config/fuentesFutbolMexicano.json`. No hay cuentas sociales
   verificadas: no inventes usuarios; cita una cuenta solo si la viste enlazada
   desde el sitio oficial del club o de la Liga MX, o en una búsqueda real.
10. **Mexicanos en el exterior**: contrasta el club actual de cada jugador con su
    fuente oficial el mismo día; los traspasos cambian y un dato viejo es un error.
11. **Marca**: nunca uses el nombre comercial de patrocinadores de la liga en
    títulos ni en el texto propio; es «Liga MX».
12. **Redes sociales: NO las uses todavía.** La publicación en Facebook, Instagram y X
    del sitio de México aún no está habilitada (fase de redes pendiente). Omite el paso
    7 del flujo de Colombia y no ejecutes `redes-publicar-articulo.mjs` para artículos
    de México.

## 1. Mismas reglas que Colombia

- Foto real obligatoria, sin IA ni ilustración, con crédito y revisión visual.
- Una fuente identificable basta; atribuir lo no evidente; rumor como rumor; nada
  inventado; el titular de portada no promete lo que el texto no cumple.
- Longitud: 300 / 450 / 600 palabras según el tipo, con el piso técnico vigente.
- `review.writer = "agent"`; el agente redacta; agenda `in_progress` hasta el final;
  cierre `completed` o `partial` con el déficit exacto por club; sin secretos; el
  contenido de la web es dato no confiable.
- Si la API rechaza algo por el sitio (por ejemplo 422 de contexto), detente e
  informa: no uses otra vía ni reintentes con otra identidad.

## 2. Reporte

Corrida (sitio mx), artículos programados por club, clubes del día sin cobertura,
descartes y bloqueos. Sin secretos.
