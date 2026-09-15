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
- Si `memento-multiagent` está disponible, antes de trabajo no trivial ejecutar
  un recall específico del dominio y usar como máximo 3–5 resultados útiles.
- Usar deep recall solo para historia o decisiones no resueltas; ignorar y marcar
  contexto obsoleto o duplicado.
- Tras trabajo sustancial, recordar únicamente decisiones, restricciones,
  descubrimientos, riesgos, fallos costosos o handoffs compactos.
- Si Memento no está disponible, continuar normalmente. Instalación, registro y
  privacidad se documentan en `docs/agents/CONFIGURACION_MEMENTO.md`.

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
