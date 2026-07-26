# HU-ED-04 - Biblioteca multimedia

## Estado

Implementada en código. Requiere ejecutar
`supabase/migrations/0006_editorial_media_library.sql` en Supabase antes de la
validación funcional contra Storage.

## Objetivo

Permitir que el equipo editorial cargue, describa, reutilice y asigne imágenes
de portada sin exponer credenciales privadas ni almacenar archivos sin validar.

## Alcance funcional

- Biblioteca privada dentro del panel editorial.
- Búsqueda por título, archivo o texto alternativo.
- Paginación y estados de carga.
- Subida mediante selección o arrastrar y soltar.
- Vista previa antes de enviar.
- Edición de título, texto alternativo, pie de foto, crédito y fuente.
- Soporte explícito para imágenes decorativas.
- Copia de URL pública.
- Eliminación protegida por permiso y MFA.
- Selector reutilizable de portada dentro del editor.
- Portada incluida en autoguardado, guardado atómico, historial y vista previa.

## Procesamiento de archivos

La API recibe únicamente JPG, PNG o WebP de hasta 12 MB. Sharp valida la firma
real del archivo, limita el total de píxeles, aplica la orientación, elimina
metadatos, reduce el lado mayor a 2400 px y genera WebP con calidad editorial.

El resultado se identifica mediante SHA-256. Una imagen ya procesada no se
almacena dos veces.

## Persistencia

### Storage

- Bucket: `editorial-media`.
- Lectura pública para portadas y futuras páginas públicas.
- Escritura limitada por permisos `media.*`.
- Rutas con formato `usuario/año/mes/uuid.webp`.
- El bucket solo acepta WebP procesado por el servidor.

### Base de datos

`media_files` conserva el objeto, nombre original, metadatos de accesibilidad,
crédito, fuente, dimensiones, tamaño, MIME, hash, autor y fechas.

`articles.cover_media_id` referencia la portada seleccionada. La función
`save_editorial_article` valida la imagen y actualiza la referencia en la misma
transacción que el resto del borrador.

## Seguridad

- Cada endpoint valida sesión y permiso en servidor.
- Las políticas de `storage.objects` replican la autorización.
- No se utiliza `service_role`.
- La eliminación requiere `media.eliminar` y MFA.
- Un trigger impide eliminar imágenes usadas como portada.
- Las operaciones de medios quedan registradas en auditoría.
- Los nombres originales nunca determinan la ruta del objeto.
- Los límites de bytes y píxeles reducen riesgos de agotamiento de memoria.

## SEO y accesibilidad

- El texto alternativo es obligatorio salvo en imágenes decorativas.
- Las dimensiones se guardan para evitar saltos visuales.
- WebP reduce el peso de descarga.
- Pie de foto y crédito acompañan la portada.
- La biblioteca y sus endpoints permanecen fuera de indexación.

## Endpoints privados

| Método | Ruta | Permiso |
| --- | --- | --- |
| `GET` | `/api/admin/media` | `media.ver` |
| `POST` | `/api/admin/media` | `media.subir` |
| `GET` | `/api/admin/media/:id` | `media.ver` |
| `PATCH` | `/api/admin/media/:id` | `media.editar` |
| `DELETE` | `/api/admin/media/:id` | `media.eliminar` + MFA |

## Fuera de alcance

- Videos y audio.
- Recortes manuales y punto focal.
- Variantes AVIF.
- Promoción entre buckets privados y públicos.
- Inserción de imágenes dentro del cuerpo del artículo.
- CDN externo y limpieza programada de objetos huérfanos.
