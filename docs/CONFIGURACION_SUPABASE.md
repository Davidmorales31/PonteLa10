# Configuracion Supabase

## Variables Locales

Pont3la10 usa Nuxt, por eso las variables publicas deben usar prefijo `NUXT_PUBLIC_*`.

```txt
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_KEY=
```

Si Supabase o una guia entrega variables con prefijo `NEXT_PUBLIC_*`, se deben mapear asi:

```txt
NEXT_PUBLIC_SUPABASE_URL -> NUXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY -> NUXT_PUBLIC_SUPABASE_KEY
```

## Migraciones

Aplicar en orden:

```txt
supabase/migrations/0001_foundation.sql
supabase/migrations/0002_api_permissions.sql
```

La primera migracion crea tablas, roles, politicas RLS y datos iniciales.

La segunda migracion declara permisos explicitos para PostgREST. RLS sigue siendo la capa que decide que puede leer o modificar cada rol.

## Claves

Se permite usar la publishable key en cliente.

Nunca guardar en Git:

```txt
service_role
secret keys
database password
tokens de proveedores
```

## Prueba Rapida

Con la migracion aplicada, una consulta publica a categorias debe devolver datos activos.
