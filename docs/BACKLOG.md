# Backlog de producto — Pont3la10

Última actualización: 2026-09-28

Este backlog consolida el Discovery aprobado para Pont3la10. Debe contrastarse
siempre con el código actual, las migraciones aplicadas y las HU específicas.
No autoriza publicación automática ni reemplaza los criterios de aceptación de
cada historia.

**Estado del producto revisado el 2026-09-28:** Pont3la10 ya está publicado en
producción; la ingesta TikTok y la tarea editorial programada de Codex existen
en el producto. Las listas históricas de HU-ED-07/08/09 contienen verificaciones
pendientes, no una indicación de que esos flujos todavía no existan. No volver a
implementar esos procesos sin contrastar primero el código y el despliegue.

## Orden de ejecución revisado

1. **P0 — Estabilidad de producción:** vigilar respuestas, legibilidad en temas,
   rutas públicas y fallos del flujo editorial; detener despliegues si hay
   regresiones.
2. **P1 — Seguridad de dependencias:** HU-OP-01; el arreglo amplio de NPM queda
   pendiente porque rompió el typecheck.
3. **P1 — Tablas deportivas:** HU-DA-01; empezar por Liga BetPlay, sujeto a
   cobertura por temporada y derechos de publicación escritos.
4. **P2 — Cierre operativo editorial/SEO:** completar verificaciones reales de
   HU-ED-07/08/09 y la siguiente corrida de portadas IA, sin duplicar flujos que
   ya están activos.
5. **P2 — Analítica y distribución social:** terminar HU-AN-01 y HU-SO-01/02/03;
   publicación en redes depende de credenciales oficiales y permisos.
6. **P3 — Expansión:** nuevas fuentes RSS/web, preferencias/notificaciones,
   boletín y monetización cuando presupuesto y derechos estén definidos.

## Objetivo del producto

Construir audiencia hispanohablante global mediante contenido original de
deportes, tecnología y entretenimiento, con SEO como canal principal y
distribución coordinada en Instagram, TikTok, Facebook y X.

La automatización debe reducir el trabajo operativo sin eliminar la revisión
humana. Meta inicial: tres artículos diarios, siete días por semana, durante un
piloto de 90 días, siempre que existan fuentes relevantes y contenido de calidad.

## Restricciones confirmadas

- Una sola persona operará el piloto entre 30 y 60 minutos diarios.
- Presupuesto operativo máximo: USD 25 mensuales.
- El desarrollo y el procesamiento pesado se ejecutarán inicialmente en el PC
  del propietario.
- Equipo conocido: Intel i5-10300H, NVIDIA GTX 1650 y 8 GB de RAM.
- Desarrollo y pruebas son locales; el sitio público corre en producción y
  depende de Vercel/Supabase.
- DeepSeek será el proveedor principal de redacción, detrás de una interfaz
  intercambiable.
- La transcripción se realizará localmente con Whisper.
- No se reutilizarán videos ajenos como contenido propio.
- Ningún contenido generado se publica sin aprobación humana.
- Las acciones sensibles conservan MFA, capacidades y auditoría.

## Cerrado recientemente

- **HU-ED-11 — Portada editorial con IA en la tarea programada Codex
  (2026-09-28):** la tarea puede generar una ilustración pertinente con
  ImageGen, optimizarla, cargarla con disclosure y dejarla ligada al borrador
  `review`. No cambia TikTok ni la carga manual; si la imagen no es segura o no
  está disponible, entrega el borrador sin portada. Ver
  `docs/agents/handoffs/2026-09-27-portadas-ia-tarea-codex.md`.
  **Verificación operativa pendiente:** la corrida `f9de3dc4-6ebd-47f3-9435-ced24106fc3e`
  terminó parcial con 12 borradores antes de que la tarea programada recibiera
  las instrucciones de portada (actualizadas después de esa corrida). No se
  encontraron llamadas ni artefactos de imagen en sus logs; confirmar la
  siguiente corrida real antes de cerrar este punto.

# NOW — MVP

## EP-ED-01 — Ingesta editorial asistida

