import { describe, expect, it } from 'vitest'
import type { PartidoFutbolProveedor } from '~/types/futbolProveedor'
import { proyectarStandingsFutbolPublicos } from '~/utils/proyeccionFutbolPublico'
import {
  proyectarSnapshotClasificacionFutbol,
  proyectarSnapshotsFixturesFutbol,
  tieneCompetenciasMapeadasFutbol,
  type MappingsProveedorFutbol
} from '../../server/utils/proveedoresFutbol/proyectarSnapshots'

const partido: PartidoFutbolProveedor = {
  idProveedor: 'fixture-externo-1',
  competencia: {
    idProveedor: 'liga-externa', nombre: 'Liga BetPlay', pais: 'Colombia',
    temporada: 2026, etapa: 'Apertura', grupo: 'Grupo A', jornada: 'Fecha 1'
  },
  inicioUtc: '2026-10-01T23:10:00.000Z',
  estado: 'live',
  estadoProveedor: '2H',
  minutoTranscurrido: 62,
  local: { idProveedor: 'equipo-local-ext', nombre: 'Atlético Nacional', insigniaUrl: 'https://provider.test/home.svg' },
  visitante: { idProveedor: 'equipo-visitante-ext', nombre: 'Millonarios', insigniaUrl: 'https://provider.test/away.svg' },
  golesLocal: 1,
  golesVisitante: 0,
  sede: 'Atanasio Girardot',
  ciudad: 'Medellín'
}

const mappings: MappingsProveedorFutbol = {
  competencias: [{ externalId: 'liga-externa', competitionId: 'competition-canonical' }],
  equipos: [
    { externalId: 'equipo-local-ext', teamId: 'home-team-canonical' },
    { externalId: 'equipo-visitante-ext', teamId: 'away-team-canonical' }
  ],
  fixtures: [{
    externalId: 'fixture-externo-1', fixtureId: 'fixture-canonical',
    fixture: {
      id: 'fixture-canonical', competitionId: 'competition-canonical',
      homeTeamId: 'home-team-canonical', awayTeamId: 'away-team-canonical'
    }
  }]
}

function proyectar(
  input: PartidoFutbolProveedor[] = [partido],
  mappingsInput: MappingsProveedorFutbol = mappings
) {
  return proyectarSnapshotsFixturesFutbol(input, {
    proveedor: 'goal-api',
    fechaNegocio: '2026-10-01',
    consultadoEn: '2026-10-02T00:00:00.000Z',
    mappings: mappingsInput
  })
}

