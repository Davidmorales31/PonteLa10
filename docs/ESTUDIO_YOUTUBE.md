# Estudio de video ↔ YouTube

El estudio local (`npm run video:estudio`, http://localhost:4810) puede poner **la miniatura y el título** que elijas en un
video que **ya subiste** a tu canal de YouTube. Código: `scripts/video-youtube.mjs`. No sube el video, no lo publica y no
cambia su privacidad; cada cambio pide tu confirmación en pantalla.

## Qué hace y qué no
- Sí: conectar tu canal (OAuth en tu navegador), vincular un video por su enlace, subir la miniatura A/B/C elegida
  (`thumbnails.set`) y cambiar el título (`videos.update`, conservando descripción, etiquetas y categoría).
- No: subir el archivo de video, programar su publicación ni crear la prueba A/B («Probar y comparar»): esa se hace en
  YouTube Studio con los 3 títulos y 3 miniaturas ya listos.

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
6. Guárdalo como `%LOCALAPPDATA%\Pont3la10\youtube\cliente.json`
   (o define `PONT3LA10_YOUTUBE_DIR` con otra carpeta; el estudio muestra la ruta si falta).
7. En el estudio: **Títulos y miniaturas → Conectar con YouTube**, autoriza en la pestaña de Google y vuelve.
   El token queda en `token.json` de esa misma carpeta y nunca llega a la página.

## Uso diario
1. Sube el video a YouTube como **privado** o **no listado** (a mano, desde YouTube Studio).
2. En el estudio → **Títulos y miniaturas** → pega el enlace del video y pulsa **Vincular video**.
3. **Poner en YouTube** en el título elegido y **Subir a YouTube** en la miniatura elegida (cada uno pide confirmación).
4. En YouTube Studio crea la prueba **Probar y comparar** con los títulos y miniaturas restantes y publica.

## Límites y cuota
- Cuota gratuita: 10.000 unidades al día (se renueva a medianoche, hora del Pacífico). Subir una miniatura cuesta unas 50;
  leer un video, 1; cambiar el título, unas 50. Sobra para el uso diario.
- Las miniaturas personalizadas exigen un **canal verificado** (verificación por teléfono en YouTube).
- Sin confirmar (probar con la cuenta real): si Google deja las subidas de video por API en privado hasta una auditoría
  (no aplica: el estudio no sube videos) y si la API permite crear la prueba A/B (hoy no se usa).

## Seguridad
- Permiso pedido: `youtube.force-ssl` (necesario para `videos.update` y `thumbnails.set`).
- PKCE + `state` de un solo uso; el servidor solo escucha en `127.0.0.1` y rechaza orígenes ajenos.
- El estudio verifica que el video sea del canal conectado antes de tocarlo.
- «Desconectar» revoca el token en Google y borra `token.json`.
