# Configuración opcional de Memento

## Propósito y estado

`memento-multiagent` es un MVP experimental para recuperar decisiones y handoffs
compactos. No forma parte del runtime, build, CI ni pruebas de Pont3la10; el
proyecto debe funcionar igual cuando no esté instalado.

Estado al 2026-09-15: no instalado. `python`, `pipx` y `memento-multiagent`
no están disponibles en `PATH`; por seguridad no se modificó Python global.
Fuente oficial: https://github.com/wmyung/memento-multiagent

## Instalación en Windows

1. Instalar Python y `pipx` por el mecanismo administrado del equipo.
2. En una terminal nueva comprobar `python --version`, `pipx --version` y
   `memento-multiagent --help`.
3. Cuando `pipx` exista, ejecutar `pipx install memento-multiagent`.

No usar `pip install` global como sustituto improvisado.

## Inicialización y registro de Codex

Usar memoria del usuario fuera del repositorio. Reemplazar `<USUARIO>`:

```powershell
memento-multiagent init
memento-multiagent agent add pont3la10-codex --type codex --memory-root "C:\Users\<USUARIO>\.memento" --skill-root "C:\Users\<USUARIO>\.codex\skills" --instructions "C:\PONTE LA 10\AGENTS.md"
memento-multiagent agent doctor pont3la10-codex
memento-multiagent instructions print --agent pont3la10-codex
```

Solo después de instalar y registrar se pega el bloque generado. No inventarlo.

## Recall, deep recall, remember, decide y dashboard

```powershell
memento-multiagent recall "<dominio y objetivo>" --agent pont3la10-codex
memento-multiagent deep-recall "<decisión o historia>" --agent pont3la10-codex
memento-multiagent remember "<hecho breve>" --agent pont3la10-codex --category <categoria> --keywords "<palabras>"
memento-multiagent decide "<tema>" "<decisión>" --agent pont3la10-codex --rationale "<motivo>"
memento-multiagent web
```

El dashboard oficial se liga por defecto a `http://127.0.0.1:4173/`. No activar
servidor remoto, GitHub sync, Supabase sync, wiki ni exportaciones automáticas.

## Privacidad, ausencia y desinstalación

Aplicar `docs/agents/MEMORIA.md`. SQLite, configuraciones, auditorías, sesiones,
exports y memoria viven fuera de Git. Si el comando falla, omitir Memento y usar
estado, mapa, Git y código. Para desactivar, dejar de ejecutar el CLI. Para
desinstalar: `pipx uninstall memento-multiagent`. Eliminar memoria requiere
aprobación. Nunca versionar memoria, SQLite, credenciales, sesiones o logs.
