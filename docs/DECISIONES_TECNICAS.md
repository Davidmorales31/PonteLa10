# Decisiones tecnicas

## Stack base

Usamos Nuxt 3, TypeScript, Supabase y PostgreSQL.

## Por que monolito modular

Pont3la10 tendra varios productos internos, pero al inicio no necesita microservicios. Separar los dominios dentro del mismo proyecto permite avanzar rapido sin perder orden.

## Por que PostgreSQL

El proyecto tendra relaciones entre usuarios, articulos, categorias, roles, rankings, predicciones y progreso. PostgreSQL da una base relacional fuerte y permite flexibilidad con JSONB cuando haga falta.

## Politica de IA

La IA no publica automaticamente en las primeras fases. Solo propone ideas, borradores, titulos, SEO y copys para redes. Un editor humano aprueba.

## Politica de seguridad

Todo dato privado o administrativo debe vivir detras de autenticacion y permisos. El contenido publico se consulta por estado `published`.
