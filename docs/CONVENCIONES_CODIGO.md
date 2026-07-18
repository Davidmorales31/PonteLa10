# Convenciones de codigo

Estas reglas aplican cada vez que se toque codigo en Pont3la10.

## Idioma

- Nombres de variables, funciones, tipos propios y componentes del dominio en espanol.
- Texto visible para usuario en espanol con tono Pont3la10.
- Terminos tecnicos externos se conservan cuando sean nombres de libreria, API o convencion del framework.

## Formato de nombres

- Variables y funciones: `camelCase`.
- Propiedades de objetos del dominio: `camelCase`.
- Componentes Vue: nombres descriptivos en espanol y PascalCase por convencion del framework, por ejemplo `TarjetaArticulo`.
- Archivos utilitarios: camelCase o nombres descriptivos en espanol.

## Reutilizacion

- Priorizar componentes globales autoimportados por Nuxt para piezas de UI repetidas.
- Priorizar funciones globales en `utils/` o composables cuando una regla se repite.
- Evitar duplicar rutas, formatos, validaciones o transformaciones en paginas.

## Arquitectura

- Mantener dominios separados: editorial, redes internas, autenticacion, media, SEO e interactivos.
- No mezclar prototipos publicos con herramientas internas del panel.
- Validar entradas con esquemas antes de persistir o publicar.
