# Generador manual de publicaciones para redes

## Encuadre, dirección visible y programación masiva (2026-11-13)

Vista rápida permite arrastrar la foto y ajustar zoom y posición con controles
accesibles por teclado. Los ajustes son independientes por formato/diapositiva.
**Guardar encuadre** utiliza el guardado editorial existente con revisión optimista;
un conflicto conserva los cambios locales y bloquea publicar hasta guardar. La
descarga puede exportar el encuadre actual sin guardarlo. El sitio aparece como
`www.pont3la10.com` abajo a la derecha, con fondo de contraste y sin tapar créditos.
El mismo compositor se utiliza en vista previa, descarga y envío, incluso en CTA.

Desde el listado: marcar hasta 50 noticias (también por páginas), o seleccionar
las pendientes de la página; elegir hora inicial de Colombia, intervalo 1–1440
minutos y Facebook/Instagram. Revisar orden/horarios y **Confirmar y programar
lote**. La confirmación autoriza esos envíos posteriores sin nuevos clics a cada
hora. No incluye X ni YouTube. Se puede consultar la cola y cancelar pendientes;
un envío que ya empezó no se presenta como cancelado.

`NUXT_SOCIAL_SCHEDULER_ENABLED=true` activa un plugin de Nitro para **Node
persistente** que comprueba la cola cada 15 segundos, con latido separado. No
requiere sesión de navegador abierta, pero sí proceso y servidor encendidos.
Actualmente funciona en el PC; todavía no permite apagarlo. Al migrar al VPS,
habilitar allí esta variable y mantener Node activo. No usar como sustituto de un
worker persistente en funciones efímeras. Si falta latido reciente, no acepta lotes.

Migración `20261113052608_cola_social_programada.sql`, aplicada aisladamente como
versión remota `20261113053754`. Tablas y RPCs exclusivas del servidor, RLS, auditoría,
aprobación con capacidad/MFA/origen, ID de operación e índice único de noticia
activa. El worker revalida permisos actuales, estado publicado, revisión, versión,
documento y bytes JPEG aprobados. Una composición predeterminada usa ID de
diapositiva estable por noticia para poder programar pendientes sin borrador.

La reserva usa SKIP LOCKED y UUID de intento; no retoma envíos interrumpidos.
Más de 15 minutos procesando queda incierto, sin reenvío automático. El siguiente
artículo espera el intervalo desde el inicio real del anterior, además de su hora
prevista: no publica todos los atrasados de golpe al volver el servidor. Atrasos
de más de 24 horas se detienen y requieren nueva programación. Los recibos Meta
existentes evitan duplicar una red ya publicada cuando se reprograma un lote parcial.

## Facebook e Instagram desde Vista rápida

Seleccionar ambos destinos o uno, revisar los textos por red y confirmar el envío.
Cada destino devuelve su resultado; reintentar Instagram no vuelve a enviar Facebook.
Se comparte la composición completa guardada o predeterminada. Instagram publica
en el feed y rechaza formatos fuera de la proporción 0,8–1,91 sin alterar la imagen.

Variables privadas: `NUXT_META_ACCESS_TOKEN` (Instagram),
`NUXT_META_INSTAGRAM_ACCOUNT_ID`, `NUXT_META_FACEBOOK_PAGE_ACCESS_TOKEN` y
`NUXT_META_FACEBOOK_PAGE_ID`. Permanecen en el entorno raíz ignorado; nunca se
devuelven al navegador. Cuando Meta invalide un token debe renovarse en el servidor;
no se implementó renovación automática ni alta OAuth de otras cuentas.

`GET /api/admin/redes/oauth/meta` verifica identidades. La ruta privada
`POST /api/admin/redes/:id/publicar-meta` exige capacidad, MFA según política,
JSON/origen exacto, confirmación, revisión de composición y versión del artículo.
Solo comparte artículos publicados. No recibe URLs, tokens ni texto arbitrario.

Migración local `20261113045958_publicaciones_meta_seguras.sql`, aplicada sola como
versión remota `20261113051005`: registro service-only con RLS y RPCs CAS por intento.
Huella por artículo/destino/cuenta/texto/imagen; tres preparaciones fallidas como
máximo. Fallos tras el envío final y reservas interrumpidas de más de diez minutos
quedan inciertos y bloquean reenvíos. La reconciliación requiere revisar Meta y
un procedimiento administrativo; no hay recuperación automática de inciertos.

