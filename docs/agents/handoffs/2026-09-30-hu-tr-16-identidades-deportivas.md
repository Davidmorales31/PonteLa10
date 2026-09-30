# Handoff

- **Objetivo de la sesión:** Implementar HU-TR-16 del backlog maestro v4:
  identidad persistente de competencias, equipos y jugadores de fútbol con
  mappings explícitos de proveedor.
- **Completado:** Cinco tablas con UUID/slug internos, constraints e índices;
  RLS y grants por columna, lectura solo de entidades aprobadas y escritura
  reservada a `service_role`. Adaptadores de API-Sports y TheSportsDB resuelven
  únicamente por proveedor + tipo + ID externo en resultados, detalle, marcador
  y clasificación. La consulta pública es opcional, limitada a 100 IDs y 2,5 s;
  sin configuración/fallo conserva los DTO actuales. No se persistieron payloads
  ni escudos. Revisión estática independiente no encontró bloqueos.
- **Archivos modificados:** migración
  `supabase/migrations/20260930074847_hu_tr_16_entidades_deportivas_mappings.sql`,
  prueba `supabase/tests/hu_tr_16_entidades_deportivas_rls_test.sql`, contratos
  y adaptadores en `types/`, `utils/`, `server/api/resultados/`, repositorio
  público `server/utils/repositorioEntidadesDeportivasPublicas.ts` y prueba
  `tests/unit/entidadesDeportivas.test.ts`.
- **Decisiones:** Primer corte limitado a fútbol. No inferir identidad por
  nombre, proveedor ni similitud; mantener los IDs externos por compatibilidad y
  agregar campos internos opcionales. La llave `supabaseKey` pública es el único
  secreto/config usado para lectura; nunca `service_role`. Filas privadas por
  defecto. Sin persistir activos licenciados antes de autorización escrita.
- **Validaciones ejecutadas:** `npm ci`; `npm.cmd run lint`; prueba relacionada
  (14); suite (34 archivos/191 pruebas); `npm.cmd run typecheck`; build con
  `NUXT_PUBLIC_SITE_URL=https://www.pont3la10.com`; `git diff --check`.
  Verificación estática: grants, policies, cinco RLS, 12 pruebas pgTAP con plan
  y conteo coincidentes. Revisor de migración/RLS: sin bloqueos.
- **Fallos:** Ninguna validación local de código falló en la pasada final. `npm
  ci` reportó 15 vulnerabilidades existentes (6 moderadas, 8 altas, 1 crítica);
  build conserva aviso upstream DEP0155 de `@vue/shared`.
- **Pendientes:** No hay Docker/servidor PostgreSQL local, así que pgTAP y lint
  de base no pudieron ejecutarse. No se aplicó la migración ni se consultó una
  base remota. No se poblaron mappings; confirmar derechos/cobertura por
  proveedor antes de persistir o publicar datos/activos licenciados. PR #43 está
  abierta contra `codex/hu-tr-13-direct-answer`; Vercel seguía pendiente al
  abrirla; no aprobada ni fusionada.
- **Siguiente acción exacta:** Verificar Vercel/CI de PR #43 sin aprobar ni
  fusionar. Luego iniciar HU-TR-17 en un worktree aislado basado en
  `origin/codex/hu-tr-16-sports-entities`, leyendo de nuevo AGENTS, estado, mapa,
  memoria y validaciones antes de editar.
- **Commit base:** `7ef0f06fc365452a2ea7afb0dc91a6271d17f78e`.
- **Commit final:** `ba579b8e4d0f4f2a01f8f6e42e0b97dd62cc6d79`.
