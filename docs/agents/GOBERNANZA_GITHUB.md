# Gobernanza de GitHub

Verificación de solo lectura realizada el 2026-09-15.

## Estado observado

- Rama predeterminada remota: `main`, commit `24340c0`.
- PR abiertos: ninguno.
- Último CI: ejecución `33892822019`, fallida en `test`; los otros jobs pasaron.
- Ruleset `main` (id `19154369`): existe, pero `enforcement` está `disabled`.
- Exige PR, una aprobación, bloqueo de borrado/force-push y `lint`/`build`;
  no incluye `test`/`typecheck` y sus condiciones no limitan una rama.
- La API pública reporta `main` como no protegida.

## Configuración recomendada, no aplicada

1. Limitar el ruleset a `refs/heads/main` y activarlo.
2. Exigir PR, una aprobación, conversaciones resueltas y rama actualizada.
3. Bloquear borrados y actualizaciones no fast-forward.
4. Exigir `lint`, `test`, `typecheck` y `build` cuando el CI corregido los publique.
5. Mantener secret scanning y Dependabot alerts según disponibilidad.

## Ramas posiblemente obsoletas

Revisar antes de borrar; esta lista no autoriza eliminación:

- `codex/ajustar-login-opcional` (`5701c95`)
- `codex/hu-login-editorial-completo` (`ae1e9a7`)
- `codex/redisenar-home-v1` (`070d479`)
- `codex/supabase-configuracion-inicial` (`185f06e`)

`codex/enlaces-internos-compartir` contiene trabajo local que no forma parte de
este PR; no clasificarla como obsoleta. No se cambió ninguna regla remota durante
esta verificación.
