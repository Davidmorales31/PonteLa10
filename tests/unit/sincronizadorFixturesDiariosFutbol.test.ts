import { describe, expect, it, vi } from 'vitest'
import type { PartidoFutbolProveedor, PaqueteActualizacionFutbolProveedor, RespuestaProveedorFutbol } from '~/types/futbolProveedor'
import type { ProveedorFutbol } from '../../server/utils/proveedoresFutbol/contrato'
import {
  sincronizarFixturesDiariosFutbol,
  type RepositorioWorkerFixturesFutbol
} from '../../server/utils/proveedoresFutbol/sincronizadorFixturesDiarios'
import type { MappingsProveedorFutbol } from '../../server/utils/proveedoresFutbol/proyectarSnapshots'
import { ErrorProveedorFutbol } from '../../server/utils/proveedoresFutbol/errores'

const partido: PartidoFutbolProveedor = {
  idProveedor: 'fixture-ext',
  competencia: { idProveedor: 'liga-ext', nombre: 'Liga BetPlay', temporada: 2026 },
  inicioUtc: '2026-10-01T22:00:00.000Z',
  estado: 'scheduled',
  local: { idProveedor: 'local-ext', nombre: 'Equipo local' },
  visitante: { idProveedor: 'visitante-ext', nombre: 'Equipo visitante' },
  golesLocal: null,
  golesVisitante: null
}

const mappings: MappingsProveedorFutbol = {
  competencias: [{ externalId: 'liga-ext', competitionId: 'canonical-league' }],
  equipos: [
    { externalId: 'local-ext', teamId: 'canonical-home' },
    { externalId: 'visitante-ext', teamId: 'canonical-away' }
  ],
  fixtures: [{
    externalId: 'fixture-ext', fixtureId: 'canonical-fixture',
    fixture: {
      id: 'canonical-fixture', competitionId: 'canonical-league',
      homeTeamId: 'canonical-home', awayTeamId: 'canonical-away'
    }
  }]
}

const mappingsVacios: MappingsProveedorFutbol = { competencias: [], equipos: [], fixtures: [] }

function respuesta(elementos: PartidoFutbolProveedor[]): RespuestaProveedorFutbol<PartidoFutbolProveedor> {
  return { elementos, consultadoEn: '2026-10-01T20:00:00.000Z', cuota: { limite: 1000, restante: 999 } }
}

function proveedor(
  id: 'goal-api' | 'api-football',
  obtener: () => Promise<RespuestaProveedorFutbol<PartidoFutbolProveedor>>,
  actualizaciones?: PaqueteActualizacionFutbolProveedor[]
): ProveedorFutbol {
  return {
    id,
    capacidades: {
      fixturesPorFecha: true, fixturesEnVivo: true, detalleFixture: true,
      eventos: true, alineaciones: true, estadisticas: true, clasificaciones: true,
      actualizacionPorLote: Boolean(actualizaciones)
    },
    obtenerPartidosPorFecha: vi.fn(obtener),
    obtenerPartidosEnVivo: vi.fn(async () => respuesta([])),
    obtenerDetalleFixture: vi.fn(async () => null),
    obtenerEventos: vi.fn(async () => ({ elementos: [], consultadoEn: '2026-10-01T20:00:00.000Z' })),
    obtenerAlineaciones: vi.fn(async () => ({ elementos: [], consultadoEn: '2026-10-01T20:00:00.000Z' })),
    obtenerEstadisticas: vi.fn(async () => ({ elementos: [], consultadoEn: '2026-10-01T20:00:00.000Z' })),
    obtenerClasificacion: vi.fn(async () => null),
    ...(actualizaciones ? {
      obtenerActualizacionesPorLote: vi.fn(async (ids: string[]) => ({
        elementos: actualizaciones.filter(actualizacion => ids.includes(actualizacion.partido.idProveedor)),
        consultadoEn: '2026-10-01T20:01:00.000Z',
        solicitudes: ids.length
      }))
    } : {})
  }
}

function repositorio(mappingsGoal = mappings, mappingsFootball = mappings) {
  const instancia = {
    cargarMappings: vi.fn(async id => id === 'goal-api' ? mappingsGoal : mappingsFootball),
    cargarTiemposDetalle: vi.fn(async () => new Map<string, string | null>()),
    upsertSnapshots: vi.fn(async () => undefined),
    upsertDetalles: vi.fn(async () => undefined),
    registrarCorrida: vi.fn(async () => undefined)
  } satisfies RepositorioWorkerFixturesFutbol
  return instancia
}

