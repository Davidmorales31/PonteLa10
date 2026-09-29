
# BACKLOG MAESTRO — PONT3LA10
## Refactor del core hacia Growth, SEO Utility, Sports Data, P10 Games, Retención, Monetización Evergreen y P10 Tools

**Versión:** 4.0  
**Fecha de corte:** 29-09-2026  
**Repositorio auditado:** `Davidmorales31/PonteLa10`  
**Branch de referencia:** `main`  
**Commit de referencia:** `b6b865e7405a427e046a8c3cd220b226a2e06ecb`  
**Producto:** Pont3la10  
**Objetivo inmediato:** aumentar tráfico cualificado, tráfico recurrente y retención.  
**Principio de arquitectura:** refactor incremental; no Big Bang.

---

# Cambios principales de v4.0

Esta versión conserva las 52 HUs activas de v3.0 y agrega 8 HUs (`HU-TR-53` a `HU-TR-60`) para formalizar una segunda superficie de producto:

```text
pont3la10.com
→ Pont3la10 Sports
→ deporte, contenido, datos, eventos y juegos

tools.pont3la10.com
→ P10 Tools
→ utilidades generales, experimentos SEO y monetización por Ads
```

La decisión central es **no mezclar utilidades no deportivas dentro del dominio editorial/deportivo principal**.

P10 Tools nace como laboratorio de adquisición orgánica con herramientas pequeñas, útiles y medibles. No debe convertirse en una granja de contenido ni en un catálogo de miles de páginas generadas automáticamente.

Se agregan:

- arquitectura y aislamiento del subdominio `tools.pont3la10.com`;
- catálogo/registro común de herramientas;
- primer paquete de utilidades generales;
- vertical experimental de significados;
- reglas de calidad, indexación y lifecycle;
- analytics segmentado por superficie/hostname;
- Ads específicos para P10 Tools reutilizando la infraestructura común;
- marco objetivo para decidir cuándo un vertical merece independizarse.

**Total activo: 60 HUs.**

La monetización mediante tipsters, premium y afiliación continúa fuera del alcance activo. Display Ads queda permitido únicamente como experimento medido en superficies evergreen y P10 Tools.

---

# 1. Propósito de este backlog

Este documento convierte la estrategia de producto definida para Pont3la10 en un backlog implementable.

No parte de un producto vacío. El código actual ya contiene:

- Nuxt 3, Vue 3 y TypeScript.
- Nitro como backend.
- Supabase Auth, PostgreSQL, Storage y RLS.
- CMS editorial.
- Workflow `draft → review → changes_requested → approved → scheduled → published → archived`.
- Versionado de artículos.
- Taxonomías.
- Ingestas.
- Worker durable.
- DeepSeek.
- Automatización editorial Codex.
- Agenda, checkpoints, idempotencia y API privada firmada.
- Resultados deportivos.
- `/partidos-hoy`.
- `/resultados/{id}`.
- SEO técnico, sitemap y news sitemap.
- JSON-LD.
- GA4.
- Tests unitarios y CI.
- Cuenta/autenticación pública inicial.

Por tanto, **no se debe reconstruir el CMS, autenticación, seguridad, SEO base ni motor Codex desde cero**.

El refactor debe extender esas capacidades.

---

# 2. Tesis de producto

Pont3la10 evoluciona de:

```text
noticia
→ publicación
→ visita
→ salida
```

a:

```text
oportunidad
→ contenido / dato / herramienta / juego
→ primera visita
→ interacción
→ retorno
→ cuenta
→ racha / XP
→ share
→ nuevo usuario
```

La publicación deja de ser el final del proceso.

A partir de v4, el ecosistema se divide por intención de usuario:

```text
PONT3LA10 SPORTS
pont3la10.com
→ información deportiva
→ utilidad deportiva
→ datos
→ juegos
→ identidad del fan
→ retención

P10 TOOLS
tools.pont3la10.com
→ resolver una tarea
→ interacción inmediata
→ SEO evergreen
→ medición
→ Ads
→ descubrir verticales con demanda real
```

Ambas superficies pueden compartir infraestructura técnica, analítica, componentes y operación, pero **no deben compartir indiscriminadamente taxonomía, navegación ni identidad temática**.

---

# 3. Objetivos del backlog

## 3.1 Adquisición

Aumentar:

- impresiones orgánicas;
- clics;
- CTR;
- sesiones orgánicas con interacción;
- tráfico referido;
- tráfico social.

## 3.2 Retención

Medir y mejorar:

- D1;
- D7;
- D30;
- usuarios recurrentes;
- tráfico directo;
- juegos por usuario;
- rachas.

## 3.3 Eficiencia editorial

Reducir:

- publicaciones de vida útil muy corta sin demanda;
- duplicidad de URLs;
- contenido creado únicamente porque un tema está en tendencia;
- investigación repetida;
- artículos que deberían haber sido actualizaciones.

## 3.4 Producto

Construir razones permanentes para volver:

- hubs;
- páginas de utilidad;
- perfiles;
- juegos;
- P10 Daily;
- rankings;
- comunidad;
- utilidades generales medibles en P10 Tools;
- nuevos verticales sólo cuando los datos justifiquen escalarlos.

---

# 4. Supuestos de planificación usados en esta versión

Estas decisiones se utilizan como **defaults de backlog**, no como verdades irreversibles:

1. P10 Games inicia con fútbol.
2. Día lógico de juegos: `America/Bogota`.
3. El cambio diario ocurre a las 00:00.
4. El usuario puede jugar sin cuenta.
5. La cuenta se solicita después de demostrar valor.
6. La 10 y Adivina el jugador son los primeros juegos.
7. P10 Grid sigue inmediatamente después.
8. Primer vertical SEO diferencial: Colombianos en Europa.
9. Tendencias se conserva sólo cuando encaja con deporte/cultura/tecnología deportiva.
10. Gaming se concentra inicialmente en fútbol gaming.
11. Opinión importante debe tener autor identificable.
12. No hay premios con dinero en el MVP.
13. No hay publicación IA totalmente automática.
14. Hubs usan rutas limpias, conservando compatibilidad con URLs actuales.
15. Datos de TV/streaming se cargan manualmente hasta tener una fuente fiable.
16. Dataset de jugadores será híbrido: proveedor + snapshot/curación interna.
17. El foco de los próximos ciclos sigue siendo SEO + Games; se habilita únicamente un piloto controlado de display ads sobre superficies evergreen cuando existan tráfico y métricas suficientes.
18. Tipsters, premium y afiliación continúan en Icebox hasta tener audiencia suficiente; el piloto de Ads no autoriza degradar UX, Core Web Vitals ni publicar thin content.
19. `pont3la10.com` se conserva como producto deportivo; utilidades generales no relacionadas con deporte no se publican allí.
20. `tools.pont3la10.com` será la superficie inicial de P10 Tools.
21. P10 Tools inicia sin login obligatorio, comunidad ni CMS editorial pesado.
22. P10 Tools valida primero entre 10 y 20 utilidades; no se escala por volumen de URLs sino por demanda y uso.
23. Las primeras familias candidatas son `calculadoras`, `fechas`, `random`, `conversiones` y `estudio`; `significados` se trata como experimento separado por su mayor riesgo de thin content.
24. P10 Tools puede compartir librerías, analytics, Ads y deployment tooling con Sports, pero canonical, sitemap, navegación, taxonomía y métricas deben distinguir cada hostname.
25. Un vertical de P10 Tools sólo se independiza en subdominio o dominio propio después de demostrar demanda, profundidad de catálogo, monetización y valor de marca.

---

# 5. Invariantes del sistema

Ninguna historia de este backlog puede romper:

- artículos publicados;
- URLs públicas actuales;
- `/articulos`;
- `/resultados`;
- `/partidos-hoy`;
- canonical;
- sitemap;
- ingestas;
- worker;
- workflow editorial;
- MFA;
- permisos;
- RLS;
- programación;
- automatización Codex;
- revisión humana;
- identidad deportiva de `pont3la10.com`;
- aislamiento de canonical/sitemap entre Sports y P10 Tools;
- ausencia de enlaces cruzados agresivos o artificiales entre superficies.

---

# 6. Priorización

## P0 — Fundacional

Sin esto no debe comenzar la expansión.

## P1 — MVP / crecimiento directo

Debe ejecutarse después de la fundación.

## P2 — Escalamiento

Aporta retención, autoridad o eficiencia una vez validado el MVP.

## LATER — Icebox

No comprometer desarrollo todavía.

---

# 7. Resumen ejecutivo del backlog activo

| Épica | Objetivo | HUs |
|---|---|---:|
| EP-TR-01 Inteligencia editorial | Elegir mejor qué crear | 7 |
| EP-TR-02 SEO & Discovery | Crear tráfico acumulativo | 8 |
| EP-TR-03 Sports Utility & Data | Convertir datos en producto | 8 |
| EP-TR-04 P10 Games MVP | Crear hábito diario | 10 |
| EP-TR-05 Identidad & Retención | Convertir hábito en relación | 6 |
| EP-TR-06 Growth Analytics | Cerrar el ciclo de aprendizaje | 5 |
| EP-TR-07 Eventos Evergreen & Ads | Capturar demanda recurrente y monetizar superficies útiles | 8 |
| EP-TR-08 P10 Tools | Validar utilidades generales como motor SEO + Ads | 8 |
| **Total activo** |  | **60** |

---


# HU-TR-01 — Incorporar intención estratégica al contenido

**Épica:** EP-TR-01 — Inteligencia editorial orientada a Growth  
**Prioridad:** P0  
**Estado:** Refactor  
**Tamaño inicial:** M  
**Actor principal:** responsable editorial

## Historia

**Como** responsable editorial  
**quiero** clasificar cada pieza por la razón estratégica por la que existe  
**para** separar el formato editorial de su función de adquisición, utilidad o retención.

## Problema / valor de negocio

Hoy `TipoContenidoEditorial` describe si una pieza es noticia, análisis, especial, etc., pero no explica para qué existe. Se agrega `contentIntent` sin reemplazar el modelo actual.

## Base actual que se reutiliza

- `types/contenidoEditorial.ts`
- `pages/admin/contenidos/[id].vue`
- `server/utils/esquemasCodexEditorial.ts`
- `server/api/internal/codex/proposals.post.ts`
- `supabase/migrations/*`

## Alcance funcional

Agregar `IntencionContenidoEditorial` con valores iniciales:

```text
search_utility
breaking
explainer
evergreen
data_story
special
opinion
game_support
social_first
update
```

Mostrar `Tipo` e `Intención` como campos distintos en el editor y propagar el valor por contratos públicos/privados donde corresponda.

## Reglas de negocio

- **RN01:** Todo contenido nuevo debe tener una intención válida.
- **RN02:** La intención no modifica por sí sola el workflow editorial.
- **RN03:** `update` debe enlazar un recurso objetivo existente.
- **RN04:** Los artículos históricos reciben backfill conservador; no se intenta adivinar casos ambiguos.
- **RN05:** Codex sólo puede enviar valores pertenecientes al enum validado.

## Frontend

- Agregar selector de intención en el editor.
- Mostrar intención en bandeja/filtros administrativos.
- Explicar brevemente cada intención para evitar clasificación arbitraria.

## Backend / API

- Extender creación/edición de contenidos.
- Extender contratos Codex `draft` y `proposals`.
- Validar con Zod antes de persistir.

## Base de datos

- Agregar `articles.content_intent`.
- Actualizar snapshots/versiones para conservar el campo.
- Backfill mínimo compatible con contenidos históricos.

## SEO

La intención no debe imprimirse como keyword artificial. Se usa para decidir template, metadata, enlaces y ciclo de vida.

## Analytics

- `content_intent_selected`
- `article_view (dimensión content_intent)`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un editor crea un borrador  
**CUANDO** guarda el contenido  
**ENTONCES** el servidor persiste una intención válida
### CA02
**DADO** Codex envía una intención desconocida  
**CUANDO** la API valida la propuesta  
**ENTONCES** la solicitud es rechazada sin crear artículo
### CA03
**DADO** existen artículos publicados históricos  
**CUANDO** se aplica la migración  
**ENTONCES** siguen disponibles con backfill compatible

## Dependencias

- Ninguna.

## Definition of Done específica

Migración versionada; tipos, Zod, CRUD y UI alineados; pruebas de backfill y contratos; lint, suite, typecheck y build verdes.

---


# HU-TR-02 — Calcular Strategic Opportunity Score

**Épica:** EP-TR-01 — Inteligencia editorial orientada a Growth  
**Prioridad:** P0  
**Estado:** Refactor  
**Tamaño inicial:** L  
**Actor principal:** responsable de crecimiento

## Historia

**Como** responsable de crecimiento  
**quiero** puntuar cada oportunidad según su valor estratégico  
**para** priorizar temas con demanda, vida útil y diferenciación en vez de producir sólo por recencia.

## Problema / valor de negocio

Codex ya calcula `recency`, `relevance`, `novelty` y `editorialFit`. Esta HU evoluciona ese sistema, no crea otro motor paralelo.

## Base actual que se reutiliza

- `server/utils/esquemasCodexEditorial.ts`
- `server/api/internal/codex/agenda.post.ts`
- `supabase/migrations/20260926082738_hu_ed_10_codex_agenda_checkpoints.sql`
- `.agents/skills/pont3la10-trend-research/SKILL.md`

## Alcance funcional

Añadir scores `0..100`:

```text
searchDemand
lifespan
socialPotential
interactivePotential
firstPartyData
competitionOpportunity
```

El servidor calcula `strategicScore`; la IA nunca envía el total final como autoridad.

## Reglas de negocio

- **RN01:** El score total se calcula en servidor.
- **RN02:** Los thresholds pueden variar por `contentIntent`.
- **RN03:** Un breaking relevante puede aprobarse con lifespan bajo.
- **RN04:** Un evergreen puede priorizarse aunque su recencia sea baja.
- **RN05:** Ausencia de evidencia de demanda no puede convertirse mágicamente en demanda alta.

## Frontend

- Mostrar score total y desglose en Operación/Radar.
- Permitir ordenar oportunidades por score.
- Mostrar motivo cuando un criterio carece de evidencia.

## Backend / API

- Extender `esquemaScoresTendencia`.
- Calcular total después de validar scores.
- Persistir desglose en el candidato de agenda.

## Base de datos

- Reutilizar JSON de `editorial_codex_agenda_candidates` inicialmente.
- Crear columnas derivadas sólo si el dashboard demuestra necesidad.

## SEO

El score influye en selección editorial, no se expone directamente a buscadores.

## Analytics

- `editorial_opportunity_scored`
- `editorial_opportunity_selected`
- `editorial_opportunity_discarded`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** una oportunidad tiene alta recencia pero demanda y relevancia bajas  
**CUANDO** se calcula el score  
**ENTONCES** no queda arriba únicamente por ser reciente
### CA02
**DADO** un explainer tiene demanda y lifespan altos  
**CUANDO** se calcula el score  
**ENTONCES** puede superar a noticias efímeras
### CA03
**DADO** un score llega fuera del rango 0..100  
**CUANDO** se valida la agenda  
**ENTONCES** la API rechaza la entrada

## Dependencias

- HU-TR-01.

## Definition of Done específica

Fórmula versionada y testeada; validación de rangos; dashboard muestra desglose; deduplicación/checkpoints existentes continúan funcionando.

---


# HU-TR-03 — Decidir acción editorial antes de crear contenido

**Épica:** EP-TR-01 — Inteligencia editorial orientada a Growth  
**Prioridad:** P0  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** editor

## Historia

**Como** editor  
**quiero** recibir una acción recomendada por oportunidad  
**para** evitar crear una URL nueva cuando conviene actualizar, construir un hub o descartar.

## Problema / valor de negocio

El sistema actual desemboca principalmente en propuesta de artículo. El nuevo core necesita decidir `crear`, `actualizar`, `producto`, `juego` o `descartar`.

## Base actual que se reutiliza

- `server/api/internal/codex/agenda.post.ts`
- `server/api/internal/codex/context.post.ts`
- `server/utils/esquemasCodexEditorial.ts`
- `pages/admin/operacion.vue`

## Alcance funcional

Agregar:

```text
recommendedAction:
  create_article
  update_article
  update_hub
  create_data_story
  create_game_candidate
  manual_review
  discard

targetResourceId?
targetResourceType?
actionReason
```

## Reglas de negocio

- **RN01:** Una oportunidad no equivale a un artículo.
- **RN02:** `update_*` exige recurso objetivo existente.
- **RN03:** `discard` conserva razón y score para aprendizaje.
- **RN04:** `create_game_candidate` no publica un juego.
- **RN05:** Ninguna acción de Codex puede aprobar/publicar contenido.

## Frontend

- Panel de oportunidad con acción, target y razón.
- Botones `Crear borrador`, `Abrir target`, `Descartar`, `Posponer`.
- Estado visual de acción ya tomada.

## Backend / API

- Extender agenda/contexto Codex.
- Resolver targets mediante catálogo limitado.
- Registrar decisión editorial humana.

## Base de datos

- Persistir `recommendedAction`, target y decisión final en candidato/checkpoint o tabla de decisiones si se requiere auditoría.

## SEO

Favorece consolidación de URLs y evita canibalización por artículos redundantes.

## Analytics

- `editorial_action_recommended`
- `editorial_action_confirmed`
- `editorial_action_overridden`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** existe un hub adecuado  
**CUANDO** Codex detecta una actualización diaria  
**ENTONCES** la oportunidad puede recomendar `update_hub` con target
### CA02
**DADO** el usuario descarta una oportunidad  
**CUANDO** confirma descarte  
**ENTONCES** la razón queda persistida
### CA03
**DADO** la acción es `update_article` sin target válido  
**CUANDO** se valida la solicitud  
**ENTONCES** no puede ejecutarse

## Dependencias

- HU-TR-01
- HU-TR-02.

## Definition of Done específica

Contrato tipado, UI de decisión, persistencia y pruebas de todas las acciones; sin bypass del workflow actual.

---


# HU-TR-04 — Aplicar plantillas editoriales según intención

**Épica:** EP-TR-01 — Inteligencia editorial orientada a Growth  
**Prioridad:** P1  
**Estado:** Refactor  
**Tamaño inicial:** M  
**Actor principal:** lector

## Historia

**Como** lector  
**quiero** que el contenido esté estructurado según la necesidad que intenta resolver  
**para** encontrar primero la información útil y después el contexto.

## Problema / valor de negocio

Un search utility, una noticia urgente y un explainer no deberían redactarse con la misma estructura narrativa.

## Base actual que se reutiliza

- `server/utils/ai/deepseekCodexRedaccion.ts`
- `server/utils/ai/instrucciones/redaccion-codex.mjs`
- `.agents/skills/pont3la10-seo-editorial/SKILL.md`
- `utils/editorial/contenido.ts`

## Alcance funcional

Definir guías por intención:

- `search_utility`: respuesta directa → datos clave → contexto → relacionados.
- `breaking`: qué pasó → confirmado → por qué importa → qué sigue.
- `explainer`: respuesta corta → cómo funciona → ejemplo → caso.
- `data_story`: hallazgo → metodología → comparación → limitaciones.
- `special`: gancho → historia → contexto → cierre.

## Reglas de negocio

- **RN01:** Las plantillas son guías, no texto rígido.
- **RN02:** No inventar datos para llenar una sección.
- **RN03:** Mantener `DocumentoEditorial` como contrato común.
- **RN04:** Fuentes estructuradas siguen siendo obligatorias cuando aplique.

## Frontend

- Vista previa puede mostrar checklist de estructura según intent.
- No crear editores separados.

## Backend / API

- Enviar intent al proveedor de redacción.
- Validar salida bajo el contrato editorial existente.

## Base de datos

- Sin tablas nuevas; el intent queda en artículo/snapshot.

## SEO

Search utility debe resolver intención arriba; explainers pueden incorporar FAQ sólo cuando exista contenido real y útil.

## Analytics

