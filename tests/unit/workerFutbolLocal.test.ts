import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { crearSincronizadorFutbolLocal } from '../../workers/sincronizar_futbol_local.mjs'

const secreto = 'secreto-local-de-prueba'

describe('integración de fútbol en el worker local', () => {
  it('firma y activa los endpoints de fixtures y clasificación solo al llegar el intervalo', async () => {
    let ahora = Date.parse('2026-10-01T20:00:00.000Z')
    const llamadas: Array<[URL, RequestInit]> = []
    const transporte = vi.fn((input: URL | RequestInfo, init?: RequestInit) => {
      const url = input instanceof URL ? input : new URL(input instanceof Request ? input.url : String(input))
      const opciones = init || {}
      llamadas.push([url, opciones])
      return Promise.resolve(new Response(JSON.stringify({
        estado: 'completado', provider: 'api-football', solicitudes: 2, fixturesGuardados: 1
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
    })
    const sincronizador = crearSincronizadorFutbolLocal({
      entorno: {
        PONT3LA10_FUTBOL_WORKER_ENABLED: 'true',
        PONT3LA10_FUTBOL_SYNC_INTERVAL_MS: '3600000',
        PONT3LA10_CODEX_API_BASE_URL: 'http://127.0.0.1:3001',
        NUXT_FUTBOL_WORKER_API_SECRET: secreto
      },
      transporte,
      ahora: () => ahora,
      registrar: vi.fn(),
      avisar: vi.fn()
    })

    const resultado = await sincronizador.ejecutarSiCorresponde()
    expect(resultado.estado).toBe('completado')
    expect(transporte).toHaveBeenCalledTimes(2)
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
      expect(['fixtures', 'clasificaciones'].some(nombre => ruta.endsWith(nombre))).toBe(true)
    }

    expect((await sincronizador.ejecutarSiCorresponde()).estado).toBe('esperando')
    expect(transporte).toHaveBeenCalledTimes(2)
    ahora += 60 * 60 * 1000
    await sincronizador.ejecutarSiCorresponde()
    expect(transporte).toHaveBeenCalledTimes(4)
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
})
