# HU-ED-06: Enlaces Internos Y Distribución

## Objetivo

Permitir que el equipo editorial conecte publicaciones relacionadas desde el
editor y que cada noticia pública pueda compartirse fácilmente, sin admitir
HTML arbitrario, URLs internas escritas a mano ni referencias a borradores.

## Decisiones

- El enlace interno es un bloque estructurado `articuloRelacionado`.
- El selector consulta únicamente el catálogo público de artículos.
- El servidor vuelve a validar cada referencia antes del guardado manual.
- Una publicación conserva la referencia en su snapshot versionado.
- La vista pública resuelve otra vez el destino vigente. Si fue archivado, el
  bloque se omite y no se entrega un enlace roto.
- Se permiten hasta ocho referencias únicas por documento.
- Las recomendaciones automáticas excluyen la noticia actual, priorizan la
  misma categoría y usan enlaces HTML rastreables por buscadores.
- Compartir usa Web Share cuando está disponible y enlaces oficiales para
  WhatsApp, X y Facebook. No requiere API keys.

## Seguridad

La aplicación no acepta URLs de destino proporcionadas por el editor. Guarda el
UUID del artículo y deriva la ruta pública desde una versión publicada. La RPC
`resolve_public_editorial_links` expone solo publicaciones con
`published_version_id` y excluye contenido archivado.

No se usa `v-html`, `service_role` ni acceso directo a borradores desde la web
pública.

## Activación

Aplicar en Supabase:

```text
supabase/migrations/0008_editorial_internal_links.sql
```

Después, crear o abrir una revisión editable, agregar el bloque de enlace,
seleccionar una publicación y completar el flujo normal de revisión y
publicación.

## Criterios De Aceptación

- El selector busca por título, resumen y categoría.
- La noticia actual no aparece como destino.
- No se puede guardar una referencia duplicada, privada, archivada o propia.
- El bloque funciona en editor, vista previa y artículo público.
- Las acciones de compartir tienen nombre accesible y confirmación al copiar.
- Las recomendaciones no incluyen el artículo actual.
- El diseño se adapta a escritorio y móvil sin desbordamiento horizontal.
