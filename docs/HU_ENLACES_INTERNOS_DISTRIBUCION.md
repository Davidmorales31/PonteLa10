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

## Tarjetas Sociales Y SEO

Cada noticia publicada entrega sus metadatos desde el HTML renderizado en el
servidor para que los rastreadores no dependan de ejecutar JavaScript:

- Open Graph con URL canónica, título, descripción, portada, texto alternativo,
  dimensiones, tipo de imagen, sitio, idioma y datos propios de artículo.
- X Card `summary_large_image` con imagen y alternativa accesible.
- `NewsArticle` y `BreadcrumbList` en JSON-LD, con autor, editor, fecha,
  sección, portada y entidad principal.
- Títulos con marca limitados a 70 caracteres y descripciones normalizadas a
  un máximo de 170 caracteres.
- Enlace `canonical` e `image_src` rastreables.

El editor incluye vistas previas para Facebook, X y WhatsApp. También revisa
la presencia de portada, texto alternativo, resolución y proporción. La imagen
recomendada es de al menos `1200 x 630 px`, cercana a `1.91:1`; las alertas de
calidad orientan al editor sin reemplazar la validación de publicación.

En producción, `NUXT_PUBLIC_SITE_URL` debe contener el origen HTTPS público.
Las redes no pueden leer URLs locales y pueden conservar en caché una tarjeta
anterior, por lo que una publicación desplegada debe comprobarse con los
depuradores oficiales de cada plataforma.

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
- El HTML SSR contiene Open Graph, X Card y metadatos de artículo completos.
- La portada social expone URL absoluta, dimensiones y texto alternativo.
- El editor permite revisar la tarjeta de Facebook, X y WhatsApp.
- La evaluación advierte portadas pequeñas, mal proporcionadas o sin alternativa.
- Las recomendaciones no incluyen el artículo actual.
- El diseño se adapta a escritorio y móvil sin desbordamiento horizontal.
