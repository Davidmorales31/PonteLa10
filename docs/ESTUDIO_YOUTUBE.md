# Estudio de video ↔ YouTube

El estudio local (`npm run video:estudio`, http://localhost:4810) sube el video final a tu canal de YouTube y pone **la
miniatura y el título** que elijas. Código: `scripts/video-youtube.mjs`. A mano nunca publica el video: lo sube como **privado** o
**no listado** y la publicación la haces tú en YouTube Studio; cada acción pide tu confirmación. Solo el **piloto automático**
(autorizado el 2026-11-20, ver `docs/HORARIOS_PUBLICACION.md`) sube y programa la publicación (`publishAt`) sin confirmación.

## Qué hace y qué no
- Sí: conectar tu canal (OAuth en tu navegador), **subir `renders/final.mp4`** (subida reanudable, con progreso; privado
  por defecto), vincular un video ya subido por su enlace, subir la miniatura A/B/C elegida (`thumbnails.set`) y cambiar el
  título (`videos.update`, conservando descripción, etiquetas y categoría).
- No: publicar el video, programar su publicación ni crear la prueba A/B («Probar y comparar»): eso se hace en YouTube
  Studio con los 3 títulos y 3 miniaturas ya listos.

## Configuración (una sola vez, la haces tú)
Nada de esto se pega en el chat ni se guarda en el repositorio.

1. En https://console.cloud.google.com crea un proyecto (por ejemplo «Pont3la10 Estudio»).
2. **APIs y servicios → Biblioteca**: activa **YouTube Data API v3**.
3. **Pantalla de consentimiento de OAuth** (o «Google Auth Platform»): tipo **Externo**; nombre de la app, tu correo de
   soporte y de contacto. Añade tu cuenta como **usuario de prueba**.
4. Pasa la app a **«En producción»** (Publicar). Así no verás la advertencia de 7 días: con la app en «Pruebas», Google
   vence la conexión a la semana. Al autorizar verás «Google no ha verificado esta app»: es tu propia app; elige
   *Configuración avanzada → Ir a … (no seguro)*.
5. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación de escritorio**. Descarga el JSON.
6. Guárdalo como `%USERPROFILE%\.pont3la10\youtube\cliente.json` (no uses AppData: si el estudio se abre desde la app de Claude, Windows redirige esa carpeta y no vería el archivo)
   (o define `PONT3LA10_YOUTUBE_DIR` con otra carpeta; el estudio muestra la ruta si falta).
7. En el estudio: **Títulos y miniaturas → Conectar con YouTube**, autoriza en la pestaña de Google y vuelve.
   El token queda en `token.json` de esa misma carpeta y nunca llega a la página.

## Uso diario
1. Renderiza el video final en el estudio.
2. **Títulos y miniaturas → Subir video a YouTube** (privado por defecto). Se sube con el primer título y la descripción
   preparada; queda vinculado al proyecto solo.
3. **Poner en YouTube** en el título elegido y **Subir a YouTube** en la miniatura elegida (cada uno pide confirmación).
   Si ya subiste el video a mano, pega su enlace y pulsa **Vincular video**.
4. En YouTube Studio crea la prueba **Probar y comparar** con los títulos y miniaturas restantes y publícalo.

## Límites y cuota
- Cuota gratuita: 10.000 unidades al día (se renueva a medianoche, hora del Pacífico). Subir un video cuesta unas 1.600;
  una miniatura, unas 50; cambiar el título, unas 50; leer un video, 1. Alcanza para unos 5 videos al día.
- Probado el 2026-11-19 con un video de 3 segundos: se sube privado, se lee y se borra bien.
- Las miniaturas personalizadas exigen un **canal verificado** (verificación por teléfono en YouTube).
- **Riesgo por confirmar:** Google puede dejar **bloqueados como privados** los videos subidos por API desde un proyecto de
  Google Cloud sin auditar (YouTube lo avisa en Studio). Si al intentar publicar un video subido por el estudio YouTube
  Studio dice que está bloqueado, hay dos salidas: subir el video a mano (el estudio sigue poniendo título y miniatura) o
  pedir la auditoría de Google (formulario «YouTube API Services – Audit and Quota Extension»).
- Sin confirmar: si la API permite crear la prueba A/B (hoy no se usa).

## Seguridad
- Permiso pedido: `youtube.force-ssl` (necesario para `videos.update` y `thumbnails.set`).
- PKCE + `state` de un solo uso; el servidor solo escucha en `127.0.0.1` y rechaza orígenes ajenos.
- El estudio verifica que el video sea del canal conectado antes de tocarlo.
- «Desconectar» revoca el token en Google y borra `token.json`.
- La subida nunca usa «público»: el código solo acepta «private» y «unlisted».
