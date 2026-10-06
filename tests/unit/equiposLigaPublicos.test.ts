import { describe, expect, it } from 'vitest'
import { crearMapaSlugsEquiposPublicos, normalizarClaveEquipoLiga } from '../../server/utils/partidosSeoPublicos'
import {
  proyectarEquiposLigaPublicos,
  seleccionarPartidosEnVivoEquipo,
  seleccionarResultadosRecientesEquipo,
  seleccionarSedeVerificada
} from '../../server/utils/equiposLigaPublicos'
import type { PartidoSeoPublico } from '../../server/utils/partidosSeoPublicos'

interface FilaClasificacionPrueba {
  competition_slug: string
  season: string
  phase: string
  team_key: string
  team_name: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  team_logo_url: string | null
  checked_at: string
  is_public: boolean
  publication_rights_confirmed: boolean
}

function filaClasificacion(overrides: Partial<FilaClasificacionPrueba> = {}): FilaClasificacionPrueba {
  return {
    competition_slug: 'liga-betplay',
    season: '2026-II',
    phase: 'Todos contra todos',
    team_key: 'atletico-nacional',
    team_name: 'Atlético Nacional',
    position: 1,
    played: 12,
    won: 8,
    drawn: 2,
    lost: 2,
    goals_for: 22,
    goals_against: 10,
    goal_difference: 12,
    points: 26,
    team_logo_url: '/images/escudos/liga-colombiana/atletico-nacional.png',
    checked_at: '2026-10-06T15:00:00.000Z',
    is_public: true,
    publication_rights_confirmed: true,
    ...overrides
  }
}

function partidoPrueba(overrides: Partial<PartidoSeoPublico> = {}): PartidoSeoPublico {
  return {
    slug: 'atletico-nacional-vs-millonarios',
    competencia: 'liga-betplay',
    temporada: '2026-II',
    jornada: 'Fecha 1',
    fechaIso: '2026-10-01T20:00:00.000Z',
    local: 'Atlético Nacional',
    visitante: 'Millonarios',
    estado: 'FINALIZADO',
    golesLocal: 1,
    golesVisitante: 0,
    estadio: 'Atanasio Girardot',
    ciudad: 'Medellín',
    fuenteOficialUrl: 'https://dimayor.com.co/programacion/fixture',
    escudoLocal: null,
    escudoVisitante: null,
    verificadoEn: '2026-10-06T15:00:00.000Z',
    ...overrides
  }
}

