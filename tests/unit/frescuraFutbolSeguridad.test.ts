import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const endpoint = readFileSync(
  resolve(process.cwd(), 'server/api/admin/futbol/frescura.get.ts'),
  'utf8'
)

describe('HU-OPS-04 · seguridad del monitor de frescura', () => {
  it('autoriza antes de consultar y evita cachear el estado privado', () => {
    expect(endpoint.indexOf("exigirPermisoEditorial(evento, 'configuracion.ver')"))
      .toBeLessThan(endpoint.indexOf('obtenerClienteSupabaseEditorial(evento)'))
    expect(endpoint).toContain("setResponseHeader(evento, 'Cache-Control', 'private, no-store')")
  })

  it('solo hace lecturas acotadas de filas públicas con derechos confirmados', () => {
    expect(endpoint).toContain(".eq('is_public', true)")
    expect(endpoint).toContain(".eq('publication_rights_confirmed', true)")
    expect(endpoint).toContain('.limit(limiteCalendario)')
    expect(endpoint).toContain('.limit(limiteTablas)')
    expect(endpoint).toMatch(/\.select\('competition_slug,status,scheduled_at,checked_at'/)
    expect(endpoint).toMatch(/\.select\('competition_slug,checked_at'/)
    expect(endpoint).not.toMatch(/\.(?:insert|upsert|update|delete)\s*\(/)
    expect(endpoint).not.toContain('service_role')
    expect(endpoint).not.toMatch(/provider_fixture_id|home_team|away_team|team_name/)
  })
})
