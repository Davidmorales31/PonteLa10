# Gobernanza de GitHub

Verificación de solo lectura realizada el 2026-09-15.

## Estado observado

- Rama predeterminada remota: `main`, commit `24340c0`.
- PR abierto: Fase 0, borrador `#4`.
- Último CI: ejecución `34996033049`, con `lint`, `test`, `typecheck` y `build` aprobados.
- Ruleset `main` (id `19154369`): activo y limitado a `refs/heads/main`.
- Exige PR, una aprobación, conversaciones resueltas, rama actualizada y los
  cuatro checks de CI; bloquea borrado y actualizaciones no fast-forward.

## Configuración aplicada

El 2026-09-15 se activó el ruleset después de que los cuatro checks pasaran en
el PR. Secret scanning y Dependabot alerts no se modificaron.

## Ramas posiblemente obsoletas

Revisar antes de borrar; esta lista no autoriza eliminación:

- `codex/ajustar-login-opcional` (`5701c95`)
- `codex/hu-login-editorial-completo` (`ae1e9a7`)
- `codex/redisenar-home-v1` (`070d479`)
- `codex/supabase-configuracion-inicial` (`185f06e`)

`codex/enlaces-internos-compartir` contiene trabajo local que no forma parte de
este PR; no clasificarla como obsoleta. `codex/fase-0-gobernanza` es la rama del
PR activo y tampoco debe eliminarse.