- `template_intent_used`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un borrador es `search_utility`  
**CUANDO** se genera con IA  
**ENTONCES** la respuesta directa aparece antes del contexto extenso
### CA02
**DADO** faltan datos para una sección  
**CUANDO** se genera el borrador  
**ENTONCES** la IA la omite en vez de inventarla

## Dependencias

- HU-TR-01.

## Definition of Done específica

Prompts versionados, pruebas de contrato, revisión humana intacta y comparación de muestras antes/después.

---


# HU-TR-05 — Gestionar ciclo de vida evergreen y actualizaciones

**Épica:** EP-TR-01 — Inteligencia editorial orientada a Growth  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** editor

## Historia

**Como** editor  
**quiero** marcar contenidos que deben mantenerse actualizados  
**para** acumular valor en URLs estables en lugar de publicar duplicados.

## Problema / valor de negocio

Las páginas útiles deben tener política de revisión y actualización distinta a una noticia efímera.

## Base actual que se reutiliza

- `pages/admin/contenidos/[id].vue`
- `server/utils/repositorioContenidoEditorial.ts`
- `server/routes/sitemap.xml.get.ts`
- `supabase/migrations/*`

## Alcance funcional

Agregar política:

```text
none
daily
weekly
monthly
event_driven
```

y fechas `last_content_review_at`, `review_due_at` cuando aplique.

## Reglas de negocio

- **RN01:** Actualizar contenido no crea automáticamente un slug nuevo.
- **RN02:** La versión pública permanece estable mientras la revisión no se apruebe.
- **RN03:** `dateModified` sólo cambia cuando la versión pública realmente cambia.
- **RN04:** Contenido vencido no se despublica automáticamente.

## Frontend

- Selector de política en editor.
- Indicador `Revisión pendiente` en bandeja.
- Filtro de contenidos por revisar.

## Backend / API

- CRUD de política y fechas.
- Consulta de pendientes para panel.

## Base de datos

- Agregar metadata de actualización a `articles` o entidad separada si se necesita histórico.
- Índice por `review_due_at`.

## SEO

Mantener canonical y registrar `dateModified` real en la versión publicada.

## Analytics

- `content_update_due`
- `content_updated`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** una landing evergreen vence según política  
**CUANDO** el editor abre el panel  
**ENTONCES** aparece en pendientes
### CA02
**DADO** se edita una página publicada  
**CUANDO** todavía no se aprueba la revisión  
**ENTONCES** la versión pública anterior permanece estable

## Dependencias

- HU-TR-01.

## Definition of Done específica

Política persistida, bandeja de pendientes, versionado correcto y fecha SEO real.

---


# HU-TR-06 — Controlar portafolio editorial y mezcla de contenido

**Épica:** EP-TR-01 — Inteligencia editorial orientada a Growth  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** responsable editorial

## Historia

**Como** responsable editorial  
**quiero** ver si la producción semanal está concentrada en contenido efímero  
**para** mantener una mezcla alineada con la estrategia de tráfico.

## Problema / valor de negocio

La estrategia objetivo prioriza Search Utility y Evergreen sobre crónicas genéricas. Esta HU convierte esa intención en observabilidad, no en cuotas ciegas.

## Base actual que se reutiliza

- `pages/admin/operacion.vue`
- `server/api/admin/operacion.get.ts`
- `types/contenidoEditorial.ts`

## Alcance funcional

Dashboard de últimos 7/30 días por:

```text
contentIntent
contentType
category
sourceOrigin
```

Mostrar recomendación si hay desequilibrio; no bloquear publicación.

## Reglas de negocio

- **RN01:** La distribución objetivo es guía, no restricción automática.
- **RN02:** No forzar artículos débiles para completar porcentajes.
- **RN03:** Breaking importante siempre puede publicarse.
- **RN04:** La recomendación debe basarse en piezas realmente publicadas.

## Frontend

- Widget de mezcla editorial.
- Comparación 7 vs 30 días.
- Alertas informativas, no bloqueantes.

## Backend / API

- Endpoint/admin agregado sobre artículos publicados.

## Base de datos

- Usar datos existentes + `content_intent`; evitar tabla materializada hasta necesitar performance.

## SEO

Indirecto: ayuda a sostener una estrategia people-first y reduce thin/duplicated content.

## Analytics

- Sin evento nuevo.

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** la semana está dominada por breaking  
**CUANDO** se abre Operación  
**ENTONCES** el sistema muestra el desbalance sin impedir publicar
### CA02
**DADO** no hay suficientes publicaciones  
**CUANDO** se calcula el reporte  
**ENTONCES** muestra muestra insuficiente en vez de conclusiones falsas

## Dependencias

- HU-TR-01.

## Definition of Done específica

Dashboard correcto con ventanas 7/30, estados vacíos y pruebas de agregación.

---


# HU-TR-07 — Crear Radar de Oportunidades dentro del flujo Codex existente

**Épica:** EP-TR-01 — Inteligencia editorial orientada a Growth  
**Prioridad:** P1  
**Estado:** Extensión  
**Tamaño inicial:** L  
**Actor principal:** responsable editorial

## Historia

**Como** responsable editorial  
**quiero** recibir una bandeja diaria de oportunidades priorizadas  
**para** reducir investigación manual y seleccionar sólo piezas con razón estratégica.

## Problema / valor de negocio

Ya existe agenda/checkpoints de Codex. El Radar debe ser una vista/productización de ese motor, no un servicio paralelo.

## Base actual que se reutiliza

- `server/api/internal/codex/context.post.ts`
- `server/api/internal/codex/agenda.post.ts`
- `pages/admin/operacion.vue`
- `supabase/migrations/20260926082738_hu_ed_10_codex_agenda_checkpoints.sql`

## Alcance funcional

Mostrar por oportunidad:

```text
tema
intent
strategicScore
acción recomendada
razón
target
señales utilizadas
estado
```

Señales futuras: Search Console, histórico, calendario deportivo, APIs y fuentes oficiales.

## Reglas de negocio

- **RN01:** Radar no aprueba ni publica.
- **RN02:** No exige llenar cupos con temas débiles.
- **RN03:** Cada señal debe diferenciar evidencia real de inferencia.
- **RN04:** Reanudar una corrida no debe duplicar oportunidades.

## Frontend

- Nueva sección Radar dentro de admin/operación o ruta propia.
- Filtros por intent, categoría, score y acción.
- Acciones aceptar/descartar/posponer.

## Backend / API

- Reutilizar endpoints privados de Codex y crear API admin de lectura/decisión si es necesario.

## Base de datos

- Reutilizar runs/candidates/checkpoints; agregar decisión editorial sólo si no existe campo adecuado.

## SEO

No aplica directamente.

## Analytics

- `radar_view`
- `radar_accept`
- `radar_discard`
- `radar_postpone`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** existe una corrida parcial  
**CUANDO** el usuario entra al Radar  
**ENTONCES** ve lo ya encontrado sin duplicados
### CA02
**DADO** una oportunidad carece de evidencia suficiente  
**CUANDO** se muestra  
**ENTONCES** queda marcada y no se presenta como demanda comprobada

## Dependencias

- HU-TR-02
- HU-TR-03
- HU-TR-40 o importación inicial de métricas para señales de Search Console.

## Definition of Done específica

Radar usable, acciones auditables, sin duplicar el motor Codex y con pruebas de reanudación.

---


# HU-TR-08 — Filtrar artículos en servidor por categoría y búsqueda

**Épica:** EP-TR-02 — SEO, Discovery y activos permanentes  
**Prioridad:** P0  
**Estado:** Corrección/Refactor  
**Tamaño inicial:** M  
**Actor principal:** lector

## Historia

**Como** lector  
**quiero** obtener resultados completos de una categoría  
**para** no depender del subconjunto de artículos ya cargado en el navegador.

## Problema / valor de negocio

Actualmente `pages/articulos/index.vue` carga una página global y filtra localmente. Esto puede mostrar una categoría vacía aunque existan artículos más atrás.

## Base actual que se reutiliza

- `pages/articulos/index.vue`
- `server/api/articulos/index.get.ts`
- `server/utils/repositorioContenidoEditorial.ts`
- `utils/articulosLanding.ts`
- `tests/unit/landing.test.ts`

## Alcance funcional

Extender `/api/articulos` con filtros server-side:

```text
categoria
tema
buscar
limite
cursor/pagina
```

La búsqueda pública puede mantenerse `noindex`.

## Reglas de negocio

- **RN01:** La categoría se filtra en base/servidor antes de paginar.
- **RN02:** No devolver borradores.
- **RN03:** Validar categorías/inputs.
- **RN04:** La carga de una página posterior conserva el filtro.

## Frontend

- Enviar filtros al endpoint.
- Eliminar dependencia del filtro local para completitud.
- Mantener estados vacío/error/carga.

## Backend / API

- Extender `GET /api/articulos`.
- Actualizar repositorio/RPC pública con parámetros seguros.

## Base de datos

- Preferir RPC con filtros e índices existentes; agregar índice sólo si EXPLAIN/volumen lo justifica.

## SEO

Soluciona consistencia de páginas de categoría; búsqueda interna continúa `noindex`.

## Analytics

- `category_filter`
- `search`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** existen 40 artículos y uno de categoría Tech está en una página posterior  
**CUANDO** se abre el filtro Tech  
**ENTONCES** el artículo puede aparecer sin recorrer páginas globales
### CA02
**DADO** se solicita categoría inválida  
**CUANDO** el API procesa la consulta  
**ENTONCES** responde de forma controlada sin SQL dinámico inseguro

## Dependencias

- HU-TR-01 no obligatoria.

## Definition of Done específica

Filtrado server-side, tests de paginación+categoría, compatibilidad de URLs y build verde.

---


# HU-TR-09 — Implementar paginación pública rastreable

**Épica:** EP-TR-02 — SEO, Discovery y activos permanentes  
**Prioridad:** P1  
**Estado:** Refactor  
**Tamaño inicial:** M  
**Actor principal:** lector y crawler

## Historia

**Como** lector y crawler  
**quiero** navegar contenido antiguo mediante URLs estables  
**para** hacer accesible el archivo sin depender sólo de `Cargar más`.

## Problema / valor de negocio

El botón de carga incremental es útil para UX, pero no debe ser la única forma de alcanzar páginas antiguas.

## Base actual que se reutiliza

- `pages/articulos/index.vue`
- `server/api/articulos/index.get.ts`
- `server/routes/sitemap.xml.get.ts`

## Alcance funcional

Agregar navegación rastreable mediante una de estas rutas canónicas:

```text
/articulos/pagina/2
```

o paginación equivalente dentro de hubs.

`Cargar más` puede permanecer como mejora de UX.

## Reglas de negocio

- **RN01:** Cada página debe resolver SSR.
- **RN02:** Previous/next deben ser enlaces reales.
- **RN03:** No generar páginas más allá del total disponible.
- **RN04:** Filtros canónicos no deben producir combinaciones infinitas indexables.

## Frontend

- Componente de paginación accesible.
- Mantener carga progresiva opcional.

## Backend / API

- Soportar `pagina/cursor` determinista.

## Base de datos

- Sin modelo nuevo.

## SEO

Canonical por página; no indexar combinaciones de búsqueda; enlaces rastreables.

## Analytics

- `pagination_view`
- `pagination_next`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** hay más de una página de publicaciones  
**CUANDO** el crawler abre página 2  
**ENTONCES** recibe contenido SSR y enlaces navegables
### CA02
**DADO** se solicita una página inexistente  
**CUANDO** el servidor responde  
**ENTONCES** no devuelve una página vacía indexable como válida

## Dependencias

- HU-TR-08.

## Definition of Done específica

Paginación SSR, canonical coherente, enlaces accesibles y pruebas.

---


# HU-TR-10 — Crear entidad de Hubs públicos

**Épica:** EP-TR-02 — SEO, Discovery y activos permanentes  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** lector

## Historia

**Como** lector  
**quiero** consultar una página central útil para un tema  
**para** encontrar contenido, datos y herramientas en una URL permanente.

## Problema / valor de negocio

Una categoría editorial no debería asumir toda la responsabilidad de una landing con copy evergreen, widgets, partidos, juegos y FAQs.

## Base actual que se reutiliza

- `pages/articulos/index.vue`
- `composables/useSeoPont3la10.ts`
- `utils/seo.ts`
- `server/routes/sitemap.xml.get.ts`
- `pages/admin/taxonomias.vue`

## Alcance funcional

Crear `public_hubs` y renderer modular.

Tipos iniciales:

```text
topic
competition
player_collection
technology
gaming
```

Primeros candidatos:

```text
/colombianos-en-europa
/tecnologia-deportiva
/futbol-colombiano
/gaming
```

## Reglas de negocio

- **RN01:** Hub y categoría son conceptos distintos.
- **RN02:** Un hub sólo se indexa cuando tiene contenido útil suficiente.
- **RN03:** No generar hubs vacíos para cada tag.
- **RN04:** URLs query actuales se mantienen compatibles.

## Frontend

- Renderer público de hub.
- CMS mínimo para título, descripción, cuerpo y módulos.
- Breadcrumbs.

## Backend / API

- GET público por slug.
- CRUD admin protegido.

## Base de datos

- Nueva tabla `public_hubs`.
- Opcional `public_hub_sections` si módulos no caben de forma limpia en JSON validado.

## SEO

Title, description, canonical, breadcrumbs, CollectionPage/WebPage según tipo, inclusión en sitemap cuando publicado.

## Analytics

- `hub_view`
- `hub_module_click`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un hub está publicado  
**CUANDO** se abre su slug  
**ENTONCES** renderiza SSR con metadata y módulos configurados
### CA02
**DADO** un hub está en draft  
**CUANDO** un usuario público solicita la URL  
**ENTONCES** no recibe contenido interno

## Dependencias

- HU-TR-08.

## Definition of Done específica

Modelo, RLS/ACL, admin mínimo, SSR público, sitemap y pruebas.

---


# HU-TR-11 — Usar lastmod y dateModified reales

**Épica:** EP-TR-02 — SEO, Discovery y activos permanentes  
**Prioridad:** P1  
**Estado:** Refactor  
**Tamaño inicial:** S  
**Actor principal:** buscador

## Historia

**Como** buscador  
**quiero** recibir fechas reales de publicación y modificación  
**para** entender cuándo cambió realmente un recurso.

## Problema / valor de negocio

La actualización evergreen sólo sirve si el SEO refleja la versión pública real y no la hora del request.

## Base actual que se reutiliza

- `server/routes/sitemap.xml.get.ts`
- `server/routes/news-sitemap.xml.get.ts`
- `composables/useSeoPont3la10.ts`
- `pages/articulos/[slug].vue`
- `supabase/migrations/20260927131539_latest_public_home_feature_and_reading_time.sql`

## Alcance funcional

Agregar `lastmod` al sitemap y derivar `dateModified` desde la revisión/snapshot público vigente.

## Reglas de negocio

- **RN01:** No falsificar frescura cambiando fechas sin modificar contenido.
- **RN02:** `datePublished` permanece estable.
- **RN03:** `dateModified` cambia sólo al publicar una nueva revisión.

## Frontend



## Backend / API

- Exponer fecha de modificación pública en DTO de artículo cuando sea necesaria.

## Base de datos

- Usar versionado/snapshot actual; agregar campo sólo si no puede derivarse de forma fiable.

## SEO

Reemplazar dependencia de `priority/changefreq` por `lastmod` real donde aplique.

## Analytics

- Sin evento nuevo.

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un artículo no ha sido modificado  
**CUANDO** se genera sitemap  
**ENTONCES** mantiene lastmod coherente
### CA02
**DADO** se publica una revisión nueva  
**CUANDO** se renderiza JSON-LD  
**ENTONCES** dateModified refleja esa revisión

## Dependencias

- HU-TR-05 recomendada.

## Definition of Done específica

Sitemap y JSON-LD validados; tests de fechas; ninguna fecha futura accidental.

---


# HU-TR-12 — Crear perfiles públicos de autor

**Épica:** EP-TR-02 — SEO, Discovery y activos permanentes  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** lector

## Historia

**Como** lector  
**quiero** conocer quién firma análisis y opinión  
**para** evaluar experiencia, perspectiva y otros contenidos del autor.

## Problema / valor de negocio

La opinión pierde identidad cuando todo aparece bajo una firma institucional genérica.

## Base actual que se reutiliza

- `types/contenidoEditorial.ts`
- `pages/articulos/[slug].vue`
- `supabase/migrations/0001_foundation.sql`
- `server/utils/repositorioContenidoEditorial.ts`

## Alcance funcional

Ruta:

```text
/autores/{slug}
```

Campos públicos:

```text
displayName
slug
bio
role
avatar
socialLinks
```

El email nunca se expone.

## Reglas de negocio

- **RN01:** Opinión requiere persona identificada salvo editorial institucional explícita.
- **RN02:** Noticias pueden mantener autor institucional.
- **RN03:** Autor público debe optar por perfil visible.

## Frontend

- Perfil de autor.
- Byline enlazable en artículos.
- Lista de publicaciones del autor.

## Backend / API

- GET público de autor y publicaciones.

## Base de datos

- Extender `user_profiles` o crear perfil público 1:1, con RLS clara.

## SEO

Schema `Person` para autor real; no inventar credenciales.

## Analytics

- `author_view`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un artículo de opinión tiene autor público  
**CUANDO** el lector pulsa la firma  
**ENTONCES** accede a su perfil
### CA02
**DADO** un perfil no está habilitado  
**CUANDO** se consulta su slug  
**ENTONCES** no se exponen datos privados

## Dependencias

- HU-TR-08 para listado filtrado por autor.

## Definition of Done específica

Modelo público seguro, ruta SSR, schema y pruebas de privacidad.

---


# HU-TR-13 — Crear bloque de respuesta directa para Search Utility

**Épica:** EP-TR-02 — SEO, Discovery y activos permanentes  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** visitante orgánico

## Historia

**Como** visitante orgánico  
**quiero** ver la respuesta principal al inicio  
**para** resolver rápidamente búsquedas de horario, fecha, resultado o contexto.

## Problema / valor de negocio

Una persona que busca la hora de un partido no debería leer cuatro párrafos antes de encontrarla.

## Base actual que se reutiliza

- `pages/partidos-hoy.vue`
- `pages/resultados/[id].vue`
- `components/*`
- `utils/seo.ts`

## Alcance funcional

Nuevo componente reusable `RespuestaDirectaDeportiva.vue`.

Campos soportados:

```text
fecha
hora
competición
estadio
canal
streaming
resultado
estado
```

## Reglas de negocio

- **RN01:** Mostrar únicamente datos confirmados.
- **RN02:** Canal/streaming no se inventan.
- **RN03:** Campo faltante se omite o muestra `aún no confirmado` según contexto.
- **RN04:** La zona horaria debe estar explícita cuando sea relevante.

## Frontend

- Componente responsive y accesible.
- Uso inicial en partidos/search utility.

## Backend / API

- Consumir datos existentes; permitir metadata manual editorial para TV/streaming.

## Base de datos

- Metadata de transmisión sólo si se decide persistir manualmente; no obligatoria para MVP.

## SEO

Mejora respuesta people-first; no abusar de schema no soportado.

## Analytics

- `direct_answer_view`
- `direct_answer_action`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** hay horario y estadio confirmados  
**CUANDO** se abre la página  
**ENTONCES** aparecen en el bloque superior
### CA02
**DADO** no hay canal confirmado  
**CUANDO** se renderiza  
**ENTONCES** no aparece un canal inventado

## Dependencias

- HU-TR-17 para URLs de partido recomendado.

## Definition of Done específica

Componente reutilizable, estados parciales, zona horaria y tests.

---


# HU-TR-14 — Construir grafo interno de contenido y entidades

**Épica:** EP-TR-02 — SEO, Discovery y activos permanentes  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** lector

## Historia

**Como** lector  
**quiero** pasar naturalmente de una historia a jugadores, partidos, hubs y juegos  
**para** continuar navegando dentro de Pont3la10.

## Problema / valor de negocio

Los artículos relacionados actuales son una buena base, pero el nuevo producto necesita relaciones semánticas más amplias que artículo↔artículo.

