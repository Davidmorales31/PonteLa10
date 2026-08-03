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
- Una sesion publica no concede acceso editorial: exigir rol activo y permiso explicito.
- Autorizar cada endpoint privado en servidor y respaldar la misma regla con RLS.
- No dispersar comparaciones de roles por componentes; usar capacidades centralizadas.
- Exigir MFA para publicar, programar, gestionar equipo y otras acciones sensibles.
- Registrar en auditoria cambios de roles, estados editoriales y acciones criticas.
- Nunca usar `service_role` en el navegador ni como atajo para una operacion de usuario.
- No mostrar navegacion hacia modulos internos que aun no tengan ruta y funcionalidad reales.

## SEO

- Considerar el SEO en toda pagina, ruta o modulo publico desde su implementacion inicial.
- Usar la infraestructura SEO compartida del proyecto para titulo, descripcion, canonical, Open Graph y Twitter Cards.
- Mantener `robots.txt` y `sitemap.xml` sincronizados cuando cambien las rutas publicas.
- Agregar datos estructurados solo cuando representen fielmente el contenido visible y los datos disponibles.
- Entregar metadatos importantes desde SSR y conservar HTML semantico, enlaces internos rastreables, jerarquia de encabezados y textos alternativos utiles.
- Marcar como `noindex` las rutas privadas, errores, busquedas internas y contenido mock o insuficiente para indexacion.
- Tener en cuenta rendimiento, dimensiones de imagenes y estabilidad visual como parte del SEO tecnico.

## Criterio Editorial

- Una noticia puede tratar tecnologia, cultura digital, entretenimiento, tendencias u otros temas definidos por la linea editorial sin forzar una relacion con el deporte.
- No insertar menciones a Pont3la10 dentro del cuerpo solo para intentar posicionar la marca. La marca debe estar en la autoria, el publisher, la cabecera y los metadatos; mencionarla en el texto unicamente cuando aporte contexto real.
- Priorizar contenido util, original y centrado en el lector. No deformar un tema ni agregar parrafos artificiales para cumplir palabras clave.
- Verificar fecha, fuente y contexto antes de cubrir una tendencia. Separar claramente hechos comprobados, explicaciones tecnicas e inferencias editoriales.
- Permitir y fomentar enlaces internos cuando ayuden a ampliar el tema. Deben apuntar a contenido publico, existente y relacionado, con texto ancla breve y descriptivo.
- No enlazar desde una noticia publica hacia borradores, rutas privadas, contenido inexistente ni enlaces internos genericos como "haz clic aqui".
- Las imagenes editoriales generadas deben responder al tema real de la noticia. No tienen que usar ambiente deportivo, estadio, jugadores ni la paleta de Pont3la10 cuando el contenido no lo requiera.
- Evitar logos, marcas, atletas o interfaces de terceros innecesarios en imagenes generadas. Cuando se necesite representar una plataforma, usar una interfaz social generica que comunique la idea sin copiar su identidad.
- Registrar el origen y los creditos de cada imagen. Si una imagen fue generada con asistencia de IA, conservar esa informacion en la trazabilidad editorial.

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
