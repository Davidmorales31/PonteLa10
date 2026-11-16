# Plan: automatización editorial de fútbol colombiano, sin depender de Codex ni del PC

Fecha: 2026-11-14 · Estado: propuesta para decisión del responsable · Alcance: investigación,
arquitectura y plan por fases. No cambia código de producción ni la política vigente.

## 1. Resumen ejecutivo

1. **Ya dependes menos de Codex de lo que parece.** El redactor (DeepSeek), la API
   privada firmada (HMAC), la aprobación IA, la programación y el cron de
   publicación ya viven en el servidor. Lo que **sí** depende de Codex y de tu PC
   encendido es el orquestador: investigar, elegir historias, buscar fotos,
   revisar y llamar a la API (`docs/AUTOMATIZACION_EDITORIAL_IA.md`).
2. **La migración es reemplazar ese orquestador por un worker propio** (Node/TypeScript
   en un VPS, dentro de este repo), con un LLM por API detrás de una interfaz
   intercambiable. **No recomiendo un modelo local en esta etapa**: a tu volumen
   cuesta más que la API y rinde menos (sección 4).
3. **El cuello de botella no es el modelo, es la fuente.** Un agente no puede
   leer X, Instagram ni Facebook sin API o sesión. Hay que construir recolectores
   (sección 5).
4. **Cambios editoriales que pides:** nicho cerrado, cobertura mínima por club,
   formatos variados, dos títulos, fuentes oficiales, menos exigencia. Los
   implemento en un prompt nuevo (`docs/agents/prompts/editorial-futbol-colombiano-v2.md`).
   Mantengo un **piso de veracidad mínimo** y explico por qué en la sección 7.
5. **Volumen:** 70 artículos/día es mucho para un sitio donde Google ya dejó
   378 páginas rastreadas sin indexar, 192 de ellas artículos (de 499). Propongo
   **20–30 por día** con más variedad de formato y datos propios.

## 2. Estado actual (lo que leí en el repo)

| Etapa | Quién la hace hoy | ¿Depende de Codex/PC? |
| --- | --- | --- |
| Reservar corrida y contexto | Codex llama `contexto` | Sí (orquestación) |
| Investigar tendencias/fuentes | Codex (web) | **Sí** |
| Redactar | DeepSeek vía `/api/internal/codex/draft` | No (ya es API) |
| Revisar fidelidad, categoría, temas | Codex | **Sí** |
| Fotos reales con crédito | Codex + `preparar-portada-codex.mjs` | **Sí** |
| Aprobar y programar | `auto-proposals` (RPC atómico) | No |
| Publicar | Cron cada minuto | No |
| Disparador 06:05 y 18:05 | Tarea programada de Codex en tu PC | **Sí** |

Piezas reutilizables: idempotencia por corrida/categoría/huella, checkpoints,
recibos, deduplicación y las rutas `internal/codex/*`. Es buena ingeniería; se
conserva.

## 3. Opciones de orquestación

| Opción | Independiente del PC | Independiente de Codex/Claude | Esfuerzo | Veredicto |
| --- | --- | --- | --- | --- |
| A. Seguir con tareas programadas de Codex | No | No | Nulo | Descartada |
| B. Tareas programadas de Claude | No (se ejecutan en tu equipo) | No | Bajo | **Solo para la prueba en seco** |
| C. **Worker propio en VPS + LLM por API** | **Sí** | **Sí** | Medio | **Recomendada** |
| D. Worker en VPS + modelo local (GPU) | Sí | Sí | Alto | Prematura |
| E. n8n u otro low-code | Sí | Parcial | Medio | Útil como prototipo; menos testeable que código |

## 4. ¿Modelo local o API?

- **Costo.** Con 25 artículos al día (~6 000 tokens de entrada y ~1 500 de salida
  cada uno) son ~190 000 tokens/día. A precios de DeepSeek V4 reportados en
  noviembre de 2026 (entre ~0,30/1,20 y ~1,32/3,96 USD por millón de tokens
  entrada/salida; fuentes agregadoras discrepan, hay que verificar en la página
  oficial) el costo es de **centavos al día (≲ 10 USD/mes incluso con el modelo
  grande)**. Una GPU alquilada cuesta órdenes de magnitud más y las guías de
  punto de equilibrio sitúan el beneficio del autohospedaje por encima de varios
  millones de tokens diarios sostenidos.
- **Calidad.** Para español colombiano y titulares, los modelos de API actuales
  superan con holgura a un modelo pequeño local. No encontré una comparación
  fiable específica en español; hay que medirla con tus propios textos.
- **Qué sí tiene sentido local:** embeddings y similitud para deduplicar, que
  corren en CPU. Todo lo demás, por API.
