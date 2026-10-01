import { describe, expect, it } from 'vitest'
import { proyectarFixtureFutbolPublico, proyectarStandingsFutbolPublicos } from '~/utils/proyeccionFutbolPublico'

const fixturePublico = {
  id: 'snapshot-id',
  fixture_id: 'canonical-fixture-uuid',
  business_date: '2026-10-01',
  kickoff_at: '2026-10-01T18:00:00.000Z',
  league_name: 'Liga BetPlay',
  league_country: 'Colombia',
  season: '2026',
  round: 'Fecha 14',
  phase: 'Apertura',
  group_name: null,
  home_team_provider_id: 'home-private-provider-id',
  home_team_name: 'Atlético Nacional',
  away_team_provider_id: 'away-private-provider-id',
  away_team_name: 'Millonarios',
  status: 'live' as const,
  status_external: '2H',
  elapsed: 60,
  goals_home: 1,
  goals_away: 0,
  venue_name: 'Atanasio Girardot',
  venue_city: 'Medellín',
  provider_fetched_at: '2026-10-01T19:00:00.000Z',
  events: [{
    idProveedor: 'secret-event-id', minuto: 22, tipo: 'goal', equipoIdProveedor: 'home-private-provider-id',
    jugador: 'Jugador', descripcion: 'Gol', logoUrl: 'https://private.example/logo.png', secret: 'NO_EXPOSE'
  }],
  lineups: [{
    equipoIdProveedor: 'away-private-provider-id', entrenador: 'Técnico', formacion: '4-3-3',
    jugadores: [{ idProveedor: 'secret-player-id', nombre: 'Jugador', titular: true, numero: 10, url: 'https://private.example' }]
  }],
  statistics: [{
    clave: 'possession', etiqueta: 'Posesión', valoresPorEquipo: [
      { equipoIdProveedor: 'home-private-provider-id', valor: '54%' },
      { equipoIdProveedor: 'away-private-provider-id', valor: '46%' }
    ], providerPayload: 'NO_EXPOSE'
  }],
  is_public: true,
  publication_rights_confirmed: true
}

describe('proyección pública de snapshots de fútbol', () => {
  it('expone solo campos allowlisted y elimina IDs, logos y claves imprevistas', () => {
    const result = proyectarFixtureFutbolPublico(fixturePublico)
    const serializado = JSON.stringify(result)

    expect(result.id).toBe('canonical-fixture-uuid')
    expect(result.events[0]).toMatchObject({ minuto: 22, lado: 'local', tipo: 'goal', jugador: 'Jugador' })
    expect(result.lineups[0]?.lado).toBe('visitante')
    expect(result.statistics[0]).toMatchObject({ local: '54%', visitante: '46%' })
    expect(serializado).not.toContain('home-private-provider-id')
    expect(serializado).not.toContain('secret-event-id')
    expect(serializado).not.toContain('secret-player-id')
    expect(serializado).not.toContain('private.example')
    expect(serializado).not.toContain('NO_EXPOSE')
    expect(serializado).not.toContain('providerPayload')
  })

  it('descarta alineaciones cuyo equipo no corresponde al fixture', () => {
    const result = proyectarFixtureFutbolPublico({
      ...fixturePublico,
      lineups: [{ equipoIdProveedor: 'otro-equipo', jugadores: [{ nombre: 'Privado', titular: true }] }]
    })
    expect(result.lineups).toEqual([])
  })

  it('se niega a proyectar un fixture no aprobado o sin derechos confirmados', () => {
    expect(() => proyectarFixtureFutbolPublico({ ...fixturePublico, is_public: false }))
      .toThrow('no está aprobado para publicación')
    expect(() => proyectarFixtureFutbolPublico({ ...fixturePublico, publication_rights_confirmed: false }))
      .toThrow('no está aprobado para publicación')
  })

  it('filtra clasificaciones a estadísticas editoriales sin IDs ni escudos', () => {
    const result = proyectarStandingsFutbolPublicos({
      business_date: '2026-10-01', league_name: 'Liga BetPlay', season: '2026',
      provider_fetched_at: '2026-10-01T19:00:00.000Z', is_public: true, publication_rights_confirmed: true,
      standings: { grupos: [{
        nombre: 'Cuadrangular A', etapa: 'Semifinales', providerSecret: 'NO_EXPOSE',
        filas: [{
          posicion: 1, equipo: { nombre: 'Equipo A', idProveedor: 'league-provider-id', insigniaUrl: 'https://private.example/logo.png' },
          jugados: 6, ganados: 4, empatados: 1, perdidos: 1, golesFavor: 9, golesContra: 4,
          diferenciaGoles: 5, puntos: 13, forma: ['W', 'D', 'L'], puntosDeduccion: 0, privateValue: 'NO_EXPOSE'
        }]
      }] }
    })

    const serializado = JSON.stringify(result)
    expect(result.groups[0]?.filas[0]).toMatchObject({ posicion: 1, equipo: { nombre: 'Equipo A' }, puntos: 13 })
    expect(serializado).not.toContain('league-provider-id')
    expect(serializado).not.toContain('private.example')
    expect(serializado).not.toContain('NO_EXPOSE')
  })
})
