# Plan: de la noticia a la imagen de redes, con formatos variados (2026-11-20)

Decisiones del responsable: todo local en su PC, sin depender de agentes; el crédito y la foto real no son obligatorios;
por ahora solo se ajustan formatos (no se reemplaza nada ya programado). Formatos: `docs/ESTUDIO_FORMATOS_REDES_COMPETENCIA.md`.

## 1. Qué formatos priorizar

Valoración visual de los 8 formatos con las notas de hoy (Águilas, América, Bucaramanga, Fortaleza, Pasto):

| Prioridad | Formato | Por qué |
| --- | --- | --- |
| 1 | `circulo` (principal desenfocada + círculo) | Le gusta al responsable; da contexto y se lee a tamaño de feed |
| 2 | `impacto` (la primera) | Le gusta al responsable; la más limpia y reconocible |
| 3 | `impacto-desenfocado` | Misma lectura con fondo real; funciona con cualquier foto |
| 4 | `banda` | Titular completo legible; buena para notas largas de titular |
| 5 | `carrusel` | Retiene (desliza) y es la única que cuenta la nota en 3 pasos |
| Condicionales | `cita`, `ficha`, `versus` | Solo cuando la nota trae frase, cifra o dos protagonistas |

## 2. ¿Al azar o según la noticia? Las dos cosas

Nunca al azar puro (una cita sin cita queda mal). Cada nota recibe una lista de formatos **elegibles** según lo que tenga, y
entre ellos se elige con **azar ponderado y reproducible** (semilla = id de la nota + fecha).

Elegibilidad:

- `cita`: el cuerpo trae una frase entre comillas de 40–170 caracteres.
- `ficha`: hay una cifra con concepto claro en el titular o el resumen.
- `versus`: el titular nombra dos protagonistas o equipos y hay dos fotos.
- `circulo`: hay segunda foto (ver 3).
- `carrusel`: la nota tiene 3 oraciones útiles para «Lo que debes saber».
- `impacto`, `impacto-desenfocado`, `banda`: siempre.

Pesos base: círculo 30, impacto 25, desenfocado 15, banda 15, carrusel 15. Si hay cita, `cita` pasa a peso 40 y se escala el
resto; igual con `ficha` (30) y `versus` (25). Reglas de variedad: no repetir el formato de las dos últimas publicaciones, máximo
2 del mismo formato por día y al menos 1 carrusel por día si hay notas elegibles.

## 3. Fase de fotos (sin crear noticias aparte)

No se crean noticias con dos fotos. Cada nota guarda un **juego de fotos** local: portada (siempre) y hasta dos extras.
Los extras salen, en orden y sin agentes:

1. La biblioteca del propio sitio: fotos de otras notas del mismo club o protagonista.
2. La imagen principal de las fuentes de la nota (`fuente.url` y `fuentesInvestigacion`).
3. Wikimedia Commons por nombre del club o jugador.

Si no hay segunda foto, la nota no es elegible para `circulo` ni `versus`. Los agentes editoriales pueden añadir fotos por la
API que ya existe, pero el flujo no las necesita.

## 4. Orden de la construcción

1. Medidas por formato (rangos de capturas de Cracks y La Gambeta) y compuerta de calidad: si un formato no pasa, cae a `impacto`.
2. Elegibilidad y selección ponderada con pruebas.
3. Fase de fotos (biblioteca, fuentes, Commons).
4. Mejorar la palabra gigante (lista más fina, revisión de casos malos).
5. Conectar con el programador local: detectar → elegir → generar → subir → programar (hoy `--pendientes --auto`).
