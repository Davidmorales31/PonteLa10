# Estandares De Desarrollo

## Principios

- Claridad antes que decoracion.
- Modular por dentro, simple por fuera.
- Seguridad desde el inicio.
- Mobile-first sin sacrificar escritorio.
- UI editorial profesional, no demo generica.

## Codigo

- Variables, funciones y propiedades del dominio en espanol y `camelCase`.
- Componentes Vue reutilizables con nombres descriptivos en espanol.
- Logica repetida en `utils/` o composables.
- Tipos compartidos en `types/`.
- Datos semilla temporales en `data/`.
- Validaciones en `utils/validation/`.

## Componentes

Crear componente cuando:

- Una pieza se repite.
- Una vista queda dificil de leer.
- Hay una responsabilidad visual clara.

Evitar componente cuando:

- Solo agrega indirecciones.
- Encapsula una linea sin valor.
- Mezcla datos, UI y reglas de negocio sin necesidad.

## Estilo Visual

- Mantener identidad Pont3la10: navy, amarillo, blanco, azul y acentos controlados.
- La portada debe sentirse como medio editorial deportivo/tecnologico.
- Evitar apariencia de landing generica.
- Evitar interfaces recargadas o infantiles.
- Usar imagenes reales o assets editoriales cuando la pantalla lo necesite.

## Seguridad

- No publicar claves ni tokens.
- Usar `NUXT_PUBLIC_SUPABASE_URL` y `NUXT_PUBLIC_SUPABASE_KEY` para la clave publica de Supabase en Nuxt.
- No usar nombres `NEXT_PUBLIC_*` porque este proyecto usa Nuxt, no Next.
- Separar rutas publicas e internas.
- Validar entradas con Zod o esquemas equivalentes.
- Mantener RLS en tablas Supabase.
- No activar autopublicacion de IA en fases iniciales.

## Validacion

Consultar exclusivamente `docs/agents/VALIDACIONES.md`. Este documento no
mantiene una segunda matriz de comandos.

## Definicion De Terminado

La definición oficial de terminado está en `docs/agents/VALIDACIONES.md`.
Además, el cambio debe cumplir su objetivo, respetar estas convenciones y no
introducir secretos, artefactos locales ni procesos innecesarios.