describe('entidades públicas de equipos colombianos', () => {
  it('reconoce las diferencias de nombre confirmadas entre tabla y fixtures públicos', () => {
    const equivalencias = [
      ['Alianza Valledupar', 'Alianza'],
      ['Barranquilla FC', 'Barranquilla'],
      ['Bogotá FC', 'Bogotá'],
      ['Envigado', 'Envigado FC'],
      ['Fortaleza', 'Fortaleza CEIF'],
      ['Independiente Valle del Cauca', 'Ind. Yumbo'],
      ['Internacional FC de Palmira', 'Internacional Palmira'],
      ['Jaguares', 'Jaguares de Córdoba FC'],
      ['Leones', 'Leones FC'],
      ['Patriotas', 'Patriotas Boyacá'],
      ['Tigres', 'Tigres FC']
    ]

    for (const [tabla, fixture] of equivalencias) {
      expect(normalizarClaveEquipoLiga(tabla), tabla).toBe(normalizarClaveEquipoLiga(fixture))
    }
  })

  it('proyecta equipos solo desde filas con visibilidad y derechos confirmados', () => {
    const equipos = proyectarEquiposLigaPublicos([
      filaClasificacion(),
      filaClasificacion({ phase: 'Fase adicional', checked_at: '2026-10-05T15:00:00.000Z' }),
      filaClasificacion({ team_key: 'privado-fc', team_name: 'Privado FC', is_public: false }),
      filaClasificacion({ team_key: 'sin-derechos', team_name: 'Sin derechos FC', publication_rights_confirmed: false }),
      filaClasificacion({ team_key: 'slug invalido', team_name: 'Slug inválido FC' }),
      filaClasificacion({ competition_slug: 'competicion-desconocida', team_key: 'desconocido-fc' })
    ])

    expect(equipos).toHaveLength(1)
    expect(equipos[0]).toMatchObject({
      slug: 'atletico-nacional',
      nombre: 'Atlético Nacional',
      escudo: '/images/escudos/liga-colombiana/atletico-nacional.png',
      clasificaciones: [
        { competencia: 'liga-betplay', temporada: '2026-II', fase: 'Todos contra todos', posicion: 1 },
        { competencia: 'liga-betplay', temporada: '2026-II', fase: 'Fase adicional', posicion: 1 }
      ]
    })
    expect(equipos[0]?.actualizadoEn).toBe('2026-10-06T15:00:00.000Z')
  })

  it('resuelve slugs para partidos solo desde identidades públicas no ambiguas', () => {
    const slugs = crearMapaSlugsEquiposPublicos([
      { team_key: 'fortaleza-ceif', team_name: 'Fortaleza CEIF', team_logo_url: null, is_public: true, publication_rights_confirmed: true },
      { team_key: 'privado-fc', team_name: 'Privado FC', team_logo_url: null, is_public: false, publication_rights_confirmed: true },
      { team_key: 'no-autorizado', team_name: 'Sin derechos', team_logo_url: null, is_public: true, publication_rights_confirmed: false },
      { team_key: 'slug invalido', team_name: 'Slug inválido', team_logo_url: null, is_public: true, publication_rights_confirmed: true },
      { team_key: 'una-identidad', team_name: 'Ambiguo FC', team_logo_url: null, is_public: true, publication_rights_confirmed: true },
      { team_key: 'otra-identidad', team_name: 'Ambiguo FC', team_logo_url: null, is_public: true, publication_rights_confirmed: true }
    ])

    expect(slugs.get('fortaleza')).toBe('fortaleza-ceif')
    expect(slugs.has('privado fc')).toBe(false)
    expect(slugs.has('sin derechos')).toBe(false)
    expect(slugs.has('slug invalido')).toBe(false)
    expect(slugs.has('ambiguo fc')).toBe(false)
  })

  it('muestra la sede solo desde un partido de local con fuente oficial, priorizando la verificación fresca', () => {
    const sede = seleccionarSedeVerificada([
      partidoPrueba({ slug: 'visita', local: 'Millonarios', visitante: 'Atlético Nacional' }),
      partidoPrueba({ slug: 'sin-fuente', fuenteOficialUrl: null, verificadoEn: '2026-10-06T15:30:00.000Z' }),
      partidoPrueba({ slug: 'mas-reciente', estadio: 'Estadio actualizado', verificadoEn: '2026-10-06T15:00:00.000Z' }),
      partidoPrueba({ slug: 'futura', estadio: 'Estadio no confirmado', verificadoEn: '2026-10-07T15:00:00.000Z' })
    ], 'atletico nacional', Date.parse('2026-10-06T16:00:00.000Z'))

    expect(sede?.slug).toBe('mas-reciente')
    expect(sede?.estadio).toBe('Estadio actualizado')
  })

  it('no muestra una sede si la única verificación disponible está en el futuro', () => {
    expect(seleccionarSedeVerificada([
      partidoPrueba({ verificadoEn: '2026-10-07T15:00:00.000Z' })
    ], 'atletico nacional', Date.parse('2026-10-06T16:00:00.000Z'))).toBeNull()
  })

  it('reconoce estados del proveedor para resultados recientes y partidos en vivo', () => {
    const resultados = seleccionarResultadosRecientesEquipo([
      partidoPrueba({ estado: 'finished', fechaIso: '2026-09-30T20:00:00.000Z', golesLocal: 3, golesVisitante: 1 }),
      partidoPrueba({ estado: 'scheduled', fechaIso: '2026-09-29T20:00:00.000Z', golesLocal: 2, golesVisitante: 0 }),
      partidoPrueba({ estado: 'finished', fechaIso: '2026-09-28T20:00:00.000Z', golesLocal: null, golesVisitante: 0 }),
      partidoPrueba({ estado: 'finished', fechaIso: '2026-10-07T20:00:00.000Z' })
    ], 'atletico nacional', Date.parse('2026-10-06T16:00:00.000Z'))
    const enVivo = seleccionarPartidosEnVivoEquipo([
      partidoPrueba({ estado: '2H' }),
      partidoPrueba({ estado: 'finished' }),
      partidoPrueba({ estado: 'actualizacion_pendiente' })
    ], 'atletico nacional')

    expect(resultados.map(partido => [partido.estado, partido.golesLocal, partido.golesVisitante]))
      .toEqual([['finished', 3, 1]])
    expect(enVivo.map(partido => partido.estado)).toEqual(['2H'])
  })
})
