# HU Login Editorial

## Objetivo

Como integrante autorizado del equipo Pont3la10, quiero entrar al panel interno con correo, contrasena, enlace por correo o Google, para gestionar contenido editorial sin exponer herramientas privadas al publico.

## Alcance Implementado

- Login con correo y contrasena usando Supabase Auth.
- Registro de acceso editorial con confirmacion por correo.
- Enlace magico por correo.
- Recuperacion y cambio de contrasena.
- Inicio con Google OAuth.
- Cliente Supabase propio, opcional y seguro para no romper CI cuando falten variables.
- Guard de ruta para `/admin`.
- UI dividida: identidad editorial a la izquierda, formulario a la derecha.
- Validaciones unitarias con Zod.
- Mensajes de error controlados para evitar filtrar detalles tecnicos.

## Criterios De Aceptacion

- Si falta Supabase, el formulario informa que falta configuracion.
- Si las credenciales son invalidas, la UI muestra un mensaje claro.
- Si el correo no tiene formato valido, no se llama al proveedor.
- Si el usuario inicia sesion, se redirige al panel interno.
- Si el usuario no tiene sesion, `/admin` redirige a `/admin/login`.
- Si se solicita recuperacion, Supabase envia correo de cambio de contrasena.
- Si se usa Google, Supabase redirige al proveedor configurado.
- Las pruebas unitarias pasan en local y en CI.

## Configuracion Supabase Pendiente En Dashboard

- Activar Email Auth si no esta activo.
- Configurar plantillas de correo con marca Pont3la10.
- Configurar Google como proveedor OAuth.
- Agregar redirect URLs:
  - `http://localhost:3001/admin/login`
  - URL final de produccion cuando exista deploy.
- Mantener RLS y roles como barrera real de datos internos.

## Nota De Seguridad

Crear una cuenta no debe dar permisos editoriales por si solo. El acceso a datos internos se controla con roles y politicas RLS.