Facebook sube fotos sin publicar y después crea el feed. Se conservan sus IDs por
intento; las fotos huérfanas de fallos requieren limpieza manual. No se eliminan
fotos tras un envío incierto. Instagram recibe JPEG por URL firmada de una hora
desde el bucket privado `social-meta-private`, procesa contenedores y publica.
Si no se obtiene el permalink, se identifica el enlace alternativo como perfil.
La limpieza comprueba errores de Storage y recupera hasta diez recibos con archivos
de más de 24 horas en envíos posteriores, incluyendo referencias de intentos previos.
Si no hay nuevos envíos, esa recuperación queda pendiente; no se añadió un worker.

Se probaron publicaciones con proveedores simulados. Sí se comprobaron realmente
identidades, subida, lectura firmada, bloqueo público y borrado del bucket. La
primera publicación pública debe confirmarla el responsable desde Vista rápida.

Fuentes: [Instagram API de Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api),
[feed de páginas](https://developers.facebook.com/docs/graph-api/reference/page/feed/),
[buckets Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## Conexión oficial de X (2026-11-12)

Implementado el botón Conectar X y OAuth 2.0 confidencial con PKCE S256. Callback
registrado por Juan: `http://localhost:3001/api/admin/redes/oauth/x/callback`.
Iniciar desde **localhost**, no 127.0.0.1, porque el origen debe coincidir exactamente.
El registro de la app X se completó manualmente; Meta sigue pendiente de SMS.

- Inicio: `POST /api/admin/redes/oauth/x/conectar`. Callback: GET en la ruta anterior.
  Ambos revalidan `configuracion.gestionar` y MFA aal2 antes de usar el cliente privado.
  Inicio exige JSON y Origin del panel. El callback exige sesión editorial existente.
- State y nonce aleatorios, cookie HttpOnly/SameSite Lax de diez minutos, HTTPS salvo
  loopback explícito; cookie, actor y state vinculados a reserva persistida. Consumo
  atómico único antes de llamar X, sin reintentos de canje, y límite de cinco intentos
  por actor en diez minutos. Cancelación/fallo/replay no guardan conexiones nuevas.
- Solo acepta el perfil `Pont3la10` verificado por `GET /2/users/me`. Solicita
  `tweet.read users.read tweet.write media.write offline.access`, sin email, DMs,
  likes o follows. Endpoints fijos; no redirecciones de transporte ni cuerpos de
  error del proveedor en las respuestas o logs. El callback vuelve a URL limpia.
- Tokens y verificadores cifrados AES-256-GCM con propósito autenticado y clave
  privada independiente. No se devuelven tokens en JSON, HTML, cookies o Storage del
  navegador. Solo se devuelve estado de configuración, usuario y caducidad.
- Dos tablas RLS sin acceso a anon/authenticated. Tres RPC security invoker solo
  para servicio, después de autorización en servidor; auditoría sin secretos en
  inicio y guardado. Actor/nonce/estado no se aceptan desde el body del navegador.
- La migración local `20261112131534_conexion_oauth_x_servidor.sql` se aplicó sola
  al proyecto Pont3la10 con versión remota `20261112183112`. Se verificaron RLS,
  ausencia de grants de usuarios y acceso exclusivo de servicio. Cero conexiones
  o intentos reales al corte. No se aplicó `social_compositions` ni otras migraciones.
- Configuración privada: `NUXT_X_CLIENT_ID`, `NUXT_X_CLIENT_SECRET`,
  `NUXT_X_REDIRECT_URI`, `NUXT_SOCIAL_ENCRYPTION_KEY` y la clave privada Supabase
  existente `NUXT_SUPABASE_SERVICE_ROLE_KEY` (acepta secret key nueva `sb_secret_...`).
  No usar prefijo PUBLIC ni pegar valores en chats. Mantener la clave de cifrado
  para recuperación; cambiarla sin recifrar inutiliza las conexiones almacenadas.

### Configuración local por el responsable

En la terminal PowerShell del proyecto principal:

```powershell
& ".\.codex\worktrees\redes-sociales\scripts\configurar-oauth-x.ps1"
```

Pide Client ID y Client Secret de **OAuth 2.0** de X (no Consumer Key ni token de
cuenta personal). El secreto se introduce oculto. Si falta clave privada Supabase,
solicita también esa clave con entrada oculta: obtenerla del proyecto Pont3la10,
Settings > API Keys, sección Secret keys; no usar la publicable ni compartirla.
No compra créditos ni genera claves externas. Conserva el cifrado existente,
rechaza formatos ambiguos/duplicados y genera 32 bytes aleatorios solo si falta.
Guarda únicamente en el entorno local principal de forma atómica, sin imprimirlo.

Después hay que reiniciar el servidor local para cargar las variables y abrir
`http://localhost:3001/admin/redes/cuentas`. Iniciar sesión editorial/MFA y Conectar
X. Autorizar **@Pont3la10** en el proveedor. La pantalla comprueba el estado del
servidor; `resultadoX=conectada` por sí solo no demuestra conexión.

Estado conectado significa autorización guardada, no permiso de facturación ni
envío probado. Se informa la caducidad; renovación automática y publicación
idempotente por destino siguen pendientes. No se afirma que este incremento
publique desde la vista rápida. Los tokens de renovación se conservan cifrados
para ese incremento. No hay publicación ni llamadas pagadas de prueba en desarrollo.

Fuentes: [OAuth confidencial y PKCE de X](https://docs.x.com/fundamentals/authentication/oauth-2-0/user-access-token),
[scopes de X](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code),
[RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security),
[claves de servidor](https://supabase.com/docs/guides/getting-started/api-keys).

## Vista rápida y cuentas objetivo (2026-11-12)

- `/admin/redes` incorpora Vista rápida por noticia: modal con el mismo compositor
  y formato del editor, documento guardado o configuración inicial 60/90, texto
  por destino y navegación de carrusel. No guarda, genera con IA ni publica al abrir.
- El lienzo tiene modo de consulta: no arrastra el encuadre ni anuncia controles
  de edición. Escape/cierre devuelve el foco al botón; la carga se cancela al salir,
  el fondo no se desplaza y los fallos permiten reintentar. Se puede descargar la
  lámina visible usando la exportación existente y sus permisos/MFA.
- `/admin/redes/cuentas` registra destinos públicos pedidos por Juan:
  Instagram `@pont3ladiez`, Facebook mediante el enlace compartido proporcionado
  (página canónica y permisos aún por verificar), X `@Pont3la10` y YouTube
  `@somosnoobs`. Se eliminaron parámetros de seguimiento de IG/YouTube.
- Las tres cuentas publicables por API figuran **sin autorización**, no conectadas.
  Esta pantalla es un inventario y guía de registro; no implementa OAuth ni envíos.
  Juan indicó empezar a registrar las aplicaciones de Meta y X. No había nombres
  de variables de credenciales sociales en los entornos inspeccionados; no se
  imprimieron valores ni se copiaron secretos.
- La referencia oficial de YouTube consultada no lista un recurso para crear posts
  de Comunidad con imágenes. Se ofrece preparación/exportación y publicación manual;
  no convertir una imagen en video o Short sin un pedido específico.
- El acceso automatizado al navegador reporta `browser access host is unavailable`.
  No se repitió el intento de controlar Edge mediante la alternativa que ya falló
  por no identificar su URL. Se pidió al responsable abrir la consola Meta e indicar
  su pantalla para continuar el registro, sin compartir contraseñas ni códigos.
- **Pendiente para cumplir el objetivo completo:** registro y consentimiento de apps,
  conexión OAuth segura, persistencia cifrada de credenciales solo de servidor,
  revisión de permisos/MFA/RLS, envío idempotente con recibos independientes por
  destino y conciliación de resultados parciales. No habilitar un botón de envío
  ficticio ni registrar un perfil público como cuenta conectada.

Fuentes oficiales consultadas: [X, creación de posts](https://docs.x.com/x-api/posts/create-post)
y [YouTube, referencia API](https://developers.google.com/youtube/data/reference/rest).
Meta no permitió recuperar su documentación en esta sesión (429/inaccesible);
verificar permisos y versión oficial antes de implementar su adaptador.

## Ajuste solicitado del cierre y los valores iniciales (2026-11-10)

- Los encuadres nuevos empiezan con tamaño de texto 60 y sombreado 90 en los cinco
  formatos. Los ajustes guardados no se sobrescriben.
- La nueva opción predeterminada de CTA es una imagen promocional generada una
  sola vez con ImageGen a partir de la referencia del responsable:
  `public/brand/cta-pont3la10-generada-v2.png`. El servidor empaqueta la misma
  imagen para exportar; abrir el editor no genera imágenes ni consume IA.
- El texto de esa imagen es fijo y muestra `pont3la10.com`. Se oculta su editor
  de titular para no aparentar cambios que el bitmap no puede aplicar. Los tres
  diseños editables anteriores siguen disponibles en el selector.
- La imagen se adapta con `contain`, sin deformar ni cortar logo, texto o dominio.
  Es una promoción de marca, no una portada ni una fotografía documental.
- `NUXT_PUBLIC_SOCIAL_SITE_URL` separa el dominio público de las piezas/enlaces
  del origen localhost del panel. La configuración predeterminada de Pont3la10
  usa `https://www.pont3la10.com` cuando el panel se ejecuta en loopback. Las CTA
  editables y los enlaces usan esa configuración; el dominio del bitmap forma
  parte del propio archivo.

El responsable pidió sustituir el primer diseño por una composición más
elaborada. La v2 incorpora estadio nocturno ficticio, iluminación de reflectores,
texturas deportivas y tipografía condensada en cursiva. Es una promoción creada
con IA, no una fotografía de un evento real. La v1 se conserva como versión anterior.

## Alcance entregado en código

Rama `feat/generador-publicaciones-redes`, creada desde `origin/main` en
`f3593fc`. Worktree `C:\PONTE LA 10\.codex\worktrees\redes-sociales`.
El directorio principal conservaba 49 archivos modificados y otros nuevos;
no se trasladaron, revirtieron, commitearon ni mezclaron esos cambios.

`/admin/redes` lista noticias publicadas con portada, categoría y estado de
preparación. La búsqueda y paginación se ejecutan en servidor; el filtro de
estado indica expresamente que afecta a la página actual.
`/admin/redes/:id` recupera la fotografía y el texto social de la noticia,
permite imagen única o carrusel, composición por formato, guardado en CMS,
recomendaciones DeepSeek bajo solicitud, copia de texto y exportación PNG.

Este incremento es el módulo **manual de preparación y exportación**.
No incluye OAuth, envío a Facebook/Instagram/X, programación social, métricas
remotas ni conexión directa con WhatsApp Channels. La pantalla lo declara y
no contiene botones que simulen esas operaciones. No cambia la tarea editorial,
su prompt, las rutas Codex, Cron ni los permisos de publicación web.

## Referencias y decisiones visuales

Se leyeron el prompt adjunto y
`pont3la10_generador_plantillas_redes_v2_logo_real.html`; se inspeccionó
`Panel SaaS deportivo Pont3la10 (1).png`. Los originales permanecen intactos.
La referencia aprobada se adaptó al layout Nuxt existente, sin una aplicación
paralela ni navegación ficticia. Se conservan tres zonas: inspector azul,
lienzo, asistencia/descripcion/exportación. En móvil se apilan; entre 768 y
1300 px la asistencia pasa debajo. Se mantienen los tokens del sitio.

La pieza usa foto cover, degradado inferior, logo encima del titular, texto
blanco y resaltados amarillos, líneas de marca y diagonales discretas. El logo
es el PNG oficial limpio ya usado por el panel (`pont3la10_logo_login_blanco.png`);
el archivo llamado `logo_real_blanco_transparente` tiene una franja blanca
incrustada y no se utiliza. No se recreó el logo con IA.

Se añadió Montserrat Bold (SIL OFL, licencia junto a la fuente). OpenType convierte
el texto en trazados SVG con medidas de la fuente real. El mismo compositor
genera la vista previa y la entrada de Sharp, evitando fuentes del sistema o
una pestaña abierta para exportar. No corta titulares: ajusta hasta cuatro
líneas y rechaza desbordamientos. Ofrece 1080×1080, 1080×1350, 1080×1920,
1200×628 y 1280×720. Una historia estática no se etiqueta como Reel.

Cada diapositiva conserva medio, texto y encuadres independientes por formato.
El cierre CTA tiene tres variantes distintas, buscador genérico y dominio de
`runtimeConfig.public.siteUrl`. Se añade al convertir a carrusel y puede
eliminarse. Añadirlo a una imagen única cambia explícitamente a carrusel.

Desviaciones intencionales del mockup: layout editorial actual, acciones de
exportación en lugar de publicación no conectada, ganchos respaldados por hechos
en lugar de mensajes vacíos, buscador sin marca Google, ausencia de analíticas
o cuentas ficticias. No se afirma equivalencia píxel a píxel con la captura.

## Investigación editorial: tráfico propio

Consultada el 10 de noviembre de 2026. Estas son reglas de trabajo e hipótesis
para medir, no garantías de CTR ni observaciones inventadas de competidores.

| Referencia | Evidencia disponible | Decisión aplicada |
| --- | --- | --- |
| Instagram `ingenia.ai` | Perfil y permalinks bloqueados. Se localizaron reproducciones de captions en un tercero sin poder verificar los originales; se excluyen como evidencia editorial. | No afirmar diseño, frecuencia, rendimiento ni patrones propios de la cuenta. |
| Facebook `elfutbolerointernacional` | Perfil bloqueado; no hubo publicaciones concretas verificables de la cuenta exacta. | Análisis visual/comparativo pendiente de acceso o capturas. |
| Mockup Pont3la10 | Imagen adjunta inspeccionada. | Tres zonas, foco en fotografía, titular destacado, control de carrusel. |
| HTML Pont3la10 | Código leído. | Adaptar composición; corregir truncamiento, encuadre, fuente y dependencias del navegador. |

1. Presentar protagonista, hecho y consecuencia antes de pedir la visita.
   La explicación histórica de Meta identifica como clickbait ocultar la
   información necesaria para decidir si vale la pena abrir el enlace:
   [Meta, clickbait](https://about.fb.com/news/2014/08/news-feed-fyi-click-baiting/).
2. Añadir una razón concreta que el artículo sí resuelva: consecuencias,
   contexto, cronología o declaraciones existentes. Evitar "nadie está viendo
   esto" o urgencia inventada. Las citas de sustento deben aparecer literalmente
   en el artículo; esa comprobación no sustituye la revisión humana de todas
   las afirmaciones generadas.
3. Mantener relación entre foto, texto y noticia. Meta anunció en 2025 medidas
   contra descripciones distractoras, hashtags excesivos y captions ajenos a
   la imagen: [Meta, contenido spam](https://about.fb.com/news/2025/04/cracking-down-spammy-content-facebook/).
4. Hacer preguntas editoriales concretas, sin "comenta SÍ", etiquetas forzadas
   o reacciones como truco: [Meta, engagement bait](https://about.fb.com/news/2017/12/news-feed-fyi-fighting-engagement-bait-on-facebook/).
5. Facebook, X y exportación WhatsApp usan la URL real con UTM. Instagram no
   promete un enlace de biografía que no esté configurado ni un clic en captions.
   El editor permite copiar el enlace por separado. Los límites deben modelarse
   por cuenta y endpoint; X documenta hasta cuatro imágenes:
   [X, publicación](https://docs.x.com/x-api/posts/create-post).
6. Carrusel: hecho → contexto → consecuencia → cierre, sin rellenar diapositivas.
   Reutilizar la foto de la noticia está permitido como decisión editorial
   visible; no inventar una galería ni buscar imágenes nuevas automáticamente.
7. Medir alcance, clics de plataforma, sesiones web y lectores que regresan por
   separado. UTM identifica red, noticia y variante; no es un recolector de
   analítica ni demuestra clics por sí solo:
   [Google Analytics](https://support.google.com/analytics/answer/10917952?hl=en).
   El contexto de consumo social y relaciones directas con lectores se contrastó
   con [Reuters Institute 2026](https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary).

La generación ofrece cinco enfoques con titular, gancho, contexto, razón de
visita y citas de sustento. El tono es seleccionable y todo es editable.
No publica automáticamente ni garantiza crecimiento de tráfico.

## Integración técnica y permisos

- Se reutilizan noticias, `social_brief`, biblioteca/Storage, autenticación,
  capacidades editoriales, MFA, layout, configuración de dominio y proveedor IA.
- `social_compositions` guarda el documento editable, un registro por noticia,
  estado draft/ready y revisión optimista. `social_publications` se conserva
  para las futuras entregas por destino: no se usa como una composición maestra
  de red y formato arbitrarios.
- `social_copy_requests` reserva cada generación pagada. Misma operación y revisión
  recupera el resultado; una operación pendiente/incierta impide otra llamada
  de esa noticia. Máximo diez reservas por noticia cada 24 horas, con bloqueo
  transaccional. No hay reintentos del proveedor. Abrir el editor recupera la
  última propuesta completa de la misma revisión si el borrador no tiene una.
- Lectura: `contenido.verBorradores`. Escritura, IA y exportación:
  `contenido.editarTodos` y MFA según política central. RLS reproduce esas reglas.
  Los autores con edición propia conservan vista de consulta; no se amplían roles.
- El cliente de sesión autoriza las lecturas y el guardado; no hay service_role.
  Las escrituras exigen JSON y rechazan Origin cruzado. Los medios llegan por ID,
  se descargan desde `editorial-media` y se decodifican con límites de bytes/píxeles.
  No se aceptan URLs externas de imágenes para renderizar.
- Insertar/actualizar composición usa la auditoría existente. La revisión se
  incrementa en DB y rechaza reasignar artículo/ID. Conflictos devuelven 409.
- Guardado manual en CMS más recuperación en sessionStorage por usuario/noticia,
  validación de revisión y aviso de salida. No es autoguardado remoto continuo.
- `ready` valida todas las diapositivas del formato seleccionado y descripción
  del destino. No demuestra aprobación factual, derechos de foto o publicación.

## Instalación y conciliación operativa

La migración se generó con Supabase CLI. No se aplicó a una base remota:
`supabase/migrations/20261110113715_generador_publicaciones_sociales.sql`.
Debe aplicarse mediante el procedimiento habitual de despliegue después de la
revisión y aprobación correspondiente. Sin ella el editor informa la falta de
persistencia; no aparenta haber guardado. IA y exportación siguen mostrando
errores explícitos cuando falta configuración o el medio.

Una reserva `pending`/`uncertain` no se libera por tiempo: un timeout puede haber
consumido el servicio. Procedimiento del operador autorizado:

1. Consultar `social_copy_requests` por artículo e identidad; verificar estado,
   revisión fuente y hora. No crear otra identidad para eludir el bloqueo.
2. Conciliar con el resultado/registro del proveedor. Si existe respuesta válida,
   guardar `result = { propuestas: [...] }` y `state = 'completed'` para la misma
   identidad; abrir el editor recupera las propuestas de esa revisión.
3. Si no puede recuperarse, informar incertidumbre/costo al responsable. Solo
   tras su autorización explícita de un nuevo cargo, marcar la identidad anterior
   `cancelled` mediante la herramienta administrativa autenticada. Conservar la fila;
   no borrarla ni modificar su revisión. Recargar el editor antes de solicitar otra.
4. No se ejecutaron estas mutaciones ni llamadas pagadas durante el desarrollo.

La exportación para WhatsApp Channels está disponible. No se verificó un endpoint
oficial de publicación en Canales y no se confunde con WhatsApp Business Messaging:
[WhatsApp, Canales](https://blog.whatsapp.com/introducing-whatsapp-channels-a-private-way-to-follow-what-matters).

## Segunda fase pendiente de aprobación

La tarea editorial podrá aportar enfoque/textos al documento social usando la
imagen ya ligada a la noticia. Una pieza única no necesita otra foto. Un carrusel
necesita contenido y configuración por lámina, con fotos existentes pertinentes
o reutilización explícita; su preparación debe ejecutarse en la tarea y quedar
persistida, sin cobrar ni generar al abrir la pantalla y sin sobrescribir ediciones.

Las conexiones oficiales, sus credenciales, trabajos durables por destino,
publicación humana confirmada y programación social requieren otro incremento
completo y verificable. No existe aún envío real desde este módulo.

## Validación

Aplicar únicamente [la matriz oficial](agents/VALIDACIONES.md). Resultados finales,
límites y evidencias en el [handoff](agents/handoffs/2026-11-10-generador-publicaciones-sociales.md).
