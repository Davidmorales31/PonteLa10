# Corrida editorial con aprobación IA

El responsable autorizó el 4 de noviembre de 2026 la aprobación IA por API y
programación automática, y confirmó que mantiene DeepSeek como redactor. Esta política sustituye
la obligación anterior de revisión humana exclusivamente para las propuestas
nuevas de esta corrida. TikTok y el flujo humano conservan sus permisos y MFA.

## Cadencia y costos

Objetivo: dos corridas por día en Bogotá, a las 06:05 y 18:05, con un mínimo de
10 artículos únicos por cada categoría activa (70 con las siete actuales).
`config/automatizacionEditorial.json` contiene la configuración deseada.
Ese archivo no instala ni modifica por sí mismo una tarea en el programador.
Hay que actualizar la tarea existente, evitando duplicarla.

Codex investiga y revisa; DeepSeek redacta usando el expediente proporcionado.
Se conserva su costo por generación. Se reutiliza el resultado guardado y no se
repite una generación completada ni una llamada de resultado incierto para ahorrar
costo. Codex sigue sujeto al plan y sus límites; no se promete calidad idéntica,
un costo total menor ni disponibilidad para 140 artículos diarios.
Cada artículo conserva el contrato de texto/documento/SEO y 660 palabras mínimas.
La cuota es una meta: si faltan historias, imágenes o capacidad, se informa el
déficit exacto y se cierra `partial`, sin duplicar ni rellenar artículos.

## Investigación y enfoque

Las categorías deportivas conservan su tema. Tendencias cubre actualidad de
Latinoamérica y acontecimientos mundiales de interés regional: política,
entretenimiento, sociedad, ciencia y cultura digital. Se investigan noticias
concretas; no se escriben artículos sobre lo que muestra Google Trends.
Se pueden usar búsquedas, noticias y señales públicas de conversación/interés.
Solo se dice «lo más buscado» o se atribuye popularidad si existe una medición
accesible con fecha y ámbito; no se inventan métricas, viralidad ni tendencias.

Una fuente periodística identificable puede bastar para una noticia atribuida;
no se exige siempre una fuente primaria ni dos editores independientes. Las
declaraciones, rumores y denuncias se atribuyen y se describen con su nivel real
de certeza. No se presentan como hechos confirmados si no lo son. No se inventan
datos, citas, acusaciones, entrevistas ni experiencias propias. La falta de
segunda fuente no obliga a descartar una pieza que puede contarse con atribución.
Conservar URLs, fechas, editor, tipo de fuente y afirmaciones sustentadas.

El Futbolero Colombia es referencia de construcción de titulares y cercanía al
aficionado, no una fuente que deba copiarse o una garantía de veracidad. Se revisó
su portal y la sección Millonarios el 4 de noviembre; Facebook bloqueó el acceso,
así que no se afirma haber revisado sus publicaciones ni su rendimiento social.

- Dar protagonismo a nombres y equipos reconocibles, una acción y su consecuencia.
- Usar tensión, contraste y curiosidad que el cuerpo realmente resuelva.
- Preferir verbos concretos. «Sorprende», «sacude» o «amenaza» necesitan un hecho
  específico; no convertirlos en muletillas para todas las historias.
- Preparar tres alternativas y elegir la más atractiva que siga siendo precisa.
- Mantener condicionales y atribución cuando corresponda; no falsear certezas.
- No ocultar toda la información, inventar polémicas ni prometer revelaciones ausentes.
- El título social puede ser más expresivo; título, resumen y SEO deben ser coherentes.

Ejemplos inventados de estructura, no noticias reales:
«[Jugador] cambia los planes de [equipo]: la decisión que abre otra pelea»;
«De suplente a protagonista: el dato que pone a [jugador] en la mira»;
«[Medida] entra en vigor: quiénes sentirán primero el cambio en [país]».

## Contrato y aprobación

La ruta `POST /api/internal/codex/auto-proposals` recibe `{proposal, briefSeo,
review}`. `proposal` usa el contrato de propuestas existente y admite una fuente;
`review` contiene `model`, `categoryId`, `coverMediaId`, `tagIds`, `newTopicNames`,
los booleanos verdaderos `categoryMatches`, `topicsMatch`, `imagePresent`,
`titleFaithful`, y `notes` (30–1000 caracteres). Se revisan la categoría, todos los
temas y sus nombres nuevos, la imagen persistida y la fidelidad del título.
La revisión es un juicio IA declarado; el servidor valida correspondencia e
integridad, no simula una comprobación semántica de hechos mediante igualdad de IDs.

Se requiere fotografía real pertinente, con fuente, crédito y texto alternativo.
No se generan portadas IA para esta corrida. Los temas deben aparecer o tener una
relación explícita con el contenido; no se asigna un club solo por compartir liga.
Opinión y Especiales conservan su marca de revisión de enfoque; el agente la
resuelve antes de enviar la revisión IA, sin inventar una voz humana.

La ruta requiere una generación DeepSeek completada de la misma clave, corrida,
categoría y huella, y el brief exacto guardado con ella. Codex puede corregir el
texto antes de aprobarlo; no se genera otro borrador solo por cambiar el titular.
La ruta exige una clave distinta, `NUXT_CODEX_EDITORIAL_PUBLICATION_API_SECRET`,
solo de servidor; conserva HMAC, nonce y límite de cuerpo. La clave de investigación
no puede publicar. El CLI `propuesta-automatica` utiliza esa clave sin imprimirla.
No se incluye en prompts, archivos de control, navegador ni Git.

Un RPC atómico crea la propuesta, guarda el brief, registra aprobación IA y
programa el artículo. Se dejan `approved_by` y el actor humano nulos, y se registra
explícitamente el actor IA, modelo y hash de la solicitud. El recibo se persiste.
Los reintentos exactos no crean artículos ni cambian horarios; los duplicados de
otra propuesta no se aprueban ni cuentan para la cuota.

La primera fecha disponible queda a más de cuatro minutos; las siguientes se
separan dos minutos, respetando la cola existente y el bloqueo global. Cron sigue
revisando cada minuto y publica solo cuando llega `scheduled_at`.

## Activación y verificación

Aplicar la migración `20261105033000`, desplegar la API, configurar su secreto
de publicación y actualizar el horario/prompt de la tarea existente. Hasta entonces
el nuevo flujo está preparado en código, no activado en Producción.
No se ejecuta una corrida de 70 artículos como parte de la implementación.
Verificar recibo y CMS: estado `scheduled`/`published`, fotografía, taxonomía,
auditoría IA y ausencia de duplicados. Solo cerrar `completed` si todas las
categorías activas alcanzan diez artículos nuevos aprobados y programados.

Referencias de enfoque: https://www.elfutbolero.com.co/ y
https://www.elfutbolero.com.co/primeraa/millonarios.
Límites de tareas: https://learn.chatgpt.com/docs/automations y
https://learn.chatgpt.com/docs/pricing.
