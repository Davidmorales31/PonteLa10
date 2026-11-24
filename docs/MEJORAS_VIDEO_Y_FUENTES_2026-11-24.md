# Auditoría de fuentes, videos y estrategia (2026-11-24)

Pedido del responsable: investigar y pulir el proceso de fuentes, video y estrategia viral, y dejar una lista priorizada de
mejoras. Esta auditoría mezcla **hechos medidos** (con la fecha y la herramienta) y **recomendaciones** (hipótesis hasta medir
con datos propios). Lo que dependía de la web se verificó el mismo día; las cifras de plataformas deben confirmarse en
YouTube Studio antes de decidir.

## 1. Lo que se midió

### Fuentes (feeds de medios)
- `node scripts/fuentes-salud.mjs`: 10 de 11 feeds declarados responden con notas de las últimas horas. **The Guardian
  Football responde 403** (feed de la corrida internacional; es el único roto).
- Candidatos de Latinoamérica probados (27): responden y están al día **Olé (2), ESPN Argentina, ge (Globo), UOL Esporte,
  Infobae (deportes y América), CONMEBOL, Mundo Deportivo** y las búsquedas de Google Noticias por torneo y país. **No sirven:**
  TyC Sports (404), Lance (410), La Tercera (404), Emol (reinicia la conexión), Referí (sin notas), El País Ovación (403),
  El Comercio (404), Depor (404), El Universo (404), y **Marca** (última nota del 7 de noviembre) y **AS** (de 2024) están
  desactualizados. Chile, Uruguay, Perú, Ecuador y Paraguay se cubren solo con búsquedas de Google Noticias.
- Radar de Latinoamérica (`node scripts/tendencias-futbol-latam.mjs`): en una pasada real leyó 70 tendencias, 927 titulares
  y 121 notas de feeds, y puso primero a Messi (Trends en Argentina 500+).

### Cobertura de contenido
- Con las notas del 23 de noviembre, `node scripts/video-latam.mjs` dio **12 historias de Latinoamérica, 10 de ellas
  colombianas**, y 3 internacionales. Una edición «Latinoamérica» hoy sería casi toda Colombia: el sitio solo tiene corridas
  de Colombia e internacional.

### Medición de lo que publicamos
- Con el permiso actual de YouTube (`youtube.force-ssl`) solo leemos vistas, me gusta y comentarios. **No hay retención,
  porcentaje visto ni tiempo de visualización**, que son lo que decide el algoritmo y la monetización.

### Plataformas (búsqueda web del 2026-11-24; confirmar en Studio)
- **Monetización de YouTube:** hoy 1.000 suscriptores y 4.000 horas públicas en 12 meses (o 10 M de vistas de Shorts en 90
  días); nivel inicial con 500 suscriptores, 3 videos públicos y 3.000 horas. Según el anuncio de YouTube, **desde el 1 de
  febrero de 2027 los canales nuevos necesitarán 8.000 horas** (o 20 M de vistas de Shorts) más 1.000 suscriptores; no afecta a
  quien ya esté dentro. Solo cuenta el video largo público: el tiempo visto en el feed de Shorts no suma horas.
- **Contenido «inauthentic» / genérico o repetitivo (aclaración de julio de 2026):** YouTube evalúa el **canal completo**,
  no cada video. Usar IA para guion, miniaturas o edición no descalifica; sí la producción en serie de videos casi idénticos
  con poco aporte original.
- **Meta:** no hay una política oficial clara sobre automatización; la información útil es de proveedores y foros. El motivo
  real está en el correo de Meta y en «Calidad de la cuenta» de Business Suite.

## 2. Lista priorizada de mejoras

### A. Urgente (plazos y riesgos)
1. **Plazo del 1 de febrero de 2027 para monetizar.** Ver en YouTube Studio → Monetización cuántos suscriptores y horas hay
   hoy. Orientación (hipótesis): 4.000 h son 240.000 minutos. Si un documental de 23 min se ve en promedio 8 min, hacen falta
   unas 30.000 reproducciones; un diario de 8 min visto 3 min, unas 75.000. Con eso decidir si el plazo es alcanzable o si
   conviene planear para 8.000 h.
2. **Medir retención.** Pedir el permiso `yt-analytics.readonly` (requiere que Juan vuelva a conectar la cuenta) y crear un
   reporte semanal: retención a 30 s, duración media vista, CTR de miniatura, fuentes de tráfico y caídas por minuto. Sin esto
   no hay ciclo de mejora ni cómo saber si los documentos suman horas.
3. **Meta (Facebook e Instagram).** Pausar el envío automático, leer el motivo en «Calidad de la cuenta», apelar a mano y no
   crear cuentas nuevas para esquivar el bloqueo. Retomar con pocas publicaciones manuales antes de volver a automatizar.