## Base actual que se reutiliza

- `components/editorial/SeccionArticulosRelacionados.vue`
- `components/editorial/TarjetaEnlaceInterno.vue`
- `server/utils/repositorioContenidoEditorial.ts`
- `supabase/migrations/0008_editorial_internal_links.sql`

## Alcance funcional

Crear relaciones tipadas entre:

```text
article
hub
match
team
player
competition
game
```

Sin intentar construir un knowledge graph genérico.

## Reglas de negocio

- **RN01:** Una relación referencia recursos reales.
- **RN02:** No duplicar relaciones.
- **RN03:** La ausencia de relación no bloquea publicación.
- **RN04:** Las recomendaciones públicas sólo incluyen recursos publicados/activos.

## Frontend

- Bloques relacionados por entidad.
- Navegación contextual en artículo/hub/juego.

## Backend / API

- Resolver relaciones públicas por recurso.

## Base de datos

- Tabla `content_entity_links` o modelo equivalente con índices por origen/destino.

## SEO

Fortalece internal linking y clusters temáticos; enlaces deben ser HTML navegable.

## Analytics

- `related_entity_click`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un artículo está relacionado con un jugador  
**CUANDO** se renderiza  
**ENTONCES** el perfil/hub aparece como enlace
### CA02
**DADO** el recurso destino se archiva  
**CUANDO** se consulta la relación pública  
**ENTONCES** no se ofrece enlace roto

## Dependencias

- HU-TR-10
- HU-TR-16.

## Definition of Done específica

Modelo tipado, resolución pública segura, enlaces rastreables y tests.

---


# HU-TR-15 — Importar y explotar datos de Search Console

**Épica:** EP-TR-02 — SEO, Discovery y activos permanentes  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** responsable de crecimiento

## Historia

**Como** responsable de crecimiento  
**quiero** usar consultas, impresiones, CTR y posición para priorizar contenido  
**para** dejar de decidir únicamente por intuición o Trends.

## Problema / valor de negocio

Search Console debe convertirse en una señal del Radar. Como no se confirmó acceso API, el MVP debe admitir una vía manual/exportable antes de automatizar OAuth.

## Base actual que se reutiliza

- `pages/admin/operacion.vue`
- `server/api/admin/*`
- `supabase/migrations/*`

## Alcance funcional

Fase A:

- importar CSV/export de Search Console;
- normalizar consulta, página, fecha, clicks, impressions, ctr, position;
- no guardar datos personales.

Fase B futura:

- integración oficial API si se autoriza.

## Reglas de negocio

- **RN01:** No almacenar consultas sensibles si algún export las incluyera de forma identificable.
- **RN02:** Deduplicar por fecha+query+page.
- **RN03:** Distinguir dato real de estimación.
- **RN04:** No convertir automáticamente una consulta en artículo.

## Frontend

- Panel de importación admin.
- Tabla `oportunidades Search` con filtros.
- Indicador páginas con muchas impresiones y CTR bajo.

## Backend / API

- POST admin de importación con validación.
- GET agregados.

## Base de datos

- `search_console_metrics_daily` con índices por date/page/query hash o texto normalizado según política.

## SEO

Señal directa para optimizar titles, contenidos existentes y clusters.

## Analytics

- `search_console_import`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** se carga un export válido  
**CUANDO** se procesa  
**ENTONCES** las filas quedan normalizadas sin duplicados
### CA02
**DADO** una página tiene impresiones altas y CTR bajo  
**CUANDO** se consulta el panel  
**ENTONCES** aparece como oportunidad de optimización
### CA03
**DADO** se carga un archivo inválido  
**CUANDO** se valida  
**ENTONCES** no se persiste parcialmente sin reporte

## Dependencias

- Ninguna externa para CSV; API futura requiere autorización Google.

## Definition of Done específica

Importación segura, reporte útil, rollback/transacción y tests.

---


# HU-TR-16 — Persistir entidades deportivas internas y mappings de proveedores

**Épica:** EP-TR-03 — Sports Utility & Data  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** plataforma

## Historia

**Como** plataforma  
**quiero** identificar competiciones, equipos y jugadores con IDs internos estables  
**para** construir URLs y productos sin acoplarse a un ID de proveedor.

## Problema / valor de negocio

Los contratos `PartidoResultado` normalizan datos en runtime, pero el crecimiento hacia hubs/perfiles requiere identidad persistente.

## Base actual que se reutiliza

- `types/resultados.ts`
- `utils/resultadosDeportivos.ts`
- `utils/resultadosTheSportsDb.ts`
- `utils/resultadosBasketball.ts`
- `server/api/resultados/*`
- `nuxt.config.ts`

## Alcance funcional

Tablas propuestas:

```text
sports_competitions
sports_teams
sports_players
sports_provider_mappings
sports_player_memberships
```

El primer corte puede limitarse a fútbol.

## Reglas de negocio

- **RN01:** Nunca asumir que IDs de proveedores distintos son equivalentes.
- **RN02:** Mapping debe declarar provider + external_id.
- **RN03:** Slug interno es estable y no depende del nombre devuelto hoy por la API.
- **RN04:** Datos de imágenes/escudos respetan derechos del proveedor.

## Frontend

- No exige UI pública inmediata.
- Admin/diagnóstico mínimo para conflictos de mapping puede ser necesario.

## Backend / API

- Adaptadores traducen proveedor→entidad interna.
- Endpoints públicos siguen usando DTO normalizado.

## Base de datos

- Crear tablas e índices únicos provider/external_id.
- RLS: lectura pública sólo de campos aprobados; escritura servidor/admin.

## SEO

Fundación para URLs estables de jugadores/equipos/competiciones.

## Analytics

- Sin evento nuevo.

## Seguridad, privacidad y performance

Claves API continúan sólo en servidor. No persistir payloads completos del proveedor sin necesidad/licencia.

## Criterios de aceptación

### CA01
**DADO** un equipo llega desde API-Sports  
**CUANDO** se normaliza  
**ENTONCES** obtiene un ID interno estable
### CA02
**DADO** otro proveedor devuelve un nombre parecido sin mapping  
**CUANDO** se procesa  
**ENTONCES** no se fusiona automáticamente
### CA03
**DADO** cambia el nombre comercial de un equipo  
**CUANDO** se actualiza metadata  
**ENTONCES** el ID interno permanece

## Dependencias

- Confirmación de derechos/cobertura por proveedor cuando se persistan activos licenciados.

## Definition of Done específica

Modelo + adaptadores + pruebas de mapping/conflicto; sin regresión en resultados actuales.

---


# HU-TR-17 — Crear URL canónica estable de partido

**Épica:** EP-TR-03 — Sports Utility & Data  
**Prioridad:** P1  
**Estado:** Refactor  
**Tamaño inicial:** L  
**Actor principal:** aficionado

## Historia

**Como** aficionado  
**quiero** abrir una URL legible y estable para cada partido  
**para** consultar previa, vivo y resultado en el mismo recurso.

## Problema / valor de negocio

`/resultados/{id}` ya ofrece detalle, SportsEvent y actualización en vivo. Esta HU lo evoluciona sin destruir la ruta actual.

## Base actual que se reutiliza

- `pages/resultados/[id].vue`
- `server/api/resultados/[id].get.ts`
- `server/api/resultados/[id]/marcador.get.ts`
- `components/PanelResumenPartido.vue`
- `utils/seo.ts`

## Alcance funcional

Ruta futura:

```text
/partidos/{local}-vs-{visitante}-{yyyy-mm-dd}
```

`/resultados/{id}` sigue funcionando y puede canonicalizar/redirect sólo cuando el mapping sea inequívoco.

## Reglas de negocio

- **RN01:** Un partido mantiene URL antes/durante/después.
- **RN02:** No crear canonical nuevo si no puede resolverse de forma estable.
- **RN03:** La ruta antigua no puede romper enlaces existentes.

## Frontend

- Nueva página o alias que reutiliza componentes del detalle actual.
- Respuesta directa en cabecera.

## Backend / API

- Resolver slug→fixture interno/proveedor.
- Mantener endpoint de marcador.

## Base de datos

- Depende de entidad/fixture persistido o mapping determinista.

## SEO

SportsEvent existente se reutiliza; canonical limpio, breadcrumbs y enlaces desde `/partidos-hoy`.

## Analytics

- `match_view`
- `match_follow_toggle`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un partido programado tiene URL  
**CUANDO** finaliza  
**ENTONCES** la misma URL muestra el resultado
### CA02
**DADO** un usuario abre la URL histórica `/resultados/id`  
**CUANDO** el recurso existe  
**ENTONCES** no recibe 404 por la migración

## Dependencias

- HU-TR-16
- HU-TR-13 recomendado.

## Definition of Done específica

URL estable, compatibilidad legacy, schema válido y tests SSR.

---


# HU-TR-18 — Evolucionar Partidos de Hoy como producto de utilidad

**Épica:** EP-TR-03 — Sports Utility & Data  
**Prioridad:** P1  
**Estado:** Refactor  
**Tamaño inicial:** M  
**Actor principal:** aficionado

## Historia

**Como** aficionado  
**quiero** filtrar y encontrar rápidamente los partidos relevantes de hoy  
**para** usar `/partidos-hoy` como destino recurrente.

## Problema / valor de negocio

La ruta ya existe, adapta horarios a la zona del dispositivo y usa datos reales. El objetivo es profundizarla, no rehacerla.

## Base actual que se reutiliza

- `pages/partidos-hoy.vue`
- `server/api/resultados/index.get.ts`
- `components/TarjetaMarcadorCompacto.vue`
- `types/resultados.ts`

## Alcance funcional

Agregar progresivamente:

- deporte;
- competición;
- equipo;
- estado;
- destacados;
- enlaces a páginas canónicas de partido.

No convertir todos los filtros en URLs indexables.

## Reglas de negocio

- **RN01:** Hora local continúa siendo correcta.
- **RN02:** Estado vacío debe ser útil.
- **RN03:** Los filtros cliente no deben cambiar el canonical principal salvo rutas SEO diseñadas.
- **RN04:** No esconder partidos por una allowlist editorial arbitraria.

## Frontend

- Filtros rápidos accesibles.
- Persistencia de preferencia local opcional.
- Destacar competiciones relevantes sin borrar el resto.

## Backend / API

- Agregar filtros sólo si reducen payload y son necesarios; mantener cache.

## Base de datos

- Sin modelo nuevo obligatorio.

## SEO

Canonical `/partidos-hoy`; ItemList SSR; enlaces a partidos.

## Analytics

- `matches_today_view`
- `matches_today_filter`
- `match_card_click`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** hay partidos de múltiples competiciones  
**CUANDO** el usuario filtra una  
**ENTONCES** ve sólo los correspondientes sin perder hora local
### CA02
**DADO** no hay partidos  
**CUANDO** abre la ruta  
**ENTONCES** recibe estado útil y enlaces alternativos

## Dependencias

- HU-TR-17 para enlaces nuevos.

## Definition of Done específica

Filtros, analytics, estados y SEO sin regresiones.

---


# HU-TR-19 — Lanzar hub Colombianos en Europa

**Épica:** EP-TR-03 — Sports Utility & Data  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** aficionado colombiano

## Historia

**Como** aficionado colombiano  
**quiero** ver qué colombianos juegan hoy y cómo les fue  
**para** seguir a los jugadores colombianos desde un solo lugar.

## Problema / valor de negocio

Es el primer vertical diferencial propuesto y puede unir SEO, datos, perfiles y contenido.

## Base actual que se reutiliza

- `pages/partidos-hoy.vue`
- `server/api/resultados/*`
- `types/resultados.ts`
- `server/routes/sitemap.xml.get.ts`

## Alcance funcional

Ruta estable:

```text
/colombianos-en-europa
```

MVP:

- jugador;
- club;
- rival;
- competición;
- hora Colombia;
- estado;
- resultado;
- enlace a partido/perfil cuando exista.

## Reglas de negocio

- **RN01:** Sólo incluir jugadores identificados con suficiente certeza.
- **RN02:** La lista de colombianos debe ser mantenible/actualizable.
- **RN03:** No afirmar titularidad antes de tener alineación confirmada.
- **RN04:** La página se actualiza; no se crea una URL nueva cada día.

## Frontend

- Hub SSR con secciones `Juegan hoy`, `Resultados`, `Próximos`.
- Estado vacío honesto.

## Backend / API

- Servicio que cruza memberships de colombianos con fixtures.
- Cache y fecha de actualización visible.

## Base de datos

- Usar `sports_players`, `sports_player_memberships`, mappings.
- Campo de nacionalidad validado.

## SEO

URL permanente, title dinámico moderado, canonical estable, internal links a jugadores/partidos.

## Analytics

- `colombians_hub_view`
- `colombian_player_click`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un colombiano tiene partido hoy  
**CUANDO** se consulta el hub  
**ENTONCES** aparece con club, rival y hora
### CA02
**DADO** no existe confirmación de que juega como titular  
**CUANDO** se muestra el partido  
**ENTONCES** no se afirma titularidad

## Dependencias

- HU-TR-16
- HU-TR-17.

## Definition of Done específica

Datos contrastables, SSR, cache, actualización visible y pruebas.

---


# HU-TR-20 — Crear perfil público de jugador

**Épica:** EP-TR-03 — Sports Utility & Data  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** aficionado

## Historia

**Como** aficionado  
**quiero** consultar información y actividad reciente de un jugador  
**para** navegar desde búsquedas y juegos a un activo permanente.

## Problema / valor de negocio

Los perfiles convierten nombres repetidos en entidades SEO y alimentan juegos, artículos y hubs.

## Base actual que se reutiliza

- `types/resultados.ts`
- `components/editorial/SeccionArticulosRelacionados.vue`
- `utils/seo.ts`

## Alcance funcional

Ruta:

```text
/jugadores/{slug}
```

MVP:

- nombre;
- nacionalidad;
- posición;
- club actual;
- próximos partidos;
- últimas noticias relacionadas;
- datos con fecha/fuente.

## Reglas de negocio

- **RN01:** No publicar estadísticas sin fuente y temporada.
- **RN02:** No inferir club actual sólo por un artículo.
- **RN03:** Imágenes sólo con licencia válida.
- **RN04:** Perfil vacío no se indexa.

## Frontend

- Página SSR de jugador.
- Módulos reutilizables.

## Backend / API

- GET jugador por slug + módulos.
- Cache.

## Base de datos

- Usar `sports_players` y mappings; relaciones con contenido.

## SEO

Person/Athlete sólo si schema apropiado; canonical estable; breadcrumbs.

## Analytics

- `player_profile_view`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un jugador tiene datos suficientes  
**CUANDO** se publica el perfil  
**ENTONCES** aparece indexable con información vigente
### CA02
**DADO** faltan datos esenciales  
**CUANDO** se solicita el perfil  
**ENTONCES** no se crea thin page sólo por tener slug

## Dependencias

- HU-TR-16
- HU-TR-14.

## Definition of Done específica

Perfil útil, provenance, SEO y estados parciales.

---


# HU-TR-21 — Crear hub de competición y Liga BetPlay

**Épica:** EP-TR-03 — Sports Utility & Data  
**Prioridad:** P1 condicionado  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** aficionado

## Historia

**Como** aficionado  
**quiero** consultar tabla, jornada y resultados desde un centro de competición  
**para** resolver búsquedas recurrentes en una URL permanente.

## Problema / valor de negocio

Liga BetPlay es una oportunidad fuerte, pero la tabla/descenso exige coverage y derechos verificados.

## Base actual que se reutiliza

- `components/TablaClasificacionResultados.vue`
- `types/resultados.ts`
- `docs/BACKLOG.md`
- `server/api/resultados/*`

## Alcance funcional

Primer hub:

```text
/liga-betplay
```

Módulos según datos autorizados:

- tabla;
- próxima fecha;
- últimos resultados;
- goleadores;
- descenso/reclasificación sólo si se modelan reglas correctas.

## Reglas de negocio

- **RN01:** No publicar tabla/escudos sin cerrar el gate de derechos.
- **RN02:** No equiparar standings simples con descenso colombiano.
- **RN03:** Mostrar fuente y fecha de actualización.
- **RN04:** Degradar honestamente ante fallo del proveedor.

## Frontend

- Hub de competición.
- Componentes de tabla/jornada/resultado.

## Backend / API

- Adaptador de standings autorizado.
- Cache servidor.

## Base de datos

- Reutilizar entidades deportivas; cache persistido opcional según términos del proveedor.

## SEO

Hub permanente, enlaces de jornada/equipos y canonical estable.

## Analytics

- `competition_hub_view`
- `standings_interaction`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** la fuente autorizada responde  
**CUANDO** se abre Liga BetPlay  
**ENTONCES** se muestra tabla con fecha/fuente
### CA02
**DADO** la fuente falla  
**CUANDO** se abre el hub  
**ENTONCES** se conserva contenido útil y se declara que la tabla no está disponible

## Dependencias

- **HU-DA-01 existente** — fuente autorizada y cobertura.
- HU-TR-16.

## Definition of Done específica

Sólo cerrar cuando licencia/coverage estén documentados, datos contrastados y fallback probado.

---


# HU-TR-22 — Detectar consecuencias deportivas después de un partido

**Épica:** EP-TR-03 — Sports Utility & Data  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** responsable editorial

## Historia

**Como** responsable editorial  
**quiero** recibir hallazgos derivados de resultados  
**para** crear data stories útiles en vez de una crónica genérica de cada partido.

## Problema / valor de negocio

Un resultado puede cambiar tabla, clasificación, racha o estadística. Esas consecuencias suelen tener más intención de búsqueda que `X venció a Y`.

## Base actual que se reutiliza

- `server/api/resultados/*`
- `types/resultados.ts`
- `server/api/internal/codex/context.post.ts`

## Alcance funcional

Detector de eventos candidatos:

```text
fin de partido
cambio de posición
clasificación/eliminación
racha
hito estadístico
```

Genera oportunidad para Radar, no publicación.

## Reglas de negocio

- **RN01:** Cada hallazgo debe derivarse de datos verificables.
- **RN02:** No convertir cambios mínimos en contenido automáticamente.
- **RN03:** La oportunidad incluye cálculo/fuente usada.
- **RN04:** Sin standings autorizados no calcular consecuencias de tabla.

## Frontend

- Mostrar hallazgo en Radar.

## Backend / API

- Servicio/event detector ejecutado tras refresh o job.
- Enviar candidato a agenda editorial.

## Base de datos

- Registro efímero/deduplicado de event fingerprints.

## SEO

Puede alimentar `data_story` y updates de hubs.

## Analytics

- `sports_event_candidate_created`
- `sports_event_candidate_selected`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** finaliza un partido que cambia una posición relevante  
**CUANDO** el detector procesa datos autorizados  
**ENTONCES** crea oportunidad con evidencia
### CA02
**DADO** no hay cambio relevante  
**CUANDO** procesa el resultado  
**ENTONCES** no obliga a crear contenido

## Dependencias

- HU-TR-02
- HU-TR-03
- HU-TR-21 cuando use tabla.

## Definition of Done específica

Detector idempotente, thresholds configurables y pruebas con fixtures simulados.

---


# HU-TR-23 — Definir freshness, cache y provenance de datos deportivos

**Épica:** EP-TR-03 — Sports Utility & Data  
**Prioridad:** P0 técnico  
**Estado:** Enabler funcional  
**Tamaño inicial:** L  
**Actor principal:** usuario

## Historia

**Como** usuario  
**quiero** ver datos actuales y saber cuándo fueron actualizados  
**para** confiar en marcadores, tablas y perfiles.

## Problema / valor de negocio

El nuevo core usará más datos deportivos. Sin reglas de freshness, una página útil puede volverse engañosa.

## Base actual que se reutiliza

- `server/api/resultados/index.get.ts`
- `server/api/resultados/[id].get.ts`
- `server/api/resultados/[id]/marcador.get.ts`
- `server/utils/manejadorDetalleResultado.ts`
- `nuxt.config.ts`

## Alcance funcional

