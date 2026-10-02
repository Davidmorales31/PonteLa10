import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('endpoint interno del worker de fixtures de fútbol', () => {
  it('limpia los datos diarios caducados antes de diferir una carga inicial nocturna', () => {
    const ruta = readFileSync(new URL('../../server/api/internal/futbol/fixtures.post.ts', import.meta.url), 'utf8')
    const limpieza = ruta.indexOf('await repositorio.limpiarDatosFutbolCaducados()')
    const barreraNocturna = ruta.indexOf('if (debeDiferirCargaInicialFutbol(ahora))')
    expect(limpieza).toBeGreaterThanOrEqual(0)
    expect(barreraNocturna).toBeGreaterThan(limpieza)
    expect(ruta).toContain("estado: 'diferido_ventana_sin_partidos'")
    expect(ruta).toContain('solicitudes: 0')
  })
})
