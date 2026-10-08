import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationSearchConsole = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261007095219_hu_ed21_search_console.sql'),
  'utf8'
)
const migrationOportunidades = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261007122917_hu_gro04_historial_oportunidades.sql'),
  'utf8'
)
const rutaSearchConsole = readFileSync(
  resolve(process.cwd(), 'server/api/admin/search-console.get.ts'),
  'utf8'
)

function bloqueFuncion(esquema: string, nombre: string): string {
  const inicio = migrationSearchConsole.indexOf('create or replace function ' + esquema + '.' + nombre)
  if (inicio < 0) return ''
  const cierre = migrationSearchConsole.indexOf('$$;', inicio)
  return cierre < 0 ? '' : migrationSearchConsole.slice(inicio, cierre + 3)
}

describe('HU-ED-21 · seguridad del esquema Search Console', () => {
  it('mantiene la detección privada, de solo lectura y acotada a contenido publicado', () => {
    expect(rutaSearchConsole).toContain("exigirPermisoEditorial(evento, 'contenido.verBorradores')")
    expect(rutaSearchConsole).toContain('setResponseHeader(evento, \'Cache-Control\', \'private, no-store\')')
    const inicioHandler = rutaSearchConsole.indexOf('export default defineEventHandler(async (evento) => {')
    const handler = rutaSearchConsole.slice(inicioHandler)
    const indiceCachePrivado = handler.indexOf('setResponseHeader(evento, \'Cache-Control\', \'private, no-store\')')
    const indiceGuard = handler.indexOf("await exigirPermisoEditorial(evento, 'contenido.verBorradores')")
    expect(indiceCachePrivado).toBeGreaterThanOrEqual(0)
    expect(indiceGuard).toBeGreaterThan(0)
    expect(indiceCachePrivado).toBeLessThan(indiceGuard)
    expect(rutaSearchConsole).toContain(".eq('status', 'published')")
    expect(rutaSearchConsole).toContain(".not('published_version_id', 'is', null)")
    expect(rutaSearchConsole).toContain(".eq('status', 'confirmed')")
    expect(rutaSearchConsole).toContain(".eq('relation_type', 'about')")
    expect(rutaSearchConsole).not.toContain('service_role')
    expect(rutaSearchConsole).not.toMatch(/\.\s*(?:insert|update|upsert|delete|rpc)\s*\(/i)
  })

  it('protege las tablas con RLS y revoca escrituras directas', () => {
    for (const tabla of [
      'editorial_search_console_reports',
      'editorial_search_console_metrics',
      'editorial_search_console_triage'
    ]) {
      expect(migrationSearchConsole).toContain('alter table public.' + tabla + ' enable row level security')
    }
    expect(migrationSearchConsole).toMatch(/revoke all privileges on table[\s\S]+from public, anon, authenticated, service_role;/)
    expect(migrationSearchConsole).toMatch(/grant select on table[\s\S]+to authenticated;/)
    expect(migrationSearchConsole).not.toMatch(/grant\s+(?:insert|update|delete)\s+on table public\.editorial_search_console_/i)
    expect(migrationSearchConsole).toContain('revoke all on schema editorial_private from public, anon, authenticated, service_role')
    expect(migrationSearchConsole).toContain('grant usage on schema editorial_private to authenticated')
  })

  it('mantiene importación y triage como funciones invoker con permisos editoriales y MFA', () => {
    for (const nombre of [
      'import_editorial_search_console_report',
      'save_editorial_search_console_triage'
    ]) {
      const funcionPublica = bloqueFuncion('public', nombre)
      const funcionPrivada = bloqueFuncion('editorial_private', nombre)
      expect(funcionPublica).toContain('security invoker')
      expect(funcionPrivada).toContain('security definer')
      expect(funcionPrivada).toContain("public.has_editorial_permission('contenido.editarTodos')")
      expect(funcionPrivada).toContain('public.has_aal2()')
      expect(funcionPrivada).toContain('auth.uid()')
      expect(migrationSearchConsole).toContain('revoke all on function editorial_private.' + nombre + '(')
      expect(migrationSearchConsole).toContain('revoke all on function public.' + nombre + '(')
    }
  })

  it('limita las páginas importadas al dominio propio y audita sin guardar la consulta en metadata', () => {
    expect(migrationSearchConsole).toContain("'^https://(www\\.)?pont3la10\\.com/'")
    expect(migrationSearchConsole).toContain('create policy "editorial team can read search console metrics"')
    expect(migrationSearchConsole).not.toContain('create policy "editors with MFA can update search console decisions"')
    expect(migrationSearchConsole).toContain('create or replace function editorial_private.import_editorial_search_console_report')
    expect(bloqueFuncion('editorial_private', 'audit_editorial_search_console_change')).toContain('security definer')
    expect(bloqueFuncion('editorial_private', 'audit_editorial_search_console_change')).not.toContain('new.query')
  })
})

describe('HU-GRO-04 · historial de decisiones Search Console', () => {
  it('protege el historial con RLS y solo concede lectura al equipo editorial', () => {
    expect(migrationOportunidades).toContain('alter table public.editorial_search_console_triage_history enable row level security')
    expect(migrationOportunidades).toMatch(/revoke all privileges on table public\.editorial_search_console_triage_history[\s\S]+from public, anon, authenticated, service_role;/)
    expect(migrationOportunidades).toContain('grant select on table public.editorial_search_console_triage_history to authenticated')
    expect(migrationOportunidades).toContain("public.has_editorial_permission('contenido.verBorradores')")
    expect(migrationOportunidades).not.toMatch(/grant\s+(?:insert|update|delete)\s+on table public\.editorial_search_console_triage_history/i)
    expect(migrationOportunidades).toContain('on delete restrict')
  })

  it('preserva decisiones previas y agrega las nuevas sin quitar compatibilidad', () => {
    expect(migrationOportunidades).toContain("'optimizar', 'actualizar', 'consolidar', 'ignorar'")
    expect(migrationOportunidades).toContain("'mejorar_titulo', 'ampliar_respuesta', 'fusionar', 'no_actuar'")
    expect(migrationOportunidades).toContain("log.action = 'seo.search_console.accion_registrada'")
    expect(migrationOportunidades).toContain("log.metadata ->> 'huellaConsulta'")
    expect(migrationOportunidades).toContain('pg_catalog.strpos(pg_catalog.btrim(p_note), pg_catalog.chr(92)) > 0')
    expect(migrationOportunidades).toContain("pg_catalog.btrim(p_note) ~ '[[:cntrl:]]'")
  })

  it('expone si la vista llegó al tope de historial sin descartar su conteo real', () => {
    expect(rutaSearchConsole).toContain(".select('triage_key,action,note,changed_at', { count: 'exact' })")
    expect(rutaSearchConsole).toContain('historialLimitado: historial.length < historialTotal')
    expect(rutaSearchConsole).toContain('historialCargado: 0')
    expect(rutaSearchConsole).toContain('historialTotal: 0')
  })

  it('registra cambios mediante un trigger privado y evita volver a grabar una decisión idéntica', () => {
    const inicio = migrationOportunidades.indexOf(
      'create or replace function editorial_private.record_editorial_search_console_triage_history'
    )
    const fin = migrationOportunidades.indexOf('$$;', inicio)
    const funcion = migrationOportunidades.slice(inicio, fin + 3)
    expect(funcion).toContain('security definer')
    expect(funcion).toContain("set search_path = ''")
    expect(funcion).toContain('new.action is not distinct from old.action')
    expect(migrationOportunidades).toContain('after insert or update on public.editorial_search_console_triage')
    expect(migrationOportunidades).toContain('revoke all on function editorial_private.record_editorial_search_console_triage_history()')
  })
})
