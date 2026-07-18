# Arquitectura inicial

## Principio

Pont3la10 arranca como monolito modular: simple para desplegar, ordenado por dentro y listo para crecer.

## Dominios

- `editorial`: articulos, categorias, tags, autores, estados y programacion.
- `media`: imagenes destacadas, logos, piezas exportables y storage.
- `auth`: login, perfiles, roles y permisos.
- `seo`: metadatos, slugs, sitemap y vista previa social.
- `socials`: piezas internas por red social y futuras APIs.
- `interactive`: simulador mundialista, album, polla y rankings.

## Regla para redes

El generador de plantillas de redes es interno. Cada noticia, blog o publicacion web podra tener piezas asociadas para distintas redes sociales, generadas desde el panel editorial y luego distribuidas mediante APIs cuando esa fase llegue.

## Seguridad desde el inicio

- Autenticacion con Supabase Auth.
- Row Level Security en PostgreSQL.
- Separacion entre rutas publicas y rutas internas.
- Validacion de datos con esquemas tipados.
- Revision humana antes de publicar contenido generado por IA.
- Variables privadas solo en runtime server.
- Migraciones versionadas en `supabase/migrations`.

## Modelo inicial

```txt
users
roles
user_roles
user_profiles
articles
article_categories
article_tags
tags
authors
media_files
social_publications
social_templates
special_modules
module_entries
module_settings
```
