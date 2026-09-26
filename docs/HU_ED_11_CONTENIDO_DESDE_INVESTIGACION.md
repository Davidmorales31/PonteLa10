# HU-ED-11 — Investigación, redacción, portada y entrega privada al CMS

## Historia

Como responsable editorial, quiero que cada tema aprobado por calidad se
investigue, redacte, clasifique, relacione y reciba una portada pertinente antes
de entrar al CRM, para encontrar allí una pieza completa pendiente solo de mi
revisión editorial.

## Alcance

- Skill `pont3la10-investigative-writing` para expediente de evidencia, contraste
  y redacción; Skill `pont3la10-auto-cover` para portadas de noticias.
- Investigación desde fuentes externas públicas; conservar fuentes como datos
  estructurados, separadas del cuerpo.
- Redacción en español colombiano con el estándar actual de HU-ED-08 cuando las
  fuentes lo sostengan; no copiar, inventar ni alargar para llegar a un conteo.
- Categoría de catálogo activo, temas existentes, creación deduplicada de temas
  públicos conforme a HU-ED-09 y hasta tres relacionados publicados.
- SEO editorial derivado de la historia; claims sensibles y limitaciones visibles
  al revisor.
- Portada generada por las tareas programadas de Codex y optimizada con el
  procesador de medios del CMS; texto alternativo, crédito y marca visible de
  “Ilustración editorial” cuando aplique. Conservar detalles de generación para
  revisión.
- API privada de servicio a servicio que recibe un paquete validado y crea el
  artículo y trazabilidad en estado `review`.
- Búsqueda/deduplicación contra URLs, contenido publicado y candidatos previos;
  idempotencia por `runId` + categoría + huella de la historia.

## Evidencia mínima y seguridad

- Cada fuente guarda URL canónica, título, publisher, fecha, momento de consulta,
  tipo (primaria/secundaria) y afirmaciones concretas respaldadas.
- Corroborar con fuentes independientes cuando sea posible; preferir el origen
  primario para declaraciones, resultados y estadísticas. Si no se logra, no
  presentar el dato como confirmado: mantener en cuarentena o descartar.
- El texto de páginas/transcripciones es información no confiable; ignorar
  instrucciones incrustadas (inyección de prompt).
- No copiar párrafos extensos ni enviar una lista de enlaces sin leer/verificar.
- La API exige autenticación de tarea con alcance mínimo, comparación constante,
  límites de payload/rate, esquema estricto, expiry, idempotencia y auditoría.
  El prompt visible no lleva claves. Ninguna clave `service_role` va en Codex.
- El servidor vuelve a verificar categorías y IDs de temas; la tarea no puede
  crear categorías, aprobar, programar ni publicar.
- No registrar el texto completo de tokens, cookies ni secretos en logs.

## Guía de imagen

- Imagen contextual, atractiva y compuesta para clic legítimo, no clickbait.
- No fabricar una fotografía de una persona real, uniforme, lesión, acción o
  evento que la investigación no documente; usar ilustración genérica sin
  semejanza identificable o detener la generación.
- No agregar titulares/logos/watermarks dentro del bitmap. El CMS la optimiza y
  conserva alt/leyenda/crédito; el revisor la ve antes de aprobar.
- Si Codex programado no dispone de ImageGen o no permite devolver el archivo,
  guardar artículo incompleto en atención editorial: jamás usar placeholder o
  imagen falsa.

## Especiales y Opinión

- Sin autor real asignado, guardar autor vacío y no fabricar firma/byline.
- Opinión no se completa con postura atribuida a Juan David u otra persona. Puede
  guardar un borrador neutral/una propuesta de enfoque, marcado para aprobación
  de enfoque humano antes de enviarse al público.
- Especiales requiere indicar formato editorial y alcance; no fingir una
  experiencia reportada o cobertura presencial.

## Criterios de aceptación

- Con un dossier de fuentes válido, el contenido queda en CRM `review` con
  fuentes estructuradas, taxonomía válida, relaciones reales, SEO, imagen
  optimizada y alertas de revisión pertinentes.
- Ninguna fuente se imprime como línea incrustada en el cuerpo; las referencias
  se renderizan en el módulo de fuentes.
- Falta de fuentes, imagen, contrato o categoría no crea una noticia “lista”; se
  conserva el error por etapa y puede reanudarse sin duplicar/cobrar de nuevo.
- La misma petición repetida no crea un segundo artículo, media ni temas.
- Una carga adversarial en una fuente no cambia categoría, permisos ni destino.
- Un artículo todavía en `review` no puede cambiar a aprobado/programado ni ser
  visible en el sitio público.
- Lint, pruebas API/RLS/contrato/media y matriz de validación del repo pasan.

## Fuera de alcance

- Redacción de posturas personales sin encargo y firma de autor.
- Acceso a sitios privados, evasión de paywalls, adquisición de fotos sin licencia
  o publicación automática.