Definir por recurso:

```text
TTL
stale-while-revalidate
updatedAt
source/provider
fallback
```

Ejemplos distintos para vivo, programado, finalizado, perfil, standings.

## Reglas de negocio

- **RN01:** En vivo usa TTL corto; histórico puede cachearse más.
- **RN02:** La UI muestra actualización cuando importa.
- **RN03:** No servir como actual un dato fuera de su política sin indicador.
- **RN04:** Fallback no debe inventar datos.

## Frontend

- Indicador `Actualizado` reutilizable.
- Estado stale/error.

## Backend / API

- Política central de cache/freshness.
- Headers coherentes.

## Base de datos

- Cache persistente sólo donde términos de uso lo permitan.

## SEO

Evitar render indexable con datos claramente fallidos.

## Analytics

- `sports_data_stale`
- `sports_data_error`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un partido está en vivo  
**CUANDO** se consulta  
**ENTONCES** usa política de refresh corta
### CA02
**DADO** una fuente falla y existe dato permitido en cache  
**CUANDO** se responde  
**ENTONCES** la UI indica antigüedad cuando sea relevante

## Dependencias

- Ninguna; aplicar gradualmente.

## Definition of Done específica

Matriz de freshness documentada, utilitario común, pruebas de cache/fallback.

---


# HU-TR-24 — Crear fundación de dominio P10 Games

**Épica:** EP-TR-04 — P10 Games MVP  
**Prioridad:** P0  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** jugador

## Historia

**Como** jugador  
**quiero** acceder a juegos diarios dentro de Pont3la10  
**para** tener una experiencia interactiva que me invite a volver.

## Problema / valor de negocio

El dominio `interactive` ya existe conceptualmente, pero no hay implementación `games` en el árbol actual.

## Base actual que se reutiliza

- `docs/ARQUITECTURA_INICIAL.md`
- `pages/cuenta.vue`
- `plugins/supabase.server.ts`
- `supabase/migrations/*`
- `nuxt.config.ts`

## Alcance funcional

Crear módulo interno `games` con:

```text
game_types
daily_games
game_questions
game_question_options
game_attempts
game_attempt_answers
```

Estados de daily game:

```text
draft
scheduled
active
closed
archived
```

## Reglas de negocio

- **RN01:** MVP sólo fútbol.
- **RN02:** Día lógico `America/Bogota`.
- **RN03:** Un juego puede jugarse sin cuenta.
- **RN04:** Respuestas correctas no se envían en el payload inicial.
- **RN05:** Admin y contenido público mantienen fronteras distintas.

## Frontend

- Ruta `/juegos`.
- Layout visual P10 Games dentro de la marca.
- Estados de carga/error/no disponible.

## Backend / API

- GET juegos activos.
- Crear intento anónimo.
- Endpoints específicos por mecánica.

## Base de datos

- Crear tablas con constraints e índices.
- RLS: contenido publicado legible; respuestas/administración no expuestas directamente.

## SEO

`/juegos` indexable cuando tenga contenido real. Retos activos pueden incluir metadata social.

## Analytics

- `games_home_view`
- `game_view`
- `game_start`

## Seguridad, privacidad y performance

No exponer solution/answer keys. Mutaciones públicas pasan por Nitro con rate limit básico. IDs de intento deben ser opacos.

## Criterios de aceptación

### CA01
**DADO** un visitante sin sesión abre `/juegos`  
**CUANDO** hay retos activos  
**ENTONCES** puede verlos y comenzar sin login
### CA02
**DADO** un cliente consulta Supabase directamente  
**CUANDO** intenta leer respuestas correctas  
**ENTONCES** RLS/privilegios lo impiden
### CA03
**DADO** no hay juego activo  
**CUANDO** abre `/juegos`  
**ENTONCES** recibe estado útil sin 500

## Dependencias

- Ninguna funcional; reutiliza Supabase/Auth existentes.

## Definition of Done específica

Migración, RLS, tipos, repositorio, endpoints base, ruta pública y tests negativos de seguridad.

---


# HU-TR-25 — Crear panel editorial de juegos

**Épica:** EP-TR-04 — P10 Games MVP  
**Prioridad:** P0  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** editor autorizado

## Historia

**Como** editor autorizado  
**quiero** crear, revisar, programar y cerrar retos diarios  
**para** operar P10 Games sin editar SQL.

## Problema / valor de negocio

Los juegos diarios requieren operación editorial verificable igual que los artículos.

## Base actual que se reutiliza

- `pages/admin/index.vue`
- `middleware/autenticacion-editorial.ts`
- `server/utils/autorizacionEditorial.ts`
- `pages/admin/taxonomias.vue`
- `supabase/migrations/*`

## Alcance funcional

Ruta:

```text
/admin/juegos
```

Funciones MVP:

- listado;
- crear;
- editar draft;
- preview;
- programar;
- activar;
- cerrar;
- ver estadísticas básicas.

## Reglas de negocio

- **RN01:** Sólo roles con capacidad explícita gestionan juegos.
- **RN02:** Publicación/activación sensible requiere permiso; MFA puede exigirse siguiendo patrón editorial.
- **RN03:** Un juego activo no cambia silenciosamente respuestas ya jugadas.
- **RN04:** Cambios posteriores deben versionarse o bloquearse según impacto.

## Frontend

- Bandeja de juegos.
- Editor por tipo.
- Vista previa sin contaminar métricas.

## Backend / API

- `/api/admin/juegos/*` protegido.
- Reutilizar helper de autorización.

## Base de datos

- Agregar permisos `juegos.ver`, `juegos.crear`, `juegos.publicar`, `juegos.gestionar` y auditoría.

## SEO

Admin `noindex/noarchive`, como el panel actual.

## Analytics

- `admin_game_created`
- `admin_game_scheduled`

## Seguridad, privacidad y performance

Autorización servidor + RLS + auditoría. UI no es frontera de seguridad.

## Criterios de aceptación

### CA01
**DADO** un usuario público intenta `/api/admin/juegos`  
**CUANDO** no tiene permiso  
**ENTONCES** recibe rechazo
### CA02
**DADO** un editor autorizado programa un reto  
**CUANDO** la fecha es válida  
**ENTONCES** queda disponible sólo al inicio configurado

## Dependencias

- HU-TR-24.

## Definition of Done específica

RBAC/RLS, admin responsive, auditoría y pruebas positiva/negativa.

---


# HU-TR-26 — Crear banco de preguntas verificadas

**Épica:** EP-TR-04 — P10 Games MVP  
**Prioridad:** P0  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** editor de juegos

## Historia

**Como** editor de juegos  
**quiero** mantener preguntas reutilizables con fuente y respuesta inequívoca  
**para** evitar trivia ambigua o inventada.

## Problema / valor de negocio

P10 Games depende de confianza editorial. Cada pregunta debe guardar fuente, contexto y verificación.

## Base actual que se reutiliza

- `pages/admin/juegos (nuevo)`
- `supabase/migrations/*`
- `components/admin/*`

## Alcance funcional

Campos:

```text
question
answer
options
category
difficulty
sport
country
competition
year/context
source
source_url
verified_at
status
```

## Reglas de negocio

- **RN01:** Cada pregunta tiene respuesta inequívoca.
- **RN02:** Fuente obligatoria para publicar.
- **RN03:** Contexto temporal obligatorio si la respuesta puede cambiar.
- **RN04:** Pregunta ambigua no se publica.
- **RN05:** IA puede proponer, nunca marcar como verificada por sí sola.

## Frontend

- CRUD de preguntas.
- Preview.
- Filtros y estado `draft/verified/retired`.

## Backend / API

- Admin CRUD validado.
- Endpoint de selección sólo devuelve campos públicos.

## Base de datos

- Tablas de preguntas/opciones o JSON validado; preferir opciones normalizadas si se requieren estadísticas por opción.

## SEO

No indexar el banco administrativo.

## Analytics

- `question_used`
- `question_answer_distribution`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** una pregunta no tiene fuente  
**CUANDO** se intenta marcar verificada  
**ENTONCES** el servidor la rechaza
### CA02
**DADO** una pregunta fue retirada  
**CUANDO** se generan retos futuros  
**ENTONCES** no se selecciona automáticamente

## Dependencias

- HU-TR-24
- HU-TR-25.

## Definition of Done específica

Banco operable, validaciones, auditoría y pruebas de ambigüedad/estado.

---


# HU-TR-27 — Implementar La 10

**Épica:** EP-TR-04 — P10 Games MVP  
**Prioridad:** P0  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** aficionado

## Historia

**Como** aficionado  
**quiero** responder 10 preguntas diarias  
**para** probar cuánto sé y volver por un nuevo reto.

## Problema / valor de negocio

Es el producto insignia de P10 Games y una experiencia sencilla de validar.

## Base actual que se reutiliza

- `HU-TR-24 nuevos módulos`
- `components/BotonBase.vue`
- `utils/zonasHorarias.ts`

## Alcance funcional

Ruta:

```text
/la10
```

Reglas MVP:

- 10 preguntas;
- una respuesta por pregunta;
- score 0–10;
- tiempo total;
- mismo reto durante el día lógico;
- feedback después de responder;
- resultado final compartible.

## Reglas de negocio

- **RN01:** No exige cuenta.
- **RN02:** No revelar respuesta correcta antes de la selección.
- **RN03:** Una pregunta respondida no puede responderse otra vez dentro del mismo intento.
- **RN04:** El reto cambia según fecha de Bogotá.
- **RN05:** Refresh no debe perder el intento activo si técnicamente recuperable.

## Frontend

- Flujo 1/10→10/10.
- Barra de progreso.
- Feedback accesible que no dependa sólo de color.
- Pantalla resultado.

## Backend / API

- GET reto del día sin answer key.
- POST answer por intento.
- POST complete idempotente.

## Base de datos

- `game_attempts`, `game_attempt_answers`; `user_id` nullable.
- Índice por daily_game_id/status.

## SEO

Landing `/la10` indexable; el contenido del reto no necesita crear 10 URLs.

## Analytics

- `game_view`
- `game_start`
- `game_attempt`
- `game_complete`
- `game_abandon`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** visitante abre La 10  
**CUANDO** hay reto activo  
**ENTONCES** comienza en un clic sin registrarse
### CA02
**DADO** responde una pregunta  
**CUANDO** envía opción  
**ENTONCES** el servidor devuelve feedback sin revelar futuras respuestas
### CA03
**DADO** completa 10  
**CUANDO** finaliza intento  
**ENTONCES** ve score, tiempo y CTA de compartir

## Dependencias

- HU-TR-24
- HU-TR-26.

## Definition of Done específica

E2E completo anónimo, mobile-first, keyboard accessible, respuesta protegida y analytics.

---


# HU-TR-28 — Implementar Adivina el Jugador

**Épica:** EP-TR-04 — P10 Games MVP  
**Prioridad:** P0  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** aficionado

## Historia

**Como** aficionado  
**quiero** adivinar un jugador misterioso en máximo seis intentos  
**para** tener un reto diario corto y compartible.

## Problema / valor de negocio

El juego conecta directamente con futuras entidades de jugador y el vertical Colombianos en Europa.

## Base actual que se reutiliza

- `HU-TR-16 sports entities`
- `HU-TR-24 games foundation`
- `server/api/resultados/*`

## Alcance funcional

Ruta:

```text
/juegos/adivina-el-jugador
```

Atributos MVP:

```text
nacionalidad
posición
club
liga
rangoEdad
```

Dataset híbrido y snapshot del reto diario.

## Reglas de negocio

- **RN01:** Máximo seis intentos.
- **RN02:** La solución nunca aparece en el payload inicial.
- **RN03:** Autocomplete sólo contiene jugadores válidos del dataset permitido.
- **RN04:** El snapshot del reto no cambia en mitad del día.
- **RN05:** Comparación debe explicar cada pista de manera consistente.

## Frontend

- Autocomplete.
- Matriz de intentos/pistas.
- Feedback por icono+texto, no sólo color.
- Resultado.

## Backend / API

- GET challenge metadata.
- GET player search limitado.
- POST guess → comparación.
- POST completion.

## Base de datos

- Snapshot del target/atributos en `daily_games` o tabla específica.
- Intentos en modelo común.

## SEO

Landing del juego indexable; target diario no se revela en metadata.

## Analytics

- `player_guess`
- `game_complete`
- `guess_count`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** el usuario busca un nombre válido  
**CUANDO** escribe caracteres suficientes  
**ENTONCES** recibe opciones permitidas
### CA02
**DADO** envía un guess  
**CUANDO** no es target  
**ENTONCES** recibe comparaciones sin solución futura
### CA03
**DADO** acierta antes del sexto intento  
**CUANDO** se completa  
**ENTONCES** recibe resultado y share

## Dependencias

- HU-TR-24
- HU-TR-16 mínimo jugadores
- HU-TR-19 puede compartir dataset.

## Definition of Done específica

Target protegido, 6 intentos, autocomplete performante, snapshot estable, tests.

---


# HU-TR-29 — Compartir resultados de juegos

**Épica:** EP-TR-04 — P10 Games MVP  
**Prioridad:** P0  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** jugador

## Historia

**Como** jugador  
**quiero** compartir mi resultado sin revelar la respuesta  
**para** retar amigos y atraer nuevos jugadores.

## Problema / valor de negocio

El share es parte del viral loop del MVP, no un adorno posterior.

## Base actual que se reutiliza

- `components/editorial/BarraCompartirArticulo.vue`
- `utils/analiticaPublica.ts`
- `composables/useAnaliticaPublica.ts`

## Alcance funcional

Canales iniciales:

- Web Share API;
- WhatsApp;
- copiar;
- X.

Formato visual/textual por juego con grid de estado y URL.

## Reglas de negocio

- **RN01:** Nunca revelar answer/target.
- **RN02:** El share incluye identificador de reto/fecha, no datos personales.
- **RN03:** Si Web Share no está disponible, ofrecer fallback.
- **RN04:** La URL compartida abre el juego correcto.

## Frontend

- Componente `CompartirResultadoJuego`.
- Copiar con feedback accesible.

## Backend / API

- Opcional token de atribución firmado/aleatorio.
- Endpoint para resolver share sin PII.

## Base de datos

- `game_share_events` o analytics server si se requiere atribución fiable.

## SEO

Shares apuntan a canonical del juego o reto archivado cuando corresponda.

## Analytics

- `game_share`
- `share_landing_view`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** el usuario completa un reto  
**CUANDO** pulsa WhatsApp  
**ENTONCES** se genera texto sin solución
### CA02
**DADO** otro usuario abre el enlace  
**CUANDO** el reto sigue activo  
**ENTONCES** puede jugar

## Dependencias

- HU-TR-27 o HU-TR-28.
- HU-TR-41 para atribución completa.

## Definition of Done específica

Shares funcionales en móvil/escritorio, sin answer leak y eventos medidos.

---


# HU-TR-30 — Implementar racha local anónima

**Épica:** EP-TR-04 — P10 Games MVP  
**Prioridad:** P0  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** jugador anónimo

## Historia

**Como** jugador anónimo  
**quiero** conservar una racha sin crear una cuenta  
**para** tener una razón para volver mañana.

## Problema / valor de negocio

El documento de producto define play-first/register-later. El progreso local permite validar retención antes de exigir auth.

## Base actual que se reutiliza

- `pages/cuenta.vue`
- `utils/zonasHorarias.ts`
- `composables/* (nuevo games)`

## Alcance funcional

Persistencia local MVP:

```text
currentStreak
bestStreak
lastQualifiedDate
qualifiedGameIds
```

Regla inicial: completar al menos un reto válido en el día lógico.

## Reglas de negocio

- **RN01:** Una misma actividad no incrementa dos veces.
- **RN02:** Se calcula por fecha Bogotá.
- **RN03:** Cambiar reloj cliente no convierte la racha en dato competitivo confiable.
- **RN04:** Datos locales son UX, no autoridad para ranking.

## Frontend

- Mostrar racha en resultado y home Games.
- CTA `Crea cuenta para conservarla` después de valor demostrado.

## Backend / API

- No obligatorio para racha local; completions servidor sirven para validación futura.

## Base de datos

- Sin tabla obligatoria hasta sync.

## SEO

No aplica.

## Analytics

- `streak_extended`
- `streak_lost`
- `streak_cta_view`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un usuario completa su primer reto hoy  
**CUANDO** finaliza  
**ENTONCES** racha pasa a 1
### CA02
**DADO** completa dos juegos el mismo día  
**CUANDO** finaliza segundo  
**ENTONCES** racha no aumenta otro día ficticio
### CA03
**DADO** vuelve el día siguiente y completa  
**CUANDO** finaliza  
**ENTONCES** racha aumenta

## Dependencias

- HU-TR-27 o HU-TR-28.

## Definition of Done específica

Utilitario de fecha testeado, storage versionado/migrable y CTA de sync.

---


# HU-TR-31 — Implementar XP básico en MVP

**Épica:** EP-TR-04 — P10 Games MVP  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** jugador

## Historia

**Como** jugador  
**quiero** ganar XP al completar retos  
**para** sentir progresión aunque todavía no exista ranking.

## Problema / valor de negocio

XP da feedback de progreso y prepara niveles/perfil sin bloquear el MVP en comunidad.

## Base actual que se reutiliza

- `HU-TR-24`
- `HU-TR-30`

## Alcance funcional

Tabla/reglas centralizadas por juego:

```text
baseCompletionXp
performanceBonus
dailyCap
```

En anónimo se refleja localmente; servidor calcula XP del intento para evitar fórmulas duplicadas.

## Reglas de negocio

- **RN01:** Servidor determina XP por resultado.
- **RN02:** Cliente no envía XP arbitrario.
- **RN03:** Un completion idempotente no otorga doble XP.
- **RN04:** Cambios de fórmula no deben reescribir silenciosamente histórico sincronizado.

## Frontend

- Animación/feedback de XP moderado.
- Total local.

## Backend / API

- Completion devuelve `xpEarned`.

## Base de datos

- Guardar XP por resultado cuando haya intento server; agregado de usuario viene en HU-TR-35.

## SEO

No aplica.

## Analytics

- `xp_earned`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un reto se completa  
**CUANDO** el servidor calcula  
**ENTONCES** devuelve XP una sola vez
### CA02
**DADO** se repite request de completion  
**CUANDO** es idempotente  
**ENTONCES** no duplica XP

## Dependencias

- HU-TR-24
- HU-TR-27.

## Definition of Done específica

Fórmula central, idempotencia, tests y visualización.

---


# HU-TR-32 — Implementar P10 Grid

**Épica:** EP-TR-04 — P10 Games MVP  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** aficionado avanzado

## Historia

**Como** aficionado avanzado  
**quiero** completar una cuadrícula 3×3 con jugadores que cumplan dos condiciones  
**para** tener un reto profundo y altamente compartible.

## Problema / valor de negocio

P10 Grid aumenta sesiones y diferenciación, pero debe ir después de validar los juegos más simples.

## Base actual que se reutiliza

- `HU-TR-16 sports entities`
- `HU-TR-24 games foundation`

## Alcance funcional

MVP:

- grid 3x3;
- nueve respuestas;
- validación server;
- una respuesta no se reutiliza si así define la regla;
- rareza calculada después;
- share sin soluciones.

## Reglas de negocio

- **RN01:** Respuestas válidas se precalculan o resuelven desde dataset interno, no con llamadas externas por intento.
- **RN02:** Una celda exige intersección de fila+columna.
- **RN03:** Rareza se basa en respuestas reales y muestra muestra insuficiente si aplica.
- **RN04:** No revelar catálogo completo de respuestas válidas.

## Frontend

- Grid accesible en móvil.
- Buscador de jugador.
- Feedback y rareza.

## Backend / API

- POST respuesta por celda.
- Endpoint de autocomplete.
- Completion.

## Base de datos

- `game_grid_rules`; relación/precalculo de respuestas válidas; agregados de usage.

## SEO

Landing del juego indexable; archivo diario opcional después de cerrar.

## Analytics

