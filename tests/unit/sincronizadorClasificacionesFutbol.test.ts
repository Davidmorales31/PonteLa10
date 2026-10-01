import { describe, expect, it, vi } from 'vitest'
import type { ClasificacionFutbolProveedor } from '~/types/futbolProveedor'
import type { ProveedorFutbol } from '../../server/utils/proveedoresFutbol/contrato'
import {
  sincronizarClasificacionesFutbol,
  type RepositorioWorkerClasificacionesFutbol
} from '../../server/utils/proveedoresFutbol/sincronizadorClasificaciones'

const clasificacion: ClasificacionFutbolProveedor = {
  competencia: { idProveedor: 'liga-ext', nombre: 'Liga BetPlay', temporada: 2026 },
  consultadoEn: '2026-10-01T20:00:00.000Z',
  grupos: [{ nombre: 'Apertura', filas: [{
    posicion: 1, equipo: { idProveedor: 'equipo-ext', nombre: 'Equipo canónico' },
    jugados: 1, ganados: 1, empatados: 0, perdidos: 0, golesFavor: 2, golesContra: 0,
    diferenciaGoles: 2, puntos: 3
  }] }]
}

const mappings = {
  competencias: [{ externalId: 'liga-ext', competitionId: 'liga-canonica' }],
  equipos: [{ externalId: 'equipo-ext', teamId: 'equipo-canonico' }]
}

function proveedor(id: 'goal-api' | 'api-football', obtener = async () => clasificacion): ProveedorFutbol {
  return {
    id,
    capacidades: { fixturesPorFecha: true, fixturesEnVivo: true, detalleFixture: true, eventos: true,
      alineaciones: true, estadisticas: true, clasificaciones: true, actualizacionPorLote: false },
    obtenerPartidosPorFecha: vi.fn(async () => ({ elementos: [], consultadoEn: '2026-10-01T20:00:00.000Z' })),
    obtenerPartidosEnVivo: vi.fn(async () => ({ elementos: [], consultadoEn: '2026-10-01T20:00:00.000Z' })),
    obtenerDetalleFixture: vi.fn(async () => null),
    obtenerEventos: vi.fn(async () => ({ elementos: [], consultadoEn: '2026-10-01T20:00:00.000Z' })),
    obtenerAlineaciones: vi.fn(async () => ({ elementos: [], consultadoEn: '2026-10-01T20:00:00.000Z' })),
    obtenerEstadisticas: vi.fn(async () => ({ elementos: [], consultadoEn: '2026-10-01T20:00:00.000Z' })),
    obtenerClasificacion: vi.fn(obtener)
  }
}

function repositorio(cargado = mappings) {
  return {
    cargarMappingsClasificacion: vi.fn(async () => cargado),
    upsertSnapshotsClasificacion: vi.fn(async () => undefined),
    registrarCorrida: vi.fn(async () => undefined)
  } satisfies RepositorioWorkerClasificacionesFutbol
}

const base = { fechaNegocio: '2026-10-01', objetivos: [{ competenciaExterna: 'liga-ext', temporada: 2026 }], ahora: () => new Date('2026-10-01T20:00:00.000Z') }

describe('sincronizador privado de clasificaciones', () => {
  it('no consulta mappings ni proveedor cuando la allowlist está vacía', async () => {
    const principal = proveedor('goal-api')
    const repo = repositorio()
    const resultado = await sincronizarClasificacionesFutbol({ ...base, objetivos: [], principal, repositorio: repo })
    expect(resultado.estado).toBe('sin_objetivos')
    expect(repo.cargarMappingsClasificacion).not.toHaveBeenCalled()
    expect(principal.obtenerClasificacion).not.toHaveBeenCalled()
  })

  it('no consume cuota cuando no hay mappings canónicos completos', async () => {
    const principal = proveedor('goal-api')
    const repo = repositorio({ competencias: [], equipos: [] })
    const resultado = await sincronizarClasificacionesFutbol({ ...base, principal, repositorio: repo })
    expect(resultado).toMatchObject({ estado: 'sin_mappings', solicitudes: 0 })
    expect(principal.obtenerClasificacion).not.toHaveBeenCalled()
  })

  it('consulta sólo el objetivo explícito y persiste una proyección privada', async () => {
    const principal = proveedor('goal-api')
    const repo = repositorio()
    const resultado = await sincronizarClasificacionesFutbol({ ...base, principal, repositorio: repo })
    expect(resultado).toMatchObject({ estado: 'completado', solicitudes: 1, clasificacionesGuardadas: 1 })
    expect(repo.cargarMappingsClasificacion).toHaveBeenCalledWith('goal-api', ['liga-ext'])
    expect(principal.obtenerClasificacion).toHaveBeenCalledWith('liga-ext', 2026)
    expect(repo.upsertSnapshotsClasificacion).toHaveBeenCalledWith([expect.objectContaining({
      competition_id: 'liga-canonica', is_public: false, publication_rights_confirmed: false
    })])
  })

  it('rechaza una respuesta con temporada distinta sin guardarla', async () => {
    const principal = proveedor('goal-api', async () => ({ ...clasificacion, competencia: { ...clasificacion.competencia, temporada: 2025 } }))
    const repo = repositorio()
    const resultado = await sincronizarClasificacionesFutbol({ ...base, principal, repositorio: repo })
    expect(resultado).toMatchObject({ estado: 'completado', clasificacionesRecibidas: 1, clasificacionesGuardadas: 0,
      omitidos: { clasificacion_invalida: 1 } })
    expect(repo.upsertSnapshotsClasificacion).not.toHaveBeenCalled()
  })

  it('distingue un fallo de lectura de mappings y no llama al proveedor', async () => {
    const principal = proveedor('goal-api')
    const repo = repositorio()
    vi.mocked(repo.cargarMappingsClasificacion).mockRejectedValueOnce(new Error('detalle SQL privado'))
    const resultado = await sincronizarClasificacionesFutbol({ ...base, principal, repositorio: repo })
    expect(resultado).toMatchObject({ estado: 'fallido', errorCode: 'MAPPINGS_UNAVAILABLE', solicitudes: 0 })
    expect(principal.obtenerClasificacion).not.toHaveBeenCalled()
  })
})
