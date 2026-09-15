# Política de memoria de agentes

Memento es local y opcional. `ESTADO_ACTUAL.md`, Git, código y migraciones
siguen siendo las fuentes verificables.

## Categorías permitidas

- `DECISION`: elección confirmada y motivo.
- `CONSTRAINT`: límite permanente.
- `DISCOVERY`: hecho estable comprobado.
- `FAILED_ATTEMPT`: fallo costoso, causa y alternativa.
- `RISK`: riesgo vigente y condición de cierre.
- `HANDOFF`: estado compacto para reanudar.

## Política

- Guardar decisiones, restricciones, rutas canónicas, fallos costosos y próximos
  pasos concisos; añadir fecha, dominio y evidencia cuando ayuden.
- No guardar código/logs completos, transcripciones, conversaciones, secretos,
  tokens, cookies, claves, `.env`, datos personales, respuestas crudas de APIs
  ni información temporal sin valor futuro.
- Antes de trabajo no trivial, recuperar entre 3 y 5 entradas útiles del dominio.
- Usar deep recall solo si recall no resuelve una decisión o historia.
- No sustituir estado, Git o código con memoria.
- Recordar tras trabajo sustancial, no después de cada comando.
- Marcar obsoleto lo contradicho por código, commit o decisión posterior.
- Buscar equivalentes antes de crear; actualizar para evitar duplicados.
- Una decisión nueva referencia y vuelve obsoleta la anterior.
- No borrar ni sincronizar memorias sin aprobación humana.
