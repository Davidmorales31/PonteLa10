import { describe, expect, it, vi } from 'vitest'
import { crearProveedorApiFootball } from '../../server/utils/proveedoresFutbol/apiFootball'
import type { ConfiguracionApiFootball } from '../../server/utils/proveedoresFutbol/apiFootball'

type TransporteApiFootball = NonNullable<ConfiguracionApiFootball['transporte']>

const fixtureApi = {
  fixture: {
    id: 24001,
    date: '2026-10-01T21:00:00+00:00',
    status: { short: '2H', long: 'Second Half', elapsed: 66 },
    venue: { name: 'Estadio', city: 'Neiva' }
  },
  league: { id: 239, name: 'Primera A', country: 'Colombia', season: 2026, round: 'Apertura - Fecha 14' },
  teams: {
    home: { id: 1, name: 'Atlético Huila', logo: 'https://example.test/huila.png' },
    away: { id: 2, name: 'Millonarios', logo: 'https://example.test/millos.png' }
  },
  goals: { home: 1, away: 0 }
}

function respuestaApi(response: unknown[], headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ get: {}, parameters: {}, errors: {}, results: response.length, paging: {}, response }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-ratelimit-requests-remaining': '93', ...headers }
  })
}

describe('adaptador server-side API-Football', () => {
  it('normaliza fixtures con la zona pedida y conserva cuota', async () => {
    const transporte = vi.fn<TransporteApiFootball>(async () => respuestaApi([fixtureApi]))
    const proveedor = crearProveedorApiFootball({ apiKey: 'clave-de-prueba', transporte })
    const respuesta = await proveedor.obtenerPartidosPorFecha({
      fecha: '2026-10-01', zonaHoraria: 'America/Bogota'
    })

    expect(respuesta.elementos[0]).toMatchObject({
      idProveedor: '24001',
      inicioUtc: '2026-10-01T21:00:00.000Z',
      estado: 'live',
      minutoTranscurrido: 66,
      golesLocal: 1,
      golesVisitante: 0,
      competencia: { idProveedor: '239', etapa: 'Apertura', jornada: 'Apertura - Fecha 14' }
    })
    expect(respuesta.cuota?.restante).toBe(93)
    expect(transporte.mock.calls[0]?.[0]).toContain('timezone=America%2FBogota')
    expect((transporte.mock.calls[0]?.[1]?.headers as Record<string, string>)['x-apisports-key']).toBe('clave-de-prueba')
  })

  it('aprovecha el lote oficial de hasta 20 fixtures para incluir eventos, alineaciones y estadísticas', async () => {
    const fixtureConDetalle = {
      ...fixtureApi,
      events: [{ time: { elapsed: 33, extra: null }, team: { id: 1 }, player: { id: 9, name: 'Delantero' }, type: 'Goal', detail: 'Normal Goal' }],
      lineups: [{ team: { id: 1 }, formation: '4-3-3', startXI: [{ player: { id: 9, name: 'Delantero', number: 9, pos: 'F' } }], substitutes: [] }],
      statistics: [{ team: { id: 1 }, statistics: [{ type: 'Total Shots', value: 4 }] }]
    }
    const transporte = vi.fn<TransporteApiFootball>(async () => respuestaApi([fixtureConDetalle]))
    const proveedor = crearProveedorApiFootball({ apiKey: 'clave-de-prueba', transporte })
    const respuesta = await proveedor.obtenerActualizacionesPorLote!(['24001', '24002'])

    expect(respuesta.elementos[0]).toMatchObject({
      partido: { idProveedor: '24001' },
      eventos: [{ tipo: 'goal', minuto: 33, jugador: 'Delantero' }],
      alineaciones: [{ equipoIdProveedor: '1', jugadores: [{ nombre: 'Delantero', titular: true }] }],
      estadisticas: [{ clave: 'Total Shots', valoresPorEquipo: [{ equipoIdProveedor: '1', valor: 4 }] }]
    })
    expect(transporte.mock.calls[0]?.[0]).toContain('ids=24001-24002')
  })

  it('rechaza lotes de más de veinte IDs antes de contactar al proveedor', async () => {
    const transporte = vi.fn<TransporteApiFootball>(async () => respuestaApi([]))
    const proveedor = crearProveedorApiFootball({ apiKey: 'clave-de-prueba', transporte })

    await expect(proveedor.obtenerActualizacionesPorLote!(Array.from({ length: 21 }, (_, index) => String(index + 1))))
      .rejects.toThrow('RESPUESTA_INVALIDA')
    expect(transporte).not.toHaveBeenCalled()
  })

  it('preserva grupos de standings y calcula diferencia con GF y GA', async () => {
    const fila = (id: number, nombre: string, grupo: string) => ({
      rank: 1,
      team: { id, name: nombre },
      points: 3,
      goalsDiff: 2,
      group: grupo,
      all: { played: 1, win: 1, draw: 0, lose: 0, goals: { for: 3, against: 1 } }
    })
    const standings = [{
      league: {
        id: 239,
        name: 'Primera A',
        country: 'Colombia',
        season: 2026,
        round: 'Cuadrangulares semifinales',
        standings: [[fila(1, 'Equipo A', 'Grupo A')], [fila(2, 'Equipo B', 'Grupo B')]]
      }
    }]
    const transporte = vi.fn<TransporteApiFootball>(async () => respuestaApi(standings))
    const proveedor = crearProveedorApiFootball({ apiKey: 'clave-de-prueba', transporte })
    const respuesta = await proveedor.obtenerClasificacion('239', 2026)

    expect(respuesta?.competencia.etapa).toBe('Cuadrangulares')
    expect(respuesta?.grupos.map(grupo => grupo.nombre)).toEqual(['Grupo A', 'Grupo B'])
    expect(respuesta?.grupos[0]?.filas[0]?.diferenciaGoles).toBe(2)
  })
})