- **Diseño:** una interfaz `ProveedorLlm` (`redactar`, `clasificar`, `resumir`) con
  adaptadores intercambiables (DeepSeek hoy; otro proveedor o un servidor
  vLLM/Ollama mañana). Así no dependes de nadie y puedes migrar cuando el volumen
  lo justifique.

## 5. Fuentes: lo que se puede y lo que no

| Fuente | Cómo leerla de forma legítima | Costo/riesgo |
| --- | --- | --- |
| **X (cuentas oficiales y periodistas)** | API oficial, pago por uso | ~0,005 USD por post leído (cifra de terceros; verificar en la consola de X). Lectura incremental con `since_id` para pagar solo lo nuevo. |
| Instagram / Facebook | No hay lectura pública por API de cuentas ajenas; el scraping viola sus términos | **Descartar como recolector.** Usar solo el embed oficial cuando el post sea la noticia. |
| Google Noticias (RSS por club) | RSS gratuito, verificado hoy: devuelve ~100 titulares por consulta | Solo titulares y enlaces: sirve de **radar**, no de texto base. Consultas con comillas para evitar ruido («millonarios» devolvió noticias de otro tema). |
| Sitios oficiales y DIMAYOR/FCF | HTML/RSS propios | Hoy `atlnacional.com.co` y `millonarios.com.co` redirigen (301); hay que seguir redirecciones y mantener un parser por sitio. |
| YouTube de clubes | RSS del canal / Data API | Gratis, útil para ruedas de prensa. |
| **Datos propios** | Workers de fútbol que ya tienes (fixtures, tabla, resultados) | Gratis y **es tu diferencial**. |

Conclusión: la prueba que hice confirma que **un agente sin APIs no puede leer
las redes** y que «reescribir noticias de otros medios» es justo el patrón que
Google describe como contenido a escala sin valor añadido. El valor está en los
datos propios, las declaraciones oficiales atribuidas y el análisis.

Estimación de lectura en X (supuesto explícito): 60 cuentas, ~5 posts nuevos por
cuenta y corrida, 2 corridas → ~600 lecturas/día ≈ **3 USD/día (~90 USD/mes)**.

## 6. Arquitectura objetivo

```text
VPS (systemd timers o cron)
└─ workers/editorial/            (Node + TypeScript, mismo repo)
   1. recolectar     X API · RSS Google Noticias · sitios oficiales · YouTube · datos propios
   2. normalizar     limpiar, fechar, extraer entidades (club, jugador, competición)
   3. deduplicar     huella + embeddings contra publicados y candidatos
   4. planificar     cuotas: ≥1 por club, ≥3 top-5, ≥2 Selección; formatos ≤35 %
   5. redactar       ProveedorLlm → JSON con titulo / tituloPortada / textoSocial
   6. controles      reglas deterministas (ver §7), no más IA revisando IA
   7. imagen         post oficial con crédito o embed
   8. entregar       POST /api/internal/…/auto-proposals (HMAC, idempotente)
   9. verificar      recibo, CMS, conteo por club, informe de déficit
Estado y cola: Supabase (ya existe)   Alertas: correo/Telegram   Secretos: variables del VPS
```

Principios de ingeniería:

- **Idempotencia y reanudación** por `corridaId + club + huella` (ya existe; se reutiliza).
- **Salida estructurada validada** con esquema Zod antes de gastar tokens en la
  siguiente etapa; si falla, un reintento acotado.
- **Presupuesto y límites duros:** tope diario de tokens y de lecturas de X;
  corte automático al superarlo.
- **Observabilidad:** logs estructurados, métrica de «artículos por club»,
  indexados/semana (Search Console) y tasa de rechazo.
- **Freno de emergencia:** una bandera en base de datos que pausa publicación sin redeploy.
- **Sin dependencia del PC:** el servicio corre en el VPS; tu equipo solo se
  usa para desarrollar.
- **Multi-tenant desde el principio:** `config/fuentes-<pais>.json` por liga, para
  que Argentina o Brasil sean configuración y no código nuevo.

## 7. Veracidad, titulares e imágenes: lo que haría y lo que no

Pediste bajar la exigencia al mínimo y titulares «rozando lo amarillista». Lo
implemento, con un piso que no recomiendo quitar:

**Se elimina:** segunda fuente, fuente primaria obligatoria, revisión semántica
por otro agente, mínimo de 660 palabras (empujaba relleno). Una fuente
identificable basta.

**Se mantiene (cinco reglas, todas automatizables):**
1. Atribución en el texto de lo no evidente.
2. Rumor presentado como rumor.
3. Cero citas, cifras, marcadores o fechas inventados.
4. Nada sobre salud, vida privada o acusaciones de personas reales sin fuente de primer nivel.
5. El titular de portada no promete lo que el texto no cumple.

