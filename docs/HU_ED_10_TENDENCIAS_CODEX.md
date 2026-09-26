# HU-ED-10 — Investigación de tendencias y agenda editorial Codex

## Historia

Como responsable editorial de Pont3la10, quiero que una automatización local
de Codex detecte diariamente temas con interés real para cada categoría activa,
para comenzar desde oportunidades verificables y pertinentes, no desde titulares
inventados.

## Alcance

- Programación diaria de Codex Automation local, vinculada al proyecto local.
- Descubrir señales de búsqueda y conversación en Colombia, incluyendo Google
  Trends RSS y fuentes abiertas compatibles; registrar origen y fecha de la señal.
- Leer en cada ejecución el catálogo de categorías activas y la ventana de
  artículos recientes/publicados para detectar repetición y temas ya cubiertos.
- Proponer un objetivo mínimo de 15 borradores completos por corrida diaria,
  distribuidos entre las categorías activas según evidencia y relevancia. Es un
  objetivo de producción, no una autorización para inventar, duplicar ni rellenar
  temas; registrar cualquier faltante con sus causas verificables. No significa
  15 por categoría.
- Dejar una agenda/checkpoint durable por ejecución, categoría y tema; continuar
  lotes incompletos sin duplicar.
- Crear la Skill de proyecto `pont3la10-trend-research` para repetir criterios,
  consultas, evaluación de señales y reporte de oportunidades omitidas.

## Reglas

1. Tendencia significa señal observada; nunca prueba que la noticia sea cierta.
2. Aplicar enfoque Pont3la10 a deporte, cultura deportiva, tecnología deportiva
   y gaming. No forzar noticias irrelevantes dentro de una categoría.
3. Especiales y Opinión quedan marcadas como “requiere enfoque editorial”; no
   inventar formato, tesis, autor o experiencia.
4. No incluir entidades o afirmaciones sensibles sin fuentes suficientes.
5. Guardar el RSS/URL de consulta, fecha, consultas/términos observados, razón de
   relevancia y motivo de descarte para cada candidata.
6. Respetar límites razonables por fuente, caché y política de acceso; no
   scrapear barreras, iniciar sesión ni automatizar búsquedas que violen términos.

## Criterios de aceptación

- El job carga las categorías activas de Supabase, no solo la lista de seeds.
- Cada candidata queda asociada a categoría, señal, URL/fecha y puntuación
  explicable (recencia, relevancia, novedad y encaje editorial).
- El catálogo publicado y las agendas previas se usan para deduplicar.
- Si una categoría no ofrece suficientes oportunidades válidas, se guarda el
  faltante con motivo; no se generan temas de relleno.
- El checkpoint permite reanudar después de interrupción sin perder ni duplicar
  candidatos completados.
- Si RSS, red o Codex no están disponibles, el sistema informa la etapa y conserva
  agenda anterior sin marcar la corrida como exitosa.
- No se crean artículos públicos, programados ni aprobados en esta HU.

## Fuera de alcance

- Redacción final, generación de imagen, aprobación y publicación.
- Afirmar que Trends mide volumen absoluto o que una señal equivale a demanda
  confirmada.
- Dependencia de Google Trends API alfa.
