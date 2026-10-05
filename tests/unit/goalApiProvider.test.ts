import { describe, expect, it, vi } from 'vitest'
import { crearProveedorGoalApi } from '../../server/utils/proveedoresFutbol/goalApi'
import type { ConfiguracionGoalApi } from '../../server/utils/proveedoresFutbol/goalApi'
import { LIGAS_PRIORITARIAS_GOAL } from '../../server/utils/proveedoresFutbol/ligasPrioritariasGoal'

type TransporteGoalApi = NonNullable<ConfiguracionGoalApi['transporte']>

const fixtureGoal = {
  id: 'fixture-77',
  kickoffUtc: '2026-10-01T23:10:00.000Z',
  matchStatus: '45+2',
  matchElapsed: 45,
  league: { id: 'liga-a', name: 'Liga BetPlay', country: { name: 'Colombia' }, season: 2026 },
  homeTeam: { id: 'nacional', name: 'Atlético Nacional' },
  awayTeam: { id: 'millonarios', name: 'Millonarios' },
  homeScore: '1',
  awayScore: '0'
}

function respuestaApi(datos: unknown, opciones: { pagination?: unknown; status?: number } = {}) {
  const cuerpo = opciones.status === 204 ? undefined : JSON.stringify({
    success: true,
    data: datos,
    ...(opciones.pagination ? { pagination: opciones.pagination } : {})
  })
  return new Response(cuerpo, {
    status: opciones.status || 200,
    headers: {
      'content-type': 'application/json',
      'x-ratelimit-limit': '1000',
      'x-ratelimit-remaining': '997',
      'x-ratelimit-reset': '1790900000'
    }
  })
}

