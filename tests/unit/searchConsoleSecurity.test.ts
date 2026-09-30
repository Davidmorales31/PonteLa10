import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migracion = readFileSync(new URL(
  '../../supabase/migrations/20260930112700_hu_tr_15_search_console_metrics.sql',
  import.meta.url
), 'utf8')
const importacion = migracion.slice(
  migracion.indexOf('create or replace function public.import_search_console_metrics'),
  migracion.indexOf('create or replace function public.get_search_console_opportunities')
)
const consulta = migracion.slice(
  migracion.indexOf('create or replace function public.get_search_console_opportunities'),
  migracion.indexOf('revoke all on function public.import_search_console_metrics')
)

describe('seguridad Search Console', () => {
  it('mantiene ambas tablas administrativas con RLS forzada y privilegios explícitos', () => {
    expect(migracion.match(/enable row level security;/g)).toHaveLength(2)
    expect(migracion.match(/force row level security;/g)).toHaveLength(2)
    expect(migracion).toContain('from public, anon, authenticated, service_role')
    expect(migracion).toContain('grant select on public.search_console_import_runs to authenticated')
    expect(migracion).toContain('grant select on public.search_console_metrics_daily to authenticated')
    expect(migracion).not.toMatch(/grant [^;]*\b(insert|update)\b[^;]* to authenticated/i)
    expect(migracion).toContain("public.has_editorial_permission('searchConsole.importar')")
    expect(migracion).toContain("public.has_editorial_permission('searchConsole.ver')")
    expect(migracion).toContain('public.has_aal2()')
  })

  it('centraliza escrituras en una RPC definer protegida y mantiene la lectura invoker', () => {
    expect(importacion).toContain('security definer')
    expect(consulta).toContain('security invoker')
    expect(consulta).not.toContain('security definer')
    expect(migracion).toContain('set search_path = \'\'')
    expect(migracion).toContain('alter function public.import_search_console_metrics(jsonb) owner to postgres')
    expect(migracion).toContain('on public.search_console_metrics_daily for all to postgres')
    expect(migracion).toContain('on public.search_console_import_runs for all to postgres')
    expect(migracion).toContain('revoke all on function public.import_search_console_metrics(jsonb) from public, anon, authenticated, service_role')
    expect(migracion).toContain('grant execute on function public.import_search_console_metrics(jsonb) to authenticated')
    expect(migracion).not.toContain('p_duplicate_rows')
    expect(migracion).toContain('on conflict (metric_date, query, page_url) do update')
    expect(importacion).toContain('insert into public.search_console_import_runs')
    expect(importacion).toContain('insert into public.search_console_metrics_daily')
    expect(importacion).toContain("not public.has_editorial_permission('searchConsole.importar')")
    expect(importacion).toContain('not public.has_aal2()')
  })

  it('audita solo conteos y periodo, no copia nombres de archivo ni consultas', () => {
    expect(migracion).toContain("'search_console_import'")
    expect(migracion).toContain("'rowsProcessed', new.rows_processed")
    expect(migracion).toContain("'dateFrom', new.date_from")
    expect(migracion).toContain('revoke all on function public.audit_search_console_import_run() from public, anon, authenticated, service_role')
    expect(migracion).not.toMatch(/source_file_name|filename|file_name/i)
    const auditoria = migracion.slice(
      migracion.indexOf('create or replace function public.audit_search_console_import_run'),
      migracion.indexOf('revoke all on function public.audit_search_console_import_run')
    )
    expect(auditoria).not.toMatch(/query|page_url|email|correo/i)
  })

  it('solo persiste consultas normalizadas, páginas internas HTTPS y métricas reales del importador', () => {
    expect(migracion).toContain('query = lower(btrim(query))')
    expect(migracion).toContain("page_url ~ '^https://(www\\.)?pont3la10\\.com")
    expect(migracion).toContain('false,\n    v_run_id')
    expect(importacion).toContain('fila.metric_date > current_date')
    expect(migracion).toContain('search_console_query_no_email')
    expect(migracion).toContain('search_console_query_no_long_id')
    expect(migracion).toContain('search_console_page_url_no_email')
    expect(migracion).toContain('create trigger search_console_metrics_date_guard')
    expect(migracion).toContain('new.metric_date > current_date')
  })
})
