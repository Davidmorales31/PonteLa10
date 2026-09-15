# Configuración opcional de Memento

## Propósito y estado

`memento-multiagent` es un MVP experimental para recuperar decisiones y handoffs
compactos. No forma parte del runtime, build, CI ni pruebas de Pont3la10; el
proyecto debe funcionar igual cuando no esté instalado.

Estado al 2026-09-15: instalado y validado localmente con Python 3.11.9,
pipx 1.17.2, `memento-memory` 0.1.0 y `memento-multiagent` 0.1.0. El agente
registrado es `pont3la10-codex`; el proyecto sigue funcionando sin Memento.
Fuente oficial: https://github.com/wmyung/memento-multiagent

## Instalación en Windows

1. Comprobar Python 3.10 o posterior con `python --version`.
2. Instalar pipx para el usuario: `py -m pip install --user pipx` y después
   `py -m pipx ensurepath`. Abrir una terminal nueva.
3. Instalar el núcleo. El README permite `pipx install memento-memory`; esta
   estación quedó fijada al commit oficial verificado:

```powershell
pipx install "git+https://github.com/wmyung/memento.git@fb8e87687a1b67e67cd1dad0b28b21bbf86f84b6"
```

4. El paquete multiagente no estaba publicado en PyPI durante esta instalación.
   Se instaló de forma reproducible desde el commit oficial verificado:

```powershell
pipx install "git+https://github.com/wmyung/memento-multiagent.git@732c367138fd502576cb3bd2374988fb2cfbc422"
```

En Windows se configuró `PYTHONUTF8=1` para evitar errores de salida Unicode
del núcleo bajo CP-1252. No se modificó el Python global ni el runtime de Nuxt.

No usar `pip install` global como sustituto improvisado.

## Inicialización y registro de Codex

La memoria y la configuración viven fuera del repositorio:

- memoria: `C:\Users\juand\.memento`;
- control multiagente: `C:\Users\juand\.memento-multiagent`;
- wiki local del núcleo: `C:\Users\juand\wiki`.

```powershell
memento-multiagent init --memento-command "C:\Users\juand\.local\bin\memento.exe"
memento-multiagent agent add pont3la10-codex --type codex --memory-root "C:\Users\juand\.memento" --skill-root "C:\Users\juand\.codex\skills" --instructions "C:\PONTE LA 10\AGENTS.md"
memento-multiagent agent doctor pont3la10-codex
memento-multiagent instructions print --agent pont3la10-codex
```

El bloque integrado en `AGENTS.md` fue generado por el CLI para este agente y
ajustado únicamente a la política de privacidad y categorías del proyecto.

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
La prueba local devolvió HTTP 200 únicamente en `127.0.0.1`; el proceso se cerró
después de validarlo y no queda ejecutándose como servicio.

## Privacidad, ausencia y desinstalación

Aplicar `docs/agents/MEMORIA.md`. SQLite, configuraciones, auditorías, sesiones,
exports y memoria viven fuera de Git. Si el comando falla, omitir Memento y usar
estado, mapa, Git y código. Para desactivar, dejar de ejecutar el CLI. Para
desinstalar: `pipx uninstall memento-multiagent` y `pipx uninstall memento-memory`.
Eliminar `C:\Users\juand\.memento`, `C:\Users\juand\.memento-multiagent` o la
wiki requiere aprobación. Nunca versionar memoria, SQLite, credenciales, sesiones o logs.
