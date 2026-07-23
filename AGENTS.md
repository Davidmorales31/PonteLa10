# Instrucciones Persistentes Para Codex

Estas reglas aplican siempre que Codex trabaje en Pont3la10.

## Proyecto Activo

- La carpeta principal del proyecto es `C:\PONTE LA 10`.
- No trabajar en la copia anterior ubicada en OneDrive.
- Antes de tocar codigo, revisar el contexto local y respetar cambios existentes.

## Idioma Y Nombres

- Programar el dominio del proyecto en espanol.
- Usar `camelCase` para variables, funciones, propiedades y utilitarios.
- Usar componentes Vue en PascalCase descriptivo en espanol, por ejemplo `TarjetaArticulo`.
- Mantener textos visibles en espanol con tono Pont3la10.
- Conservar nombres tecnicos externos cuando sean APIs, paquetes, comandos o convenciones del framework.

## Arquitectura

- Priorizar componentes globales autoimportados por Nuxt.
- Priorizar funciones reutilizables en `utils/` o composables cuando una regla se repite.
- Mantener separados los dominios: editorial, redes internas, autenticacion, media, SEO e interactivos.
- El generador de redes es una herramienta interna del panel editorial, no una pagina publica.
- Supabase debe quedar preparado, pero no debe romper localmente si faltan variables de entorno.

## Seguridad

- Validar entradas con esquemas antes de persistir o publicar.
- No exponer claves privadas en cliente, logs, commits ni documentacion.
- Mantener Row Level Security en Supabase desde las primeras migraciones.
- La IA puede asistir, pero las primeras fases requieren aprobacion humana antes de publicar.

## SEO

- Considerar el SEO en toda pagina, ruta o modulo publico desde su implementacion inicial.
- Usar la infraestructura SEO compartida del proyecto para titulo, descripcion, canonical, Open Graph y Twitter Cards.
- Mantener `robots.txt` y `sitemap.xml` sincronizados cuando cambien las rutas publicas.
- Agregar datos estructurados solo cuando representen fielmente el contenido visible y los datos disponibles.
- Entregar metadatos importantes desde SSR y conservar HTML semantico, enlaces internos rastreables, jerarquia de encabezados y textos alternativos utiles.
- Marcar como `noindex` las rutas privadas, errores, busquedas internas y contenido mock o insuficiente para indexacion.
- Tener en cuenta rendimiento, dimensiones de imagenes y estabilidad visual como parte del SEO tecnico.

## Flujo De Trabajo

- Antes de editar, entender la estructura existente.
- Usar `apply_patch` para cambios manuales.
- Mantener cambios pequenos y relacionados con la tarea.
- No revertir cambios ajenos sin instruccion explicita.
- Si se toca codigo, correr `npm.cmd run lint`.
- Si se toca estructura, rutas, build, Nuxt, Supabase o dependencias, correr tambien `npm.cmd run build`.

## Git

- Usar Conventional Commits en espanol.
- No commitear `node_modules`, `.nuxt`, `.output`, `.env` ni logs locales.
- Preferir PRs pequenos, revisables y con checklist completo.