const ahora = () => new Date('2026-10-01T20:00:00.000Z')

describe('sincronizador diario privado de fixtures', () => {
  it('no consume proveedor ni escribe snapshots si no hay mappings', async () => {
    const principal = proveedor('goal-api', async () => respuesta([partido]))
    const secundario = proveedor('api-football', async () => respuesta([partido]))
    const repo = repositorio(mappingsVacios, mappingsVacios)

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, secundario, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado.estado).toBe('sin_mappings')
    expect(principal.obtenerPartidosPorFecha).not.toHaveBeenCalled()
    expect(secundario.obtenerPartidosPorFecha).not.toHaveBeenCalled()
    expect(repo.upsertSnapshots).not.toHaveBeenCalled()
  })

  it('reporta distinto un fallo al leer Supabase de un catálogo sin mappings', async () => {
    const principal = proveedor('goal-api', async () => respuesta([partido]))
    const repo = repositorio()
    vi.mocked(repo.cargarMappings).mockRejectedValueOnce(new Error('tabla aún no migrada'))

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado).toMatchObject({ estado: 'fallido', errorCode: 'MAPPINGS_UNAVAILABLE', solicitudes: 0 })
    expect(principal.obtenerPartidosPorFecha).not.toHaveBeenCalled()
    expect(repo.registrarCorrida).not.toHaveBeenCalled()
  })

  it('elige el fallback ya mapeado sin llamar al principal que no tiene mappings', async () => {
    const principal = proveedor('goal-api', async () => respuesta([partido]))
    const secundario = proveedor('api-football', async () => respuesta([partido]))
    const repo = repositorio(mappingsVacios, mappings)

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, secundario, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado).toMatchObject({ estado: 'completado', provider: 'api-football', fixturesGuardados: 1 })
    expect(principal.obtenerPartidosPorFecha).not.toHaveBeenCalled()
    expect(secundario.obtenerPartidosPorFecha).toHaveBeenCalledOnce()
    expect(repo.upsertSnapshots).toHaveBeenCalledOnce()
  })

  it('mantiene el proveedor fallback para el resto del día tras crear sus mappings', async () => {
    const principal: ProveedorFutbol = {
      ...proveedor('api-football', async () => respuesta([partido])),
      permiteDescubrimientoFixturesDiarios: true
    }
    const secundario: ProveedorFutbol = {
      ...proveedor('goal-api', async () => respuesta([partido])),
      permiteDescubrimientoFixturesDiarios: true
    }
    const repo = repositorio(mappings, mappingsVacios)

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, secundario, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado).toMatchObject({ estado: 'completado', provider: 'goal-api', fixturesGuardados: 1 })
    expect(secundario.obtenerPartidosPorFecha).toHaveBeenCalledOnce()
    expect(principal.obtenerPartidosPorFecha).not.toHaveBeenCalled()
  })

  it('limita detalles por ciclo y rota primero los que llevan más tiempo sin actualizar', async () => {
    const partidos = Array.from({ length: 5 }, (_, indice) => ({
      ...partido,
      idProveedor: `fixture-${indice + 1}`,
      estado: 'live' as const
    }))
    const paquetes = partidos.map(partidoActual => ({
      partido: partidoActual, eventos: [], alineaciones: [], estadisticas: []
    }))
    const mappingsLote: MappingsProveedorFutbol = {
      competencias: mappings.competencias,
      equipos: mappings.equipos,
      fixtures: partidos.map((partidoActual, indice) => ({
        externalId: partidoActual.idProveedor,
        fixtureId: `canonical-${indice + 1}`,
        fixture: {
          id: `canonical-${indice + 1}`, competitionId: 'canonical-league',
          homeTeamId: 'canonical-home', awayTeamId: 'canonical-away'
        }
      }))
    }
    const principal = proveedor('goal-api', async () => respuesta(partidos), paquetes)
    const repo = repositorio(mappingsLote)
    vi.mocked(repo.cargarTiemposDetalle).mockResolvedValue(new Map([
      ['fixture-1', '2026-10-01T19:59:00.000Z'],
      ['fixture-2', '2026-10-01T19:58:00.000Z'],
      ['fixture-3', '2026-10-01T19:30:00.000Z'],
      ['fixture-4', '2026-10-01T19:20:00.000Z'],
      ['fixture-5', null]
    ]))

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, repositorio: repo, fechaNegocio: '2026-10-01', ahora,
      maxActualizacionesPorCiclo: 100
    })

    expect(resultado).toMatchObject({ estado: 'completado', detallesActualizados: 2 })
    expect(principal.obtenerActualizacionesPorLote).toHaveBeenCalledWith([
      'fixture-5', 'fixture-4'
    ])

    const apiFootball: ProveedorFutbol = { ...principal, id: 'api-football' }
    vi.mocked(repo.cargarMappings).mockImplementation(async () => mappingsLote)
    const resultadoApiFootball = await sincronizarFixturesDiariosFutbol({
      principal: apiFootball, repositorio: repo, fechaNegocio: '2026-10-01', ahora,
      maxActualizacionesPorCiclo: 100
    })
    expect(resultadoApiFootball).toMatchObject({ estado: 'completado', detallesActualizados: 3 })
    expect(principal.obtenerActualizacionesPorLote).toHaveBeenNthCalledWith(2, [
      'fixture-5', 'fixture-4', 'fixture-3'
    ])
  })

  it('duerme por cuota cuando falla el principal y el fallback ya agotó su presupuesto', async () => {
    const principal = proveedor('api-football', async () => { throw new Error('proveedor no disponible') })
    const secundario = proveedor('goal-api', async () => { throw new ErrorProveedorFutbol('LIMITE_CUOTA') })
    const repo = repositorio()

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, secundario, repositorio: repo, fechaNegocio: '2026-10-01', ahora,
      puedeConsumir: async () => true
    })

    expect(resultado).toMatchObject({ estado: 'sin_cuota', errorCode: null, solicitudes: 1 })
    expect(secundario.obtenerPartidosPorFecha).toHaveBeenCalledOnce()
    expect(repo.registrarCorrida).toHaveBeenCalledWith(expect.objectContaining({
      success: false, reason: 'cuota_no_disponible', requests_used: 1
    }))
  })

  it('usa fallback solo si falla el principal; no ante una respuesta vacía válida', async () => {
    const principal = proveedor('goal-api', async () => respuesta([]))
    const secundario = proveedor('api-football', async () => respuesta([partido]))
    const repo = repositorio()

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, secundario, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado).toMatchObject({ estado: 'completado', provider: 'goal-api', fixturesRecibidos: 0 })
    expect(secundario.obtenerPartidosPorFecha).not.toHaveBeenCalled()
    expect(repo.upsertSnapshots).not.toHaveBeenCalled()
    expect(repo.registrarCorrida).toHaveBeenCalledWith(expect.objectContaining({ success: true, fixture_count: 0 }))
  })

  it('activa el fallback tras error de red y registra solo metadatos sin payload', async () => {
    const principal = proveedor('goal-api', async () => { throw new Error('respuesta privada del proveedor') })
    const secundario = proveedor('api-football', async () => respuesta([partido]))
    const repo = repositorio()

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, secundario, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado).toMatchObject({ estado: 'completado', provider: 'api-football', solicitudes: 2 })
    expect(repo.registrarCorrida).toHaveBeenCalledWith(expect.objectContaining({
      success: true, requests_used: 2, reason: 'fallback_proveedor'
    }))
    expect(JSON.stringify(repo.registrarCorrida.mock.calls)).not.toContain('respuesta privada del proveedor')
  })

  it('actualiza eventos, alineaciones y estadísticas para partidos iniciados', async () => {
    const partidoIniciado = { ...partido, estado: 'live' as const }
    const actualizacion: PaqueteActualizacionFutbolProveedor = {
      partido: partidoIniciado,
      eventos: [{ idProveedor: 'gol-1', minuto: 12, tipo: 'goal', equipoIdProveedor: 'local-ext' }],
      alineaciones: [{ equipoIdProveedor: 'local-ext', jugadores: [{ nombre: 'Delantero', titular: true }] }],
      estadisticas: [{ clave: 'Remates', etiqueta: 'Remates', valoresPorEquipo: [
        { equipoIdProveedor: 'local-ext', valor: 3 }, { equipoIdProveedor: 'visitante-ext', valor: 1 }
      ] }]
    }
    const principal = proveedor('api-football', async () => respuesta([partidoIniciado]), [actualizacion])
    const repo = repositorio()

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado).toMatchObject({ estado: 'completado', detallesActualizados: 1, solicitudes: 2 })
    expect(repo.upsertDetalles).toHaveBeenCalledWith([expect.objectContaining({
      provider: 'api-football', provider_fixture_id: 'fixture-ext',
      events: actualizacion.eventos, lineups: actualizacion.alineaciones, statistics: actualizacion.estadisticas
    })])
  })

  it('vuelve a consultar un programado con más de dos horas de retraso y guarda su estado corregido', async () => {
    const partidoVencido = { ...partido, inicioUtc: '2026-10-01T16:00:00.000Z' }
    const partidoFinalizado = { ...partidoVencido, estado: 'finished' as const, golesLocal: 2, golesVisitante: 1 }
    const actualizacion: PaqueteActualizacionFutbolProveedor = {
      partido: partidoFinalizado, eventos: [], alineaciones: [], estadisticas: []
    }
    const principal = proveedor('api-football', async () => respuesta([partidoVencido]), [actualizacion])
    const repo = repositorio()

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado).toMatchObject({ estado: 'completado', detallesActualizados: 1 })
    expect(principal.obtenerActualizacionesPorLote).toHaveBeenCalledOnce()
    expect(repo.upsertSnapshots).toHaveBeenCalledWith([expect.objectContaining({
      status: 'finished', goals_home: 2, goals_away: 1
    })])
  })

  it('no pide detalles de partidos fuera de las competiciones prioritarias', async () => {
    const partidoNoPrioritario = {
      ...partido,
      competencia: { idProveedor: 'liga-irrelevante', nombre: 'Liga no prioritaria', pais: 'Argentina' },
      estado: 'live' as const
    }
    const principal = proveedor('api-football', async () => respuesta([partidoNoPrioritario]), [])
    const repo = repositorio()

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado.estado).toBe('completado')
    expect(principal.obtenerActualizacionesPorLote).not.toHaveBeenCalled()
    expect(repo.upsertDetalles).not.toHaveBeenCalled()
  })

  it('usa Goal API como respaldo cuando API-Football falla al traer el detalle', async () => {
    const partidoEnVivo = { ...partido, estado: 'live' as const }
    const paquete: PaqueteActualizacionFutbolProveedor = { partido: partidoEnVivo, eventos: [], alineaciones: [], estadisticas: [] }
    const principal = proveedor('api-football', async () => respuesta([partidoEnVivo]), [paquete])
    const secundario = proveedor('goal-api', async () => respuesta([partidoEnVivo]), [paquete])
    vi.mocked(principal.obtenerActualizacionesPorLote!).mockRejectedValueOnce(
      Object.assign(new Error('error privado del proveedor'), { solicitudesConsumidas: 1 })
    )
    vi.mocked(secundario.obtenerActualizacionesPorLote!).mockResolvedValueOnce({
      elementos: [paquete], consultadoEn: '2026-10-01T20:01:00.000Z', solicitudes: 4
    })
    const repo = repositorio()

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, secundario, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado).toMatchObject({ estado: 'completado', provider: 'goal-api', solicitudes: 7, detallesActualizados: 1 })
    expect(repo.registrarCorrida).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'goal-api', requests_used: 7, reason: 'fallback_proveedor'
    }))
    expect(principal.obtenerPartidosPorFecha).toHaveBeenCalledOnce()
    expect(secundario.obtenerActualizacionesPorLote).toHaveBeenCalledOnce()
  })

  it('no intenta otro proveedor si la persistencia falla', async () => {
    const principal = proveedor('goal-api', async () => respuesta([partido]))
    const secundario = proveedor('api-football', async () => respuesta([partido]))
    const repo = repositorio()
    vi.mocked(repo.upsertSnapshots).mockRejectedValueOnce(new Error('db error'))

    const resultado = await sincronizarFixturesDiariosFutbol({
      principal, secundario, repositorio: repo, fechaNegocio: '2026-10-01', ahora
    })

    expect(resultado).toMatchObject({ estado: 'fallido', errorCode: 'SNAPSHOT_PERSISTENCE_FAILED' })
    expect(principal.obtenerPartidosPorFecha).toHaveBeenCalledOnce()
    expect(secundario.obtenerPartidosPorFecha).not.toHaveBeenCalled()
  })
})
