# HU Login De Usuarios

## Objetivo

Como usuario de Pont3la10, quiero iniciar sesion con correo, enlace temporal o Google, para usar funciones personalizadas sin bloquear la navegacion publica del sitio.

## Alcance Implementado

- Login con correo y contrasena usando Supabase Auth.
- Registro de cuenta con confirmacion por correo.
- Enlace magico por correo.
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

## Configuracion Supabase Pendiente En Dashboard

- Activar Email Auth si no esta activo.
- Configurar plantillas de correo con marca Pont3la10.
- Configurar Google como proveedor OAuth.
- Agregar redirect URLs:
  - `http://localhost:3001/login`
  - URL final de produccion cuando exista deploy.
- Mantener RLS y roles como barrera real de datos internos.

## Nota De Seguridad

Crear una cuenta no debe dar permisos editoriales por si solo. El acceso a datos internos se controla despues con roles y politicas RLS.
