# HU Login De Usuarios

## Objetivo

Como usuario de Pont3la10, quiero iniciar sesion con correo o Google, para usar funciones personalizadas sin bloquear la navegacion publica del sitio.

## Alcance Implementado

- Login con correo y contrasena usando Supabase Auth.
- Registro de cuenta con confirmacion por correo.
- Recuperacion y cambio de contrasena.
- Inicio con Google OAuth.
- Cliente Supabase propio, opcional y seguro para no romper CI cuando falten variables.
- Guard de ruta para `/admin`.
- UI dividida: identidad Pont3la10 a la izquierda, formulario a la derecha.
- Validaciones unitarias con Zod.
- Mensajes de error controlados para evitar filtrar detalles tecnicos.

## Criterios De Aceptacion

- Si falta Supabase, el formulario informa que falta configuracion.
- Si las credenciales son invalidas, la UI muestra un mensaje claro.
- Si el correo no tiene formato valido, no se llama al proveedor.
- Si el usuario inicia sesion desde el acceso opcional, vuelve al sitio publico.
- Si el usuario no tiene sesion, `/admin` redirige a `/login?redirigir=/admin`.
- Si se solicita recuperacion, Supabase envia correo de cambio de contrasena.
- Si se usa Google, Supabase redirige al proveedor configurado.
- Las pruebas unitarias pasan en local y en CI.

## Configuracion Supabase En Produccion

- `Site URL`: `https://www.pont3la10.com`.
- Redirect URLs exactas permitidas:
  - `https://www.pont3la10.com/login`
  - `http://localhost:3001/login`
  - `http://127.0.0.1:3001/login`
- No se usan comodines de producción. El flujo de registro y recuperación envía
  su destino explícito a `/login` con parámetros de consulta, que no cambian la
  ruta permitida.
- Supabase estaba usando `http://localhost:3000/admin/login` como `Site URL` y
  no tenía Redirect URLs; por eso un enlace de confirmación/recuperación podía
  volver a localhost. La configuración fue corregida y verificada en el
  Dashboard el 2026-09-26.
- SMTP personalizado quedó activo en Supabase con Brevo. El remitente es
  `contact@pont3la10.com` y el nombre visible `Pont3la10`; no guardar la clave
  SMTP en el repositorio ni en memoria.
- Las plantillas `Confirm sign up` y `Reset password` se actualizaron en el
  Dashboard con los diseños de `supabase/templates/confirmar-correo.html` y
  `supabase/templates/restablecer-contrasena.html`. Ambas usan
  `{{ .ConfirmationURL }}`; la vista previa se verificó y se guardaron sin
  duplicar el contenido predeterminado.
- Falta una prueba de envío real iniciada por el responsable (registro o
  recuperación) para comprobar la entrega final en correo; no se disparó ningún
  mensaje de autenticación durante esta configuración.
- Configurar Google como proveedor OAuth únicamente cuando se vaya a habilitar
  ese método. Mantener RLS y roles como barrera real de datos internos.

## Nota De Seguridad

Crear una cuenta no debe dar permisos editoriales por si solo. El acceso a datos internos se controla despues con roles y politicas RLS.
