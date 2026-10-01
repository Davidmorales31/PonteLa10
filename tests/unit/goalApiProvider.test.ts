import { describe, expect, it, vi } from 'vitest'
import { crearProveedorGoalApi } from '../../server/utils/proveedoresFutbol/goalApi'
import type { ConfiguracionGoalApi } from '../../server/utils/proveedoresFutbol/goalApi'

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
    const respuestas = [
      respuestaApi([{ id: 'e1', minute: 61, type: 'Goal', team: { id: 'nacional' }, player: { name: 'Delantero' } }]),
      respuestaApi([
        { team: { id: 'nacional' }, statistics: [{ type: 'Shots', value: 7 }] },
        { team: { id: 'millonarios' }, statistics: [{ type: 'Shots', value: 4 }] }
      ])
    ]
    const transporte = vi.fn<TransporteGoalApi>(async () => respuestas.shift()!)
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-de-prueba', transporte })
    const eventos = await proveedor.obtenerEventos('fixture-77')
    const estadisticas = await proveedor.obtenerEstadisticas('fixture-77')

    expect(eventos.elementos[0]).toMatchObject({
      idProveedor: 'e1', tipo: 'goal', minuto: 61, equipoIdProveedor: 'nacional', jugador: 'Delantero'
    })
    expect(estadisticas.elementos[0]).toMatchObject({
      clave: 'Shots', valoresPorEquipo: [
        { equipoIdProveedor: 'nacional', valor: 7 },
        { equipoIdProveedor: 'millonarios', valor: 4 }
      ]
    })
  })

  it('sincroniza el paquete completo del detalle contabilizando cada endpoint', async () => {
    const respuestas = [
      respuestaApi([fixtureGoal]),
      respuestaApi([{ id: 'gol-1', minute: 61, type: 'Goal', team: { id: 'nacional' }, player: { name: 'Delantero' } }]),
      respuestaApi([{ team: { id: 'nacional' }, formation: '4-3-3', players: [{ name: 'Delantero', starter: true }] }]),
      respuestaApi([
        { team: { id: 'nacional' }, statistics: [{ type: 'Shots', value: 7 }] },
        { team: { id: 'millonarios' }, statistics: [{ type: 'Shots', value: 4 }] }
      ])
    ]
    const transporte = vi.fn<TransporteGoalApi>(async () => respuestas.shift()!)
    const proveedor = crearProveedorGoalApi({ apiKey: 'secreto-de-prueba', transporte })
    const actualizacion = await proveedor.obtenerActualizacionesPorLote!(['fixture-77'])

    expect(actualizacion.solicitudes).toBe(4)
    expect(transporte).toHaveBeenCalledTimes(4)
    expect(actualizacion.elementos[0]).toMatchObject({
      partido: { idProveedor: 'fixture-77' },
      eventos: [{ idProveedor: 'gol-1', tipo: 'goal', minuto: 61 }],
      alineaciones: [{ equipoIdProveedor: 'nacional', formacion: '4-3-3' }],
      estadisticas: [{ clave: 'Shots', valoresPorEquipo: [
        { equipoIdProveedor: 'nacional', valor: 7 }, { equipoIdProveedor: 'millonarios', valor: 4 }
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
