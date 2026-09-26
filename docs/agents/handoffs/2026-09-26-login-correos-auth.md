# Handoff — login y correos de autenticación

- **Objetivo de la sesión:** corregir enlaces Auth a localhost y preparar identidad visual/remitente Pont3la10.
- **Completado:** Supabase `pont3la10` usa `https://www.pont3la10.com` como Site URL. Redirect URLs exactas guardadas: producción `/login`, `http://localhost:3001/login` y `http://127.0.0.1:3001/login`.
- **Archivos modificados:** `supabase/templates/confirmar-correo.html`, `supabase/templates/restablecer-contrasena.html`, `docs/HU_LOGIN_EDITORIAL.md`, `docs/agents/ESTADO_ACTUAL.md`.
- **Decisiones:** sin comodines de producción; ambos correos usan `{{ .ConfirmationURL }}` para no construir enlaces de verificación inseguros. No se guardaron credenciales SMTP.
- **Validaciones ejecutadas:** Dashboard confirmó Site URL y tres Redirect URLs; Supabase mostró `Successfully updated site URL` y `Successfully added 3 URLs`. `npm.cmd run lint -- --no-warn-ignored` y `git diff --check` pasaron.
- **Fallos:** ninguno durante la configuración. No se envió un correo real.
- **Pendientes:** el responsable debe iniciar voluntariamente un registro o recuperación desde `https://www.pont3la10.com/login` y verificar que el mensaje llega con `contact@pont3la10.com`, sin localhost y con la plantilla de marca. No enviar enlaces de autenticación por cuenta del usuario.
- **Siguiente acción exacta:** prueba manual en producción de recuperación de contraseña; revisar remitente, diseño y destino del enlace. No se necesita compartir credenciales.
- **Commit base:** `21483de` (`codex/ui-ux-publico`)
- **Commit final:** sin commit
