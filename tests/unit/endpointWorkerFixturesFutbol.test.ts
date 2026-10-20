import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('endpoint interno del worker de fixtures de fútbol', () => {
  it('limpia datos caducados antes de calcular el presupuesto y la siguiente cobertura', () => {
    const ruta = readFileSync(new URL('../../server/api/internal/futbol/fixtures.post.ts', import.meta.url), 'utf8')
    const limpieza = ruta.indexOf('await repositorio.limpiarDatosFutbolCaducados()')
    const limiteDetalles = ruta.indexOf('const maxActualizaciones = Math.min(maxConfigurado, 2)')
    const planCobertura = ruta.indexOf('calcularEsperaSiguienteEjecucion([principal.id], fechaNegocio)')
    expect(limpieza).toBeGreaterThanOrEqual(0)
    expect(limiteDetalles).toBeGreaterThan(limpieza)
    expect(planCobertura).toBeGreaterThan(limiteDetalles)
    expect(ruta).toContain('presupuestoDiarioGoalApi')
    expect(ruta).toContain('cuota_agotada_hasta_mantenimiento_bogota')
  })
})
