# HU-ED-05: Flujo Editorial Y Publicacion

## Objetivo

Convertir los borradores del CMS en publicaciones revisables, aprobables,
programables y publicas sin permitir saltos de estado, sobrescrituras
concurrentes ni exposicion de versiones no aprobadas.

## Estados

```text
draft
  -> review
  -> changes_requested
  -> approved
  -> scheduled
  -> published
  -> archived
```

El grafo real permite volver desde `changes_requested` a `review`, cancelar una
programacion hacia `approved` y abrir una revision nueva desde `published`.
Archivar retira la version publica; crear una revision no lo hace.

## Seguridad

- Todas las transiciones validan sesion y permiso en la API.
- PostgreSQL vuelve a validar permiso, estado anterior y estado objetivo.
- Aprobar, programar y publicar no se resuelven unicamente desde la UI.
- Programar y publicar requieren una sesion `aal2`.
- `lock_version` evita que una sesion antigua cambie el estado.
- El navegador nunca recibe una clave `service_role`.
- Los comentarios se almacenan como texto y no se renderizan como HTML.
- La ruta administrativa usa `noindex, nofollow`.

## Requisitos De Calidad

Antes de revision:

- Titulo valido.
- Resumen de al menos 20 caracteres.
- Seccion editorial.
- Cuerpo estructurado no vacio.
- URL de origen para contenidos no manuales.

Antes de aprobacion, programacion o publicacion:

- Todos los requisitos anteriores.
- Portada seleccionada.
- Descripcion SEO de al menos 40 caracteres.

## Version Publica Estable

`articles.published_version_id` apunta a la version que puede consumir el sitio.
La funcion `get_public_editorial_article` devuelve unicamente ese snapshot.

Cuando un contenido publicado vuelve a `draft`:

- La version publica anterior continua visible.
- El editor trabaja sobre una nueva revision.
- Publicar nuevamente reemplaza el puntero publico de forma atomica.

Cuando se archiva:

- `published_version_id` se limpia.
- La ruta publica deja de encontrar el articulo.

## Programacion

La migracion crea:

```sql
public.publish_due_editorial_articles()
```

La funcion publica los contenidos `scheduled` cuya fecha ya vencio. Para
ejecutarla automaticamente se debe habilitar Supabase Cron y crear un job:

```sql
select cron.schedule(
  'pont3la10-publicaciones-programadas',
  '* * * * *',
  $$select public.publish_due_editorial_articles();$$
);
```

El job debe crearse desde una cuenta administradora de la base de datos. La
funcion no se concede a `anon` ni a `authenticated`.

## Superficies

- `/admin/contenidos/:id`: panel de flujo, comentarios y acciones.
- `/admin/revision`: columnas de revision, aprobados y programados.
- `/api/admin/contenidos/:id/transicion`: transicion protegida.
- `/api/admin/contenidos/:id/comentarios`: conversacion editorial.
- `/api/articulos/:slug`: lectura publica de la version fijada.
- `/api/articulos`: listado de publicaciones reales.
- `/articulos/:slug`: pagina publica, SEO y `NewsArticle`.
- `/sitemap.xml`: incorpora publicaciones reales.

## Validacion Operativa

1. Guardar un borrador completo.
2. Enviarlo a revision.
3. Solicitar cambios y comprobar que vuelve a ser editable.
4. Enviarlo nuevamente y aprobarlo.
5. Programarlo o publicarlo con MFA.
6. Abrir `/articulos/:slug` en una sesion publica.
7. Crear una revision y comprobar que la version publica sigue visible.
8. Publicar la revision y comprobar el reemplazo.
9. Archivar y confirmar la retirada publica.

## Fuera De Alcance

- Notificaciones por correo o push.
- Asignacion manual de revisores.
- Distribucion automatica en redes sociales.
- Ingesta desde TikTok o YouTube.
- Analitica editorial.
