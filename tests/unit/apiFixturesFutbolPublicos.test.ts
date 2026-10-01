import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('API SSR pública de fixtures', () => {
  it('consulta sólo snapshots aprobados y los proyecta', () => {
    const ruta = readFileSync(new URL('../../server/api/futbol/fixtures.get.ts', import.meta.url), 'utf8')
    const lectura = readFileSync(new URL('../../server/utils/lecturaSnapshotsFutbol.ts', import.meta.url), 'utf8')
    expect(ruta).toContain('leerSnapshotsFutbolPublicos(cliente')
    expect(ruta).not.toContain('crearProveedoresFutbolConfigurados')
    expect(lectura).toContain(".eq('is_public', true)")
    expect(lectura).toContain(".eq('publication_rights_confirmed', true)")
    expect(lectura).toContain('validarIdentidadesPublicas(cliente, filas)')
    expect(lectura).toContain('proyectarFixtureFutbolPublico(')
  })
})
