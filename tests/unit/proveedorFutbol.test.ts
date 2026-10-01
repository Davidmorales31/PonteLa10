import { describe, expect, it, vi } from 'vitest'
import type { ProveedorFutbol } from '../../server/utils/proveedoresFutbol/contrato'
import { validarProveedorFutbol } from '../../server/utils/proveedoresFutbol/contrato'

function crearProveedorPrueba(
  opciones: { actualizacionPorLote?: boolean; incluirMetodoLote?: boolean } = {}
): ProveedorFutbol {
  const actualizacionPorLote = opciones.actualizacionPorLote ?? false
  const proveedor: ProveedorFutbol = {
    id: 'goal-api',
    capacidades: {
      fixturesPorFecha: true,
      fixturesEnVivo: true,
      detalleFixture: true,
      eventos: true,
      alineaciones: true,
      estadisticas: true,
      clasificaciones: true,
      actualizacionPorLote
    },
    obtenerPartidosPorFecha: vi.fn(),
    obtenerPartidosEnVivo: vi.fn(),
    obtenerDetalleFixture: vi.fn(),
    obtenerEventos: vi.fn(),
    obtenerAlineaciones: vi.fn(),
    obtenerEstadisticas: vi.fn(),
    obtenerClasificacion: vi.fn()
  }

  if (opciones.incluirMetodoLote) {
    proveedor.obtenerActualizacionesPorLote = vi.fn()
  }

  return proveedor
}

describe('contrato de proveedor de fútbol', () => {
  it('acepta un adaptador que implementa las operaciones comunes', () => {
    expect(() => validarProveedorFutbol(crearProveedorPrueba())).not.toThrow()
  })

  it('rechaza un adaptador que anuncia lotes sin implementar el método', () => {
    expect(() => validarProveedorFutbol(crearProveedorPrueba({
      actualizacionPorLote: true
    }))).toThrow('El proveedor declara actualización por lote, pero no implementa el método.')
  })

  it('acepta lotes solo cuando la capacidad y el método coinciden', () => {
    expect(() => validarProveedorFutbol(crearProveedorPrueba({
      actualizacionPorLote: true,
      incluirMetodoLote: true
    }))).not.toThrow()
  })
})
