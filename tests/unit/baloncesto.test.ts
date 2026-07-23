import { describe, expect, it } from 'vitest'
import type {
  EstadisticaEquipoApiBasketball,
  PartidoApiBasketball
} from '../../types/apiBasketball'
import {
  mapearEstadisticasApiBasketball,
  mapearPartidoApiBasketball,
  obtenerEstadoBasketball
} from '../../utils/resultadosBasketball'
import { mapearEventoTheSportsDb } from '../../utils/resultadosTheSportsDb'

const partidoBase: PartidoApiBasketball = {
  id: 391053,
  date: '2026-07-23T20:00:00-05:00',
  status: { short: 'Q3', timer: '06:41' },
  league: { id: 12, name: 'NBA', season: '2026-2027' },
  country: { name: 'USA' },
  teams: {
    home: { id: 1, name: 'Equipo local' },
    away: { id: 2, name: 'Equipo visitante' }
  },
  scores: {
    home: { quarter_1: 24, quarter_2: 30, quarter_3: 12, total: 66 },
    away: { quarter_1: 21, quarter_2: 28, quarter_3: 10, total: 59 }
  }
}

describe('resultados de baloncesto', () => {
  it('normaliza los periodos en vivo y los estados finales', () => {
    expect(obtenerEstadoBasketball('Q4')).toBe('en-vivo')
    expect(obtenerEstadoBasketball('FT')).toBe('finalizado')
    expect(obtenerEstadoBasketball('NS')).toBe('programado')
  })

  it('mapea un partido al contrato multideporte', () => {
    expect(mapearPartidoApiBasketball(partidoBase)).toMatchObject({
      id: 'basket-391053',
      deporte: 'baloncesto',
      estado: 'en-vivo',
      periodo: 'Tercer cuarto · 06:41',
      marcadorLocal: 66,
      marcadorVisitante: 59
    })
  })

  it('combina marcadores por cuartos y estadísticas de equipos', () => {
    const estadisticas: EstadisticaEquipoApiBasketball[] = [
      {
        game: { id: 391053 },
        team: { id: 1 },
        rebounds: { total: 38 },
        assists: 14,
        field_goals: { percentage: 44 }
      },
      {
        game: { id: 391053 },
        team: { id: 2 },
        rebounds: { total: 47 },
        assists: 18,
        field_goals: { percentage: 51 }
      }
    ]
    const resultado = mapearEstadisticasApiBasketball(partidoBase, estadisticas)

    expect(resultado.find(item => item.clave === 'primer-cuarto')).toMatchObject({ local: 24, visitante: 21 })
    expect(resultado.find(item => item.clave === 'rebotes')).toMatchObject({ local: 38, visitante: 47 })
    expect(resultado.find(item => item.clave === 'porcentaje-campo')).toMatchObject({ sufijo: '%' })
  })

  it('conserva el deporte cuando TheSportsDB actúa como respaldo', () => {
    const partido = mapearEventoTheSportsDb({
      idEvent: '22001',
      strSport: 'Basketball',
      strLeague: 'NBA',
      strHomeTeam: 'Local',
      strAwayTeam: 'Visitante',
      intHomeScore: 98,
      intAwayScore: 94,
      strStatus: 'FT',
      dateEvent: '2026-07-23'
    })

    expect(partido).toMatchObject({
      id: 'tsdb-baloncesto-22001',
      deporte: 'baloncesto',
      estado: 'finalizado'
    })
  })
})
