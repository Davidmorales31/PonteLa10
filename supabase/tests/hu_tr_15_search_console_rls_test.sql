BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(18);

SELECT ok(
  (SELECT count(*) = 2 FROM public.editorial_permissions
   WHERE permission IN ('searchConsole.ver', 'searchConsole.importar')),
  'las capacidades de Search Console están registradas'
);
SELECT ok(
  (SELECT count(*) = 4 FROM public.editorial_role_permissions
   WHERE role IN ('propietario', 'administrador')
     AND permission IN ('searchConsole.ver', 'searchConsole.importar')),
  'solo propietario y administrador reciben las capacidades'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.search_console_import_runs'::regclass),
  'RLS está habilitado en search_console_import_runs'
);
SELECT ok(
  (SELECT relforcerowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.search_console_import_runs'::regclass),
  'RLS está forzado en search_console_import_runs'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.search_console_metrics_daily'::regclass),
  'RLS está habilitado en search_console_metrics_daily'
);
SELECT ok(
  (SELECT relforcerowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.search_console_metrics_daily'::regclass),
  'RLS está forzado en search_console_metrics_daily'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.search_console_import_runs', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.search_console_metrics_daily', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.search_console_metrics_daily', 'INSERT'),
  'anon no puede leer ni escribir las métricas'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.search_console_import_runs', 'SELECT')
  AND has_table_privilege('authenticated', 'public.search_console_metrics_daily', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.search_console_import_runs', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.search_console_metrics_daily', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.search_console_metrics_daily', 'UPDATE')
  AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid IN (
      'public.search_console_import_runs'::regclass,
      'public.search_console_metrics_daily'::regclass
    ) AND polcmd IN ('a', 'w', '*')
      AND (
        polroles @> ARRAY['authenticated'::regrole::oid]
        OR polroles @> ARRAY[0::oid]
      )
  )
  AND EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.search_console_import_runs'::regclass
      AND polname = 'search console run rpc owner'
      AND polroles @> ARRAY['postgres'::regrole::oid]
  )
  AND EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.search_console_metrics_daily'::regclass
      AND polname = 'search console metrics rpc owner'
      AND polroles @> ARRAY['postgres'::regrole::oid]
  ),
  'authenticated solo lee; solo el dueño fijo de la RPC tiene policy de escritura'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.search_console_metrics_daily', 'DELETE')
  AND NOT has_table_privilege('service_role', 'public.search_console_metrics_daily', 'SELECT')
  AND NOT has_table_privilege('service_role', 'public.search_console_metrics_daily', 'INSERT')
  AND NOT has_table_privilege('service_role', 'public.search_console_metrics_daily', 'UPDATE'),
  'no se conceden borrado ni acceso privilegiado de servidor'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.import_search_console_metrics(jsonb)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.import_search_console_metrics(jsonb)', 'EXECUTE'),
  'solo autenticados pueden llamar la importación protegida'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.get_search_console_opportunities(date,date)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.get_search_console_opportunities(date,date)', 'EXECUTE'),
  'solo autenticados pueden consultar oportunidades'
);
SELECT ok(
  (SELECT prosecdef AND proowner = 'postgres'::regrole::oid FROM pg_catalog.pg_proc
   WHERE oid = 'public.import_search_console_metrics(jsonb)'::regprocedure),
  'la importación SECURITY DEFINER pertenece al rol postgres tras comprobar permiso y MFA'
);
SELECT ok(
  NOT (SELECT prosecdef FROM pg_catalog.pg_proc
       WHERE oid = 'public.get_search_console_opportunities(date,date)'::regprocedure),
  'la consulta aplica RLS como SECURITY INVOKER'
);
SELECT ok(
  (SELECT count(*) = 1 FROM pg_catalog.pg_trigger
   WHERE tgname = 'search_console_import_run_audit' AND NOT tgisinternal),
  'cada lote crea un único registro de auditoría'
);
SELECT ok(
  (SELECT count(*) = 1 FROM pg_catalog.pg_trigger
   WHERE tgname = 'search_console_metrics_date_guard' AND NOT tgisinternal),
  'las métricas rechazan fechas futuras también en modificaciones'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.audit_search_console_import_run()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.audit_search_console_import_run()', 'EXECUTE'),
  'la función privilegiada de auditoría no es invocable directamente'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'search_console_import_runs'
      AND column_name IN ('query', 'page_url', 'source_file_name', 'file_name')
  ),
  'el historial no duplica datos de consulta ni el nombre del archivo'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.search_console_metrics_daily'::regclass
      AND conname = 'search_console_daily_dimensions_unique'
      AND contype = 'u'
  ),
  'la tabla deduplica por fecha, consulta y página'
);

SELECT * FROM finish();
ROLLBACK;