### FE-ED-01 — Procesamiento fiable de TikTok

#### HU-ED-07 — Convertir un TikTok en una ingesta procesable

**Estado revisado:** el flujo ya está activo en producción. Los ítems siguientes
son endurecimiento/verificación histórica que deben contrastarse con la cola,
el worker y las migraciones actuales antes de reabrir desarrollo.

Decisión del propietario (2026-09-10): HU-ED-07 termina en evidencia y traducción;
redacción y borrador pasan a HU-ED-08. Registro separado mediante
`ingestas.registrar`; reintento/cancelación solo propietario y administrador.
Diseños en `DISENO_SQL_0013_HU_ED_07.md` y `CONTRATOS_HU_ED_07.md`;
B0 parcial en `PREFLIGHT_HU_ED_07.md`. No hay implementación autorizada.

Como integrante interno autorizado, quiero registrar un TikTok público y
procesarlo de forma observable, para obtener evidencia y una transcripción sin
dejar trabajos bloqueados ni duplicados.

**Resultado esperado del MVP:** TikTok → transcripción → borrador revisable →
aprobación humana → publicación web.

**Tareas pendientes:**

- [ ] Confirmar en el entorno objetivo la aplicación de las migraciones
      `0010_editorial_ingestion_queue.sql` y `0011_tiktok_processing.sql`.
- [x] Confirmar la aplicación de `0012_corregir_estados_ingesta.sql`.
      Confirmación del propietario el 2026-09-09; verificar técnicamente antes
      del release.
- [ ] Crear un entorno Python propio y reproducible con dependencias versionadas.
- [ ] Sustituir el procesamiento HTTP síncrono por encolado con respuesta rápida.
- [ ] Ejecutar un trabajador local independiente con concurrencia máxima de uno.
- [ ] Separar estados queued/processing/evidence_ready/failed/cancelled de
      las etapas de extracción, transcripción y traducción.
- [ ] Incorporar identificador de intento, lease y heartbeat.
- [ ] Impedir que un intento vencido finalice el trabajo de otro intento.
- [ ] Añadir límites configurables de duración, tamaño, tiempo e intentos.
- [ ] Revalidar protocolo, host, redirecciones e IP antes de cada descarga.
- [ ] Validar mediante esquema la salida completa del trabajador Python.
- [ ] Eliminar archivos temporales incluso ante cancelación o fallo.
- [ ] Guardar errores por etapa sin exponer secretos.
- [ ] Mostrar progreso, fallo recuperable y próxima acción en el panel.
- [ ] Finalizar evidencia e intento atómicamente e idempotentemente, sin artículo.
- [ ] Probar un TikTok público corto de extremo a extremo.
- [ ] Probar timeout, URL inválida, video demasiado largo y reintento.
- [ ] Verificar que ningún error deje la ingesta indefinidamente en proceso.

**Riesgos de regresión:**

- Flujo editorial existente de creación, revisión y publicación.
- Capacidades `ingestas.ver` e `ingestas.gestionar`.
- RLS y auditoría editorial.
- Renovación de sesión SSR y cookies de Supabase.
- Creación manual de artículos.
- Ejecución simultánea de Nuxt, Whisper, pruebas y build con 8 GB de RAM.

### FE-ED-02 — Redacción asistida y verificable

#### HU-ED-08 — Generar un borrador editorial con DeepSeek

**Estado revisado:** ya existe redacción DeepSeek dentro del flujo editorial
activo. No iniciar una implementación paralela; confirmar los criterios de
calidad, trazabilidad y costo pendientes contra el proceso en producción.

Como responsable editorial, quiero convertir la transcripción y los metadatos
de una fuente en un borrador estructurado, para reducir el tiempo de redacción
sin perder trazabilidad ni control humano.

**Tareas previstas:**

- [ ] Definir la interfaz `proveedorRedaccion`.
- [ ] Implementar DeepSeek únicamente desde el servidor.
- [ ] Mantener la clave en variables de entorno y fuera de Git.
- [ ] Diseñar instrucciones editoriales versionadas.
- [ ] Exigir salida JSON y validarla con Zod.
- [ ] Generar título, resumen, cuerpo, propuesta SEO, categoría, subcategoría,
      fuente y créditos.
