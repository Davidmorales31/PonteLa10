---
name: pont3la10-titulos-clickbait
description: Títulos de YouTube del fútbol colombiano con misterio, sorpresa y tensión («¡NO CREERÁS LO QUE PASÓ…!») sin inventar hechos y con la promesa cumplida en el video. Úsalo para los 3 títulos A/B del video diario y para pedidos de «hazme títulos» o «ponlo más clickbait».
---

# Títulos de YouTube estilo «¡NO CREERÁS LO QUE PASÓ!»

Origen: skill `titulos-fpc-clickbait` entregada por el responsable (2026-11-20). Manda sobre la sección «Títulos» de `pont3la10-video-diario-guion` en cuanto a estilo; la rúbrica (`config/videoDiario.json`, `titulos`) lo verifica.

## Objetivo
Reescribir una noticia o resumen de fútbol colombiano con clickbait emocional, misterioso e irresistible. Prioriza la curiosidad y la claridad sobre el sensacionalismo vacío.

## Voz y tono
- Creador futbolero colombiano, intenso, directo e intrigante.
- Fórmulas: **«¡NO CREERÁS…!»**, **«¡NADIE PUEDE CREER…!»**, **«¡ESTO NADIE LO ESPERABA!»**, **«¡SE ARMÓ…!»**, **«¡LO QUE PASÓ CON [EQUIPO]…!»**.
- Que se sienta que ocurrió algo sorpresivo que vale la pena ver. Una emoción por título: sorpresa, indignación, ilusión, polémica o suspenso.
- MAYÚSCULAS estratégicas, sobre todo en el gancho; no todo el título. 0–1 emoji, solo si suma.

## Reglas de calidad
1. Protagonista (Nacional, América, Junior, Millonarios, Once Caldas…) al inicio o justo después del gancho.
2. Abre un vacío de curiosidad: no expliques todo en la primera frase.
3. **Conserva los hechos**: no inventes fichajes, salidas, escándalos, declaraciones ni resultados; no llames «bomba» a lo que el material no sustenta.
4. Con varias noticias, un solo gancho principal; lo demás, coletilla breve o fuera.
5. Sin relleno. Apunta a 55–85 caracteres, leyendo natural y claro.
6. Variedad real de ganchos entre opciones.
7. **La promesa del título tiene que cumplirse en el video.**
8. No prometas vistas ni CTR.

## Flujo
1. Identifica equipo/protagonista, hecho comprobado y emoción más fuerte.
2. Crea 10 títulos: 4 misterio, 3 impacto, 2 polémica (solo si los hechos la permiten), 1 equilibrado para búsqueda.
3. Elige un **GANADOR** (claridad, curiosidad, palabras clave) y justifícalo en una frase.
4. 3 frases de miniatura de 2–5 palabras, sin repetir el título.
5. Para el video diario: entrega 3 títulos A/B (uno misterioso, uno emocional, uno de búsqueda) en `titulos` del guion; el primero también en `tituloVideo`. Cada uno 45–85 caracteres, con nombre propio en los primeros 40 y al menos 2 con gancho de curiosidad (lo exige la rúbrica).

## Ejemplo
Entrada: «Nacional ganaba 2-0 y terminó eliminado; final Once Caldas contra América».
- «¡NADIE PUEDE CREER LO DE NACIONAL! 😱 GANABA 2-0 Y QUEDÓ AFUERA»
- «¡NO CREERÁS CÓMO TERMINÓ LO DE NACIONAL! DE 2-0 A LA ELIMINACIÓN»
- «¡ESTO NADIE LO ESPERABA! NACIONAL AFUERA Y UNA FINAL SORPRESIVA»

Miniaturas: «¡TENÍA EL 2-0!», «¡NO PUEDE SER!», «¡AFUERA!».

## Formato
Primero el ganador, luego alternativas y miniaturas. Si piden un solo título, uno, sin explicación larga.
