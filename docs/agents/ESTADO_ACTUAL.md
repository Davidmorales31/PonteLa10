# Estado actual de Pont3la10

- **Actualizado:** 2026-09-15
- **Commit base:** `24340c0` (`origin/main`)
- **Estado general:** Fase 0 implementada y validada localmente; producto no certificado para producción.
- **Árbol de trabajo:** rama limpia y separada para la Fase 0; el trabajo local de HU-ED-07 no forma parte de este cambio.

## Terminado en el repositorio

- Base Nuxt 3, identidad visual, sitio público y panel administrativo.
- Autenticación pública opcional y acceso editorial protegido, recuperación y MFA.
- CMS: taxonomías, borradores, autoguardado, versiones, multimedia y publicación.
- Artículos públicos, enlaces internos, tarjetas sociales, sitemap y robots.
- Resultados deportivos para fútbol, baloncesto, béisbol y tenis.
- Bandeja segura para registrar y gestionar ingestas editoriales.
- 10 migraciones versionadas, desde `0001` hasta `0010`.

## Parcial o activo

- **HU-ED-07:** la bandeja y la cola base están versionadas. La extracción,
  transcripción, traducción, evidencia y ejecución durable siguen pendientes.
- La portada usa datos mock en parte; una pantalla o mock no certifica una función.

## Bloqueos

- `python`, `pipx` y `memento-multiagent` no están disponibles en `PATH`.
- No se verificó qué migraciones están aplicadas en el Supabase remoto.
- No hay prueba real confirmada de TikTok a `evidence_ready`.
- El ruleset de `main` está desactivado.

## Deuda técnica confirmada

- El CI remoto más reciente falla en `test` por ejecutar Vitest sin preparar Nuxt.
- CI instala dependencias en cuatro jobs; se conserva para mantener checks independientes.
- `npm audit` reporta 14 vulnerabilidades en dependencias (5 moderadas, 8 altas
  y 1 crítica); requieren revisión separada, sin aplicar arreglos automáticos.
- Funciones `security definer` y usos históricos de `auth.role()` requieren auditoría SQL.
- Falta un entorno Python reproducible para el worker de TikTok.
- El estado remoto de RLS, Storage, Cron y migraciones no está certificado.
- Varias ramas `codex/*` antiguas siguen en remoto.

## Siguiente paso recomendado

Publicar y validar la Fase 0 en un PR independiente. Después, revisar por
separado el trabajo local de HU-ED-07; no continuar funcionalidad sin aprobación.

## Última validación conocida

El 2026-09-15 pasaron en la rama limpia `npm ci`, lint, 15 archivos/83 pruebas,
typecheck y build. El build emitió una advertencia de dependencia obsoleta.

## Documentos posiblemente desactualizados

- `docs/ARQUITECTURA_INICIAL.md`: conserva el diseño de la primera etapa y no
  sustituye el estado verificado de este documento.