- `grid_cell_attempt`
- `grid_complete`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** una respuesta cumple ambas condiciones  
**CUANDO** se envía  
**ENTONCES** la celda se valida
### CA02
**DADO** cumple sólo una  
**CUANDO** se envía  
**ENTONCES** se rechaza sin revelar otras soluciones

## Dependencias

- HU-TR-16
- HU-TR-24.

## Definition of Done específica

Dataset validado, performance sin API externa por guess, share y tests.

---


# HU-TR-33 — Crear archivo SEO de retos cerrados

**Épica:** EP-TR-04 — P10 Games MVP  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** visitante

## Historia

**Como** visitante  
**quiero** consultar la solución y contexto de retos pasados  
**para** convertir algunos juegos diarios en activos evergreen útiles.

## Problema / valor de negocio

Un reto cerrado puede aportar contexto, perfil del jugador y enlaces, pero no se deben crear miles de páginas vacías sólo para indexar.

## Base actual que se reutiliza

- `server/routes/sitemap.xml.get.ts`
- `composables/useSeoPont3la10.ts`
- `HU-TR-24`

## Alcance funcional

Rutas candidatas:

```text
/juegos/adivina-el-jugador/2026-09-29
/la10/2026-09-29
```

Sólo indexar archivo si incluye valor adicional suficiente.

## Reglas de negocio

- **RN01:** Reto activo no revela solución.
- **RN02:** Al cerrar puede mostrar respuesta, explicación, fuente y relacionados.
- **RN03:** No indexar thin pages.
- **RN04:** Archivo puede quedar `noindex` si no supera criterios mínimos.

## Frontend

- Vista archivada.
- CTA al reto de hoy.

## Backend / API

- GET reto cerrado con solución ya liberada.

## Base de datos

- Reutilizar daily game + preguntas/snapshot.

## SEO

Canonical, breadcrumb, lastmod; inclusión selectiva en sitemap.

## Analytics

- `game_archive_view`
- `archive_to_today_click`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un reto está cerrado y tiene explicación útil  
**CUANDO** se abre su archivo  
**ENTONCES** muestra solución y contexto
### CA02
**DADO** un reto carece de valor adicional  
**CUANDO** se publica archivo técnico  
**ENTONCES** permanece noindex o no se expone

## Dependencias

- HU-TR-27/28
- HU-TR-11.

## Definition of Done específica

Reglas de indexación explícitas, no answer leak previo y sitemap selectivo.

---


# HU-TR-34 — Crear P10 Daily

**Épica:** EP-TR-05 — Identidad, Gamificación y Retención  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** jugador recurrente

## Historia

**Como** jugador recurrente  
**quiero** ver todos mis retos del día en un solo lugar  
**para** convertir juegos separados en una rutina diaria.

## Problema / valor de negocio

P10 Daily es la superficie de retención, no un juego adicional.

## Base actual que se reutiliza

- `HU-TR-24`
- `pages/cuenta.vue`

## Alcance funcional

`/juegos` evoluciona a panel diario:

```text
La 10
Adivina jugador
P10 Grid
contenido recomendado
progreso diario
racha
XP
```

## Reglas de negocio

- **RN01:** Sólo mostrar retos realmente disponibles.
- **RN02:** Estado de completion debe persistir entre refresh.
- **RN03:** Usuario anónimo ve progreso local; registrado ve progreso sincronizado cuando exista.
- **RN04:** No exigir completar todos los retos para conservar la racha MVP.

## Frontend

- Dashboard diario.
- Cards de estado pendiente/completado.
- CTA discreta de registro.

## Backend / API

- Endpoint resumen diario opcional para usuario registrado.

## Base de datos

- Reutiliza daily_games y resultados.

## SEO

`/juegos` es landing estable; estados personales no deben formar parte del HTML indexable cacheado.

## Analytics

- `daily_view`
- `daily_complete`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** hay dos retos activos  
**CUANDO** usuario completó uno  
**ENTONCES** P10 Daily muestra 1/2
### CA02
**DADO** el usuario ya completó un reto del día  
**CUANDO** actualiza la página de P10 Daily  
**ENTONCES** el progreso existente se conserva

## Dependencias

- HU-TR-27
- HU-TR-28
- HU-TR-30.

## Definition of Done específica

Dashboard responsive, estado consistente y analytics.

---


# HU-TR-35 — Sincronizar progreso de juegos con la cuenta existente

**Épica:** EP-TR-05 — Identidad, Gamificación y Retención  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** jugador

## Historia

**Como** jugador  
**quiero** conservar mi progreso entre dispositivos  
**para** no perder racha, resultados y XP al iniciar sesión.

## Problema / valor de negocio

La autenticación ya existe; el trabajo es añadir dominio de juego, no crear otro login.

## Base actual que se reutiliza

- `pages/cuenta.vue`
- `pages/login.vue`
- `composables/useAutenticacionEditorial.ts`
- `plugins/supabase.client.ts`
- `supabase/migrations/*`

## Alcance funcional

Tablas:

```text
user_game_results
user_game_progress
user_streaks
user_xp
```

Al iniciar sesión, fusionar progreso local verificable con server.

## Reglas de negocio

- **RN01:** No confiar en XP arbitrario del cliente.
- **RN02:** Sólo sincronizar intentos que el servidor pueda validar o reconciliar.
- **RN03:** Merge idempotente.
- **RN04:** El usuario sólo consulta su progreso privado.

## Frontend

- CTA de registro después de juego.
- Pantalla de sincronización breve.
- Cuenta muestra resumen de progreso.

## Backend / API

- Endpoint de merge/sync autenticado.
- GET progreso propio.

## Base de datos

- RLS por `auth.uid()`.
- Constraints únicos por user/game/result.

## SEO

Cuenta/progreso continúa `noindex`.

## Analytics

- `account_created_from_game`
- `game_progress_synced`

## Seguridad, privacidad y performance

RLS estricta; no exponer email o progreso privado en rankings. No usar service role en cliente.

## Criterios de aceptación

### CA01
**DADO** usuario anónimo tiene resultados locales válidos  
**CUANDO** inicia sesión  
**ENTONCES** se fusionan una sola vez
### CA02
**DADO** otro usuario intenta leer progreso ajeno  
**CUANDO** consulta DB/API  
**ENTONCES** es rechazado

## Dependencias

- HU-TR-24
- HU-TR-30
- HU-TR-31.

## Definition of Done específica

Sync idempotente, RLS verificada, pruebas multiusuario y cuenta sin regresiones.

---


# HU-TR-36 — Crear perfil deportivo público separado de Cuenta

**Épica:** EP-TR-05 — Identidad, Gamificación y Retención  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** jugador registrado

## Historia

**Como** jugador registrado  
**quiero** tener una identidad pública deportiva sin exponer mi configuración privada  
**para** participar en rankings y comunidad con un nombre visible.

## Problema / valor de negocio

`/cuenta` debe seguir siendo técnica/privada. El perfil público se modela aparte.

## Base actual que se reutiliza

- `pages/cuenta.vue`
- `supabase/migrations/0001_foundation.sql`
- `components/AccesoUsuarioCabecera.vue`

## Alcance funcional

Ruta:

```text
/perfil/{slug}
```

Datos:

```text
displayName
avatar
level
streak
badges
selectedPublicStats
```

Privado:

```text
email
settings
security
```

## Reglas de negocio

- **RN01:** Perfil público es opt-in.
- **RN02:** Email nunca se muestra.
- **RN03:** Slug/nombre cumplen moderación básica.
- **RN04:** Usuario controla qué estadísticas opcionales se publican.

## Frontend

- Perfil público.
- Configuración de privacidad en cuenta.

## Backend / API

- GET perfil público.
- PATCH perfil propio autenticado.

## Base de datos

- Extender perfil o tabla `public_player_profiles`; RLS separada.

## SEO

Perfiles públicos pueden ser indexables sólo si aportan valor y el usuario opta; de lo contrario noindex.

## Analytics

- `public_profile_view`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** usuario no habilita perfil  
**CUANDO** otro visita slug  
**ENTONCES** no obtiene información privada
### CA02
**DADO** usuario habilita perfil  
**CUANDO** aparece en ranking  
**ENTONCES** se muestra sólo nombre/avatar/stats permitidas

## Dependencias

- HU-TR-35.

## Definition of Done específica

Separación pública/privada, moderación, RLS y tests.

---


# HU-TR-37 — Crear temporadas y rankings

**Épica:** EP-TR-05 — Identidad, Gamificación y Retención  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** jugador registrado

## Historia

**Como** jugador registrado  
**quiero** comparar mi rendimiento durante una temporada  
**para** tener motivación competitiva sin depender de premios monetarios.

## Problema / valor de negocio

Ranking debe venir después de tener datos suficientes y resultados server-authoritative.

## Base actual que se reutiliza

- `HU-TR-35`
- `HU-TR-36`

## Alcance funcional

MVP:

```text
game_seasons
season_scores
```

Rankings:

- semanal;
- temporada.

No All-Time inicialmente.

## Reglas de negocio

- **RN01:** Sólo usuarios registrados participan.
- **RN02:** Score agregado se calcula en servidor.
- **RN03:** Cerrar temporada congela posiciones.
- **RN04:** No mostrar email.
- **RN05:** Empates tienen regla determinista.

## Frontend

- Ranking top + posición propia.
- Selector semanal/temporada.

## Backend / API

- GET leaderboard paginado.
- Job/RPC de agregación.

## Base de datos

- Índices por season/score; evitar recalcular histórico completo por request.

## SEO

Ranking público puede ser noindex inicialmente para evitar contenido thin/dinámico de poco valor.

## Analytics

- `leaderboard_view`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** usuario tiene resultados válidos  
**CUANDO** se agrega ranking  
**ENTONCES** su score corresponde a reglas
### CA02
**DADO** temporada se cierra  
**CUANDO** llegan nuevos resultados  
**ENTONCES** no alteran el ranking cerrado

## Dependencias

- HU-TR-35
- HU-TR-31.

## Definition of Done específica

Agregación determinista, paginación, privacidad y pruebas.

---


# HU-TR-38 — Implementar insignias

**Épica:** EP-TR-05 — Identidad, Gamificación y Retención  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** jugador

## Historia

**Como** jugador  
**quiero** desbloquear logros por hitos  
**para** visualizar mi progreso más allá del ranking.

## Problema / valor de negocio

Badges pueden premiar constancia, conocimiento y especialización sin dinero.

## Base actual que se reutiliza

- `HU-TR-35`
- `HU-TR-37`

## Alcance funcional

Ejemplos:

```text
7 días
30 días
La 10 perfecta
50 jugadores adivinados
Experto Colombia
Top 100 temporada
```

## Reglas de negocio

- **RN01:** Desbloqueo server-side para cuentas.
- **RN02:** Una insignia se concede una vez.
- **RN03:** Criterios versionados.
- **RN04:** No retroceder automáticamente insignias históricas salvo fraude/error administrativo.

## Frontend

- Galería de insignias en perfil.
- Feedback al desbloquear.

## Backend / API

- Evaluación tras eventos relevantes.

## Base de datos

- `badges`, `user_badges` con unique user+badge.

## SEO

No aplica.

## Analytics

- `badge_unlocked`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** usuario cumple criterio  
**CUANDO** se procesa completion  
**ENTONCES** recibe la insignia una vez
### CA02
**DADO** se repite evento idempotente  
**CUANDO** se procesa  
**ENTONCES** no duplica badge

## Dependencias

- HU-TR-35.

## Definition of Done específica

Catálogo, motor de reglas sencillo, unique constraints y tests.

---


# HU-TR-39 — Implementar misiones, retos y ligas privadas por fases

**Épica:** EP-TR-05 — Identidad, Gamificación y Retención  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** jugador recurrente

## Historia

**Como** jugador recurrente  
**quiero** completar objetivos y competir con amigos  
**para** crear loops sociales fuera del ranking global.

## Problema / valor de negocio

Esta HU agrupa una capacidad de fase posterior; debe dividirse al entrar en desarrollo si supera tamaño manejable.

## Base actual que se reutiliza

- `HU-TR-34`
- `HU-TR-37`

## Alcance funcional

Subcapacidades:

1. misiones diarias;
2. reto directo por share token;
3. liga privada con código.

Tablas candidatas:

```text
missions
user_mission_progress
challenges
private_leagues
private_league_members
```

## Reglas de negocio

- **RN01:** Ligas privadas no exponen miembros a personas fuera de la liga.
- **RN02:** Código de invitación es aleatorio/no predecible.
- **RN03:** Reto compartido no revela respuesta.
- **RN04:** Misiones sólo otorgan XP por eventos server-valid.

## Frontend

- Misiones en P10 Daily.
- Página de reto.
- Vista de liga privada.

## Backend / API

- Endpoints autenticados para liga; share challenge puede aceptar visitante.

## Base de datos

- Tablas anteriores con RLS/membresía.

## SEO

Ligas privadas y páginas personales: noindex. Retos públicos temporales: noindex por defecto.

## Analytics

- `mission_complete`
- `challenge_created`
- `challenge_completed`
- `league_created`
- `league_joined`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** un usuario crea liga  
**CUANDO** comparte código válido  
**ENTONCES** otro usuario autenticado puede unirse
### CA02
**DADO** persona ajena conoce un ID interno  
**CUANDO** consulta la liga  
**ENTONCES** no obtiene miembros

## Dependencias

- HU-TR-35
- HU-TR-37.

## Definition of Done específica

Al entrar a implementación dividir en HUs hijas; privacidad y abuso revisados.

---


# HU-TR-40 — Extender taxonomía de eventos GA4 para nuevo producto

**Épica:** EP-TR-06 — Growth Analytics y aprendizaje  
**Prioridad:** P0  
**Estado:** Refactor  
**Tamaño inicial:** M  
**Actor principal:** responsable de producto

## Historia

**Como** responsable de producto  
**quiero** medir contenido, utility pages y juegos con una convención única  
**para** comparar adquisición, activación y retención.

## Problema / valor de negocio

GA4 ya está en producción con pageviews manuales, `article_view`, búsqueda y categorías. Se debe extender, no reinstalar.

## Base actual que se reutiliza

- `utils/analiticaPublica.ts`
- `composables/useAnaliticaPublica.ts`
- `plugins/analiticaPublica.client.ts`
- `tests/unit/analiticaPublica.test.ts`

## Alcance funcional

Catálogo mínimo:

```text
hub_view
utility_interaction
game_view
game_start
game_attempt
game_complete
game_fail
game_share
daily_complete
streak_extended
account_created_from_game
```

## Reglas de negocio

- **RN01:** No enviar email/nombre/PII.
- **RN02:** No enviar texto libre sensible.
- **RN03:** Eventos deben usar nombres/versiones consistentes.
- **RN04:** Respeta la decisión de analítica existente.
- **RN05:** Admin/login/API continúan excluidos.

## Frontend

- Helpers tipados por dominio.

## Backend / API

- No requiere backend salvo eventos server-side específicos.

## Base de datos

- Sin cambio obligatorio.

## SEO

No aplica.

## Analytics

- `todos los anteriores`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** usuario rechaza analítica según política existente  
**CUANDO** juega  
**ENTONCES** no se envían eventos cliente no permitidos
### CA02
**DADO** se completa un juego  
**CUANDO** analytics está activo  
**ENTONCES** se envía una sola completion con parámetros permitidos

## Dependencias

- Antes de cerrar P10 Games MVP.

## Definition of Done específica

Catálogo documentado, helper tipado, tests de privacidad/allowlist y DebugView pendiente documentado si no puede verificarse.

---


# HU-TR-41 — Medir viral loop de shares

**Épica:** EP-TR-06 — Growth Analytics y aprendizaje  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** responsable de crecimiento

## Historia

**Como** responsable de crecimiento  
**quiero** saber cuántas visitas y jugadores nacen de un share  
**para** medir si P10 Games realmente genera adquisición orgánica.

## Problema / valor de negocio

Contar shares sin poder seguir `share → visita → start → complete` deja el loop a medias.

## Base actual que se reutiliza

- `HU-TR-29`
- `utils/analiticaPublica.ts`

## Alcance funcional

Generar `share_token` no sensible.

Funnel:

```text
game_share
→ share_landing_view
→ game_start
→ game_complete
→ account_created_from_game
```

## Reglas de negocio

- **RN01:** Token no contiene userId legible.
- **RN02:** Atribución tiene TTL.
- **RN03:** No crear tracking fingerprint invasivo.
- **RN04:** Métrica agregada basta para MVP.

## Frontend

- Propagar token en URL y limpiar/normalizar cuando corresponda.

## Backend / API

- Registrar/validar token si se usa backend.
- Evitar open redirect.

## Base de datos

- Tabla agregada de shares opcional; GA4 puede cubrir MVP si es suficiente.

## SEO

Parámetros de atribución deben canonicalizar hacia URL limpia.

## Analytics

- `share_landing_view`
- `share_to_start`
- `share_to_complete`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** usuario comparte  
**CUANDO** amigo abre el enlace  
**ENTONCES** la sesión queda atribuida sin revelar al emisor
### CA02
**DADO** Google rastrea URL con token  
**CUANDO** se genera canonical  
**ENTONCES** apunta a URL limpia

## Dependencias

- HU-TR-29
- HU-TR-40.

## Definition of Done específica

Funnel medible, canonical limpio y política de retención de tokens.

---


# HU-TR-42 — Crear Dashboard Growth

**Épica:** EP-TR-06 — Growth Analytics y aprendizaje  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** responsable de producto

## Historia

**Como** responsable de producto  
**quiero** ver adquisición y retención en una sola vista  
**para** decidir con datos qué desarrollar y qué dejar de hacer.

## Problema / valor de negocio

Cloudflare/GA4/Search Console muestran piezas diferentes. El admin necesita una capa de producto, aunque al principio combine datos internos e importados.

## Base actual que se reutiliza

- `pages/admin/index.vue`
- `pages/admin/operacion.vue`
- `server/api/admin/resumen.get.ts`
- `HU-TR-15`

## Alcance funcional

Ruta propuesta:

```text
/admin/crecimiento
```

Bloques:

- tráfico;
- contenido;
- Search Console;
- juegos;
- D1/D7/D30;
- shares;
- registros desde Games.

## Reglas de negocio

- **RN01:** Cada métrica muestra fuente y ventana temporal.
- **RN02:** No mezclar requests Cloudflare con usuarios.
- **RN03:** Datos faltantes se declaran, no se estiman como reales.
- **RN04:** No exponer dashboard públicamente.

## Frontend

- Cards + tablas; gráficos sólo donde aporten.
- Filtros 7/30/90 días.

## Backend / API

- Endpoints admin agregados.
- Import Search Console reutilizado.

## Base de datos

- Agregados internos; evitar copiar datos de GA4 si no se necesita.

## SEO

Admin noindex/noarchive.

## Analytics

- Sin evento nuevo.

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** Search Console no tiene datos importados  
**CUANDO** se abre dashboard  
**ENTONCES** bloque muestra `sin datos` y no cero falso
### CA02
**DADO** hay juegos activos  
**CUANDO** se consulta 7 días  
**ENTONCES** muestra starts/completions/returning con definición visible

## Dependencias

- HU-TR-15
- HU-TR-40.

## Definition of Done específica

Dashboard trazable, roles correctos, ventanas consistentes y pruebas.

---


# HU-TR-43 — Crear feedback loop de rendimiento editorial

**Épica:** EP-TR-06 — Growth Analytics y aprendizaje  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** responsable editorial

## Historia

**Como** responsable editorial  
**quiero** comparar rendimiento por intención, categoría y edad  
**para** aprender qué tipo de contenido vale la pena repetir o actualizar.

## Problema / valor de negocio

El nuevo motor editorial debe aprender de resultados reales, no sólo del score previo a publicar.

## Base actual que se reutiliza

- `HU-TR-01`
- `HU-TR-15`
- `HU-TR-42`

## Alcance funcional

Métricas por contenido:

```text
views
organic impressions
organic clicks
ctr
position
engaged sessions
related clicks
game referrals
age
contentIntent
```

