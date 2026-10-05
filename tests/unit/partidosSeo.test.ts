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
    away_team: 'Deportivo Pereira',
    created_at: '2026-01-02T10:00:00Z'
  }
]

describe('identidad SEO de partidos', () => {
  it('genera un slug legible, sin tildes y estable ante cambios de fecha', () => {
    expect(crearSlugBasePartido(partidos[0]!)).toBe('cucuta-deportivo-vs-deportivo-pereira')
    expect(asignarSlugsPartidosSeo(partidos)[0]?.slug).toBe('cucuta-deportivo-vs-deportivo-pereira')
  })

  it('conserva la URL histórica corta y usa competencia y temporada para la revancha', () => {
    const repetidos = [
      { ...partidos[0]!, provider_fixture_id: 'dimayor-2027-i-13-cucuta-pereira', season: '2027-I', created_at: '2026-01-03T10:00:00Z' },
      partidos[0]!
    ]
    const asignados = asignarSlugsPartidosSeo(repetidos)
    const rutas = asignados.map(partido => partido.slug)
    expect(new Set(rutas).size).toBe(2)
    expect(rutas).toContain('cucuta-deportivo-vs-deportivo-pereira')
    expect(rutas).toContain('cucuta-deportivo-vs-deportivo-pereira-liga-betplay-2027-i')
    expect(buscarPartidoSeoPorSlug(asignados, 'cucuta-deportivo-vs-deportivo-pereira')).toMatchObject({
      provider_fixture_id: partidos[0]!.provider_fixture_id
    })
  })

  it('resuelve los slugs largos ya emitidos al fixture original', () => {
    const repetidos = asignarSlugsPartidosSeo([
      partidos[0]!,
      { ...partidos[0]!, provider_fixture_id: 'dimayor-2027-i-13-cucuta-pereira', season: '2027-I', created_at: '2026-01-03T10:00:00Z' }
    ])
    const aliasAnterior = [
      'cucuta-deportivo-vs-deportivo-pereira', 'liga-betplay', '2027-i', 'fecha-13',
      'dimayor', 'dimayor-2027-i-13-cucuta-pereira'
    ].join('-')

    expect(buscarPartidoSeoPorSlug(repetidos, aliasAnterior)).toMatchObject({
      provider_fixture_id: 'dimayor-2027-i-13-cucuta-pereira',
      slug: 'cucuta-deportivo-vs-deportivo-pereira-liga-betplay-2027-i'
    })
  })

  it('distingue más de dos cruces en la misma competición y temporada con una clave estable', () => {
    const base = partidos[0]!
    const repetidos = [
      { ...base, provider_fixture_id: 'fixture-b', created_at: '2026-01-01T00:00:00Z' },
      { ...base, provider_fixture_id: 'fixture-c', created_at: '2026-01-01T00:00:00Z' },
      { ...base, provider_fixture_id: 'fixture-a', created_at: '2026-01-01T00:00:00Z' }
    ]
    const primeraAsignacion = asignarSlugsPartidosSeo(repetidos)
    const segundaAsignacion = asignarSlugsPartidosSeo([...repetidos].reverse())
    const slugPorId = (asignados: typeof primeraAsignacion) => Object.fromEntries(
      asignados.map(partido => [partido.provider_fixture_id, partido.slug])
    )

    expect(new Set(primeraAsignacion.map(partido => partido.slug)).size).toBe(3)
    expect(primeraAsignacion.map(partido => partido.provider_fixture_id)).toEqual([
      'fixture-b',
      'fixture-c',
      'fixture-a'
    ])
    expect(slugPorId(primeraAsignacion)).toEqual(slugPorId(segundaAsignacion))
    expect(primeraAsignacion.every(partido => partido.slug.length < 100)).toBe(true)
  })
})
