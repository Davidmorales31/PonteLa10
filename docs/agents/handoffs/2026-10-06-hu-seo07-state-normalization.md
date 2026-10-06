# Handoff

- **Objetivo de la sesión:** corregir la presentación de resultados recientes y
  partidos en vivo en fichas públicas de equipos cuando fixtures usan estados
  brutos del proveedor.
- **Completado:** lógica ahora usa `etiquetaEstadoSeoPartido` para
  clasificar partidos en vivo, próximos y finalizados. La prueba reproduce
  `finished` y `2H`, descarta partidos programados sin marcador, filas sin goles
  y resultados con fecha futura. PR #67 se integró como
  `c55f56061ba4d6860871f4094d5eb6373fb91c9c`; Production quedó Ready y la API/
  página respondieron 200 con cinco resultados recientes, incluido Atlético
  Nacional 3–1 Junior. El HTML renderizado contiene el marcador.
- **Archivos modificados:** `server/utils/equiposLigaPublicos.ts`,
  `tests/unit/equiposLigaPublicos.test.ts`,
  `docs/agents/ESTADO_ACTUAL.md`, handoff de esta reparación y handoff de la
  implementación inicial.
- **Decisiones:** mantener sin cambios el estado/proveedor original en la API;
  emplear la taxonomía existente `etiquetaEstadoSeoPartido` al clasificar
  resultados. El resultado real que motivó el cambio es Atlético Nacional 3–1
  Junior, del 2026-09-30, visible en datos públicos con `estado=finished`.
- **Validaciones ejecutadas:** lint (0); suite completa (74 archivos/363
  pruebas, 0); typecheck (0); build de producción en snapshot aislado (0);
  `git diff --check` (0); CI main de PR #67 (lint/test/typecheck/build, éxito);
  Vercel Preview build y smoke real de Production.
- **Fallos:** preview Vercel no dispone de variables públicas Supabase y no pudo
  validar datos reales; Production sí las tiene, no se trasladaron credenciales.
  Build Windows en carpeta activa puede fallar por `EPERM` de Sharp; repetir en
  snapshot aislado. Permanece `DEP0155` upstream de `@vue/shared`.
- **Pendientes:** ninguno para esta reparación. Vercel Preview no tiene
  variables públicas de Supabase y responde 503; no fue necesario trasladar
  credenciales porque Production se validó directamente.
- **Siguiente acción exacta:** continuar con la siguiente HU aprobada desde
  `main` en `c55f560`; no cambiar variables Vercel ni datos Supabase por esto.
- **Commit base:** `f24d4ac1192bf33ce90e40bd4e0a9c1fb84461d5` (PR #66 integrado).
- **Commit final:** `c55f56061ba4d6860871f4094d5eb6373fb91c9c` (merge de PR #67).
