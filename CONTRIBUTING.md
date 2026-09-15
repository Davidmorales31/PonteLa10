# Guia De Contribucion

## Rama Principal

- `main` representa el estado estable.
- Todo cambio relevante entra por Pull Request.
- No se hacen commits directos a `main` salvo inicializacion controlada o emergencia documentada.

## Ramas

Formato recomendado:

```txt
tipo/descripcion-corta
```

Tipos:

- `feat`: nueva funcionalidad.
- `fix`: correccion de bug.
- `ui`: cambios visuales o experiencia.
- `docs`: documentacion.
- `refactor`: mejora interna sin cambio funcional.
- `test`: pruebas.
- `chore`: configuracion, mantenimiento o herramientas.
- `security`: seguridad, permisos o datos sensibles.

Ejemplos:

```txt
feat/panel-editorial
ui/portada-editorial
docs/estandares-github
security/rls-articulos
```

Para trabajo hecho por Codex se permite el prefijo `codex/`, por ejemplo:

```txt
codex/ui-portada-editorial
```

## Commits

Usamos Conventional Commits en espanol:

```txt
tipo(alcance): descripcion corta
```

Ejemplos:

```txt
feat(editorial): agregar portada con tendencias
fix(auth): evitar error local sin variables de Supabase
ui(portada): mejorar jerarquia de articulos
docs(git): definir flujo de ramas y PRs
security(db): agregar politicas RLS para articulos
```

Reglas:

- Usar infinitivo o descripcion clara.
- Mantener el asunto en una linea corta.
- Un commit debe representar una unidad coherente.
- No mezclar cambios visuales, base de datos y documentacion sin razon.

## Pull Requests

Cada PR debe incluir:

- Resumen de cambios.
- Motivo o contexto.
- Capturas si cambia UI.
- Validaciones ejecutadas según `docs/agents/VALIDACIONES.md`.
- Riesgos o pendientes conocidos.
- Referencia a Issue o HU.

## Validacion Local

La única matriz oficial y la definición de terminado viven en
`docs/agents/VALIDACIONES.md`. GitHub Actions usa Node.js 22 LTS y publica
checks separados de lint, pruebas, typecheck y build.
