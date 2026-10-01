import { describe, expect, it, vi } from 'vitest'
import type { ProveedorFutbol } from '~/server/utils/proveedoresFutbol/contrato'
import { crearFallbackProveedorFutbol } from '~/server/utils/proveedoresFutbol/fallback'

function crearProveedor(id: 'goal-api' | 'api-football'): ProveedorFutbol {
  return {
    id,
    capacidades: {
      fixturesPorFecha: true,
      fixturesEnVivo: true,
      detalleFixture: true,
      eventos: true,
      alineaciones: true,
      estadisticas: true,
      clasificaciones: true,
      actualizacionPorLote: false
    },
    obtenerPartidosPorFecha: vi.fn(),
    obtenerPartidosEnVivo: vi.fn(),
    obtenerDetalleFixture: vi.fn(),
    obtenerEventos: vi.fn(),
    obtenerAlineaciones: vi.fn(),
    obtenerEstadisticas: vi.fn(),
    obtenerClasificacion: vi.fn()
  } as unknown as ProveedorFutbol
}

describe('fallback de proveedor de fútbol', () => {
  it('no consulta el secundario si el principal devuelve una colección vacía', async () => {
    const principal = crearProveedor('api-football')
    const secundario = crearProveedor('goal-api')
    const ejecutar = vi.fn().mockResolvedValue([])
    const resultado = await crearFallbackProveedorFutbol({ principal, secundario })
      .consultar('fixtures', ejecutar)

    expect(resultado).toEqual({ datos: [], proveedor: 'api-football', usoFallback: false })
    expect(ejecutar).toHaveBeenCalledTimes(1)
    expect(ejecutar).toHaveBeenCalledWith(principal)
  })

  it('activa el fallback solo tras error y etiqueta al proveedor que devolvió los datos', async () => {
    const principal = crearProveedor('api-football')
    const secundario = crearProveedor('goal-api')
    const eventos: unknown[] = []
    const ejecutar = vi.fn()
      .mockRejectedValueOnce(new Error('fallo principal'))
      .mockResolvedValueOnce(['partido'])
    const resultado = await crearFallbackProveedorFutbol({
      principal,
      secundario,
      registrar: evento => { eventos.push(evento) }
    }).consultar('fixtures', ejecutar)

    expect(resultado).toEqual({ datos: ['partido'], proveedor: 'goal-api', usoFallback: true })
    expect(ejecutar).toHaveBeenNthCalledWith(1, principal)
    expect(ejecutar).toHaveBeenNthCalledWith(2, secundario)
    expect(eventos).toEqual([
      { operacion: 'fixtures', proveedor: 'api-football', resultado: 'error', usoFallback: false, solicitudes: 1 },
      { operacion: 'fixtures', proveedor: 'goal-api', resultado: 'exito', usoFallback: true, solicitudes: 1 }
    ])
  })

  it('verifica el presupuesto de ambos proveedores antes de consultar datos', async () => {
    const principal = crearProveedor('api-football')
    const secundario = crearProveedor('goal-api')
    const ejecutar = vi.fn()
    const puedeConsumir = vi.fn().mockResolvedValue(false)

    await expect(crearFallbackProveedorFutbol({ principal, secundario, puedeConsumir })
      .consultar('standings', ejecutar)).rejects.toThrow('El proveedor secundario no tiene cuota')

    expect(puedeConsumir).toHaveBeenNthCalledWith(1, 'api-football')
    expect(puedeConsumir).toHaveBeenNthCalledWith(2, 'goal-api')
    expect(puedeConsumir).toHaveBeenCalledTimes(2)
    expect(ejecutar).not.toHaveBeenCalled()
  })

  it('no intenta el fallback cuando su propia cuota está agotada', async () => {
    const principal = crearProveedor('api-football')
    const secundario = crearProveedor('goal-api')
    const puedeConsumir = vi.fn().mockImplementation(id => id === 'api-football')
    const ejecutar = vi.fn().mockRejectedValue(new Error('fallo'))

    await expect(crearFallbackProveedorFutbol({ principal, secundario, puedeConsumir })
      .consultar('live', ejecutar)).rejects.toThrow('El proveedor secundario no tiene cuota')

    expect(ejecutar).toHaveBeenCalledTimes(1)
  })
})
