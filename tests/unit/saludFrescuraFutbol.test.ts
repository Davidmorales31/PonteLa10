import { describe, expect, it } from 'vitest'
import { COMPETENCIAS_MEXICO, construirSaludFrescuraFutbol } from '../../server/utils/saludFrescuraFutbol'

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

  it('resume las competiciones de México con sus propios nombres', () => {
    const ahora = Date.parse('2026-11-19T12:00:00.000Z')
    const salud = construirSaludFrescuraFutbol(
      [{ competition_slug: 'liga-mx', status: 'finished', scheduled_at: '2026-11-15T01:00:00.000Z', checked_at: '2026-11-19T11:00:00.000Z' }],
      [{ competition_slug: 'liga-mx', checked_at: '2026-11-19T11:30:00.000Z' }],
      ahora, 1, 1, 1000, 500, COMPETENCIAS_MEXICO
    )
    expect(salud.calendario.map(grupo => grupo.competencia)).toEqual(['Liga MX', 'Liga MX Femenil'])
    expect(salud.calendario[0]).toMatchObject({ registros: 1 })
    expect(salud.calendario[1]).toMatchObject({ estado: 'sin_datos', registros: 0 })
    expect(salud.tablas[0]).toMatchObject({ estado: 'saludable', registros: 1 })
  })
})
