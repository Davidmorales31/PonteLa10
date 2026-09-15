# Instrucciones permanentes para agentes

## Proyecto

- Trabajar exclusivamente en `C:\PONTE LA 10`; no usar la copia de OneDrive.
- Comunicarse y nombrar el dominio en español: camelCase para código propio y
  PascalCase descriptivo para componentes Vue. Conservar nombres externos.
- No desarrollar funcionalidades fuera del objetivo activo.

## Inicio obligatorio

1. Leer `AGENTS.md`.
2. Leer `docs/agents/ESTADO_ACTUAL.md`.
3. Leer `docs/agents/MAPA_CONTEXTO.md`.
4. Seleccionar solo los documentos del dominio actual.
5. Revisar el código directamente relacionado.
6. Implementar un cambio acotado.
7. Validar según `docs/agents/VALIDACIONES.md`.
8. Actualizar `ESTADO_ACTUAL.md` y un handoff si el trabajo fue sustancial.

No leer todas las HU o toda la documentación por defecto. Git, migraciones,
código y pruebas prevalecen sobre resúmenes desactualizados.

## Seguridad y cambios existentes

- Inspeccionar Git antes de editar. Preservar cambios ajenos y no borrar,
  revertir, mover, commitear o publicar trabajo sin autorización.
- No exponer secretos, tokens, cookies, claves privadas, contenido de `.env`,
  datos personales ni logs sensibles.
- Validar entradas en servidor. Autorizar endpoints privados y respaldarlos con
  RLS; nunca usar `service_role` en el navegador ni como atajo de usuario.
- Mantener capacidades centralizadas, MFA y auditoría en acciones sensibles.
- La IA asiste; toda publicación requiere aprobación humana.
- Supabase y herramientas opcionales no deben romper la ejecución local cuando
  falten variables o programas.

## Contexto, memoria y continuidad

- Aplicar `docs/agents/MEMORIA.md`; Memento nunca sustituye estado, Git o código.
- Si Memento no está disponible, continuar normalmente. Instalación, registro y
  privacidad se documentan en `docs/agents/CONFIGURACION_MEMENTO.md`.

### Shared Agent Memory

Usar la memoria MEMENTO compartida mediante `memento-multiagent`:

- Antes de trabajo no trivial, ejecutar `memento-multiagent recall "<consulta>"
  --agent pont3la10-codex` y conservar como máximo 3–5 resultados útiles.
- Usar `memento-multiagent deep-recall "<consulta>" --agent pont3la10-codex`
  solo para decisiones, procedimientos o historia que el recall normal no resuelva.
- Antes de cerrar trabajo sustancial, guardar hechos, decisiones, rutas, comandos
  y seguimientos concisos con las categorías autorizadas en `MEMORIA.md`.
- Usar `memento-multiagent remember "<hecho>" --agent pont3la10-codex
  --category <categoria> --keywords "<palabras>"` para hechos compactos.
- Usar `memento-multiagent decide "<tema>" "<decisión>" --agent
  pont3la10-codex --rationale "<motivo>"` para decisiones.
- Pedir autorización antes de editar la wiki, sincronizar, cambiar skills
  globales, borrar memoria o modificar instrucciones de otro agente.
- Nunca guardar claves, tokens, cookies, contraseñas, `.env`, datos privados ni
  conversaciones completas. Marcar contexto obsoleto, duplicado o riesgoso.

## Agentes secundarios

- No crear subagentes para cambios pequeños.
- Usar investigador solo ante información externa o diagnóstico aislado.
- Usar revisor para seguridad, migraciones, autenticación o cambios grandes.
- Delegar solo subtareas independientes con archivos claramente separados.
- Nunca enviar todo el repositorio a todos los agentes.
- El implementador recibe objetivo, restricciones, archivos candidatos y criterios.
- El revisor recibe principalmente diff, riesgos y criterios de aceptación.

## Cierre

- Validar únicamente mediante la matriz oficial y reportar cualquier omisión.
- Actualizar el estado factual y, para trabajo sustancial, partir de
  `docs/agents/plantillas/HANDOFF.md`.
- Entregar: estado, cambios, validaciones con resultado, riesgos y siguiente acción.
