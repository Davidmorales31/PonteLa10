# Backlog de producto — Pont3la10

Última actualización: 2026-09-10

Este backlog consolida el Discovery aprobado para Pont3la10. Debe contrastarse
siempre con el código actual, las migraciones aplicadas y las HU específicas.
No autoriza publicación automática ni reemplaza los criterios de aceptación de
cada historia.

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
- El sitio permanecerá local durante desarrollo y se publicará posteriormente.
- DeepSeek será el proveedor principal de redacción, detrás de una interfaz
  intercambiable.
- La transcripción se realizará localmente con Whisper.
- No se reutilizarán videos ajenos como contenido propio.
- Ningún contenido generado se publica sin aprobación humana.
- Las acciones sensibles conservan MFA, capacidades y auditoría.

# NOW — MVP

## EP-ED-01 — Ingesta editorial asistida

### FE-ED-01 — Procesamiento fiable de TikTok

#### HU-ED-07 — Convertir un TikTok en una ingesta procesable

**Estado:** En desarrollo / experimental.

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
- [ ] Registrar etapas: `queued`, `extracting`, `transcribing`, `drafting`,
      `draft_created`, `failed`, `cancelled` y `requires_review`.
- [ ] Incorporar identificador de intento, lease y heartbeat.
- [ ] Impedir que un intento vencido finalice el trabajo de otro intento.
- [ ] Añadir límites configurables de duración, tamaño, tiempo e intentos.
- [ ] Revalidar protocolo, host, redirecciones e IP antes de cada descarga.
- [ ] Validar mediante esquema la salida completa del trabajador Python.
- [ ] Eliminar archivos temporales incluso ante cancelación o fallo.
- [ ] Guardar errores por etapa sin exponer secretos.
- [ ] Mostrar progreso, fallo recuperable y próxima acción en el panel.
- [ ] Crear el artículo y finalizar la ingesta de manera idempotente.
- [ ] Garantizar como máximo un artículo por ingesta.
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

**Estado:** Pendiente. Bloqueada por la estabilización de HU-ED-07.

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
- [ ] Crear pruebas con proveedor simulado.
- [ ] Medir calidad y tiempo humano por borrador.

### FE-ED-03 — Revisión y publicación web

#### HU-ED-09 — Revisar y publicar un artículo proveniente de una ingesta

**Estado:** Pendiente. Parte del flujo editorial base ya existe; falta validar la
integración completa.

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
- Límite máximo de duración y tamaño de TikTok.
- Política de conservación de transcripciones y evidencia.
- Taxonomía inicial de categorías y subcategorías.
- Sistema visual definitivo para piezas sociales.
- Proveedores de imágenes y reglas de licenciamiento.
- APIs y requisitos de acceso para cada red social.
- Herramientas de analítica y atribución.
- Metas cuantitativas de audiencia después de obtener la línea base.

# Próxima acción recomendada

Descomponer HU-ED-07 en un plan técnico verificable sobre el código actual,
confirmar su Definition of Ready y ejecutar una prueba instrumentada antes de
integrar DeepSeek.
