import { describe, expect, it } from 'vitest'
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
