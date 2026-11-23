# Plan: el estudio de video en el iPhone

Diagnóstico y plan del 2026-11-22. Todavía no se implementó nada.

## Diagnóstico del estudio actual

| Tema | Hoy | Consecuencia para el iPhone |
| --- | --- | --- |
| Servidor | `scripts/video-estudio.mjs` (846 líneas), Node, escucha solo en `127.0.0.1:4810`. | El teléfono no lo alcanza. |
| Seguridad | Sin usuario ni clave. `peticionPermitida` solo acepta el host `localhost`/`127.0.0.1` y el mismo origen. | Abrirlo a la red sin más sería peligroso: quien llegue puede programar y publicar con las llaves del `.env`. |
| Interfaz | `estudio.html` (1674 líneas), con `viewport` y reglas hasta 760 px, pero hecha para escritorio (prompter, columnas, arrastrar y soltar). | Hay que rehacer la experiencia táctil. |
| Voz | `getUserMedia` + `MediaRecorder`. | Safari en iPhone **solo da micrófono en HTTPS**; `http://IP:4810` no sirve. Safari graba MP4/AAC. |
| Archivos | Subida de fotos por `<input type=file>`; video con `Range` (206) ya soportado. | Funciona en iOS; falta HEIC, trozos y reanudación. |
| Render | `npx hyperframes render` + `ffmpeg` en el PC. | Debe seguir en el PC; el iPhone solo manda y recibe. |
| Secretos y piloto | Tokens de YouTube, Facebook y llave de redes viven en el PC; el piloto automático corre dentro del proceso del estudio. | El PC debe estar encendido y el estudio abierto. |

## Decisión de arquitectura

**El estudio sigue en el PC y el iPhone es un control remoto con micrófono.**
Mover el render a la nube cuesta mucho (Chromium, ffmpeg, GBs de medios) y sacaría los secretos del PC. El iPhone graba la voz, sube fotos, mira los resultados y aprueba o cancela.

## Fases

1. **Acceso seguro.**
   - **Red:** Tailscale en el PC y en el iPhone, más `tailscale serve` para tener HTTPS con certificado válido (necesario para el micrófono). El servidor sigue en loopback.
   - **Servidor:** permitir el host `*.ts.net` (variable de entorno), validar origen, agregar clave propia (PIN de dispositivo + cookie de sesión), límite de intentos y registro de auditoría.
   - **Cuenta:** acciones sensibles (programar, subir a YouTube/Facebook) con confirmación. La cuenta de Tailscale con 2FA cumple el criterio de MFA de `AGENTS.md`.
2. **PC disponible.** No suspender (`powercfg`), arranque automático del estudio con Programador de tareas, reinicio si se cae, indicador «PC en línea» y aviso si no responde.
3. **Interfaz móvil.** Una columna, botones táctiles grandes, prompter a pantalla completa, grabación con `WakeLock`, manejo de interrupciones (llamadas, bloqueo), subida por trozos con reintento, fotos desde cámara o galería (HEIC a JPEG en el servidor), PWA para instalarlo en la pantalla de inicio.
4. **Revisión y publicación desde el teléfono.** Ver el video y los Reels renderizados, programar y cancelar, ver el estado del piloto automático.
5. **Avisos.** Notificación al iPhone cuando termina un render, falla algo o falta grabar una toma (ntfy o push de la PWA).
6. **Pruebas.** Playwright con emulación de iPhone, pruebas de seguridad (host, origen, fuerza bruta) y una prueba real en el dispositivo de punta a punta.

## Fase 1 hecha (2026-11-22): acceso seguro

Código: `scripts/video-estudio-acceso.mjs`, integración en `scripts/video-estudio.mjs`, comando `npm run video:estudio:clave`,
pruebas en `tests/unit/videoEstudioAcceso.test.ts`.

- En el PC nada cambia: `http://localhost:4810` sin clave, como siempre. El servidor sigue escuchando solo en `127.0.0.1`.
- **Toda petición con cabeceras de proxy** (`X-Forwarded-*`, `Tailscale-User-*`…) se trata como remota aunque el proxy reescriba el Host a
  127.0.0.1: así nadie que llegue por el túnel entra como si estuviera frente al PC.
- **Hosts permitidos.** Solo se aceptan los hosts remotos configurados (en `acceso.json` o en `VIDEO_ESTUDIO_HOSTS_REMOTOS`). Las escrituras exigen Origin `https://` de ese host.
- **Clave y sesión.** La clave se guarda con scrypt en `~/.pont3la10/estudio/acceso.json`, fuera del repo. La sesión es una cookie
  `HttpOnly; Secure; SameSite=Strict` firmada con HMAC, de 30 días. Cambiar la clave cierra todas las sesiones.
- **Límite de intentos.** Tras 5 claves malas se bloquea 15 minutos.
- **Auditoría.** Ingresos, fallos, bloqueos y cada acción que cambia algo quedan en `~/.pont3la10/estudio/auditoria.log`, sin claves ni cookies.
- **Restricciones remotas.** Conectar YouTube (OAuth) solo se puede desde el PC.
- **Opcional:** `VIDEO_ESTUDIO_USUARIOS_TS=tu@correo` limita la entrada a ese usuario de Tailscale.

### Cómo activarlo (lo hace el responsable)

1. **PC:** instala Tailscale (<https://tailscale.com/download/windows>) e inicia sesión con una cuenta que tenga verificación en dos pasos.
2. **iPhone:** instala Tailscale desde la App Store con la misma cuenta y actívalo.
3. **Consola de Tailscale:** en <https://login.tailscale.com/admin/dns>, activa **MagicDNS** y **HTTPS Certificates**.
4. **Publicar el estudio en tu red privada:** en PowerShell, en el PC, corre `tailscale serve --bg 4810`. Te muestra una dirección
   `https://<nombre-del-pc>.<tu-red>.ts.net`. No usar `tailscale funnel`: eso lo abriría a internet.
5. **Crear la clave del estudio:** en el PC, `npm run video:estudio:clave -- --host <nombre-del-pc>.<tu-red>.ts.net`.
6. **Probar:** reinicia el estudio, abre esa dirección en Safari del iPhone y entra con la clave.

## Riesgos y preguntas abiertas

- ¿El PC puede quedar siempre encendido y con internet estable? Si no, hay que agregar Wake-on-LAN o un servicio que despierte el PC.
- ¿Qué versión de iOS? Define qué formato de audio y qué APIs (`WakeLock`, push de PWA) se pueden usar.
- El micrófono de iOS se interrumpe al bloquear la pantalla: la grabación debe ser corta por toma y reanudable.
- Alternativa a Tailscale: Cloudflare Tunnel con Cloudflare Access sobre `pont3la10.com`. Es más expuesto y tiene más piezas; solo si necesitas abrirlo desde equipos sin Tailscale.

## Modelo recomendado

- **Fable 5.2 o Opus 5.5** para las fases 1 y 2 (modelo de amenazas, autenticación, revisión de seguridad), porque ahí un error expone las llaves de publicación.
- **Sonnet 5.5** para las fases 3 a 6 (interfaz móvil, subida por trozos, PWA, pruebas); es el mejor equilibrio entre costo y calidad en trabajo largo de código.
- **Haiku 5.5** solo para tareas pequeñas (textos, revisiones simples).