- [ ] Separar hechos respaldados, inferencias y elementos que requieren revisión.
- [ ] Evitar copiar literalmente la transcripción.
- [ ] Registrar proveedor, modelo, tokens, costo, duración y versión de reglas.
- [ ] Definir límite de costo mensual y bloqueo preventivo.
- [ ] Conservar la transcripción cuando falle la redacción.
- [ ] Permitir regeneración controlada sin duplicar el artículo.
- [ ] Crear artículo y vínculo de ingesta en transacción idempotente.
- [ ] Garantizar como máximo un artículo por ingesta con trazabilidad humana/técnica.
- [ ] Crear pruebas con proveedor simulado.
- [ ] Medir calidad y tiempo humano por borrador.

### FE-ED-03 — Revisión y publicación web

#### HU-ED-09 — Revisar y publicar un artículo proveniente de una ingesta

**Estado revisado:** el CMS ya ofrece revisión, aprobación y publicación. La
lista de abajo representa verificaciones operativas de extremo a extremo, no
funcionalidad ausente confirmada.

Como responsable superior, quiero revisar, corregir, aprobar o rechazar el
borrador generado, para publicar únicamente contenido confiable y optimizado.

**Tareas previstas:**

- [ ] Enlazar de forma visible fuente, transcripción, ingesta y artículo.
- [ ] Permitir edición antes de enviar a revisión.
- [ ] Permitir devolución con observaciones.
- [ ] Exigir capacidades superiores para aprobar o rechazar.
- [ ] Exigir MFA para publicar.
- [ ] Validar título, autor, fechas, fuente, créditos, imagen y taxonomía.
- [ ] Validar canonical, Open Graph, Twitter Cards y datos estructurados.
- [ ] Impedir publicación si faltan requisitos críticos.
- [ ] Registrar auditoría de revisión, aprobación y publicación.
- [ ] Verificar la URL pública y el estado publicado.
- [ ] Medir duración total y tiempo humano de revisión.

## Criterios de éxito del MVP

- Procesar tres TikToks de prueba consecutivos sin bloquear la cola.
- Obtener exactamente un borrador por cada ingesta exitosa.
- Recuperar un fallo sin crear contenido duplicado.
- Mantener trazabilidad desde la URL fuente hasta el artículo.
- Publicar únicamente después de revisión y MFA.
- Completar una revisión ordinaria en 10–20 minutos.
- Registrar costo de IA y mantenerlo dentro del presupuesto mensual.
- Pasar lint, typecheck, pruebas unitarias y build.
- No introducir regresiones conocidas en autenticación, RLS, editor o SEO.

# NEXT

## EP-OP-01 — Actualización segura de dependencias

### HU-OP-01 — Corregir vulnerabilidades sin romper el chequeo de tipos

**Prioridad propuesta:** P1 de seguridad. La auditoría del lockfile actual
reporta 15 vulnerabilidades (1 crítica, 8 altas y 6 moderadas); el chequeo de
producción (`npm audit --omit=dev`) reporta 13. Una actualización estándar
propuesta por NPM llegó a cero hallazgos, pero actualizó 120 dependencias y
`nuxt typecheck` falló con errores de inferencia en varias decenas de archivos.
No se retuvo esa actualización ni se debe desplegar sin resolverlos.

- [ ] Reproducir el fallo de tipos con el lockfile base y el lockfile actualizado
      para separar un defecto preexistente de una incompatibilidad introducida.
- [ ] Reducir la actualización a versiones directas/transitivas mínimas y
      compatibles; no usar `npm audit fix --force`.
- [ ] Mantener `npm ci`, lint, pruebas, typecheck y build reproducibles.
- [ ] Confirmar el riesgo real de Nuxt DevTools/RPC sólo en servidor de
      desarrollo y actualizar/desactivar DevTools donde aplique.
- [ ] Revisar el advisories report en CI y dejar el conteo documentado.

