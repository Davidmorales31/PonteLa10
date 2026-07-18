# Estandares De GitHub

## Repositorio

Configuracion recomendada:

- Rama por defecto: `main`.
- Activar Pull Requests obligatorios antes de mergear a `main`.
- Requerir checks verdes de CI.
- Requerir que la rama este actualizada antes de mergear.
- Bloquear force push en `main`.
- Activar secret scanning y dependabot alerts.

## Branch Protection Para `main`

Reglas recomendadas:

- Require a pull request before merging.
- Require approvals: 1.
- Dismiss stale approvals when new commits are pushed.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Restrict deletions.
- Block force pushes.

Checks requeridos:

- `lint`
- `build`

## Secrets

Guardar en GitHub Actions Secrets:

```txt
NUXT_PUBLIC_SUPABASE_URL
NUXT_PUBLIC_SUPABASE_KEY
```

Nunca guardar en Git:

```txt
.env
service_role_key
tokens de GitHub
claves de OpenAI
credenciales de redes sociales
```

## Pull Requests

Tamanos recomendados:

- Pequeno: hasta 300 lineas modificadas.
- Mediano: hasta 800 lineas modificadas.
- Grande: dividir si mezcla dominios distintos.

Merge recomendado:

- Squash merge para mantener historial limpio.
- El titulo del squash debe seguir Conventional Commits.

## Issues

Usar issues para:

- Bugs reproducibles.
- Features con alcance claro.
- Tareas tecnicas.
- Mejoras de UI/UX.
- Riesgos de seguridad.

## Releases

Cuando el producto este publicado:

- Usar tags `vMAJOR.MINOR.PATCH`.
- Documentar cambios relevantes en releases.
- Separar cambios publicos de cambios internos.
