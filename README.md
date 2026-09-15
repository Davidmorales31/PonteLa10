# Pont3la10

Pont3la10 es una plataforma deportiva digital enfocada en contenido, tecnologia, tendencias y experiencias interactivas.

## Base tecnica inicial

- Nuxt 3 con TypeScript.
- Supabase para autenticacion, PostgreSQL y storage.
- Modulos internos por dominio: editorial, media, auth, SEO, redes e interactivos.
- Diseno mobile-first con identidad visual Pont3la10.
- Flujo editorial con aprobacion humana antes de publicar contenido asistido por IA.

## Estado

El repositorio contiene sitio público, resultados deportivos, autenticación
editorial, CMS, multimedia, revisión/publicación, enlaces internos e ingestas
experimentales. El estado factual y los límites vigentes se mantienen en
`docs/agents/ESTADO_ACTUAL.md`; el roadmap distingue terminado, parcial y pendiente.

## Seguridad

La primera migracion en `supabase/migrations/0001_foundation.sql` define roles, tablas editoriales y politicas RLS para separar contenido publico de trabajo interno.

## Convenciones

Las reglas de idioma, camelCase y reutilizacion viven en `docs/CONVENCIONES_CODIGO.md`.

## GitHub Y Desarrollo

- Guia de contribucion: `CONTRIBUTING.md`.
- Estandares de desarrollo: `docs/ESTANDARES_DESARROLLO.md`.
- Estandares de GitHub: `docs/ESTANDARES_GITHUB.md`.
- Configuracion Supabase: `docs/CONFIGURACION_SUPABASE.md`.
- HU Login Editorial: `docs/HU_LOGIN_EDITORIAL.md`.
- Instrucciones persistentes para Codex: `AGENTS.md`.
- Mapa de contexto para agentes: `docs/agents/MAPA_CONTEXTO.md`.
- Matriz única de validaciones: `docs/agents/VALIDACIONES.md`.

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```
