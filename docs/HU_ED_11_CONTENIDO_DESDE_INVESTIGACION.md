# HU-ED-11 — Investigación, redacción, portada y entrega privada al CMS

## Historia

Como responsable editorial, quiero que cada tema aprobado por calidad se
investigue, redacte, clasifique, relacione y reciba una portada pertinente antes
de entrar al CRM, para encontrar allí una pieza completa pendiente solo de mi
revisión editorial.

## Alcance

- Skill `pont3la10-investigative-writing` para expediente de evidencia, contraste
  y redacción; Skill `pont3la10-auto-cover` para fotos con permiso reutilizable
  y atribución verificable; Skill `pont3la10-ai-editorial-cover` para generar
  portadas solo dentro de la tarea programada de Codex.
- Investigación desde fuentes externas públicas; conservar fuentes como datos
  estructurados, separadas del cuerpo.
- Redacción en español colombiano con el estándar actual de HU-ED-08 cuando las
  fuentes lo sostengan; no copiar, inventar ni alargar para llegar a un conteo.
- Codex investiga tendencias y verifica el expediente; el servidor usa el
  proveedor DeepSeek y el mismo contrato/prompt versionado del flujo TikTok para
  redactar, proponer taxonomía, relaciones y metadatos SEO. El resultado queda
  asociado a la clave estable de la historia: reintentos devuelven el resultado
  guardado o retoman una reserva vencida, no repiten una generación completada.
- Capa SEO editorial basada en intención y consultas realmente investigadas:
  título y descripción fieles, entidades correctas, enlaces internos existentes,
  términos relacionados naturales, fuentes estructuradas y revisión de datos.
  Sin relleno de palabras clave ni claims de demanda que no estén respaldados.
- Categoría de catálogo activo, temas existentes, creación deduplicada de temas
  públicos conforme a HU-ED-09 y hasta tres relacionados publicados.
- SEO editorial derivado de la historia; claims sensibles y limitaciones visibles
  al revisor.
- Foto de archivo opcional obtenida de una fuente que permita reutilización editorial
  (piloto: Wikimedia Commons, solo CC0 1.0, CC BY 4.0 o dominio público),
  verificada en su ficha original, optimizada por el procesador de medios y
  guardada con alt, leyenda, autor, licencia, crédito y URL de procedencia.
  Mostrar atribución y enlace a la fuente/licencia tanto en el CMS como bajo la
  imagen publicada. Crédito no reemplaza permiso: si licencia o autor no se
  pueden verificar, omitir la foto y continuar la propuesta sin portada. Nunca
  llamar foto real a una ilustración de IA.
- En el flujo programado de Codex, generar como primera opción una ilustración
  editorial con ImageGen después de completar y validar la redacción DeepSeek.
  Guardarla con el crédito fijo “Imagen generada con IA” y una leyenda visible
  que aclare que no es fotografía documental; `source_url` permanece NULL. La
  RPC valida el origen editorial y el flag exclusivo `ai_generated_cover`; no
  se presenta ni valida como foto licenciada. Una imagen imposible de ilustrar
  responsablemente, o un fallo de ImageGen, no bloquea una propuesta sin imagen.
  Esto no se aplica a TikTok ni a las cargas manuales del CMS.
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

- La tarea programada de Codex genera una sola ilustración editorial contextual,
  atractiva para un clic legítimo y fiel al expediente; nunca clickbait. No
  representar como documental a una persona real, uniforme, lesión, acción o
  evento que la investigación no documente. Usar la Skill
  `pont3la10-ai-editorial-cover`, revisar la salida y guardar el disclosure que
  aplica el servidor: “Imagen generada con IA”; la leyenda aclara que no es una
  fotografía documental y `source_url` queda NULL.
- Si ImageGen no está disponible, la salida no es utilizable o puede inducir a
  error, registrar la omisión y continuar sin portada. No regenerar una imagen
  ya guardada al reanudar el mismo candidato.
- La foto licenciada de Commons conserva su ruta separada: exigir ficha,
  creador y licencia permitida por la Skill; guardar URL de ficha y crédito
  literal. No retirar marcas de agua ni copiar imágenes de páginas de búsqueda.
- La ilustración IA es exclusiva de la tarea programada de Codex. La ingesta de
  TikTok y la carga manual del CMS no cambian y nunca deben rotularse como
  generadas por IA salvo que su flujo lo registre expresamente.

## Especiales y Opinión

- Sin autor real asignado, guardar autor vacío y no fabricar firma/byline.
- Opinión no se completa con postura atribuida a Juan David u otra persona. Puede
  guardar un borrador neutral/una propuesta de enfoque, marcado para aprobación
  de enfoque humano antes de enviarse al público.
- Especiales requiere indicar formato editorial y alcance; no fingir una
  experiencia reportada o cobertura presencial.

## Criterios de aceptación

- Con un dossier de fuentes válido, el contenido queda en CRM `review` con
  fuentes estructuradas, taxonomía válida, relaciones reales, SEO y alertas de
  revisión pertinentes; una portada pertinente es opcional.
- Ninguna fuente se imprime como línea incrustada en el cuerpo; las referencias
  se renderizan en el módulo de fuentes.
- Falta de fuentes, contrato o categoría no crea una noticia “lista”; se
  conserva el error por etapa y puede reanudarse sin duplicar/cobrar de nuevo.
  La falta de imagen se registra, pero no bloquea la entrega del borrador.
- La misma petición repetida no crea un segundo artículo, media ni temas.
- Una portada generada para Codex conserva su hash al reanudar, muestra crédito
  y disclosure IA en el CMS y publicación; nunca tiene fuente/licencia ficticia.
- Una carga adversarial en una fuente no cambia categoría, permisos ni destino.
- La ruta privada de borrador guarda el resultado DeepSeek de forma durable e
  idempotente, y no crea por sí sola un artículo ni cambia el estado a `review`;
  la ruta de propuesta valida y entrega posteriormente el borrador privado.
- Si la llamada al proveedor o su persistencia termina con resultado ambiguo, el
  candidato queda `uncertain` y no dispara otro cobro automático. Solo se permite
  un reintento explícito, con la misma clave y auditoría, tras verificar que no
  existe un resultado recuperable.
- Un artículo todavía en `review` no puede cambiar a aprobado/programado ni ser
  visible en el sitio público.
- Lint, pruebas API/RLS/contrato/media y matriz de validación del repo pasan.

## Fuera de alcance

- Redacción de posturas personales sin encargo y firma de autor.
- Acceso a sitios privados, evasión de paywalls, adquisición de fotos sin licencia
  o publicación automática.
