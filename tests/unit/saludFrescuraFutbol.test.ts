import { describe, expect, it } from 'vitest'
import { construirSaludFrescuraFutbol } from '../../server/utils/saludFrescuraFutbol'

describe('resumen privado de frescura de fútbol', () => {
  it('resume solo conteos y marcas de tiempo, no identificadores de fixture', () => {
    const fixtures = [
      {
        competition_slug: 'liga-betplay', status: 'live', scheduled_at: '2026-10-08T11:00:00.000Z',
        checked_at: '2026-10-08T11:58:00.000Z', provider_fixture_id: 'secreto-no-retornado'
      },
      {
        competition_slug: 'liga-betplay', status: 'scheduled', scheduled_at: '2026-10-08T12:20:00.000Z',
        checked_at: '2026-10-08T11:20:00.000Z'
      }
    ]
    const salud = construirSaludFrescuraFutbol(fixtures, [
      { competition_slug: 'liga-betplay', checked_at: '2026-10-08T10:30:00.000Z' }
    ], Date.parse('2026-10-08T12:00:00.000Z'))

    const ligaCalendario = salud.calendario.find(grupo => grupo.competencia === 'Liga BetPlay')
    expect(ligaCalendario).toMatchObject({ estado: 'atencion', registros: 2, desactualizados: 1 })
    expect(JSON.stringify(salud)).not.toContain('secreto-no-retornado')
    expect(salud.coberturaCompleta).toBe(true)
  })

  it('advierte cuando el número total supera la cobertura analizada', () => {
    const salud = construirSaludFrescuraFutbol([], [], Date.parse('2026-10-08T12:00:00.000Z'), 1100, 1, 1000, 500)
    expect(salud.coberturaCompleta).toBe(false)
  })
})
