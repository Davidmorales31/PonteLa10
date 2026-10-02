import { describe, expect, it, vi } from 'vitest'
import type {
  PartidoFutbolProveedor,
  PaqueteActualizacionFutbolProveedor,
  RespuestaProveedorFutbol
} from '~/types/futbolProveedor'
import type { ProveedorFutbol } from '~/server/utils/proveedoresFutbol/contrato'
import { filtrarFixturesPrioritariosDelDia, prioridadCompetenciaFutbol } from '~/server/utils/proveedoresFutbol/prioridadFixturesDiarios'
import { crearProveedorFixturesDiariosPersistidos } from '~/server/utils/proveedoresFutbol/proveedorFixturesDiariosPersistidos'
import { crearTransporteConPresupuestoDiario } from '~/server/utils/proveedoresFutbol/transporteConPresupuestoDiario'

function partido(
  id: string,
  kickoff: string,
  country: string,
  competition: string
): PartidoFutbolProveedor {
  return {
    idProveedor: id,
    competencia: { idProveedor: `liga-${id}`, nombre: competition, pais: country, temporada: 2026 },
    inicioUtc: kickoff,
    estado: 'scheduled',
    local: { idProveedor: `local-${id}`, nombre: `Local ${id}` },
    visitante: { idProveedor: `visitante-${id}`, nombre: `Visitante ${id}` },
    golesLocal: null,
    golesVisitante: null
  }
}

function proveedor(
  id: 'goal-api' | 'api-football',
  listar: (fecha: string) => Promise<RespuestaProveedorFutbol<PartidoFutbolProveedor>>
): ProveedorFutbol {
  return {
    id,
    capacidades: {
      fixturesPorFecha: true, fixturesEnVivo: true, detalleFixture: true,
      eventos: true, alineaciones: true, estadisticas: true, clasificaciones: true,
      actualizacionPorLote: true
    },
    obtenerPartidosPorFecha: consulta => listar(consulta.fecha),
    obtenerPartidosEnVivo: async () => ({ elementos: [], consultadoEn: new Date().toISOString() }),
    obtenerDetalleFixture: async () => null,
    obtenerEventos: async () => ({ elementos: [], consultadoEn: new Date().toISOString() }),
    obtenerAlineaciones: async () => ({ elementos: [], consultadoEn: new Date().toISOString() }),
    obtenerEstadisticas: async () => ({ elementos: [], consultadoEn: new Date().toISOString() }),
    obtenerClasificacion: async () => null,
    obtenerActualizacionesPorLote: async () => ({ elementos: [] as PaqueteActualizacionFutbolProveedor[], consultadoEn: new Date().toISOString() })
  }
}