## Reglas de negocio

- **RN01:** Correlación no implica causalidad.
- **RN02:** Contenido reciente y evergreen deben compararse con ventanas adecuadas.
- **RN03:** No generar ranking simplista de autores sin contexto.
- **RN04:** Datos insuficientes deben marcarse.

## Frontend

- Tabla de contenido con filtros y señales de acción.
- Badges `mejorar título`, `actualizar`, `cluster` como recomendaciones explicables.

## Backend / API

- Agregación admin.

## Base de datos

- Relacionar métricas Search Console por canonical/path.

## SEO

Permite identificar posición 8–30, CTR bajo y canibalización potencial.

## Analytics

- `content_performance_review`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** página tiene impresiones altas y CTR bajo  
**CUANDO** se analiza  
**ENTONCES** se marca como oportunidad de title/snippet
### CA02
**DADO** página no tiene muestra suficiente  
**CUANDO** se analiza  
**ENTONCES** no recibe sentencia categórica

## Dependencias

- HU-TR-01
- HU-TR-15
- HU-TR-42.

## Definition of Done específica

Feedback explicable, sin métricas inventadas y con filtros.

---


# HU-TR-44 — Generar recomendación editorial semanal basada en datos

**Épica:** EP-TR-06 — Growth Analytics y aprendizaje  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** responsable editorial

## Historia

**Como** responsable editorial  
**quiero** recibir un resumen semanal de qué funcionó y qué atacar después  
**para** convertir métricas en decisiones operativas.

## Problema / valor de negocio

Un dashboard que nadie mira es una pintura cara. Esta HU resume señales para el próximo ciclo editorial.

## Base actual que se reutiliza

- `HU-TR-07`
- `HU-TR-43`
- `.agents/skills/pont3la10-daily-editorial-run/SKILL.md`

## Alcance funcional

Resumen interno:

- intents con mejor respuesta;
- páginas a actualizar;
- queries emergentes;
- hubs con oportunidad;
- juegos con retención/share;
- temas que conviene dejar de producir.

Inicialmente bajo demanda/admin, no necesita automatización externa.

## Reglas de negocio

- **RN01:** Cada recomendación cita la métrica que la origina.
- **RN02:** No recomendar volumen por sí mismo.
- **RN03:** No ejecutar publicaciones automáticamente.
- **RN04:** Distinguir dato observado de hipótesis.

## Frontend

- Vista/resumen exportable en admin.

## Backend / API

- Servicio de agregación y, opcionalmente, resumen con IA sobre datos estructurados.

## Base de datos

- Sin tabla obligatoria; snapshot semanal sólo si se quiere histórico.

## SEO

Indirecto.

## Analytics

- `weekly_growth_report_view`

## Seguridad, privacidad y performance

Mantener las reglas actuales de autorización, RLS, secretos sólo servidor, validación de entrada y no exponer datos sensibles.

## Criterios de aceptación

### CA01
**DADO** hay datos de la semana  
**CUANDO** se genera resumen  
**ENTONCES** cada recomendación incluye evidencia
### CA02
**DADO** faltan Search Console o Games  
**CUANDO** se genera  
**ENTONCES** declara la limitación

## Dependencias

- HU-TR-43
- HU-TR-07.

## Definition of Done específica

Resumen accionable, trazable y sin acciones automáticas.

---


# EP-TR-07 — Eventos Evergreen, Search Utility y Monetización Ads

## Objetivo

Construir una capa de producto deportivo evergreen que convierta eventos, calendarios y preguntas recurrentes en URLs permanentes, útiles e indexables; posteriormente monetizar esas superficies mediante display ads sin sacrificar velocidad, claridad ni confianza.

Esta épica **no reemplaza** `EP-TR-02 SEO & Discovery` ni `EP-TR-03 Sports Utility & Data`.

Las reutiliza:

```text
EP-TR-02 SEO & Discovery
        +
EP-TR-03 Sports Utility & Data
        ↓
EP-TR-07 Eventos Evergreen & Ads
        ↓
tráfico recurrente
        ↓
medición
        ↓
monetización controlada
```

La tesis es simple:

```text
búsqueda recurrente
→ respuesta inmediata
→ dato útil actualizado
→ navegación interna
→ retorno
→ inventario publicitario
```

No:

```text
crear 2.000 páginas vacías
→ poner seis anuncios
→ esperar milagros
```

## Principios específicos

1. Una intención de búsqueda principal debe tener una URL canónica.
2. El contador es un componente, no el producto completo.
3. Una página de evento debe seguir teniendo valor cuando el evento termine.
4. Fechas, horarios, sedes, TV y clasificación sólo se muestran como confirmados cuando la fuente lo permite.
5. Los eventos deben modelarse como datos, no hardcodearse individualmente en componentes.
6. Las páginas no se indexan únicamente porque exista un registro en base de datos.
7. Display Ads entra después de utilidad, SEO técnico, performance y medición.
8. No se permitirá que publicidad desplace el contenido principal o provoque CLS significativo.
9. El MVP de Ads puede operar con un proveedor compatible con la política comercial definida posteriormente; esta HU no amarra el dominio a una red concreta.
10. Mundial 2030 y Selección Colombia son los primeros casos de uso, no excepciones hardcodeadas.

---

# HU-TR-45 — Crear motor de eventos deportivos evergreen

**Épica:** EP-TR-07 — Eventos Evergreen, Search Utility y Monetización Ads  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** visitante

## Historia

**Como** visitante  
**quiero** consultar un evento deportivo desde una URL estable antes, durante y después de que ocurra  
**para** encontrar fecha, estado, countdown, información principal y contexto sin depender de una noticia efímera.

## Problema / valor de negocio

Pont3la10 ya posee resultados, páginas públicas y utilidades SEO, pero necesita una entidad de evento de mayor duración que un artículo y que pueda representar competiciones, finales, partidos destacados o hitos deportivos.

El evento debe cambiar de comportamiento según su ciclo de vida:

```text
upcoming
→ live
→ completed
→ historical
```

sin cambiar su canonical.

## Base actual que se reutiliza

- `HU-TR-09` y `HU-TR-11` para SEO/ciclo de vida.
- `HU-TR-13` para respuesta directa.
- `HU-TR-16` para entidades deportivas.
- `HU-TR-17` para partidos canónicos.
- `HU-TR-23` para freshness/provenance.
- `composables/useSeoPont3la10.ts`.
- `server/routes/sitemap.xml.get.ts`.

## Alcance funcional

Modelo lógico inicial:

```text
sports_events
  id
  slug
  event_type
  title
  competition_id?
  home_team_id?
  away_team_id?
  starts_at?
  ends_at?
  timezone
  venue?
  city?
  country?
  status
  source
  source_url?
  source_updated_at?
  seo_indexable
  published_at?
```

Tipos iniciales:

```text
tournament
match
final
draw
season_start
milestone
```

La implementación física puede reutilizar entidades existentes cuando un `match` ya está representado por el dominio de resultados. No duplicar un partido sólo para obtener countdown.

## Reglas de negocio

- **RN01:** Un evento tiene un `slug` estable.
- **RN02:** El countdown se calcula respecto a `starts_at`; nunca se persiste como texto.
- **RN03:** Si la hora exacta no está confirmada, no se inventan horas ni segundos.
- **RN04:** Un evento completado deja de mostrar countdown y pasa a modo histórico/resultado.
- **RN05:** Cambiar el estado no cambia el canonical.
- **RN06:** Un registro no implica indexación.
- **RN07:** Eventos equivalentes deben deduplicarse mediante identificador/provider/mapping.
- **RN08:** La UI usa `America/Bogota` para mostrar hora Colombia cuando corresponda, conservando la fecha original de fuente.

## Frontend

Crear componentes reutilizables:

```text
EventoHero.vue
CountdownEvento.vue
FichaEvento.vue
EstadoEvento.vue
FuenteActualizacion.vue
```

Estados:

- fecha exacta confirmada;
- fecha confirmada sin hora;
- fecha pendiente;
- en vivo;
- finalizado;
- error/fuente temporalmente no disponible.

## Backend / API

Endpoints conceptuales:

```text
GET /api/eventos
GET /api/eventos/:slug
```

El servidor entrega timestamps y metadata; el cliente sólo anima la cuenta regresiva.

## Base de datos

Crear o extender modelo de eventos con:

- constraints por status;
- timestamps UTC;
- mappings de fuente;
- campos de indexación;
- provenance.

## SEO

- SSR de contenido útil.
- canonical único.
- title/description según estado.
- inclusión selectiva en sitemap.
- no crear páginas por combinaciones de keywords.
- redirect 301 desde aliases si se crean rutas de marketing equivalentes.

## Analytics

```text
sports_event_view
countdown_view
event_primary_action
event_related_click
```

## Seguridad, privacidad y performance

- Countdown no debe provocar hydration mismatch.
- No consultar APIs externas en cada tick.
- Cache compatible con freshness del evento.
- Sanitizar metadata editorial.

## Criterios de aceptación

### CA01
**DADO** un evento futuro con fecha exacta  
**CUANDO** el usuario abre su página  
**ENTONCES** ve countdown correcto calculado desde un timestamp de servidor

### CA02
**DADO** el evento finaliza  
**CUANDO** cambia a `completed`  
**ENTONCES** la misma URL deja de contar hacia cero y muestra resultado/contexto

### CA03
**DADO** sólo existe fecha sin hora confirmada  
**CUANDO** se renderiza  
**ENTONCES** no se muestra un contador engañoso a segundos

### CA04
**DADO** dos fuentes representan el mismo evento  
**CUANDO** se sincronizan  
**ENTONCES** no se crean dos URLs públicas equivalentes

## Dependencias

- HU-TR-13.
- HU-TR-16.
- HU-TR-23.

## Definition of Done específica

Modelo versionado, endpoints, SSR, countdown seguro, estados completos, canonical, sitemap selectivo, provenance y pruebas de transición temporal.

---

# HU-TR-46 — Crear landing evergreen del Mundial 2030

**Épica:** EP-TR-07 — Eventos Evergreen, Search Utility y Monetización Ads  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** aficionado

## Historia

**Como** aficionado  
**quiero** consultar cuánto falta para el Mundial 2030 y su información principal  
**para** resolver desde una sola página preguntas recurrentes sobre fechas, sedes, calendario y evolución del torneo.

## Problema / valor de negocio

La consulta “cuánto falta para el Mundial” es una puerta de entrada, pero un contador aislado genera poco valor y envejece mal.

La página debe ser un hub vivo.

## Ruta canónica

```text
/mundial-2030
```

No crear como páginas independientes equivalentes:

```text
/cuanto-falta-para-el-mundial-2030
/cuando-empieza-el-mundial-2030
/fecha-mundial-2030
```

Si alguna se utiliza por campañas o legado, debe redirigir/canonicalizar a `/mundial-2030` según el caso.

## Alcance funcional

Bloque superior:

```text
Mundial 2030
[estado / countdown]
fecha
hora Colombia cuando exista
sedes/resumen
última actualización
```

Módulos progresivos:

- cuándo inicia;
- dónde se juega;
- sedes;
- formato;
- selecciones clasificadas cuando existan;
- clasificación de Colombia;
- calendario;
- grupos cuando sean oficiales;
- partidos;
- horarios Colombia;
- resultados una vez iniciado;
- contenido relacionado;
- FAQ basada en preguntas reales.

## Reglas de negocio

- **RN01:** La fecha oficial proviene de fuente verificada.
- **RN02:** El countdown sólo aparece con fecha/hora suficientemente confirmadas.
- **RN03:** “Colombia clasificó” sólo se afirma con condición confirmada.
- **RN04:** El contenido cambia por fase sin cambiar URL.
- **RN05:** Al terminar el Mundial, la página se transforma en activo histórico.
- **RN06:** No publicar bloques vacíos únicamente para agregar keywords.

## Frontend

Usar el motor de eventos de `HU-TR-45` y bloques modulares.

Mobile-first: la respuesta “cuánto falta” debe estar visible antes del primer scroll en dispositivos comunes, sin ocultar navegación/accesibilidad.

## Backend / API

Composición desde:

- evento Mundial 2030;
- entidades;
- calendario;
- artículos relacionados;
- standings/clasificación sólo con fuentes autorizadas.

## Base de datos

No requiere una tabla “mundial2030”. Debe ser configuración/datos del dominio común.

## SEO

Intenciones agrupadas en la misma página:

```text
cuánto falta para el mundial 2030
cuándo empieza el mundial 2030
fecha mundial 2030
dónde será el mundial 2030
horarios mundial 2030 colombia
```

Sólo separar una intención en otra URL cuando exista producto/contenido sustancialmente distinto.

## Analytics

```text
worldcup2030_view
worldcup_countdown_view
worldcup_module_view
worldcup_related_click
```

## Seguridad, privacidad y performance

- Evitar JS pesado para un simple contador.
- Lazy load de módulos secundarios.
- Contenido principal SSR.

## Criterios de aceptación

### CA01
**DADO** existe una fecha oficial válida  
**CUANDO** se abre `/mundial-2030`  
**ENTONCES** se muestra el tiempo restante sin depender de contenido editorial hardcodeado

### CA02
**DADO** aún no existen grupos oficiales  
**CUANDO** se abre la página  
**ENTONCES** el módulo no inventa grupos ni muestra tablas ficticias

### CA03
**DADO** el torneo termina  
**CUANDO** cambia su estado  
**ENTONCES** `/mundial-2030` conserva canonical y se convierte en página histórica útil

## Dependencias

- HU-TR-45.
- HU-TR-21 cuando se integren competición/standings.
- HU-TR-14 para enlazado interno.

## Definition of Done específica

Landing SSR, módulos por disponibilidad, datos trazables, responsive, metadata, analytics y pruebas de estados pre/durante/post evento.

---

# HU-TR-47 — Crear activo evergreen “Cuándo juega Colombia”

**Épica:** EP-TR-07 — Eventos Evergreen, Search Utility y Monetización Ads  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** aficionado colombiano

## Historia

**Como** aficionado colombiano  
**quiero** saber cuál es el próximo partido de la Selección Colombia  
**para** consultar rival, fecha, hora, competición, sede y transmisión desde una URL que siempre se mantiene vigente.

## Ruta canónica

```text
/cuando-juega-colombia
```

## Alcance funcional

Respuesta superior:

```text
Colombia vs {rival}
{competición}
{fecha}
{hora Colombia}
{estadio}
{estado}
{countdown si aplica}
{TV/streaming si está confirmado}
```

Contenido complementario:

- últimos resultados;
- siguientes partidos confirmados;
- contexto de la competición;
- tabla/clasificación si corresponde y la fuente está autorizada;
- artículos relacionados.

Después del partido, la página debe seleccionar el siguiente fixture confirmado.

## Reglas de negocio

- **RN01:** “Próximo partido” significa el siguiente fixture confirmado cuya fecha sea posterior al instante actual.
- **RN02:** Un partido aplazado/cancelado no puede seguir apareciendo como próximo sin indicar su estado.
- **RN03:** TV/streaming sólo se muestra con fuente fiable o carga editorial aprobada.
- **RN04:** Si no existe próximo partido confirmado, la página permanece activa y lo declara.
- **RN05:** No crear una URL nueva por cada fecha para responder a la misma intención evergreen.
- **RN06:** Un partido individual puede enlazar a su URL canónica `HU-TR-17`.

## Frontend

- Hero del próximo partido.
- Countdown.
- Lista de próximos.
- Últimos resultados.
- CTA hacia partido/competición.
- Estado vacío digno, ese concepto radical.

## Backend / API

Servicio:

```text
getNextMatch(teamId, now)
```

Debe considerar timezone, status y reprogramaciones.

## Base de datos

Reutilizar entidades/fixtures. Puede requerir mapping permanente de Selección Colombia.

## SEO

Target principal:

```text
cuando juega colombia
a que hora juega colombia
proximo partido colombia
```

Canonical estable.

## Analytics

```text
colombia_next_match_view
colombia_countdown_view
colombia_match_click
broadcast_info_view
```

## Criterios de aceptación

### CA01
**DADO** Colombia tiene un partido confirmado futuro  
**CUANDO** se abre la URL  
**ENTONCES** el partido correcto aparece como principal

### CA02
**DADO** termina el partido principal  
**CUANDO** existe otro confirmado  
**ENTONCES** la misma URL pasa al siguiente sin intervención editorial obligatoria

### CA03
**DADO** no existe fixture futuro confirmado  
**CUANDO** se abre la página  
**ENTONCES** se informa sin inventar rival/fecha

## Dependencias

- HU-TR-16.
- HU-TR-17.
- HU-TR-23.
- HU-TR-45.

## Definition of Done específica

Selección automática robusta, reprogramaciones, SSR, SEO, countdown, datos parciales y tests de cambio de partido.

---

# HU-TR-48 — Crear calendario deportivo indexable y archivo de eventos

**Épica:** EP-TR-07 — Eventos Evergreen, Search Utility y Monetización Ads  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** aficionado

## Historia

**Como** aficionado  
**quiero** explorar próximos eventos deportivos importantes  
**para** descubrir qué viene y navegar a sus páginas permanentes.

## Rutas propuestas

```text
/eventos
/eventos/{slug}
```

Las rutas de partido existentes mantienen su canonical. `/eventos/{slug}` sólo se usa cuando el recurso es realmente un evento de esta capa y no un duplicado de partido.

## Alcance funcional

`/eventos`:

- próximos;
- hoy;
- destacados;
- recién finalizados;
- filtros razonables por deporte/competición.

Archivo:

- eventos históricos con valor;
- no indexar automáticamente cada combinación de filtros.

## Reglas de negocio

- **RN01:** Filtros por query string no crean canonicals infinitos.
- **RN02:** Sólo eventos con contenido suficiente pueden entrar a sitemap.
- **RN03:** Eventos eliminados/cancelados conservan manejo SEO explícito.
- **RN04:** No indexar páginas vacías por fecha.

## SEO

- breadcrumbs.
- canonical.
- paginación rastreable sólo cuando se justifique.
- sitemap selectivo.
- internal links hacia competiciones, equipos y contenido.

## Analytics

```text
events_index_view
event_filter_use
event_card_click
```

## Dependencias

- HU-TR-45.
- HU-TR-14.
- HU-TR-11.

## Definition of Done específica

Índice útil, filtros seguros para SEO, archivo selectivo y pruebas de canonical/robots.

---

# HU-TR-49 — Crear framework de herramientas deportivas SEO

**Épica:** EP-TR-07 — Eventos Evergreen, Search Utility y Monetización Ads  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** visitante orgánico

## Historia

**Como** visitante  
**quiero** resolver cálculos o simulaciones deportivas simples  
**para** obtener una respuesta inmediata y poder explorar contenido relacionado.

## Problema / valor de negocio

Las herramientas pueden captar búsquedas evergreen y generar interacción superior a una página informativa estática.

No se construyen veinte herramientas antes de validar una.

## MVP propuesto

Primera herramienta:

```text
/calculadoras/calculadora-de-puntos
```

Capacidades:

- partidos;
- victorias;
- empates;
- derrotas;
- sistema de puntos configurable si aplica;
- resultado inmediato;
- explicación.

Candidatos posteriores, sujetos a demanda:

```text
/calculadoras/rendimiento-equipo
/calculadoras/promedio-gol
/herramientas/generador-fixture
/herramientas/sorteador-equipos
```

Un simulador complejo de clasificación de Liga BetPlay sólo entra cuando las reglas y datos estén modelados correctamente; no se reduce una competición colombiana a una suma infantil de puntos.

## Reglas de negocio

- **RN01:** La fórmula debe estar documentada y testeada.
- **RN02:** No crear una URL por resultado calculado.
- **RN03:** Inputs del usuario no se indexan.
- **RN04:** Cada herramienta necesita contenido explicativo real.
- **RN05:** Añadir nuevas herramientas depende de demanda/uso medido, no de alcanzar un número decorativo.

## Frontend

Framework reutilizable:

```text
ToolHero
ToolForm
ToolResult
ToolExplanation
ToolRelated
```

