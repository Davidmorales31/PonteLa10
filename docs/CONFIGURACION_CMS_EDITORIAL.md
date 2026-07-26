# Configuración De La Fundación Editorial

Esta guía activa la HU-ED-01 después de desplegar el código. No contiene
credenciales ni requiere exponer la clave `service_role`.

## 1. Requisitos

- Proyecto Supabase de Pont3la10.
- Variables locales `NUXT_PUBLIC_SUPABASE_URL` y
  `NUXT_PUBLIC_SUPABASE_KEY`.
- Una cuenta pública ya creada en `/login` para el propietario fundador.
- Acceso al SQL Editor de Supabase o Supabase CLI vinculada al proyecto.

La clave publicable puede vivir en el navegador porque RLS limita su alcance.
La clave `service_role` no debe agregarse a `.env`, componentes, endpoints de
usuario, logs ni repositorio para esta HU.

## 2. Aplicar Migraciones

Aplicar en orden:

```text
supabase/migrations/0001_foundation.sql
supabase/migrations/0002_api_permissions.sql
supabase/migrations/0003_cms_editorial_foundation.sql
supabase/migrations/0004_editorial_content_model.sql
supabase/migrations/0005_editorial_draft_editor.sql
supabase/migrations/0006_editorial_media_library.sql
```

En un proyecto que ya tenga hasta `0005`, ejecutar únicamente `0006`.

Con Supabase CLI vinculada:

```bash
supabase db push
```

Antes de producción se debe probar la migración en un proyecto de staging y
guardar un respaldo. No se debe editar una migración que ya haya sido aplicada;
los ajustes posteriores se crean en una migración nueva.

## 3. Asignar El Primer Propietario

1. Crear o confirmar la cuenta en `/login`.
2. Copiar su UUID desde `Authentication > Users`.
3. Ejecutar en SQL Editor, reemplazando únicamente el UUID:

```sql
insert into public.user_roles (
  user_id,
  role,
  is_active,
  assigned_by
) values (
  'UUID_DEL_USUARIO'::uuid,
  'propietario',
  true,
  null
)
on conflict (user_id, role) do update
set
  is_active = true,
  updated_at = now();
```

No se debe convertir automáticamente al primer usuario registrado en
propietario. La asignación explícita evita que una instalación vacía eleve por
error una cuenta pública.

## 4. Activar MFA

1. Entrar en `/admin`.
2. El middleware dirigirá a `/admin/seguridad`.
3. Escanear el QR con una aplicación autenticadora.
4. Confirmar el código de seis dígitos.
5. Volver al centro editorial.

Los roles `propietario`, `administrador` y `editorJefe`, además de cualquier
rol con permiso `contenido.publicar`, requieren una sesión `aal2`.

Supabase no almacena la contraseña manual en las tablas públicas. Auth conserva
un hash seguro y gestiona también la identidad de Google. La aplicación recibe
sesiones por cookies SSR; nunca recibe la contraseña de Google.

## 5. Verificaciones

### Cuenta pública sin rol

- Puede navegar el sitio.
- Puede iniciar sesión.
- No ve la acción `Panel`.
- Recibe `403` en `/api/admin/*`.
- Es enviada a `/acceso-denegado` si intenta entrar al panel.

### Cuenta editorial

- Ve `Panel` después de cargar su contexto.
- Solo recibe las opciones permitidas.
- No puede usar APIs para las que no tenga capacidad.
- Un rol sensible pasa primero por MFA.

### Propietario con MFA

- Abre `/admin`.
- Consulta `/admin/auditoria`.
- Puede ver todas las capacidades definidas.
- Las acciones críticas futuras deberán validar permiso y `aal2` en servidor.

## 6. Orden De Desarrollo

La fundación se construyó en estas fases:

1. Sesión SSR y separación entre cuenta pública y cuenta editorial.
2. Roles, capacidades, RLS, versiones y auditoría.
3. Middleware y helpers de autorización para APIs.
4. Layout, dashboard y estados de acceso.
5. MFA y auditoría visible.
6. Pruebas de permisos, compilación y validación responsive.

Las siguientes HU deben reutilizar `exigirPermisoEditorial` en servidor,
`useContextoEditorial` en interfaz y las funciones SQL de capacidades. No deben
crear un segundo sistema de autorización.

## 7. Recuperación Y Soporte

- Mantener al menos dos propietarios cuando exista un segundo responsable.
- Guardar los códigos de recuperación del autenticador fuera del repositorio.
- Si se pierde el factor, usar el flujo administrativo de recuperación de
  Supabase y registrar la intervención.
- No desactivar RLS para resolver incidencias.
- No borrar auditoría para corregir datos; emitir un registro compensatorio.
