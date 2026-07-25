# HU-ED-02 Modelo Editorial, Taxonomia Y Bandeja De Contenidos

## Estado

Implementada localmente. Requiere aplicar la migracion `0004` en Supabase.

## Historia De Usuario

Como integrante autorizado del equipo editorial, quiero crear y organizar
borradores desde una bandeja privada, para que todo contenido manual o
proveniente de una ingesta utilice el mismo modelo, taxonomia y trazabilidad
antes de entrar al editor avanzado.

## Objetivo

Esta historia evoluciona la fundacion segura del CMS y entrega el primer flujo
editorial util:

- Crear un borrador manual.
- Consultar contenidos con paginacion, busqueda y filtros.
- Clasificar por seccion principal, temas publicos y etiquetas internas.
- Conservar una version publica estable separada de los cambios de trabajo.
- Evitar sobrescrituras silenciosas mediante control de concurrencia.
- Preparar el cuerpo estructurado que utilizara el editor de la siguiente HU.

## Decisiones

### Un Solo Agregado Editorial

Noticias, analisis, opiniones, informes, breves y especiales comparten la tabla
`articles`. El campo `content_type` define su tratamiento editorial.

### Tres Capas De Clasificacion

1. `categories`: secciones publicas principales.
2. `editorial_tags`: temas publicos reutilizables.
3. `editorial_labels`: etiquetas privadas de operacion.

Las etiquetas internas nunca se exponen automaticamente en la web publica.

### Version Publica Estable

`articles` representa el documento de trabajo. `article_versions` conserva
instantaneas inmutables y `published_version_id` identifica la version que
puede entregarse al sitio publico. Editar el documento de trabajo no modifica
esa referencia.

### Contenido Estructurado

La columna `body_json` almacenara un documento estructurado validable. Durante
la transicion se conserva `body` para compatibilidad. No se aceptara HTML
arbitrario ni scripts incrustados.

### Autoguardado

El autoguardado futuro se almacenara en `article_autosaves`, con una unica fila
por articulo y usuario. No creara una version permanente en cada pulsacion.

## Alcance Funcional

### Bandeja

Ruta: `/admin/contenidos`

- Tabla responsive y estados de carga.
- Busqueda por titulo.
- Filtros por estado, tipo, seccion y origen.
- Paginacion de servidor.
- Orden por ultima actualizacion.
- Estado vacio y recuperacion de errores.
- Accion para crear un borrador.

### Creacion De Borrador

Campos iniciales:

- Titulo.
- Tipo de contenido.
- Resumen opcional.
- Seccion principal opcional.
- Origen `manual`.

El servidor genera un slug unico, asigna al usuario autenticado como autor y
fuerza el estado inicial `draft`.

### Taxonomias

Ruta: `/admin/taxonomias`

- Consultar secciones, temas y etiquetas internas.
- Crear elementos con nombre y slug generado.
- Color opcional para etiquetas internas.
- No permitir duplicados.
- Respetar `taxonomia.ver` y `taxonomia.gestionar`.

## API

```text
GET  /api/admin/contenidos
POST /api/admin/contenidos
GET  /api/admin/taxonomias
POST /api/admin/taxonomias
```

Todas las rutas validan sesion y permiso editorial en el servidor. Las
consultas directas permanecen protegidas por RLS.

## Seguridad

- Ningun campo de autor, estado o propietario se confia al cliente.
- Un contenido nuevo siempre inicia como borrador.
- Los parametros de filtros y paginacion se validan con Zod.
- Los slugs se normalizan y se resuelven los conflictos en servidor.
- Las etiquetas internas solo son visibles para el equipo editorial.
- La version publica no depende de la fila mutable del documento de trabajo.
- No se utiliza `service_role`.
- Las rutas administrativas permanecen `noindex` y `no-store`.

## Criterios De Aceptacion

- Un propietario puede crear un borrador desde `/admin/contenidos`.
- El borrador aparece en la bandeja sin recargar toda la aplicacion.
- La lista se pagina y filtra en servidor.
- Un usuario sin `contenido.crear` no puede crear mediante una llamada directa.
- Un usuario sin `taxonomia.gestionar` no puede crear taxonomias.
- El titulo, tipo y parametros de consulta rechazan valores invalidos.
- Las etiquetas internas no quedan disponibles para usuarios anonimos.
- Dos contenidos no pueden compartir slug.
- El esquema conserva una referencia explicita a la version publicada.
- La UI funciona en escritorio, tableta y movil.
- Lint, pruebas, typecheck y build terminan correctamente.

## Fuera De Alcance

- Editor visual Tiptap.
- Carga y transformacion de imagenes.
- Vista previa publica.
- Comentarios de revision.
- Publicacion y programacion.
- Ingestas desde TikTok, Telegram o WhatsApp.
- Automatizacion de redes sociales.

## Pruebas

### Unitarias

- Normalizacion y unicidad de slug.
- Validacion de filtros.
- Validacion de borradores.
- Etiquetas de estados y tipos.

### Integracion

- Permiso de lectura y creacion.
- Paginacion y filtros.
- RLS de taxonomias internas.
- Creacion de version inicial.
- Conflicto de slug.

### Visuales

- Bandeja con datos, vacia, cargando y error.
- Modal de creacion accesible.
- Taxonomias en escritorio y movil.

## Definicion De Terminado

La HU termina cuando la bandeja y taxonomias operan contra Supabase real, las
acciones estan protegidas por permisos y RLS, la migracion es versionada, no se
exponen datos internos y toda la validacion tecnica pasa.