## Backend / API

Preferir cálculo cliente para fórmulas determinísticas sin datos sensibles; usar servidor cuando se necesiten datasets, reglas versionadas o validación central.

## SEO

- respuesta visible;
- title estable;
- FAQ sólo si realmente corresponde;
- ejemplos útiles;
- schema compatible, sin markup engañoso.

## Analytics

```text
sports_tool_view
sports_tool_calculate
sports_tool_related_click
```

## Dependencias

- HU-TR-13.
- HU-TR-14.
- HU-TR-40 para taxonomía analytics.

## Definition of Done específica

Primera herramienta productiva, framework reutilizable, tests de fórmula, SSR del contenido explicativo y analytics.

---

# HU-TR-50 — Diseñar sistema de slots publicitarios sin degradar UX

**Épica:** EP-TR-07 — Eventos Evergreen, Search Utility y Monetización Ads  
**Prioridad:** P2 condicionado  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** responsable de producto

## Historia

**Como** responsable de producto  
**quiero** definir ubicaciones publicitarias reutilizables y controladas  
**para** monetizar páginas con tráfico sin convertir Pont3la10 en una feria de banners.

## Gate de entrada

Esta HU puede desarrollarse técnicamente, pero su activación pública requiere:

- consentimiento/política aplicable resueltos;
- baseline de Core Web Vitals;
- volumen mínimo definido por producto;
- analytics de vistas e interacción;
- revisión de políticas del proveedor de Ads.

## Alcance funcional

Componente conceptual:

```text
AdSlot
  placement
  size_policy
  lazy
  reserved_space
  enabled
```

Placements iniciales candidatos:

```text
article_inline
event_below_answer
event_mid_content
tool_below_result
desktop_rail
```

No habilitar todos por defecto.

## Reglas de negocio

- **RN01:** Nunca insertar un anuncio antes de que la respuesta principal sea identificable.
- **RN02:** Reservar espacio para reducir CLS.
- **RN03:** No confundir publicidad con contenido o botones propios.
- **RN04:** No usar formatos intrusivos en MVP.
- **RN05:** Slots se controlan por feature flag/configuración.
- **RN06:** Páginas con poco valor no se crean para servir Ads.
- **RN07:** Un proveedor de Ads no se carga cuando el slot está deshabilitado.
- **RN08:** Cumplir consentimiento y configuración de privacidad aplicables.

## Frontend

- Slots responsivos.
- Placeholder técnico con dimensiones reservadas.
- Lazy load.
- etiquetado publicitario visible cuando corresponda.

## Backend / configuración

Config:

```text
adsEnabled
adsProvider
placements[]
routeRules[]
```

Secretos/configuración sensible nunca en código público cuando no corresponda.

## Performance

Medir antes/después:

- LCP;
- CLS;
- INP;
- peso JS;
- requests terceros.

## Analytics

No contar impresiones de Ads como propias si el proveedor ya las mide; registrar únicamente eventos propios necesarios para evaluar UX/placement.

## Criterios de aceptación

### CA01
**DADO** Ads está deshabilitado  
**CUANDO** se abre una página  
**ENTONCES** no se descarga el script del proveedor

### CA02
**DADO** un slot está habilitado  
**CUANDO** carga el anuncio  
**ENTONCES** el layout no salta por falta de espacio reservado

### CA03
**DADO** falla el proveedor  
**CUANDO** la página renderiza  
**ENTONCES** el contenido principal sigue funcionando

## Dependencias

- HU-TR-40.
- Baseline de performance existente.
- Política/consentimiento aplicable.

## Definition of Done específica

Componente común, flags, fallback, medición CWV, consentimiento integrado y pruebas de proveedor caído.

---

# HU-TR-51 — Medir rendimiento de superficies evergreen y Ads

**Épica:** EP-TR-07 — Eventos Evergreen, Search Utility y Monetización Ads  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** responsable de crecimiento

## Historia

**Como** responsable de crecimiento  
**quiero** comparar tráfico, engagement, rendimiento SEO y monetización por tipo de página  
**para** saber qué superficies conviene mejorar, escalar o dejar de producir.

## Métricas

Por route family:

```text
organic_sessions
organic_clicks
ctr
avg_position
engaged_sessions
returning_users
related_click_rate
tool_usage_rate
ad_impressions
viewability
estimated_revenue
page_rpm
cwv
```

Los ingresos deben provenir del proveedor/registro real, no de multiplicar visitas por una cifra optimista sacada de internet.

## Reglas de negocio

- **RN01:** Revenue estimado y revenue confirmado deben distinguirse si ambos existen.
- **RN02:** No optimizar RPM ignorando pérdida de tráfico o UX.
- **RN03:** Comparar ventanas equivalentes.
- **RN04:** Datos insuficientes se muestran como tales.
- **RN05:** Search Console y Analytics mantienen sus fuentes separadas.

## Frontend

Extender:

```text
/admin/crecimiento
```

con vista:

```text
Evergreen / Eventos / Herramientas / Ads
```

## Dependencias

- HU-TR-42.
- HU-TR-43.
- HU-TR-50.

## Definition of Done específica

Dashboard trazable, fuentes identificadas, revenue no inventado, segmentos por route family y alertas básicas de degradación.

---

# HU-TR-52 — Ejecutar piloto controlado de monetización Ads

**Épica:** EP-TR-07 — Eventos Evergreen, Search Utility y Monetización Ads  
**Prioridad:** P2 condicionado  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** responsable de producto

## Historia

**Como** responsable de producto  
**quiero** activar Ads gradualmente en páginas evergreen seleccionadas  
**para** validar monetización real antes de extender publicidad a todo el sitio.

## Alcance funcional

Piloto inicial candidato:

```text
/mundial-2030
/cuando-juega-colombia
/calculadoras/calculadora-de-puntos
```

Sólo las rutas que hayan superado gates de calidad/tráfico.

Rollout:

```text
0%
→ interno
→ porcentaje pequeño
→ 100% de rutas piloto
→ evaluación
```

## Reglas de negocio

- **RN01:** No activar globalmente por defecto.
- **RN02:** Cada ruta puede deshabilitar Ads independientemente.
- **RN03:** Si CWV/UX cae por encima del umbral acordado, rollback.
- **RN04:** No aumentar densidad publicitaria automáticamente para perseguir RPM.
- **RN05:** Antes de ampliar el piloto se revisan SEO, engagement y revenue conjuntamente.
- **RN06:** P10 Games puede permanecer sin Ads durante el MVP si los anuncios interfieren con la mecánica.
- **RN07:** Ads no convierte automáticamente premium, tipsters ni afiliación en alcance activo; esos frentes siguen separados.

## Analytics / experimento

Comparar:

- control sin Ads;
- tratamiento con Ads;
- LCP/CLS/INP;
- engagement;
- páginas por sesión;
- retorno;
- revenue/page;
- RPM.

## Criterios de aceptación

### CA01
**DADO** una ruta no está en allowlist  
**CUANDO** Ads general está disponible  
**ENTONCES** esa ruta no muestra publicidad

### CA02
**DADO** el piloto degrada una métrica crítica por encima del umbral configurado  
**CUANDO** se ejecuta rollback  
**ENTONCES** Ads puede deshabilitarse sin redeploy completo si la arquitectura lo permite

### CA03
**DADO** el piloto termina  
**CUANDO** producto evalúa resultados  
**ENTONCES** existe comparación de tráfico, UX y revenue con fuentes reales

## Dependencias

- HU-TR-46 o HU-TR-47 o HU-TR-49 con tráfico suficiente.
- HU-TR-50.
- HU-TR-51.
- EN-TR-01 Feature flags.

## Definition of Done específica

Piloto flaggeado, allowlist de rutas, rollback probado, reporte de resultados y decisión documentada antes de expandir.

---



# EP-TR-08 — P10 Tools: laboratorio SEO, utilidades y descubrimiento de verticales

## Objetivo

Crear `tools.pont3la10.com` como una segunda superficie del ecosistema Pont3la10 orientada a resolver tareas pequeñas y recurrentes mediante herramientas simples, rápidas e indexables.

P10 Tools **no es una sección deportiva** y no debe diluir la identidad de `pont3la10.com`.

Arquitectura de marca:

```text
Pont3la10
│
├── pont3la10.com
│   └── SPORTS
│       ├── contenido
│       ├── datos
│       ├── eventos
│       ├── juegos
│       └── herramientas deportivas
│
└── tools.pont3la10.com
    └── P10 TOOLS
        ├── calculadoras
        ├── fechas
        ├── estudio
        ├── random
        ├── conversiones
        └── significados (experimental)
```

## Tesis

El propósito inicial no es construir un portal gigantesco.

Es ejecutar ciclos:

```text
idea de utilidad
→ herramienta pequeña
→ indexación
→ impresiones
→ clics
→ interacción
→ RPM / revenue
→ decisión
```

La demanda real decide qué familia escala.

## Principios específicos

1. `pont3la10.com` permanece enfocado en deporte.
2. P10 Tools vive inicialmente en `tools.pont3la10.com`.
3. Un tool debe resolver algo antes de explicar algo.
4. Cada URL indexable necesita valor funcional real.
5. No generar páginas masivamente desde combinaciones de keywords.
6. No crear una URL por cada input, resultado o combinación.
7. Las herramientas determinísticas pueden calcularse en cliente.
8. Datos variables/regulatorios requieren fuente y fecha.
9. No exigir cuenta para usar las herramientas MVP.
10. Ads nunca debe bloquear el resultado principal.
11. Cada familia debe medirse como unidad de negocio.
12. Un vertical ganador puede graduarse a producto propio; uno mediocre se congela o elimina.

---

# HU-TR-53 — Crear superficie P10 Tools en `tools.pont3la10.com`

**Épica:** EP-TR-08 — P10 Tools  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** visitante

## Historia

**Como** visitante  
**quiero** acceder a herramientas generales desde una superficie claramente separada del producto deportivo  
**para** resolver tareas rápidas sin entrar en una experiencia editorial que no corresponde a mi intención.

## Decisión de arquitectura

Hosts públicos:

```text
pont3la10.com
tools.pont3la10.com
```

Responsabilidades:

```text
pont3la10.com
→ Sports

tools.pont3la10.com
→ P10 Tools
```

El MVP debe evitar mover el proyecto Sports existente únicamente para forzar una estructura de monorepo.

Opciones técnicas permitidas:

1. segundo proyecto Nuxt dentro del mismo repositorio;
2. deployment independiente apuntando a un subdirectorio;
3. workspace/monorepo sólo cuando compartir paquetes lo justifique.

La implementación elegida debe preservar el root actual de Sports.

## Alcance funcional

Crear shell inicial de P10 Tools con:

- home;
- categorías;
- búsqueda/listado de herramientas;
- header/footer propios;
- sitemap propio;
- robots;
- favicon/site metadata propios;
- analytics segmentado;
- soporte de Ads deshabilitado por defecto.

## Reglas de negocio

- **RN01:** Sports y Tools no comparten navegación principal.
- **RN02:** Un enlace discreto entre productos puede existir en footer/ecosistema.
- **RN03:** No insertar links desde artículos deportivos hacia Tools sólo para transferir autoridad.
- **RN04:** Canonical de Tools siempre usa `tools.pont3la10.com` salvo una migración explícita.
- **RN05:** Assets/paquetes compartidos no pueden acoplar los ciclos de deploy si generan riesgo innecesario.
- **RN06:** P10 Tools debe poder deshabilitarse/deployarse sin afectar Sports.

## Frontend

Identidad:

```text
P10 Tools
by Pont3la10
```

Diseño compatible con el sistema visual general, pero más utilitario y neutro.

## Backend / API

No crear backend genérico antes de necesitarlo.

Tools puramente determinísticos funcionan client-side.

Endpoints sólo para:

- datasets;
- reglas centralizadas;
- tracking server-side necesario;
- herramientas que requieran datos actualizados.

## SEO

- sitemap separado por hostname;
- canonical absoluto correcto;
- site name propio;
- breadcrumbs;
- metadata por tool;
- noindex en páginas de búsqueda interna/filtros.

## Analytics

Añadir dimensión común:

```text
product_surface = sports | tools
hostname
tool_category?
tool_slug?
```

## Criterios de aceptación

### CA01
**DADO** se abre `tools.pont3la10.com`  
**CUANDO** renderiza  
**ENTONCES** no se presenta como sección deportiva

### CA02
**DADO** Google solicita una URL de Tools  
**CUANDO** se genera canonical  
**ENTONCES** apunta al hostname Tools

### CA03
**DADO** Tools falla o se despliega  
**CUANDO** Sports recibe tráfico  
**ENTONCES** su disponibilidad no depende del runtime de Tools salvo infraestructura compartida explícitamente documentada

## Dependencias

- HU-TR-40 para taxonomía analítica.
- EN-TR-01 para flags cuando aplique.

## Definition of Done específica

Hostname operativo, SSL, sitemap, robots, metadata, analytics, deploy independiente o aislado y smoke tests cross-host.

---

# HU-TR-54 — Crear registro y arquitectura de categorías de herramientas

**Épica:** EP-TR-08 — P10 Tools  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** responsable de producto

## Historia

**Como** responsable de producto  
**quiero** registrar todas las herramientas bajo un contrato común  
**para** poder publicarlas, medirlas, retirarlas y agruparlas sin hardcodear navegación dispersa.

## Modelo conceptual

```text
ToolDefinition
  id
  slug
  category
  title
  description
  status
  indexable
  monetizable
  requiresServer
  freshnessPolicy?
  publishedAt?
  updatedAt?
```

Estados:

```text
draft
experimental
published
paused
retired
```

Categorías iniciales:

```text
calculadoras
fechas
estudio
random
conversiones
significados
```

## Reglas de negocio

- **RN01:** Una herramienta tiene un slug único.
- **RN02:** `experimental` puede estar pública con `noindex`.
- **RN03:** `retired` define redirect/410 según caso.
- **RN04:** Un tool no entra al sitemap sólo por existir en código.
- **RN05:** Las categorías vacías no se indexan.
- **RN06:** No crear categoría por una sola keyword sin evidencia de profundidad.

## Frontend

- home con herramientas destacadas;
- listado por categoría;
- cards reutilizables;
- búsqueda local/simple sólo si mejora descubrimiento.

## Backend / datos

El registro puede comenzar como configuración tipada/versionada en código.

Migrar a DB sólo si la operación editorial lo exige.

## SEO

Categorías indexables cuando tengan suficiente inventario y valor.

## Analytics

```text
tools_home_view
tool_category_view
tool_card_click
```

## Dependencias

- HU-TR-53.

## Definition of Done específica

Registro tipado, estados, navegación automática, sitemap derivado y pruebas de noindex/indexable.

---

# HU-TR-55 — Lanzar primer paquete de utilidades generales

**Épica:** EP-TR-08 — P10 Tools  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** XL  
**Actor principal:** visitante orgánico

## Historia

**Como** visitante  
**quiero** resolver cálculos y decisiones pequeñas en segundos  
**para** obtener una respuesta inmediata sin formularios innecesarios ni registro.

## Objetivo del MVP

Publicar entre 10 y 20 herramientas de alta utilidad, no cientos.

Paquete inicial recomendado:

### Calculadoras

```text
/calculadoras/porcentaje
/calculadoras/regla-de-tres
/calculadoras/promedio
/calculadoras/nota-que-necesito
/calculadoras/costo-gasolina-viaje
```

### Fechas

```text
/fechas/edad
/fechas/dias-entre-fechas
/fechas/cuanto-falta
```

### Random

```text
/random/numero-aleatorio
/random/si-o-no
/random/ruleta
/random/dividir-equipos
```

### Conversiones

```text
/conversiones/kg-a-libras
/conversiones/cm-a-pulgadas
```

La selección final puede cambiar antes de desarrollo mediante datos de demanda.

## Reglas de negocio

- **RN01:** Resultado principal aparece inmediatamente después de la interacción.
- **RN02:** No login.
- **RN03:** Inputs no sensibles no se persisten salvo necesidad explícita.
- **RN04:** Cada fórmula tiene tests.
- **RN05:** No crear URL por combinación de parámetros.
- **RN06:** Herramienta sin uso después de una ventana razonable puede pausarse.
- **RN07:** No introducir calculadoras regulatorias Colombia en este paquete sin política de actualización/versionado.

## Frontend

Template común:

```text
ToolHero
ToolForm
ToolResult
ToolExplanation
ToolExamples
ToolRelated
```

Diseño mobile-first y resultado visible sin recorrer una novela SEO.

## Backend / API

Preferir cliente para operaciones matemáticas determinísticas.

## SEO

Cada tool debe incluir:

- propósito;
- inputs comprensibles;
- resultado;
- fórmula/metodología;
- ejemplos;
- preguntas realmente útiles;
- enlaces relacionados.

## Analytics

```text
tool_view
tool_start
tool_calculate
tool_complete
tool_related_click
```

## Criterios de aceptación

### CA01
**DADO** el usuario introduce valores válidos  
**CUANDO** calcula  
**ENTONCES** obtiene resultado correcto y entendible

### CA02
**DADO** valores inválidos  
**CUANDO** intenta calcular  
**ENTONCES** ve validación útil sin error de aplicación

### CA03
**DADO** la herramienta está publicada  
**CUANDO** Google la rastrea  
**ENTONCES** encuentra contenido funcional SSR/indexable donde aplique y no resultados personalizados indexables

## Dependencias

- HU-TR-54.
- HU-TR-40.

## Definition of Done específica

Primer paquete productivo, tests por fórmula, mobile, accesibilidad, analytics, metadata y performance baseline.

---

# HU-TR-56 — Experimentar con vertical de “Significados” sin crear thin content

**Épica:** EP-TR-08 — P10 Tools  
**Prioridad:** P2 experimental  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** visitante orgánico

## Historia

**Como** visitante  
**quiero** entender rápidamente términos, expresiones o símbolos que encuentro en internet  
**para** obtener contexto claro, ejemplos y conceptos relacionados.

## Problema / valor de negocio

Consultas del tipo “qué significa X” pueden generar demanda, pero son especialmente vulnerables a:

- respuestas directas de buscadores/IA;
- contenido commodity;
- páginas delgadas;
- generación masiva de baja calidad.

Por tanto, este vertical debe validarse con un catálogo pequeño.

## Rutas

```text
/significados/{slug}
```

Ejemplos únicamente candidatos:

```text
/significados/fomo
/significados/npc
/significados/hora-espejo
```

No crear miles de términos automáticamente.

## Reglas de negocio

- **RN01:** Cada entrada necesita contexto, ejemplos y fuentes cuando corresponda.
- **RN02:** No publicar definiciones generadas a escala sin revisión.
- **RN03:** Términos médicos, legales, financieros o de alto riesgo requieren tratamiento específico o exclusión.
- **RN04:** Una página sin valor diferencial permanece noindex o no se publica.
- **RN05:** El vertical se congela si Search/engagement no justifican su mantenimiento.

## Frontend

Respuesta corta primero:

```text
¿Qué significa X?
→ respuesta directa
→ ejemplo
→ origen/contexto
→ relacionados
```

## SEO

Experimento controlado; comparar con utilidades interactivas antes de escalar.

## Analytics

```text
meaning_view
meaning_related_click
meaning_search_exit
```

## Dependencias

- HU-TR-54.
- HU-TR-57.

## Definition of Done específica

Catálogo pequeño, política editorial, noindex experimental configurable y análisis comparativo de rendimiento.

---

# HU-TR-57 — Crear Quality Gate SEO e indexación para P10 Tools

**Épica:** EP-TR-08 — P10 Tools  
**Prioridad:** P0 para escalamiento  
**Estado:** Nueva  
**Tamaño inicial:** L  
**Actor principal:** responsable de crecimiento

## Historia

**Como** responsable de crecimiento  
**quiero** impedir que herramientas o páginas de baja calidad entren automáticamente al índice  
**para** escalar P10 Tools sin convertirlo en una granja SEO.

## Gate mínimo

Una URL candidata a `index` debe validar, según su tipo:

