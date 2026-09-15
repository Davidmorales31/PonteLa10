# Matriz oficial de validaciones

Esta es la única fuente para decidir validaciones. Los demás documentos deben
enlazarla y no mantener matrices alternativas.

## Comandos canónicos

```powershell
npm.cmd ci
npm.cmd run lint
npm.cmd run test:unit
npm.cmd run typecheck
npm.cmd run build
git diff --check
```

Prueba relacionada: `npm.cmd run test:unit -- tests/unit/<archivo>.test.ts`.
`test:unit` prepara Nuxt. Debe informar archivos y pruebas descubiertos; código
0 con cero pruebas no cuenta.

| Tipo de cambio | Validación requerida |
| --- | --- |
| Solo documentación | `git diff --check`; comprobar enlaces/rutas y leer el diff. |
| Utilitarios o reglas | lint, pruebas relacionadas y suite completa; typecheck si cambian tipos/contratos. |
| Componentes o páginas | lint, pruebas relacionadas, suite, typecheck, build y validación manual responsive/accesible. |
| Rutas o configuración Nuxt | lint, suite, typecheck, build y validación manual de la ruta. |
| Dependencias o lockfile | `npm ci`, lint, suite, typecheck y build; revisar scripts/advertencias. |
| Supabase o migraciones | lint, pruebas relacionadas, suite, typecheck y build; revisar orden, reversibilidad, grants, RLS y funciones privilegiadas. Verificar una base objetivo solo con autorización. |
| Autenticación o seguridad | lint, pruebas positivas/negativas, suite, typecheck, build, revisión servidor/RLS y validación manual sin secretos. Requiere revisor. |

Antes de un PR sustancial deben pasar lint, suite completa, typecheck y build.
Ejecutar `npm ci` cuando cambien dependencias/lockfile, CI o se necesite paridad
con un job limpio. Si algo no aplica o no puede ejecutarse, registrar motivo,
riesgo y acción pendiente en el handoff; nunca declararlo verde.
