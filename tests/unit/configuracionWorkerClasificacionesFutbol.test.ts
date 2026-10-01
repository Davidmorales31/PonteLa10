import { describe, expect, it, vi } from 'vitest'
import {
  crearGateReservaClasificaciones,
  fechaNegocioBogota,
  leerAllowlistClasificacionesFutbol
} from '../../server/utils/proveedoresFutbol/configuracionWorkerClasificaciones'

describe('configuración privada del worker de clasificaciones', () => {
  it('falla cerrado cuando la allowlist está vacía', () => {
    expect(leerAllowlistClasificacionesFutbol('')).toEqual([])
    expect(leerAllowlistClasificacionesFutbol(undefined)).toEqual([])
  })

  it('normaliza y deduplica objetivos sin permitir entradas incompletas', () => {
    expect(leerAllowlistClasificacionesFutbol(' liga-a:2026,liga-a:2026 ,liga-b:2025 ')).toEqual([
      { competenciaExterna: 'liga-a', temporada: '2026' },
      { competenciaExterna: 'liga-b', temporada: '2025' }
    ])
    expect(() => leerAllowlistClasificacionesFutbol('liga-a')).toThrow('allowlist')
  })

  it('calcula el día de negocio Bogotá, no la fecha UTC del proceso', () => {
    expect(fechaNegocioBogota(new Date('2026-10-02T02:00:00.000Z'))).toBe('2026-10-01')
  })

  it('reutiliza una reserva sólo dentro de la misma activación', async () => {
    const reclamar = vi.fn(async () => true)
    const puedeConsumir = crearGateReservaClasificaciones(reclamar)
    await expect(puedeConsumir('goal-api')).resolves.toBe(true)
    await expect(puedeConsumir('goal-api')).resolves.toBe(true)
    expect(reclamar).toHaveBeenCalledOnce()
  })
})