**Por qué:** (a) las políticas de Google News describen como engañoso el contenido
de vista previa que promete detalles que no están en el contenido, con riesgo de
perder elegibilidad en superficies de noticias; (b) el sitio ya sufre rechazo por
calidad y la caída de indexación coincide con volumen alto; (c) publicar un dato
falso sobre una persona real es riesgo legal que ninguna verificación laxa
compensa. «Amarillista» funciona como **tono** (tensión, rivalidad, urgencia), no
como **hecho falso**.

**Dos títulos:** hoy el modelo de datos tiene `titulo`, `seo.titulo` y
`seo.textoSocial`; el carrusel muestra `titulo`. Propongo:
- `titulo` = SEO (≤60 caracteres, consulta + entidad + intención).
- **Campo nuevo `tituloPortada`** (migración + contrato + carrusel y tarjetas de portada).
- `seo.textoSocial` = texto para X.
Rápido y sin migración (solo para la prueba): usar `textoSocial` como titular de portada.

**Imágenes (decisión del responsable, 2026-11-15): política mínima.** Se permiten
fotos de cuentas oficiales, de medios y periodistas, de la galería de prensa de
DIMAYOR y embeds oficiales, con cuatro requisitos: crédito visible con enlace, no
quitar marcas de agua, no presentar archivo como actual y no generar con IA a
personas reales. El riesgo de reclamos de derechos de autor queda asumido; si un
titular lo pide, la imagen se reemplaza. Esto no es asesoría legal. Detalle en
`config/fuentesFutbolColombiano.json` → `fotos`.

**Titular de portada:** implementado en la rama `feat/titulo-portada`
(`docs/agents/handoffs/2026-11-15-titular-portada.md`), pendiente de migración,
PR y despliegue.

## 8. Plan por fases

| Fase | Entregable | Criterio de aceptación |
| --- | --- | --- |
| 0. Prueba en seco (ahora) | Prompt v2 ejecutado como tarea de Claude, lote de ≤8 piezas en `docs/agents/pruebas/` | Piezas con 3 títulos, atribución correcta, sección «qué no pude sin APIs» |
| 1. Contrato | Campo `tituloPortada` (migración, esquema, carrusel), cuotas por club en config, prompt v2 reemplaza la política | Pruebas de contrato y render de portada pasan |
| 2. Recolectores | X (since_id), RSS por club, sitios oficiales, YouTube; deduplicación | ≥90 % de los clubes con ≥1 candidato diario; costo de X bajo tope |
| 3. Worker en VPS | Pipeline completo con `ProveedorLlm`, idempotencia, alertas | 7 días en modo sombra (genera sin publicar) sin duplicados ni caídas |
| 4. Corte | Apagar la tarea de Codex; publicación automática con tope diario | Dos semanas estables; indexación no empeora |
| 5. Subdominios | `ar.`, `br.` o subcarpetas `/ar/` por configuración | Decisión SEO tomada con datos |

Sobre la fase 5: Google suele tratar subdominios como propiedades en gran medida
separadas, lo que impide heredar la autoridad del dominio principal; en un sitio
nuevo suele convenir más una **subcarpeta** (`/argentina/`). Decide con Search
Console en la mano; no la fijo todavía.

## 9. Costos mensuales estimados (supuestos arriba)

| Concepto | Orden de magnitud |
| --- | --- |
| LLM (25 artículos/día) | < 10 USD |
| X API (60 cuentas) | ~90 USD (reducible con listas más cortas) |
| VPS pequeño | ~5–15 USD |
| Fuentes RSS, YouTube, datos propios | 0 |

## 10. Decisiones

Tomadas por el responsable el 2026-11-15:

- **API de X:** no se contrata por ahora. Los recolectores empiezan por RSS, sitios
  oficiales, YouTube y datos propios.
- **Cuentas oficiales y periodistas:** lista verificada en
  `config/fuentesFutbolColombiano.json` (20 clubes desde las fichas de DIMAYOR,
  DIMAYOR, FCF/Selección, 8 periodistas y 5 medios).
- **Imágenes:** política mínima (sección 7).
- **Campo `tituloPortada`:** desarrollado en `feat/titulo-portada`.

Pendientes:

1. **Volumen diario objetivo** (propongo 20–30) y si «mínimo 1 por club» es por
   día o por corrida (se asume por día).

## 11. Fuentes consultadas

- Políticas de spam de Google (contenido a escala): https://developers.google.com/search/docs/essentials/spam-policies
- Políticas de Google Noticias: https://support.google.com/news/publisher-center/answer/6204050
- Precios de la API de X (secundarias, verificar en la consola de X): https://opentweet.io/x-api-pricing
- Precios de DeepSeek (agregadores; verificar en api-docs.deepseek.com): https://www.benchlm.ai/deepseek/api-pricing
- Autohospedaje vs API (punto de equilibrio): https://findstack.com/resources/self-hosted-llm-vs-api-cost
- Fotos de redes sociales y derechos de autor: https://pressgazette.co.uk/news/taking-photos-from-social-media-copyright-publishers-guide/
