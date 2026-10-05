import { describe, expect, it } from 'vitest'
import { asignarSlugsPartidosSeo, buscarPartidoSeoPorSlug, crearSlugBasePartido } from '../../utils/partidosSeo'

const partidos = [
  {
    provider: 'dimayor',
    provider_fixture_id: 'dimayor-2026-ii-13-cucuta-pereira',
    competition_slug: 'liga-betplay',
    season: '2026-II',
    round_name: 'Fecha 13',
    home_team: 'Cúcuta Deportivo',
    away_team: 'Deportivo Pereira'
  }
]

describe('identidad SEO de partidos', () => {
  it('genera un slug legible, sin tildes y estable ante cambios de fecha', () => {
    expect(crearSlugBasePartido(partidos[0]!)).toBe('cucuta-deportivo-vs-deportivo-pereira')
    expect(asignarSlugsPartidosSeo(partidos)[0]?.slug).toBe('cucuta-deportivo-vs-deportivo-pereira')
  })

  it('añade un sufijo estable de competición y fixture cuando existe una colisión', () => {
    const repetidos = [
      ...partidos,
      { ...partidos[0]!, provider_fixture_id: 'dimayor-2027-i-13-cucuta-pereira', season: '2027-I' }
    ]
    const rutas = asignarSlugsPartidosSeo(repetidos).map(partido => partido.slug)
    expect(new Set(rutas).size).toBe(2)
    expect(rutas.every(ruta => ruta.startsWith('cucuta-deportivo-vs-deportivo-pereira-liga-betplay-'))).toBe(true)
    expect(rutas[0]).not.toContain('2026-10-04')
  })

  it('no resuelve un slug base ambiguo al primer fixture coincidente', () => {
    const repetidos = asignarSlugsPartidosSeo([
      ...partidos,
      { ...partidos[0]!, provider_fixture_id: 'dimayor-2027-i-13-cucuta-pereira', season: '2027-I' }
    ])
    expect(buscarPartidoSeoPorSlug(repetidos, 'cucuta-deportivo-vs-deportivo-pereira')).toBeUndefined()
    expect(buscarPartidoSeoPorSlug(repetidos, repetidos[0]!.slug)).toBe(repetidos[0])
  })
})