**Criterio de cierre:** lockfile limpio y reproducible, cero vulnerabilidades
explotables en producción o excepciones justificadas, y batería completa verde.

## EP-DA-01 — Datos deportivos y tablas de posiciones

### FE-DA-01 — Clasificación de fútbol

#### HU-DA-01 — Consultar y mostrar tablas de posiciones con fuente autorizada

**Prioridad propuesta:** P1 tras estabilidad operativa y cierre de licencias.
**Estado:** investigación comparativa completada el 2026-09-28; proveedor no
seleccionado por falta de confirmación escrita de derechos de publicación y
presupuesto.

- [ ] Solicitar y archivar confirmación escrita de licencia de publicación web,
      uso comercial, caché/retención, atribución, límites, SLA y derechos de
      escudos para Primera A y las competiciones objetivo.
- [ ] Verificar por temporada/endpoint que Liga BetPlay 2026 entregue tablas,
      etapas Apertura/Finalización, clasificación y promedio de descenso, sin
      asumir equivalencias entre “standings” simples y reglas DIMAYOR.
- [ ] Comparar con datos oficiales de DIMAYOR una muestra de jornadas, puntos,
      diferencia de gol, etapas y fechas de actualización antes de elegir.
- [ ] Diseñar contrato interno normalizado por competición/temporada/etapa/grupo
      y un adaptador servidor para el proveedor aprobado.
- [ ] Añadir caché servidor, atribución y fecha visible de actualización;
      degradar de forma honesta si el feed falla, sin datos quemados.
- [ ] Activar primero Liga BetPlay; añadir Premier League, LaLiga, Serie A,
      Bundesliga, Ligue 1 y Champions League cuando licencia, coste y coverage
      hayan sido confirmados.

**Criterio de cierre:** fuente/temporada actuales, datos contrastados con el
organizador, licencia archivada y pruebas de actualización/fallo. No publicar
escudos ni tablas del proveedor antes de resolver los derechos.

**Investigación:** `docs/INVESTIGACION_APIS_TABLAS_FUTBOL.md`.

## EP-SO-01 — Distribución social coordinada

### FE-SO-01 — Generación de piezas sociales estáticas

#### HU-SO-01 — Generar un paquete social desde un artículo

- [ ] Permitir elegir por ingesta cuándo generar las piezas.
- [ ] Generar diseños propios para Instagram, TikTok, Facebook y X.
- [ ] Soportar imagen única, carrusel y miniatura estática.
- [ ] Adaptar copy, hashtags, CTA, proporción y layout a cada red.
- [ ] Mantener una identidad Pont3la10 consistente.
- [ ] Admitir imágenes IA, bancos licenciados, cargas internas y recursos
      autorizados.
- [ ] Registrar origen, licencia, créditos y uso de IA.
- [ ] No descargar ni republicar automáticamente el video fuente.

### FE-SO-02 — Revisión social

#### HU-SO-02 — Aprobar piezas individualmente o en conjunto

- [ ] Editar cada red de manera independiente.
- [ ] Aprobar, rechazar o devolver una pieza.
- [ ] Aprobar en conjunto solo las piezas válidas.
- [ ] Excluir de la aprobación masiva piezas con errores.
- [ ] Mantener versión, estado, responsable y auditoría por pieza.

### FE-SO-03 — Programación y publicación

#### HU-SO-03 — Programar publicaciones mediante APIs oficiales

- [ ] Recomendar horarios según rendimiento histórico.
- [ ] Exigir confirmación humana de fecha y hora.
- [ ] Publicar mediante integraciones oficiales cuando sea posible.
- [ ] Procesar cada red de forma independiente.
- [ ] Continuar con otras redes si una publicación falla.
- [ ] Permitir corregir y reprogramar manualmente.
- [ ] No implementar reintentos automáticos en la primera versión.
- [ ] Registrar identificador remoto, estado, fecha, error y enlace publicado.

## EP-DI-01 — Descubrimiento editorial

### FE-DI-01 — Sugerencias automáticas de temas

#### HU-DI-01 — Recibir oportunidades editoriales priorizadas

