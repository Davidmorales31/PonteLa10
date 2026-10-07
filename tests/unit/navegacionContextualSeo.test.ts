import { describe, expect, it } from 'vitest'
import {
  construirNavegacionContextualPartidoSeo,
  seleccionarProximoPartidoArticuloSeo
} from '../../utils/editorial/navegacionContextualSeo'
import type { RelacionEntidadSeoPublica } from '../../types/contenidoEditorial'

const entidades = [
  { tipo: 'team' as const, slug: 'cucuta-deportivo', nombre: 'Cúcuta Deportivo', ruta: '/equipos/cucuta-deportivo' },
  { tipo: 'team' as const, slug: 'deportivo-pereira', nombre: 'Deportivo Pereira', ruta: '/equipos/deportivo-pereira' },
  { tipo: 'competition' as const, slug: 'liga-betplay', nombre: 'Liga BetPlay', ruta: '/competiciones/liga-betplay' },
  { tipo: 'match' as const, slug: 'cucuta-vs-pereira-anterior', nombre: 'Cúcuta vs Pereira', ruta: '/partidos/cucuta-vs-pereira-anterior' },
  { tipo: 'match' as const, slug: 'cucuta-vs-pereira', nombre: 'Cúcuta vs Pereira', ruta: '/partidos/cucuta-vs-pereira' },
  { tipo: 'match' as const, slug: 'cucuta-vs-junior', nombre: 'Cúcuta vs Junior', ruta: '/partidos/cucuta-vs-junior' },
  { tipo: 'match' as const, slug: 'santa-fe-vs-pereira', nombre: 'Santa Fe vs Pereira', ruta: '/partidos/santa-fe-vs-pereira' }
]

const actual = {
  slug: 'cucuta-vs-pereira', competencia: 'liga-betplay', fechaIso: '2026-10-12T20:00:00Z',
  local: 'Cúcuta Deportivo', visitante: 'Deportivo Pereira', estado: 'scheduled',
  golesLocal: null, golesVisitante: null, equipoLocalSlug: 'cucuta-deportivo', equipoVisitanteSlug: 'deportivo-pereira'
}

const partidos = [
  { ...actual, slug: 'cucuta-vs-pereira-anterior', fechaIso: '2026-10-08T20:00:00Z', estado: 'FT', golesLocal: 2, golesVisitante: 1 },
  actual,
  { ...actual, slug: 'cucuta-vs-junior', fechaIso: '2026-10-20T20:00:00Z', visitante: 'Junior', estado: 'scheduled', golesLocal: null, golesVisitante: null, equipoVisitanteSlug: 'junior' },
  { ...actual, slug: 'santa-fe-vs-pereira', fechaIso: '2026-10-22T20:00:00Z', local: 'Santa Fe', equipoLocalSlug: 'santa-fe', estado: 'scheduled', golesLocal: null, golesVisitante: null },
  { ...actual, slug: 'cucuta-vs-non-indexable', fechaIso: '2026-10-15T20:00:00Z', estado: 'scheduled', golesLocal: null, golesVisitante: null }
]

describe('navegación contextual SEO', () => {
  it('enlaza equipos, competición, siguiente partido y resultado anterior solo si son indexables', () => {
    const resultado = construirNavegacionContextualPartidoSeo(actual, partidos, entidades)

    expect(resultado.equipoLocal?.ruta).toBe('/equipos/cucuta-deportivo')
    expect(resultado.equipoVisitante?.ruta).toBe('/equipos/deportivo-pereira')
    expect(resultado.competencia?.ruta).toBe('/competiciones/liga-betplay')
    expect(resultado.siguientePartido?.ruta).toBe('/partidos/cucuta-vs-junior')
    expect(resultado.resultadoAnterior?.ruta).toBe('/partidos/cucuta-vs-pereira-anterior')
  })

  it('no usa encuentros de equipos ajenos ni páginas de partido fuera del catálogo indexable', () => {
    const resultado = construirNavegacionContextualPartidoSeo(actual, partidos, entidades.slice(0, 3))

    expect(resultado.siguientePartido).toBeNull()
    expect(resultado.resultadoAnterior).toBeNull()
  })

  it('sugiere para un artículo solo el próximo fixture indexable de su entidad principal', () => {
    const relaciones: RelacionEntidadSeoPublica[] = [
      { tipo: 'team', slug: 'cucuta-deportivo', nombre: 'Cúcuta Deportivo', ruta: '/equipos/cucuta-deportivo', relacion: 'about' }
    ]
    const proximo = seleccionarProximoPartidoArticuloSeo(relaciones, partidos, entidades, Date.parse('2026-10-13T00:00:00Z'))

    expect(proximo).toMatchObject({ ruta: '/partidos/cucuta-vs-junior', nombre: 'Cúcuta Deportivo vs. Junior' })
  })

  it('no inventa entidad principal ni enlaza a un partido no indexable', () => {
    const relacionadas: RelacionEntidadSeoPublica[] = [
      { tipo: 'team', slug: 'cucuta-deportivo', nombre: 'Cúcuta Deportivo', ruta: '/equipos/cucuta-deportivo', relacion: 'related' }
    ]
    const principal: RelacionEntidadSeoPublica[] = [
      { tipo: 'team', slug: 'cucuta-deportivo', nombre: 'Cúcuta Deportivo', ruta: '/equipos/cucuta-deportivo', relacion: 'about' }
    ]

    expect(seleccionarProximoPartidoArticuloSeo(relacionadas, partidos, entidades)).toBeNull()
    expect(seleccionarProximoPartidoArticuloSeo(principal, partidos, entidades.slice(0, 3))).toBeNull()
  })
})