4. **Sitio caído (Vercel).** Resuelto el video: lee Supabase por un sitio local (`PONT3LA10_API_SITIO`). Falta decidir pausa,
   VPS o plan de pago; mientras tanto los enlaces `/articulos/…` de las descripciones dan error.

### B. Fuentes
5. **Revisar las fuentes cada semana** con `node scripts/fuentes-salud.mjs` (queda para ejecutarlo como tarea programada).
   Acciones ya visibles: reemplazar The Guardian (403) y sumar Mundo Deportivo y Marca por una fuente sana a la corrida
   internacional, que hoy solo tiene 3 feeds, todos en inglés.
6. **Una corrida editorial de Latinoamérica** (o un modo del guion que lea directo del radar y de las fuentes, sin pasar por
   el sitio). Es lo que evita que el video «latam» sea 80 % colombiano. La configuración (feeds verificados, búsquedas por país,
   clubes y figuras) ya está en `config/fuentesFutbolLatam.json`.
7. **Cuentas oficiales** de federaciones y clubes de la región (X) y un par de periodistas por país, verificados a mano, como
   ya se hizo con Colombia. Hoy Latinoamérica solo tiene medios y búsquedas.
8. **Ampliar el radar**: el selector de documentales (`documental-elegir.mjs`) puede usar también las tendencias de
   Latinoamérica, y el radar puede sumar países (México cuando salga `mx`), jugadores y eventos.
9. **Afinar el clasificador** de `video-latam.mjs` con dos semanas de notas: falsos positivos («argentina» o «chile» dentro de
   otro tema) y figuras que faltan. Cada día que haya notas se revisa la lista de «Internacional» por si algo era de la región.
10. **Regla de diversidad por país** (`maximoHistoriasPorPais`) y de dos fuentes por historia no oficial: que el comando
    avise cuando una edición se pasa.

### C. Videos
11. **Probar los formatos que sí rindieron en la competencia:** «cómo queda» (cuadros de Libertadores, eliminatorias) y
    «predicción, horario y dónde ver» en jornadas grandes; los videos «en vivo» rindieron 1,65 veces la mediana de su canal.
    Un titular con gancho de primicia o dato concreto, no la fórmula del «|».
12. **Variar la estructura** entre episodios para no parecer producción en serie (riesgo de «contenido genérico o repetitivo»
    a nivel de canal): distinto orden de bloques, distintas aperturas y cierres, opinión y análisis de Juan en cada edición, y
    datos o gráficos propios. La voz y el criterio de Juan son lo que protege el canal.
13. **Banco propio de imágenes y video.** El documental de Vozinha solo tiene unos 12 clips libres distintos para 24 minutos
    y se repiten. Armar un banco por país con material propio (las gafas), Commons y Pixabay (cuando haya llave), con crédito
    y licencia anotados una sola vez.
14. **Marca consistente.** La decisión del 2026-11-19 es «Ponte la 10»; el pack de video todavía muestra «Pont3la10» en la
    tarjeta de suscripción (valor por defecto de `suscribete`) y en los hashtags. Se corrigió en el documental; falta el pack
    y decidir el nombre del canal.
15. **Documentales como motor de horas:** abrir con la pregunta, capítulos de YouTube, pantalla final, 3 miniaturas para la
    prueba A/B y 5 a 8 clips de 30 a 60 s durante la semana (fase 7 del plan). Los Shorts no suman horas, solo llevan público.
16. **Un solo canal** hasta pasar el programa de socios y tener un proceso estable: más canales dividen el tiempo y, con la
    política de contenido repetitivo, multiplican el riesgo. Revisar cuando el primero monetice.

### D. Operación
17. **Ritual semanal (30 min):** `fuentes-salud`, reporte de retención, lista de lo que rindió y lo que no, ajustes de la lista
    de términos y de las franjas (la regla pide 30 Reels publicados para comparar horas).
18. **Pruebas de franjas** con datos propios: Latinoamérica 12:30 y 18:30, internacional 14:30 y 21:30, documental viernes
    18:30 son hipótesis; medir a 24 h y 7 días.
19. **Respaldo y robustez:** un reintento de red ya protege el radar; falta un reporte de «qué fuente falló hoy» al final de
    cada corrida.

## 3. Herramientas añadidas con esta auditoría
- `scripts/fuentes-salud.mjs` — estado de cada feed (código HTTP, notas, antigüedad); sale con error si alguno falla.
- `scripts/tendencias-futbol-latam.mjs` — radar de tendencias de la región (Trends por país, Google Noticias y feeds).
- `config/fuentesFutbolLatam.json` — ahora incluye feeds verificados, búsquedas por país, países de tendencia, figuras
  para el radar y exclusiones.
- Reintento de red en el radar internacional.
- Documental: nombre de marca «Ponte la 10» en la tarjeta del título, la suscripción y la descripción.
