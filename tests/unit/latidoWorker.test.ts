import { describe, expect, it, vi } from 'vitest'
import { crearLatidoWorker } from '../../workers/latido_worker.mjs'

describe('latido independiente del worker editorial', () => {
  it('reporta actividad, renueva en reposo y marca el cierre limpio', async () => {
    vi.useFakeTimers()
    const estados: string[] = []
    const cliente = {
      rpc: vi.fn(async (_nombre: string, entrada: { p_state: string }) => {
        estados.push(entrada.p_state)
        return { error: null }
      })
    }
    const heartbeat = crearLatidoWorker({
      cliente,
      workerInstanceId: 'c9f8c9de-a22e-4ebf-9233-74446c096004',
      cadaMs: 60_000
    })

    await heartbeat.iniciar()
    expect(estados).toEqual(['active'])
    await vi.advanceTimersByTimeAsync(60_000)
    expect(estados).toEqual(['active', 'active'])
    await heartbeat.detener()
    expect(estados.at(-1)).toBe('stopped')
    expect(heartbeat.debeDetenerse()).toBe(false)
    vi.useRealTimers()
  })

  it('continúa disponible cuando aún no está instalada la migración de salud', async () => {
    const advertir = vi.fn()
    const cliente = { rpc: vi.fn(async () => ({ error: { code: 'PGRST202', message: 'mensaje interno no debe mostrarse' } })) }
    const heartbeat = crearLatidoWorker({
      cliente,
      workerInstanceId: 'c9f8c9de-a22e-4ebf-9233-74446c096004',
      cadaMs: 60_000,
      avisar: advertir
    })

    await expect(heartbeat.iniciar()).resolves.toBeUndefined()
    expect(advertir).toHaveBeenCalledTimes(1)
    expect(advertir.mock.calls[0]?.[0]).toContain('migración o actualización del esquema')
    expect(advertir.mock.calls[0]?.[0]).not.toContain('mensaje interno')
    await heartbeat.detener()
  })

  it('distingue fallos de servicio de una función que aún no está registrada', async () => {
    const advertir = vi.fn()
    const cliente = { rpc: vi.fn(async () => ({ error: { code: '42501', message: 'no autorizado' } })) }
    const heartbeat = crearLatidoWorker({
      cliente,
      workerInstanceId: 'c9f8c9de-a22e-4ebf-9233-74446c096004',
      cadaMs: 60_000,
      avisar: advertir
    })

    await heartbeat.iniciar()
    expect(advertir.mock.calls[0]?.[0]).toContain('fallo del servicio (42501)')
    await heartbeat.detener()
  })
})