- [ ] Combinar sugerencias automáticas con enlaces manuales.
- [ ] Usar credibilidad de la fuente como requisito.
- [ ] Priorizar demanda de búsqueda y oportunidad SEO.
- [ ] Considerar actualidad, viralidad y rendimiento histórico.
- [ ] Permitir aceptar, descartar o posponer una sugerencia.
- [ ] No convertir sugerencias automáticamente en publicaciones.

## EP-AN-01 — Métricas editoriales y comerciales

**Avance 2026-09-28 — base GA4 publicada:** el sitio público incorpora
medición opcional con consentimiento explícito, pageviews SPA y eventos
generales de lectura/búsqueda/filtros con minimización de datos. Esto no
completa HU-AN-01: el panel editorial de audiencia, atribución, redes,
monetización, costos y tiempo ahorrado continúa pendiente.

### FE-AN-01 — Panel de rendimiento

#### HU-AN-01 — Analizar audiencia, contenido, redes y monetización

- [ ] Mostrar tráfico y audiencia general.
- [ ] Comparar rendimiento por artículo, categoría, subcategoría y fuente.
- [ ] Comparar resultados por red social y formato.
- [ ] Relacionar publicaciones sociales con visitas al artículo.
- [ ] Mostrar capacidad publicitaria e ingresos.
- [ ] Medir costo y tiempo humano ahorrado por automatización.

# LATER

## EP-IN-01 — Nuevas fuentes de ingesta

- RSS y comunicados oficiales como segunda familia prioritaria por costo y
  estabilidad.
- Sitios web y medios confiables.
- Instagram, Facebook y X.
- Adaptadores independientes por fuente y términos de uso.

## EP-AU-01 — Audiencia registrada

### FE-AU-01 — Cuenta y preferencias

- Guardar artículos.
- Seguir categorías y subcategorías.
- Gestionar consentimiento y notificaciones del navegador.
- Mantener lectura pública sin login ni límite de artículos.

### FE-AU-02 — Notificaciones

- Notificar cada artículo publicado de los temas seguidos.
- Exigir consentimiento explícito.
- Permitir desactivar temas y notificaciones.

### FE-AU-03 — Boletín

- Suscripción por correo sin cuenta obligatoria.
- Consentimiento y baja verificable.
- Segmentación futura por categorías y subcategorías.

## EP-MO-01 — Monetización

- Anuncios programáticos.
- Acuerdos directos con marcas.
- Contenido patrocinado claramente identificado.
- Afiliados y comisiones.
- Separación inequívoca entre contenido editorial, patrocinado y afiliado.

# Decisiones pendientes

- Proveedor y estrategia de hosting público.
- Modelo exacto de DeepSeek tras pruebas de calidad y costo.
- Tamaño máximo operativo: propuesta pendiente de ensayo; duración fijada en 180 s.
- Plazo de retención de evidencia (se conserva; audio/video se elimina).
- Taxonomía inicial de categorías y subcategorías.
- Sistema visual definitivo para piezas sociales.
- Proveedores de imágenes y reglas de licenciamiento.
- APIs y requisitos de acceso para cada red social.
- Herramientas de analítica y atribución.
- Metas cuantitativas de audiencia después de obtener la línea base.

# Próxima acción recomendada

1. Resolver **HU-OP-01** con una actualización de dependencias que mantenga
   `npm ci`, tipos, pruebas y build verdes; no promover el intento que dejó
   errores de tipos.
2. Completar **HU-DA-01** sólo después de recibir confirmación escrita de
   licencias y validar Liga BetPlay 2026 contra DIMAYOR. La comparación está en
   `docs/INVESTIGACION_APIS_TABLAS_FUTBOL.md`.
3. En la siguiente corrida real de Codex, confirmar la etapa ImageGen → carga
   optimizada → fila `media_files` → asociación al artículo en `review`; no
   duplicar ni aprobar/publicar borradores durante la comprobación.
4. Mantener las integraciones sociales y proveedores pagos detrás de las
   condiciones de presupuesto, credenciales y derechos de uso correspondientes.
