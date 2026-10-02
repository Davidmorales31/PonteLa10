import { describe, expect, it, vi } from 'vitest'
import { crearProveedoresFutbolConfigurados } from '~/server/utils/proveedoresFutbol/desdeConfiguracion'

describe('configuración privada de proveedores de fútbol', () => {
  it('usa API-Football como principal y Goal API como fallback predeterminados', () => {
    const proveedores = crearProveedoresFutbolConfigurados({
      apiSportsKey: 'football-secret',
      goalApiKey: 'goal-secret'
    })

    expect(proveedores.principal.id).toBe('api-football')
    expect(proveedores.secundario?.id).toBe('goal-api')
    expect(JSON.stringify(proveedores)).not.toContain('secret')
  })

  it('permite desactivar el fallback de forma explícita', () => {
    const proveedores = crearProveedoresFutbolConfigurados({
      apiSportsKey: 'football-secret',
      footballFallbackProvider: ''
    })

    expect(proveedores.principal.id).toBe('api-football')
    expect(proveedores.secundario).toBeUndefined()
  })

  it('permite invertir el orden sin acoplar identidades ni claves', () => {
    const proveedores = crearProveedoresFutbolConfigurados({
      footballPrimaryProvider: 'goal-api',
      footballFallbackProvider: 'api-football',
      apiSportsKey: 'football-secret',
      goalApiKey: 'goal-secret'
    })

    expect(proveedores.principal.id).toBe('goal-api')
    expect(proveedores.secundario?.id).toBe('api-football')
  })

  it('configura Goal API para consultar solo las ligas prioritarias y en el servidor del proveedor', async () => {
    const fetchOriginal = globalThis.fetch
    const fetchSimulado = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    )
    vi.stubGlobal('fetch', fetchSimulado)

    try {
      const proveedores = crearProveedoresFutbolConfigurados({
        apiSportsKey: 'football-secret',
        goalApiKey: 'goal-secret'
      })
      await proveedores.secundario!.obtenerPartidosPorFecha({
        fecha: '2026-10-01', zonaHoraria: 'America/Bogota'
      })

      const urls = fetchSimulado.mock.calls.map(([url]) => new URL(String(url)))
      expect(urls).toHaveLength(16)
      expect(urls.every(url => url.pathname === '/v1/fixtures/date/2026-10-01'
        && Boolean(url.searchParams.get('leagueId')))).toBe(true)
      expect(new Set(urls.map(url => url.searchParams.get('leagueId'))).size).toBe(16)
      expect(urls.some(url => url.searchParams.get('leagueId') === '356')).toBe(true)
    } finally {
      vi.stubGlobal('fetch', fetchOriginal)
    }
  })

  it('falla cerrado si falta la clave del proveedor principal o fallback elegido', () => {
    expect(() => crearProveedoresFutbolConfigurados({})).toThrow('La clave privada de API-Football')
    expect(() => crearProveedoresFutbolConfigurados({
      apiSportsKey: 'football-secret'
    })).toThrow('La clave privada de Goal API')
  })

  it('rechaza identificadores duplicados, desconocidos y URLs inseguras', () => {
    expect(() => crearProveedoresFutbolConfigurados({
      apiSportsKey: 'football-secret',
      footballFallbackProvider: 'api-football'
    })).toThrow('distinto del principal')

    expect(() => crearProveedoresFutbolConfigurados({
      footballPrimaryProvider: 'proveedor-desconocido'
    })).toThrow('no es compatible')

    expect(() => crearProveedoresFutbolConfigurados({
      footballPrimaryProvider: 'goal-api',
      footballFallbackProvider: '',
      goalApiKey: 'goal-secret',
      goalApiBaseUrl: 'http://localhost:8080'
    })).toThrow('debe ser HTTPS')
  })
})
