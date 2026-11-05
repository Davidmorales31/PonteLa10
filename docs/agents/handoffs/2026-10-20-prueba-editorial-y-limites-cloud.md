# Handoff

- **Objetivo vigente:** continuar la corrida editorial `3d76af82-1db0-4c32-b31f-63897acd35d6`
  y cumplir la regla permanente de Juan: perseguir al menos diez propuestas
  únicas confirmadas en `review` y al menos una por cada categoría activa,
  después de investigar todas las categorías.
- **Completado:** se confirmó el plan Plus y la limitación de no poder trasladar
  el heartbeat local a Cloud conservando el mismo hilo. En el run de Production
  `3d76af82-1db0-4c32-b31f-63897acd35d6`, la primera redacción terminó uncertain
  (HTTP 502). Juan autorizó un único reintento pagado con la misma clave; el
  reintento entregó texto completo. Se revisó contra FC Bayern, Bundesliga y
  UEFA y se corrigieron metacomentario y una afirmación histórica no sustentada.
- **Entrega confirmada:** artículo `cac3ffc8-d256-41b9-bab3-fb717c8cbd2b`,
  estado `review`, categoría Fútbol mundial; temas Colombianos en Europa y
  Bundesliga; dos artículos relacionados. La foto real muestra a Luis Díaz en
  la celebración del triplete; crédito `© Imago`, fuente FC Bayern. Contexto y
  recibo de Production confirman artículo; consulta read-only a Supabase
  confirmó estado, etiqueta, portada y crédito. El texto quedó en 724 palabras
  y ocho párrafos sustantivos.
- **Estado del run:** `in_progress`, una propuesta en `review`. No declarar
  completada la nueva meta de diez ni la cobertura de todas las categorías; la
  siguiente ejecución debe seguir el mismo run del día y conciliar cada
  categoría/oportunidad antes de cerrar.
- **Reglas guardadas para la automatización:** Juan fijó objetivo de al menos
  diez propuestas CMS únicas en `review` por corrida y al menos una válida por
  cada categoría activa; investigar todas, con prioridad para Liga BetPlay y
  Colombianos en Europa. Mantener fuentes primarias, deduplicación, y límites de
  calidad; no rellenar. Las portadas deben ser fotos reales, pertinentes,
  distintas y con crédito/fuente verificables. Si no hay foto, no crear artículo.
  El horario y el hilo no cambiaron.
- **Reanudación 2026-10-20:** la API de Producción confirmó el mismo run en
  `in_progress`, con una propuesta en `review` y siete categorías activas. La
  agenda previa solo había evaluado Fútbol colombiano y Fútbol mundial; aún
  faltan Tecnología deportiva, Gaming deportivo, Tendencias, Especiales y
  Opinión. No reabrir la oportunidad de Díaz ni repetir su generación pagada.
- **Alineación de reglas:** además de las skills diarias, trend y portada real,
  las skills de escritura/SEO quedaron con el mínimo de diez y el requisito por
  categoría. La skill de portada IA quedó desactivada para la corrida editorial:
  sin fotografía verificable se bloquea el candidato.
- **Archivos modificados:** `docs/agents/ESTADO_ACTUAL.md`, este handoff y las
  skills versionadas de corrida diaria, trend, escritura, SEO, foto real y
  portada IA. Los requests y
  checkpoints permanecen bajo `.codex/editorial-runs/` (ignorado por Git).
- **Validaciones:** consulta de Salud y contexto antes/después; contrato de
  Producción y `origin/main` contrastado con `git show`; recibo de propuesta;
  consulta read-only de artículo, temas, relaciones y metadata de imagen en
  Supabase; fotografía y crédito verificados en la fuente oficial; `git diff
  --check`.
- **Pendientes:** el run debe continuar con las oportunidades y categorías aún
  no investigadas. La automatización local sigue activa con horario original.
- **Commit base:** `f0d0cda7f7ef6bca4a3550741f425be88a3ed717`.
- **Commit final:** sin commit.
