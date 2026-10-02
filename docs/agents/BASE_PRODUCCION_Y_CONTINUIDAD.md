# Base de producción y continuidad entre instancias

Actualizado: 2026-10-02 (America/Bogota)

Este documento ayuda a las siguientes instancias a continuar desde el código
real publicado y a no reactivar trabajo que el usuario dejó sin aprobar. No
sustituye `AGENTS.md`, `ESTADO_ACTUAL.md`, Git, migraciones ni el código.

## Base verificada

- Repositorio canónico: `C:\PONTE LA 10`; no usar OneDrive.
- Production activo: `https://www.pont3la10.com`, deployment
  `dpl_64hECvYHAArmLsgXP9pv9NBUek58`, estado `Ready` (2026-10-02 01:24 COT).
- Vercel registra su origen como `vercel deploy`, sin SHA Git. El source se
  recuperó del worktree local que produjo ese deployment: base `07aca0a`, 14
  archivos existentes modificados y 4 nuevos. Los hashes SHA-256 de los 18
  archivos coinciden entre ese source y la copia canónica importada. No se
  copiaron `.env`, variables privadas ni otros archivos ignorados.
- El código de aplicación en esta rama corresponde al source del deployment;
  la guía, este handoff y las actualizaciones de estado se añadieron después
  como documentación local. No se hizo un despliegue nuevo.
- El checkout anterior (`e42b57b`) estaba 42 commits adelante del upstream y
  también tenía muchos cambios staged, unstaged y nuevos. Se retiró de la rama
  activa. Para recuperación local, el commit anterior queda bajo la etiqueta
  `archive/pre-production-reset-2026-10-02-e42b57b` y los cambios no ignorados
  en el stash `respaldo pre-reset 2026-10-02; rama e42b57b`. No aplicar ni
  publicar esos respaldos salvo que el usuario lo pida.
- La rama de trabajo se llama `codex/production-baseline-2026-10-02` y ya no
  sigue el upstream antiguo del backlog. El respaldo remoto/etiquetado sigue
  separado de la base activa.
- Se preservaron las demás ramas/worktrees, `.codex/`, archivos ignorados y el
  proceso local que ya escuchaba en `127.0.0.1:3001`. No se tocaron credenciales.

## Reglas para próximas instancias

1. Al iniciar, leer `AGENTS.md`, `docs/agents/ESTADO_ACTUAL.md`, este archivo,
   `docs/agents/MAPA_CONTEXTO.md` y `docs/agents/VALIDACIONES.md`. Luego abrir
   solo los documentos del dominio actual.
2. Antes de trabajo no trivial, ejecutar
   `memento-multiagent recall "<consulta concreta>" --agent pont3la10-codex`.
   Memento complementa; no reemplaza Git, código, migraciones o estado.
3. Inspeccionar `git status`, rama, upstream y worktrees antes de editar. Un
   conteo `ahead` no demuestra que el código sea el de Production.
4. Para identificar la base, comprobar deployment activo, dominio, estado y
   source en Vercel. Si es `vercel deploy` sin SHA, encontrar el árbol exacto
   usado y comparar sus archivos; no escoger un commit cercano por intuición.
5. Antes de resetear o retirar cambios, respaldar el commit y el estado dirty
   no ignorado; verificar el destino exacto. Mantener los respaldos locales,
   no empujarlos a GitHub ni aplicarlos automáticamente. No borrar `.env`,
   `.codex`, worktrees, contenido ignorado o procesos del usuario.
6. No incluir trabajo del backlog no aprobado. Implementar solo el alcance
   activo y no interpretar el silencio como aprobación de nuevas HU.
7. Distinguir código local, GitHub, Vercel Production, Supabase y worker del PC.
   Registrar evidencia de cada uno por separado; no afirmar que algo está
   publicado, sincronizado, probado o visible sin verificarlo.
8. El flujo deportivo documentado tiene worker en el PC, datos persistidos en
   Supabase para lectura pública y Goal API como respaldo cuando falla
   API-Football. Antes de tocar cuotas, limpieza, prioridad, proveedor o
   visibilidad pública, verificar migraciones, handoffs y contadores actuales;
   nunca gastar cuota solo para una prueba de interfaz.
9. No exponer `.env`, claves, tokens, cookies, datos personales ni logs
   sensibles. Nunca usar `service_role` en el navegador. Mantener la aprobación
   humana para publicar contenido editorial.
10. Para releases futuros, crear primero un commit reproducible, validar con la
    matriz oficial, desplegar solo con autorización humana explícita y registrar
    el SHA asociado al deployment. Evitar desplegar árboles dirty sin guardar
    una referencia recuperable del snapshot exacto.

## Validación de la base importada

- ESLint focalizado sobre los 16 archivos de aplicación/pruebas del snapshot:
  pasa. El `npm run lint` global del checkout sigue encontrando 62 errores
  locales bajo `.codex/` (scripts auxiliares y dos worktrees preservados); esos
  archivos no forman parte de la base Production importada.
- Suite unitaria: 49 archivos, 241 pruebas; typecheck y build pasan. El build
  conserva el aviso upstream `DEP0155` de `@vue/shared`.
- El handoff del source registra smoke HTTP 200 y comprobación del árbol
  accesible de las rutas públicas. No se capturó la consola del navegador; no
  afirmar que el warning de hidratación está certificado como ausente.

## Estado de la limpieza

La rama activa quedó alineada con el source de Production; la etiqueta y el
stash anteriores son archivo de recuperación, no parte de la base activa. El
deployment de Production no se modificó durante esta limpieza. Ver el handoff
`docs/agents/handoffs/2026-10-02-base-produccion-y-reset-42-commits.md` y el
registro operativo en `docs/agents/ESTADO_ACTUAL.md`.