describe('proyección privada de fixtures de fútbol', () => {
  it('normaliza partidos solo tras verificar los mappings canónicos y los mantiene privados', () => {
    const { snapshots, omitidos } = proyectar()
    const snapshot = snapshots[0]

    expect(snapshots).toHaveLength(1)
    expect(omitidos).toEqual({
      competencia_no_mapeada: 0, equipo_no_mapeado: 0, fixture_no_mapeado: 0,
      identidad_canonica_inconsistente: 0, datos_invalidos: 0
    })
    expect(snapshot).toMatchObject({
      fixture_id: 'fixture-canonical', provider: 'goal-api', business_date: '2026-10-01',
      league_id: 'liga-externa', league_name: 'Liga BetPlay', season: '2026', phase: 'Apertura',
      group_name: 'Grupo A', status: 'live', elapsed: 62, goals_home: 1, goals_away: 0,
      is_public: false, publication_rights_confirmed: false
    })
    expect(JSON.stringify(snapshot)).not.toContain('provider.test')
    expect(snapshot?.home_team_logo).toBeNull()
    expect(snapshot?.events).toEqual([])
    expect(snapshot?.publication_rights_reference).toBeNull()
  })

  it('indica si hay competencias curadas para saltarse la consulta al proveedor', () => {
    expect(tieneCompetenciasMapeadasFutbol(mappings)).toBe(true)
    expect(tieneCompetenciasMapeadasFutbol({ ...mappings, competencias: [] })).toBe(false)
  })

  it('no incluye partidos de competencias desconocidas', () => {
    const { snapshots, omitidos } = proyectar([{ ...partido, competencia: { ...partido.competencia, idProveedor: 'nueva-liga' } }])
    expect(snapshots).toEqual([])
    expect(omitidos.competencia_no_mapeada).toBe(1)
  })

  it('no autocrea fixtures ni equipos cuando falta un mapping', () => {
    const { snapshots, omitidos } = proyectar([partido], { ...mappings, fixtures: [] })
    expect(snapshots).toEqual([])
    expect(omitidos.fixture_no_mapeado).toBe(1)
  })

  it('rechaza una asociación canónica cuyo equipo o competencia no coincide', () => {
    const mappingsInconsistentes: MappingsProveedorFutbol = {
      ...mappings,
      fixtures: [{
        ...mappings.fixtures[0]!,
        fixture: { ...mappings.fixtures[0]!.fixture, homeTeamId: 'another-team' }
      }]
    }
    const { snapshots, omitidos } = proyectar([partido], mappingsInconsistentes)
    expect(snapshots).toEqual([])
    expect(omitidos.identidad_canonica_inconsistente).toBe(1)
  })

  it('omite con conteo auditable datos que violan los límites de la tabla', () => {
    const { snapshots, omitidos } = proyectar([{ ...partido, minutoTranscurrido: 181 }])
    expect(snapshots).toEqual([])
    expect(omitidos.datos_invalidos).toBe(1)
  })

  it('rechaza mappings ambiguos y fechas imposibles antes de persistir', () => {
    expect(() => proyectar([partido], {
      ...mappings,
      equipos: [...mappings.equipos, mappings.equipos[0]!]
    })).toThrow('vacíos o duplicados')
    expect(() => proyectarSnapshotsFixturesFutbol([partido], {
      proveedor: 'goal-api', fechaNegocio: '2026-02-31',
      consultadoEn: '2026-10-02T00:00:00.000Z', mappings
    })).toThrow('YYYY-MM-DD')
  })

  it('conserva la identidad privada para validar mappings y omite IDs del DTO público', () => {
    const resultado = proyectarSnapshotClasificacionFutbol({
      competencia: { idProveedor: 'liga-externa', nombre: 'Liga BetPlay', temporada: 2026 },
      consultadoEn: '2026-10-02T00:00:00.000Z',
      grupos: [{
        nombre: 'Cuadrangular A', etapa: 'Semifinales', filas: [{
          posicion: 1, equipo: { idProveedor: 'equipo-local-ext', nombre: 'Atlético Nacional' },
          jugados: 6, ganados: 4, empatados: 1, perdidos: 1,
          golesFavor: 9, golesContra: 4, diferenciaGoles: 5, puntos: 13,
          forma: ['W', 'D', 'L'], puntosDeduccion: 0
        }]
      }]
    }, { proveedor: 'goal-api', fechaNegocio: '2026-10-01', mappings })

    expect(resultado.omitido).toBeNull()
    expect(resultado.snapshot).toMatchObject({
      competition_id: 'competition-canonical', league_id: 'liga-externa', season: '2026',
      is_public: false, publication_rights_confirmed: false,
      standings: { grupos: [{ nombre: 'Cuadrangular A', etapa: 'Semifinales', filas: [{ posicion: 1, puntos: 13 }] }] }
    })
    expect(JSON.stringify(resultado.snapshot)).toContain('equipo-local-ext')
    const publico = proyectarStandingsFutbolPublicos({
      ...resultado.snapshot!, is_public: true, publication_rights_confirmed: true
    })
    expect(JSON.stringify(publico)).not.toContain('equipo-local-ext')
  })

  it('rechaza toda la tabla, no solo una fila, si falta mapping de cualquier equipo', () => {
    const resultado = proyectarSnapshotClasificacionFutbol({
      competencia: { idProveedor: 'liga-externa', nombre: 'Liga BetPlay', temporada: 2026 },
      consultadoEn: '2026-10-02T00:00:00.000Z',
      grupos: [{
        nombre: 'Apertura', filas: [{
          posicion: 1, equipo: { idProveedor: 'equipo-desconocido', nombre: 'Equipo sin catalogar' },
          jugados: 0, ganados: 0, empatados: 0, perdidos: 0,
          golesFavor: 0, golesContra: 0, diferenciaGoles: 0, puntos: 0
        }]
      }]
    }, { proveedor: 'goal-api', fechaNegocio: '2026-10-01', mappings })

    expect(resultado).toEqual({ snapshot: null, omitido: 'equipo_no_mapeado' })
  })
})