describe('adaptador privado GOAL API', () => {
  it('incluye amistosos internacionales en la consulta de respaldo para detectar a Colombia', async () => {
    const transporte = vi.fn<TransporteGoalApi>(async () => respuestaApi([]))
    const proveedor = crearProveedorGoalApi({
      apiKey: 'secreto-de-prueba',
      ligasPrioritarias: LIGAS_PRIORITARIAS_GOAL,
      transporte
    })

    await proveedor.obtenerPartidosPorFecha({ fecha: '2026-10-02', zonaHoraria: 'America/Bogota' })

    expect(transporte.mock.calls.some(([url]) => new URL(url).searchParams.get('leagueId') === '356')).toBe(true)
  })

  it('normaliza fixtures y conserva kickoff UTC y cuota', async () => {
    const transporte = vi.fn<TransporteGoalApi>(async () => respuestaApi([fixtureGoal]))
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-de-prueba', transporte })
    const respuesta = await proveedor.obtenerPartidosPorFecha({
      fecha: '2026-10-01', zonaHoraria: 'America/Bogota'
    })

    expect(respuesta.elementos[0]).toMatchObject({
      idProveedor: 'fixture-77',
      inicioUtc: '2026-10-01T23:10:00.000Z',
      estado: 'live',
      minutoTranscurrido: 45,
      golesLocal: 1,
      golesVisitante: 0,
      competencia: { idProveedor: 'liga-a', temporada: 2026 },
      local: { idProveedor: 'nacional', nombre: 'Atlético Nacional' }
    })
    expect(respuesta.cuota?.restante).toBe(997)
    expect(transporte).toHaveBeenCalledOnce()
    const [url, init] = transporte.mock.calls[0]!
    expect(url).toContain('/fixtures/date/2026-10-01')
    expect(url).toContain('limit=100')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer secreto-de-prueba')
  })

  it('normaliza leagueYear del esquema real de GOAL API como temporada', async () => {
    const fixtureReal = {
      id: 'fixture-real',
      kickoffUtc: '2026-10-01T16:00:00.000Z',
      matchStatus: 'FT',
      leagueId: 'liga-real',
      leagueName: 'UEFA Nations League',
      leagueYear: '2026/2027',
      homeTeamId: 'equipo-a',
      homeTeamName: 'Equipo A',
      homeTeamScore: '0',
      awayTeamId: 'equipo-b',
      awayTeamName: 'Equipo B',
      awayTeamScore: '0',
      league: { id: 'liga-real', name: 'UEFA Nations League', country: 'Europe' },
      homeTeam: { id: 'equipo-a', name: 'Equipo A' },
      awayTeam: { id: 'equipo-b', name: 'Equipo B' }
    }
    const transporte = vi.fn<TransporteGoalApi>(async () => respuestaApi([fixtureReal]))
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-de-prueba', transporte })

    const respuesta = await proveedor.obtenerPartidosPorFecha({
      fecha: '2026-10-01', zonaHoraria: 'America/Bogota'
    })

    expect(respuesta.elementos[0]?.competencia).toMatchObject({
      idProveedor: 'liga-real', temporada: '2026/2027'
    })
    expect(respuesta.elementos[0]).toMatchObject({ golesLocal: 0, golesVisitante: 0 })
  })

  it('consulta fixtures de una liga por páginas y conserva la jornada', async () => {
    const fixtureConJornada = {
      ...fixtureGoal,
      matchRound: 'Matchday 13',
      league: { ...fixtureGoal.league, leagueYear: '2026' }
    }
    const transporte = vi.fn<TransporteGoalApi>(async () => respuestaApi([fixtureConJornada], {
      pagination: { total: 201, limit: 100, offset: 100, hasMore: true }
    }))
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-de-prueba', transporte })

    const respuesta = await proveedor.obtenerFixturesLiga!('liga-colombia', 100, 100)

    expect(respuesta).toMatchObject({ siguienteCursor: '200', solicitudes: 1 })
    expect(respuesta.elementos[0]).toMatchObject({
      idProveedor: 'fixture-77',
      competencia: { temporada: 2026, jornada: 'Matchday 13' }
    })
    const url = new URL(transporte.mock.calls[0]![0] as string)
    expect(url.pathname).toBe('/v1/leagues/liga-colombia/fixtures')
    expect(url.searchParams.get('limit')).toBe('100')
    expect(url.searchParams.get('offset')).toBe('100')
  })

  it('expone el siguiente offset sin recorrer páginas ni gastar cuota automáticamente', async () => {
    const transporte = vi.fn<TransporteGoalApi>(async () => respuestaApi([fixtureGoal], {
      pagination: { total: 250, limit: 100, offset: 0, hasMore: true }
    }))
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-de-prueba', transporte })
    const pagina = await proveedor.obtenerPartidosPorFecha({
      fecha: '2026-10-01', zonaHoraria: 'America/Bogota'
    })

    expect(pagina.siguienteCursor).toBe('100')
    expect(transporte).toHaveBeenCalledOnce()

    await proveedor.obtenerPartidosPorFecha({
      fecha: '2026-10-01', zonaHoraria: 'America/Bogota', cursor: pagina.siguienteCursor
    })
    expect(transporte).toHaveBeenCalledTimes(2)
    expect(transporte.mock.calls[1]?.[0]).toContain('offset=100')
  })

  it('consulta cada liga prioritaria con leagueId y recorre sus páginas', async () => {
    const transporte = vi.fn<TransporteGoalApi>(async url => {
      const consulta = new URL(url)
      const leagueId = consulta.searchParams.get('leagueId')
      const offset = consulta.searchParams.get('offset')
      if (leagueId === 'liga-colombia' && offset === '0') {
        return respuestaApi([fixtureGoal], { pagination: { total: 2, limit: 1, offset: 0, hasMore: true } })
      }
      if (leagueId === 'liga-colombia' && offset === '1') {
        return respuestaApi([{ ...fixtureGoal, id: 'fixture-78' }], {
          pagination: { total: 2, limit: 1, offset: 1, hasMore: false }
        })
      }
      return respuestaApi([{ ...fixtureGoal, id: 'fixture-79' }], {
        pagination: { total: 1, limit: 100, offset: 0, hasMore: false }
      })
    })
    const proveedor = crearProveedorGoalApi({
      apiKey: 'secreto-de-prueba',
      ligasPrioritarias: ['liga-colombia', 'liga-inglaterra'],
      transporte
    })

    const respuesta = await proveedor.obtenerPartidosPorFecha({
      fecha: '2026-10-01', zonaHoraria: 'America/Bogota'
    })

    expect(respuesta.elementos.map(partido => partido.idProveedor)).toEqual([
      'fixture-77', 'fixture-78', 'fixture-79'
    ])
    expect(respuesta.solicitudes).toBe(3)
    expect(transporte.mock.calls.map(([url]) => {
      const consulta = new URL(url)
      return [consulta.pathname, consulta.searchParams.get('leagueId'), consulta.searchParams.get('offset')]
    })).toEqual([
      ['/v1/fixtures/date/2026-10-01', 'liga-colombia', '0'],
      ['/v1/fixtures/date/2026-10-01', 'liga-colombia', '1'],
      ['/v1/fixtures/date/2026-10-01', 'liga-inglaterra', '0']
    ])
  })

  it('agrupa standings por etapa y grupo en vez de mezclar Apertura y Finalización', async () => {
    const fila = (id: string, nombre: string, stage: string, group: string, position: number) => ({
      stage,
      group,
      overallLeaguePosition: position,
      overallLeaguePlayed: 1,
      overallLeagueW: 1,
      overallLeagueD: 0,
      overallLeagueL: 0,
      overallLeagueGF: 2,
      overallLeagueGA: 0,
      overallLeaguePTS: 3,
      team: { id, name: nombre }
    })
    const transporte = vi.fn<TransporteGoalApi>(async () => respuestaApi([
      fila('equipo-a', 'Equipo A', 'Apertura', 'Grupo A', 1),
      fila('equipo-b', 'Equipo B', 'Finalización', 'Grupo B', 1)
    ]))
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-de-prueba', transporte })
    const standings = await proveedor.obtenerClasificacion('liga-a', 2026)

    expect(standings?.grupos).toHaveLength(2)
    expect(standings?.grupos.map(grupo => grupo.nombre)).toEqual([
      'Apertura · Grupo A', 'Finalización · Grupo B'
    ])
    expect(standings?.grupos[0]?.filas[0]?.diferenciaGoles).toBe(2)
  })

  it('normaliza eventos y estadísticas sin perder identidad del equipo', async () => {
    const detalle = {
      ...fixtureGoal,
      events: [{ id: 'e1', minute: 61, type: 'Goal', team: { id: 'nacional' }, player: { name: 'Delantero' } }],
      statistics: [{ type: 'Shots', home: '7', away: '4' }]
    }
    const transporte = vi.fn<TransporteGoalApi>(async () => respuestaApi(detalle))
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-de-prueba', transporte })
    const eventos = await proveedor.obtenerEventos('fixture-77')
    const estadisticas = await proveedor.obtenerEstadisticas('fixture-77')

    expect(eventos.elementos[0]).toMatchObject({
      idProveedor: 'e1', tipo: 'goal', minuto: 61, equipoIdProveedor: 'nacional', jugador: 'Delantero'
    })
    expect(estadisticas.elementos[0]).toMatchObject({
      clave: 'Shots', valoresPorEquipo: [
        { equipoIdProveedor: 'nacional', valor: '7' },
        { equipoIdProveedor: 'millonarios', valor: '4' }
      ]
    })
  })

  it('mapea fixture, eventos, alineaciones y estadísticas desde la respuesta real de detalle en una llamada', async () => {
    const fixtureCompleto = {
      ...fixtureGoal,
      homeTeamSystem: '4-3-3',
      events: [{ id: 'gol-1', minute: 61, type: 'Goal', team: { id: 'nacional' }, player: { name: 'Delantero' } }],
      lineups: [
        { team: 'home', type: 'coach', lineupPlayer: 'Técnico local' },
        {
          team: 'home', type: 'starter', playerKey: 'jugador-1', lineupPlayer: 'Delantero',
          lineupNumber: 9, lineupPosition: 'Forward'
        }
      ],
      statistics: [{ type: 'Shots', home: '7', away: '4' }]
    }
    const transporte = vi.fn<TransporteGoalApi>(async () => respuestaApi(fixtureCompleto))
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-de-prueba', transporte })
    const actualizacion = await proveedor.obtenerActualizacionesPorLote!(['fixture-77'])

    expect(actualizacion.solicitudes).toBe(1)
    expect(transporte).toHaveBeenCalledOnce()
    expect(actualizacion.elementos[0]).toMatchObject({
      partido: { idProveedor: 'fixture-77' },
      eventos: [{ idProveedor: 'gol-1', tipo: 'goal', minuto: 61 }],
      alineaciones: [{
        equipoIdProveedor: 'nacional', formacion: '4-3-3', entrenador: 'Técnico local',
        jugadores: [{ idProveedor: 'jugador-1', nombre: 'Delantero', numero: 9, posicion: 'Forward', titular: true }]
      }],
      estadisticas: [{ clave: 'Shots', valoresPorEquipo: [
        { equipoIdProveedor: 'nacional', valor: '7' }, { equipoIdProveedor: 'millonarios', valor: '4' }
      ] }]
    })
  })

  it('falla de forma segura ante 429 y no incluye la clave ni el cuerpo en el error', async () => {
    const transporte = vi.fn<TransporteGoalApi>(async () => new Response('diagnóstico con secreto', {
      status: 429,
      headers: { 'retry-after': '60' }
    }))
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-no-publicable', transporte })

    await expect(proveedor.obtenerPartidosEnVivo()).rejects.toMatchObject({
      codigo: 'LIMITE_CUOTA',
      estadoHttp: 429,
      reintentarDespuesSegundos: 60
    })
    await expect(proveedor.obtenerPartidosEnVivo()).rejects.not.toThrow('secreto-no-publicable')
  })

  it('rechaza fechas inválidas antes de realizar una petición', async () => {
    const transporte = vi.fn()
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-de-prueba', transporte })

    await expect(proveedor.obtenerPartidosPorFecha({
      fecha: 'hoy', zonaHoraria: 'America/Bogota'
    })).rejects.toThrow('RESPUESTA_INVALIDA')
    expect(transporte).not.toHaveBeenCalled()
  })
})