```text
funcionalidad real
contenido único suficiente
canonical correcto
estado published
sin duplicidad de intención
sin error de fórmula/dataset
performance aceptable
analytics habilitado cuando corresponda
```

## Reglas de negocio

- **RN01:** `indexable=false` prevalece sobre cualquier sitemap.
- **RN02:** Filtros, resultados personalizados, query combinations y búsquedas internas son `noindex`.
- **RN03:** Una herramienta clonada cambiando sólo unidades debe evaluar si corresponde una sola UI configurable.
- **RN04:** No publicar páginas programáticas únicamente porque exista un dataset.
- **RN05:** Sitemap se deriva de herramientas aprobadas.
- **RN06:** Retirar una herramienta debe definir 301, 410 o mantenimiento según tráfico/backlinks.
- **RN07:** El gate debe poder ejecutarse en CI para reglas estáticas.

## Frontend

No aplica como feature visible, salvo estados 404/retired consistentes.

## Backend / build

Crear validador:

```text
validateToolForPublication(tool)
```

y checks de:

- slug;
- metadata;
- canonical;
- indexability;
- categoría;
- fórmula/test link;
- duplicidad básica.

## SEO

Auditoría periódica de:

- indexed vs submitted;
- páginas sin impresiones;
- canibalización;
- duplicados;
- CWV;
- soft 404.

## Analytics

```text
tool_indexation_status
tool_retired
```

como datos internos, no eventos públicos innecesarios.

## Dependencias

- HU-TR-54.
- HU-TR-55.

## Definition of Done específica

Gate implementado, sitemap derivado, reglas de noindex, CI y procedimiento de retiro documentado.

---

# HU-TR-58 — Separar analytics y Search Console por superficie y familia

**Épica:** EP-TR-08 — P10 Tools  
**Prioridad:** P1  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** responsable de crecimiento

## Historia

**Como** responsable de crecimiento  
**quiero** distinguir Sports de Tools y comparar cada familia de utilidades  
**para** saber qué producto está generando adquisición, interacción y retorno.

## Alcance funcional

Dimensiones mínimas:

```text
product_surface
hostname
tool_category
tool_slug
traffic_source
device_category
```

Paneles:

```text
Sports
Tools
Tools > Calculadoras
Tools > Fechas
Tools > Estudio
Tools > Random
Tools > Conversiones
Tools > Significados
```

## Reglas de negocio

- **RN01:** No sumar Sports y Tools para ocultar desempeño de una superficie.
- **RN02:** Search Console mantiene lectura por hostname/directorio según configuración disponible.
- **RN03:** Los eventos comparten nomenclatura común sólo cuando representan la misma acción.
- **RN04:** Revenue se cruza por route family, no sólo total mensual.
- **RN05:** No crear user tracking adicional sólo para comparar productos.

## Frontend

Extender `/admin/crecimiento` con filtro:

```text
Sports | P10 Tools | Ecosistema
```

## Backend

Normalizar agregados por hostname.

## Dependencias

- HU-TR-42.
- HU-TR-53.
- HU-TR-55.

## Definition of Done específica

Dashboards separados, host dimension validada, Search Console documentado y métricas comparables por familia.

---

# HU-TR-59 — Monetizar P10 Tools con Ads por route family

**Épica:** EP-TR-08 — P10 Tools  
**Prioridad:** P2 condicionado  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** responsable de producto

## Historia

**Como** responsable de producto  
**quiero** activar publicidad sólo en herramientas con tráfico y experiencia estable  
**para** medir monetización sin degradar el producto completo.

## Alcance funcional

Reutilizar la infraestructura de `HU-TR-50` cuando sea técnicamente compatible.

Configuración:

```text
surface = tools
category
tool
adsEnabled
placements[]
```

Placements iniciales candidatos:

```text
tool_below_result
tool_mid_explanation
desktop_rail
```

## Reglas de negocio

- **RN01:** Resultado de la herramienta tiene prioridad visual.
- **RN02:** No interstitials/bloqueos en MVP.
- **RN03:** Tools sin tráfico suficiente permanecen sin Ads si no aportan aprendizaje.
- **RN04:** Ads puede habilitarse por categoría o herramienta.
- **RN05:** P10 Tools y Sports pueden usar políticas distintas de densidad.
- **RN06:** Revenue no justifica degradar CWV por encima del umbral definido.

## Analytics

Por tool/category:

```text
ad_impressions
viewability
revenue
page_rpm
tool_complete_rate
related_click_rate
cwv
```

## Dependencias

- HU-TR-50.
- HU-TR-51.
- HU-TR-58.

## Definition of Done específica

Flags por route family, métricas de revenue, rollback, CWV comparado y documentación de placements.

---

# HU-TR-60 — Definir regla de graduación de verticales de P10 Tools

**Épica:** EP-TR-08 — P10 Tools  
**Prioridad:** P2  
**Estado:** Nueva  
**Tamaño inicial:** M  
**Actor principal:** responsable de producto

## Historia

**Como** responsable de producto  
**quiero** decidir con datos cuándo una familia de herramientas debe escalar, independizarse, mantenerse o retirarse  
**para** no crear marcas/subdominios por intuición.

## Decisiones posibles

```text
scale
maintain
merge
pause
retire
graduate
```

`graduate` significa evaluar:

```text
nuevo subdominio
o
dominio propio
o
aplicación propia
```

No significa ejecutarlo automáticamente.

## Señales mínimas de evaluación

- impresiones orgánicas;
- clics;
- CTR;
- posición;
- sesiones engaged;
- uso real de la herramienta;
- retorno;
- cantidad de tools útiles posibles dentro del vertical;
- revenue;
- page RPM;
- backlinks/referidos;
- coste de mantenimiento;
- fit de marca.

## Reglas de negocio

- **RN01:** Ninguna métrica aislada decide graduación.
- **RN02:** Un pico viral no equivale a mercado permanente.
- **RN03:** Revenue alto con riesgo SEO/UX no es suficiente.
- **RN04:** Antes de mover URLs se exige plan de redirects y migración.
- **RN05:** La marca Pont3la10 puede conservar endorsement sin obligar a que todos los productos usen el mismo hostname.
- **RN06:** Un vertical puede cerrarse sin considerarse fracaso; el laboratorio existe para descartar barato.

## Frontend

En `/admin/crecimiento`:

```text
Vertical
Estado
Tráfico
Engagement
Revenue
RPM
Cobertura posible
Recomendación
Evidencia
```

## Backend

Regla explicable; no crear un score mágico único.

## Dependencias

- HU-TR-58.
- HU-TR-59 cuando haya Ads.
- HU-TR-43 para feedback loop.

## Definition of Done específica

Matriz de decisión, dashboard, evidencia trazable y checklist de migración/retirada.

---


# 8. Backlog existente que se conserva y NO se duplica

Estas HUs ya existen en el repositorio y continúan siendo dependencias o trabajos paralelos:

## HU-OP-01 — Corregir vulnerabilidades sin romper typecheck

Continúa separada del refactor de negocio. No mezclar actualizaciones masivas de dependencias con HUs Growth.

## HU-DA-01 — Consultar y mostrar tablas de posiciones con fuente autorizada

Se convierte en dependencia de `HU-TR-21`. No crear otra HU de “traer standings”.

## HU-SO-01 — Generar paquete social desde un artículo  
## HU-SO-02 — Aprobar piezas sociales  
## HU-SO-03 — Programar mediante APIs oficiales

Siguen vigentes. El nuevo backlog debe integrarlas al feedback loop, no reescribirlas.

## HU-ED-07 / 08 / 09 / 10–13

El sistema de ingesta, redacción, revisión, automatización Codex, agenda, programación y monitor operativo ya existe parcial o totalmente en producción. Las nuevas HUs extienden esos flujos.

---

# 9. Enablers técnicos transversales

No se modelan como “features de usuario” falsas. Son trabajo técnico habilitador.

## EN-TR-01 — Feature flags

Flags sugeridos:

```text
growthEditorialEnabled
publicHubsEnabled
p10GamesEnabled
p10DailyEnabled
rankingsEnabled
```

Deben controlar rollout, no autorización.

## EN-TR-02 — Convención de migraciones

Toda migración debe revisar:

- RLS;
- grants;
- `security invoker/definer`;
- `search_path`;
- reversibilidad;
- locks;
- backfill;
- índices;
- impacto en snapshots.

## EN-TR-03 — Rate limiting público

Aplicar a:

- respuestas de juegos;
- búsquedas de jugador;
- shares/tokens;
- endpoints que puedan abusar proveedores externos.

## EN-TR-04 — Observabilidad

Registrar:

- errores por dominio;
- latencia de proveedor;
- stale/fallback;
- completion de juegos;
- fallos de jobs;
- rate limit.

## EN-TR-05 — Accesibilidad y mobile-first

Toda nueva UI debe cubrir:

- teclado;
- focus;
- contraste;
- labels;
- estados no dependientes sólo de color;
- viewport móvil;
- reduced motion cuando corresponda.

---

# 10. Icebox estratégico — Pronósticos, Tipsters y Monetización

**Estado:** LATER.  
**Condición de entrada:** audiencia y recurrencia suficientes; revisión comercial/legal; operadores autorizados; métricas confiables.

Estas historias se documentan para no perder la visión, pero NO compiten con el backlog de tráfico/retención actual.

## HU-SP-01 — Perfil público de tipster

Como usuario, quiero consultar historial y métricas de un pronosticador para evaluar su contenido.

Incluye perfil, bio, deportes/ligas, seguidores y picks públicos.

## HU-SP-02 — Publicar picks con integridad temporal

Como tipster, quiero publicar un pronóstico antes del inicio del evento para construir un historial verificable.

Una vez iniciado el evento no se permite alterar selección, cuota, stake ni borrar el historial.

## HU-SP-03 — Liquidar resultados y estadísticas verificables

Como usuario, quiero que Pont3la10 calcule win rate, ROI, yield y unidades sobre picks cerrados.

El cálculo debe ser server-side y auditable.

## HU-SP-04 — Ranking de tipsters

Como usuario, quiero descubrir creadores con suficiente historial sin depender únicamente del porcentaje de aciertos.

Requiere metodología transparente y muestra mínima.

## HU-SP-05 — Seguimiento y feed de tipsters

Como usuario, quiero seguir creadores para ver sus nuevos picks y contenido.

No incluye notificaciones compulsivas ni promesas de ganancias.

## HU-SP-06 — Planes premium y suscripciones

Como tipster, quiero ofrecer contenido premium y recibir suscripciones.

No desarrollar hasta definir pagos, impuestos, términos, chargebacks y payouts.

## HU-SP-07 — Affiliate Tracking Service

Como responsable comercial, quiero registrar clicks hacia operadores asociados para medir campañas.

Ruta conceptual:

```text
/out/{operator}/{contextId}
```

Debe prevenir open redirects y registrar sólo operadores allowlisted.

## HU-SP-08 — Media Kit y patrocinios

Como responsable comercial, quiero mostrar tráfico, usuarios, engagement y conversiones verificables para vender patrocinios.

Los números deben provenir de Analytics, no escribirse manualmente como “estimaciones”.

---

# 11. Dependencias críticas

```text
HU-TR-01
  ↓
HU-TR-02
  ↓
HU-TR-03
  ↓
HU-TR-07
```

```text
HU-TR-08
  ↓
HU-TR-09
  ↓
HU-TR-10
  ↓
HU-TR-14
```

```text
HU-TR-16
  ├─ HU-TR-17
  ├─ HU-TR-19
  └─ HU-TR-20

HU-DA-01
  ↓
HU-TR-21
```

```text
HU-TR-24
  ├─ HU-TR-25
  ├─ HU-TR-26
  ├─ HU-TR-27
  └─ HU-TR-28

HU-TR-27/28
  ↓
HU-TR-29
  ↓
HU-TR-30
  ↓
HU-TR-31
  ↓
HU-TR-34
  ↓
HU-TR-35
  ↓
HU-TR-37/38/39
```

```text
HU-TR-15 + HU-TR-40
  ↓
HU-TR-42
  ↓
HU-TR-43
  ↓
HU-TR-44
```

---


```text
HU-TR-13 + HU-TR-16 + HU-TR-23
  ↓
HU-TR-45
  ├─ HU-TR-46 Mundial 2030
  ├─ HU-TR-47 Cuándo juega Colombia
  └─ HU-TR-48 Calendario

HU-TR-13 + HU-TR-14 + HU-TR-40
  ↓
HU-TR-49 Herramientas

HU-TR-42 + HU-TR-50
  ↓
HU-TR-51
  ↓
HU-TR-52 Piloto Ads
```

---


```text
HU-TR-53 P10 Tools
  ↓
HU-TR-54 Registro
  ├─ HU-TR-55 Primer paquete
  └─ HU-TR-56 Significados experimental

HU-TR-54 + HU-TR-55
  ↓
HU-TR-57 Quality Gate

HU-TR-53 + HU-TR-55 + HU-TR-42
  ↓
HU-TR-58 Analytics por superficie
  ↓
HU-TR-59 Ads Tools
  ↓
HU-TR-60 Decisión de vertical
```

---

# 12. Orden de implementación recomendado

## Sprint 0 — Baseline y protección

Objetivo: preparar el refactor sin romper producción.

- EN-TR-01 Feature flags.
- Baseline de GA4.
- Confirmar validaciones actuales.
- HU-TR-40 taxonomía analytics.

## Sprint 1 — Motor editorial Growth

- HU-TR-01.
- HU-TR-02.
- HU-TR-03.
- HU-TR-08.

**Salida:** contenido clasificado + scoring + acción + filtros correctos.

## Sprint 2 — SEO Utility

- HU-TR-09.
- HU-TR-11.
- HU-TR-13.
- Inicio HU-TR-10.

**Salida:** archivo rastreable, fechas SEO correctas y primer componente Search Utility.

## Sprint 3 — Datos deportivos internos

- HU-TR-16.
- HU-TR-23.
- HU-TR-17.

**Salida:** identidad estable de entidades y partido canónico.

## Sprint 4 — Primer vertical SEO

- HU-TR-19.
- HU-TR-15.
- HU-TR-07.

**Salida:** Colombianos en Europa + Radar con señales reales.


## Sprint 4B — Eventos evergreen y Search Utility

- HU-TR-45 motor de eventos.
- HU-TR-47 Cuándo juega Colombia.
- HU-TR-46 Mundial 2030.
- HU-TR-48 calendario, después de validar el motor.
- HU-TR-49 primera herramienta deportiva, en paralelo si capacidad lo permite.

**Salida:** primeras superficies evergreen que responden búsquedas recurrentes y pueden crecer sin crear noticias diarias.


## Track paralelo T1 — P10 Tools MVP

Este track **no bloquea** Sports/Games y debe poder desarrollarse/deployarse de forma aislada.

### T1.1 — Fundación

- HU-TR-53 superficie/subdominio.
- HU-TR-54 registro/categorías.
- HU-TR-57 Quality Gate inicial.

### T1.2 — Validación de demanda

- HU-TR-55 primer paquete de 10–20 herramientas.
- HU-TR-58 analytics/Search Console por superficie.
- HU-TR-56 significados sólo como experimento pequeño.

**Salida:** P10 Tools indexable, medible y todavía pequeño.

### T1.3 — Monetización y decisión

Después de conseguir tráfico suficiente:

- HU-TR-59 Ads por familia.
- HU-TR-60 regla de graduación.

**Salida:** evidencia para decidir qué vertical escalar, mantener o retirar.


## Sprint 5 — Games Foundation

- HU-TR-24.
- HU-TR-25.
- HU-TR-26.
- EN-TR-03.

**Salida:** plataforma de juegos operable y segura.

## Sprint 6 — Primer loop de retención

- HU-TR-27 La 10.
- HU-TR-28 Adivina jugador.
- HU-TR-29 Share.
- HU-TR-30 Racha.

**Salida:** jugar → terminar → compartir → volver.

## Sprint 7 — P10 Daily

- HU-TR-31.
- HU-TR-32.
- HU-TR-34.

**Salida:** XP + Grid + rutina diaria.

## Sprint 8 — Cuenta y ranking

- HU-TR-35.
- HU-TR-36.
- HU-TR-37.

## Sprint 9 — Growth loop

- HU-TR-41.
- HU-TR-42.
- HU-TR-43.
- HU-TR-44.


## Sprint 9B — Piloto Ads sobre evergreen

Sólo después de contar con baseline y tráfico medible:

- HU-TR-50 sistema de slots.
- HU-TR-51 medición de monetización.
- HU-TR-52 piloto controlado.

**Salida:** monetización medida y reversible, sin activar Ads indiscriminadamente en todo Pont3la10.

## Sprint 10 — Comunidad

- HU-TR-38.
- HU-TR-39.

---

# 13. Definition of Ready global

Una HU no entra a desarrollo sin:

- actor y resultado claros;
- código existente revisado;
- dependencias identificadas;
- fuente de datos definida;
- derechos/licencia revisados cuando aplique;
- contrato API preliminar;
- modelo de datos preliminar;
- errores y estados vacíos definidos;
- analytics definidos;
- impacto SEO definido;
- impacto seguridad/RLS definido;
- criterios de aceptación verificables.

---

# 14. Definition of Done global

Aplicar la matriz oficial `docs/agents/VALIDACIONES.md`.

Como mínimo para cambio sustancial:

```powershell
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run typecheck
npm.cmd run build
git diff --check
```

Además:

- tests relacionados;
- responsive;
- accesibilidad;
- estados loading/error/empty;
- autorización servidor;
- RLS cuando haya DB;
- no secretos cliente;
- migración revisada;
- rollback documentado;
- analytics verificado;
- canonical/robots/schema revisados si toca UI pública;
- `docs/agents/ESTADO_ACTUAL.md` actualizado;
- handoff cuando el cambio sea sustancial.

---

# 15. Métricas de éxito por etapa

## Editorial Growth

- % de oportunidades descartadas antes de redactar;
- % create vs update;
- rendimiento por contentIntent;
- tiempo humano por publicación.

## SEO

- impresiones;
- clics;
- CTR;
- queries en posiciones 8–30;
- páginas con tráfico recurrente;
- sesiones orgánicas engaged.

## Evergreen / Eventos

- impresiones y clics orgánicos por URL permanente;
- CTR;
- posición media;
- sesiones recurrentes;
- navegación a partido/competición/contenido;
- uso de countdown;
- uso de herramientas;
- porcentaje de páginas indexables con tráfico real;
- proporción de thin pages evitadas/noindex.

## P10 Tools

- impresiones orgánicas por herramienta/categoría;
- clics;
- CTR;
- posición media;
- tool start rate;
- tool completion rate;
- sesiones engaged;
- retorno;
- herramientas con tráfico real;
- herramientas sin demanda después de la ventana de validación;
- revenue y RPM por familia;
- coste de mantenimiento por familia;
- verticales candidatos a escalar/retirar.

## Ads

- ad impressions;
- viewability;
- revenue real;
- page RPM;
- impacto en LCP/CLS/INP;
- impacto en engagement;
- impacto en retorno;
- revenue por familia de ruta.

## Games

- game start rate;
- completion rate;
- shares;
- D1;
- D7;
- Daily Returning Players;
- streak promedio.

## Cuenta

- account_created_from_game;
- sync success;
- % jugadores anónimos que vuelven;
- % que registra cuenta después de una racha.

---

# 16. North Star operativa

Durante el refactor se usarán dos métricas principales:

```text
Adquisición:
Organic Engaged Sessions

Retención:
Daily Returning Players

P10 Tools (experimental):
Monthly Organic Tool Completions
```

La métrica unificada se decide sólo después de tener suficiente volumen en P10 Games.

---

# 17. Principio de cierre

Pont3la10 no debe optimizarse para:

> publicar la mayor cantidad posible.

Debe optimizarse para:

> crear la mayor cantidad posible de razones válidas para que un usuario llegue, encuentre valor, interactúe y vuelva.

Para P10 Tools, además:

> construir pocas utilidades excelentes, medirlas y dejar que la demanda decida qué negocio merece existir.

