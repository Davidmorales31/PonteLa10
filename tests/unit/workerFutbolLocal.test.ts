import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { crearSincronizadorFutbolLocal } from '../../workers/sincronizar_futbol_local.mjs'

const secreto = 'secreto-local-de-prueba'

describe('integración de fútbol en el worker local', () => {
  it('firma fixtures cada cinco minutos sin consumir el ciclo en clasificaciones', async () => {
    let ahora = Date.parse('2026-10-01T20:00:00.000Z')
    const llamadas: Array<[URL, RequestInit]> = []
    const registrar = vi.fn()
    const transporte = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url = input instanceof URL ? input : new URL(input instanceof Request ? input.url : String(input))
      const opciones = init || {}
      llamadas.push([url, opciones])
      return Promise.resolve(new Response(JSON.stringify({
        estado: 'completado', provider: 'api-football', solicitudes: 2, fixturesGuardados: 1,
        omitidos: { datos_invalidos: 0, competencia_no_mapeada: 0 }
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
    })
    const sincronizador = crearSincronizadorFutbolLocal({
      entorno: {
        PONT3LA10_FUTBOL_WORKER_ENABLED: 'true',
        PONT3LA10_FUTBOL_SYNC_INTERVAL_MS: '300000',
        PONT3LA10_CODEX_API_BASE_URL: 'http://127.0.0.1:3001',
        NUXT_FUTBOL_WORKER_API_SECRET: secreto
      },
      transporte,
      ahora: () => ahora,
      registrar,
      avisar: vi.fn()
    })

    const resultado = await sincronizador.ejecutarSiCorresponde()
    expect(resultado.estado).toBe('completado')
    expect(transporte).toHaveBeenCalledTimes(1)
    expect(registrar.mock.calls[0]?.[0]).toContain('"omitidos":{"datos_invalidos":0,"competencia_no_mapeada":0}')
    for (const [url, init] of llamadas) {
      const ruta = url.pathname
      const encabezados = init?.headers as Record<string, string>
      const cuerpo = String(init?.body)
      const esperada = createHmac('sha256', secreto)
        .update(`${encabezados['x-pont3la10-timestamp']}.POST.${ruta}.${encabezados['x-pont3la10-request-id']}.`)
        .update(cuerpo)
        .digest('hex')
      expect(encabezados['x-pont3la10-signature']).toBe(esperada)
      expect(cuerpo).toBe('{}')
      expect(ruta.endsWith('/fixtures')).toBe(true)
    }

    expect((await sincronizador.ejecutarSiCorresponde()).estado).toBe('esperando')
    expect(transporte).toHaveBeenCalledTimes(1)
    ahora += 5 * 60 * 1000
    await sincronizador.ejecutarSiCorresponde()
    expect(transporte).toHaveBeenCalledTimes(2)
  })

  it('no hace llamadas por omisión y rechaza destinos ajenos al PC', async () => {
    const transporte = vi.fn()
    const deshabilitado = crearSincronizadorFutbolLocal({
      entorno: { PONT3LA10_FUTBOL_WORKER_ENABLED: 'false' }, transporte
    })
    expect((await deshabilitado.ejecutarSiCorresponde()).estado).toBe('deshabilitado')

    const avisar = vi.fn()
    const destinoExterno = crearSincronizadorFutbolLocal({
      entorno: {
        PONT3LA10_FUTBOL_WORKER_ENABLED: 'true',
        NUXT_FUTBOL_WORKER_API_SECRET: secreto,
        PONT3LA10_CODEX_API_BASE_URL: 'https://pont3la10.com'
      },
      transporte,
      avisar
    })
    expect((await destinoExterno.ejecutarSiCorresponde()).estado).toBe('no_configurado')
    expect(transporte).not.toHaveBeenCalled()
    expect(avisar).toHaveBeenCalledOnce()
  })

  it('usa la próxima ventana adaptativa sugerida por Production', async () => {
    let ahora = Date.parse('2026-10-01T20:00:00.000Z')
    const transporte = vi.fn(async () => new Response(JSON.stringify({
      estado: 'completado', siguienteEjecucionMs: 60_000, siguienteEjecucionMotivo: 'fixture_debe_actualizarse'
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    const sincronizador = crearSincronizadorFutbolLocal({
      entorno: {
        PONT3LA10_FUTBOL_WORKER_ENABLED: 'true',
        PONT3LA10_FUTBOL_SYNC_INTERVAL_MS: '300000',
        PONT3LA10_CODEX_API_BASE_URL: 'http://127.0.0.1:3001',
        NUXT_FUTBOL_WORKER_API_SECRET: secreto
      },
      transporte,
      ahora: () => ahora,
      registrar: vi.fn(),
      avisar: vi.fn()
    })

    await sincronizador.ejecutarSiCorresponde()
    ahora += 59_999
    expect((await sincronizador.ejecutarSiCorresponde()).estado).toBe('esperando')
    ahora += 1
    expect((await sincronizador.ejecutarSiCorresponde()).estado).toBe('completado')
    expect(transporte).toHaveBeenCalledTimes(2)
  })
})