describe('presupuesto y calendario del worker de fútbol', () => {
  it('no envía la petición al proveedor cuando Supabase deniega la reserva', async () => {
    const reservar = vi.fn(async () => false)
    const enviar = vi.fn(async () => new Response('{}'))
    const transporte = crearTransporteConPresupuestoDiario('api-football', '2026-10-01', reservar, enviar)

    await expect(transporte('https://v3.football.api-sports.io/fixtures?date=2026-10-01', { method: 'GET' }))
      .rejects.toMatchObject({ codigo: 'LIMITE_CUOTA', solicitudesConsumidas: 0 })
    expect(reservar).toHaveBeenCalledWith('api-football', '2026-10-01', '2026-10-01')
    expect(enviar).not.toHaveBeenCalled()
  })

  it('reserva cada petición real y distingue el listado diario de los detalles', async () => {
    const reservar = vi.fn(async () => true)
    const enviar = vi.fn(async () => new Response('{}'))
    const transporte = crearTransporteConPresupuestoDiario('goal-api', '2026-10-01', reservar, enviar)

    await transporte('https://api.goal-api.com/v1/fixtures/date/2026-10-01?leagueId=liga-a', { method: 'GET' })
    await transporte('https://api.goal-api.com/v1/fixtures/date/2026-10-01?leagueId=liga-b', { method: 'GET' })
    await transporte('https://api.goal-api.com/v1/fixtures/123/events', { method: 'GET' })
    await transporte('https://api.goal-api.com/v1/fixtures/date/2026-10-02?leagueId=liga-a', { method: 'GET' })

    expect(reservar.mock.calls).toEqual([
      ['goal-api', '2026-10-01', '2026-10-01'],
      ['goal-api', '2026-10-01', null],
      ['goal-api', '2026-10-01', null],
      ['goal-api', '2026-10-01', '2026-10-02']
    ])
    expect(enviar).toHaveBeenCalledTimes(4)
  })

  it('prioriza Colombia, torneos europeos y luego las cinco ligas top, dentro del día de Bogotá', () => {
    const partidos = [
      partido('colombia', '2026-10-01T05:00:00.000Z', 'Colombia', 'Liga BetPlay'),
      partido('colombia-antes', '2026-10-01T04:59:59.000Z', 'Colombia', 'Copa Colombia'),
      partido('inglaterra', '2026-10-02T04:59:59.000Z', 'England', 'Premier League'),
      partido('uefa', '2026-10-01T22:00:00.000Z', 'Europe', 'UEFA Champions League'),
      partido('argentina', '2026-10-01T22:00:00.000Z', 'Argentina', 'Primera División'),
      { ...partido('seleccion', '2026-10-01T21:00:00.000Z', 'World', 'FIFA World Cup Qualifiers'),
        local: { idProveedor: 'col', nombre: 'Colombia' }, visitante: { idProveedor: 'otro', nombre: 'Perú' } }
    ]

    expect(prioridadCompetenciaFutbol(partidos[0]!)).toBe(4)
    expect(prioridadCompetenciaFutbol(partidos[2]!)).toBe(2)
    expect(prioridadCompetenciaFutbol(partidos[3]!)).toBe(3)
    expect(prioridadCompetenciaFutbol(partidos[5]!)).toBe(4)
    expect(filtrarFixturesPrioritariosDelDia(partidos, '2026-10-01').map(item => item.idProveedor))
      .toEqual(['colombia', 'inglaterra', 'uefa', 'seleccion'])
  })

  it('reconoce la selección Colombia en clasificatorias sin priorizar otras selecciones por el nombre del torneo', () => {
    const clasificacion = partido('colombia-wc', '2026-10-01T21:00:00.000Z', 'World', 'WC Qualification South America')
    clasificacion.local = { idProveedor: 'colombia', nombre: 'Colombia' }
    clasificacion.visitante = { idProveedor: 'peru', nombre: 'Perú' }
    const otraSeleccion = partido('otra-seleccion', '2026-10-01T21:00:00.000Z', 'World', 'FIFA World Cup Qualifiers')
    otraSeleccion.local = { idProveedor: 'argentina', nombre: 'Argentina' }
    otraSeleccion.visitante = { idProveedor: 'peru', nombre: 'Perú' }

    expect(prioridadCompetenciaFutbol(clasificacion)).toBe(4)
    expect(prioridadCompetenciaFutbol(otraSeleccion)).toBe(0)
  })

  it('lee una sola carga del día y hace dos consultas UTC a Goal API en el bootstrap', async () => {
    const listar = vi.fn(async (fecha: string) => ({
      elementos: fecha === '2026-10-01'
        ? [partido('partido-a', '2026-10-01T20:00:00.000Z', 'Colombia', 'Liga BetPlay')]
        : [
            partido('partido-b', '2026-10-02T03:00:00.000Z', 'England', 'Premier League'),
            partido('mañana', '2026-10-02T05:00:00.000Z', 'France', 'Ligue 1')
          ],
      consultadoEn: '2026-10-01T12:00:00.000Z',
      solicitudes: 1
    }))
    const cargar = vi.fn(async () => null)
    const cache = crearProveedorFixturesDiariosPersistidos(proveedor('goal-api', listar), { cargarFixturesDiarios: cargar }, '2026-10-01')
    const primerListado = await cache.obtenerPartidosPorFecha({ fecha: '2026-10-01', zonaHoraria: 'America/Bogota' })

    expect(listar.mock.calls.map(([fecha]) => fecha)).toEqual(['2026-10-01', '2026-10-02'])
    expect(primerListado.elementos.map(item => item.idProveedor)).toEqual(['partido-a', 'partido-b'])
    expect(primerListado.solicitudes).toBe(2)
    expect(cache.seConsultoListadoDiario?.()).toBe(true)
    expect(cache.fechasListadoDiario?.()).toEqual(['2026-10-01', '2026-10-02'])

    const reutilizado = crearProveedorFixturesDiariosPersistidos(proveedor('goal-api', listar), {
      cargarFixturesDiarios: async () => []
    }, '2026-10-01')
    const desdeSupabase = await reutilizado.obtenerPartidosPorFecha({ fecha: '2026-10-01', zonaHoraria: 'America/Bogota' })
    expect(desdeSupabase).toMatchObject({ elementos: [], solicitudes: 0 })
  })

  it('expone ambas fechas consultadas para confirmar la carga UTC de Goal', async () => {
    const listar = vi.fn(async (fecha: string) => ({
      elementos: [partido(`partido-${fecha}`, `${fecha}T20:00:00.000Z`, 'Colombia', 'Liga BetPlay')],
      consultadoEn: '2026-10-01T12:00:00.000Z', solicitudes: 1
    }))
    const cache = crearProveedorFixturesDiariosPersistidos(
      proveedor('goal-api', listar),
      { cargarFixturesDiarios: async () => null },
      '2026-10-01'
    )

    await cache.obtenerPartidosPorFecha({ fecha: '2026-10-01', zonaHoraria: 'America/Bogota' })
    expect(cache.fechasListadoDiario?.()).toEqual(['2026-10-01', '2026-10-02'])
  })
})
