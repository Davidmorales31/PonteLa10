import { describe, expect, it } from 'vitest'
import { diagnosticarTransporteEditorial, obtenerBaseUrlEditorial } from '../../scripts/codex-editorial-config.mjs'

describe('destino independiente de la corrida editorial', () => {
  it('usa producción para editorial y conserva el destino local de fútbol', () => {
    const entorno = {
      PONT3LA10_CODEX_EDITORIAL_API_BASE_URL: 'https://www.pont3la10.com',
      PONT3LA10_CODEX_API_BASE_URL: 'http://127.0.0.1:3001'
    }
    expect(obtenerBaseUrlEditorial(entorno)).toBe('https://www.pont3la10.com')
    expect(entorno.PONT3LA10_CODEX_API_BASE_URL).toBe('http://127.0.0.1:3001')
  })

  it('conserva compatibilidad con ejecuciones locales y detecta ausencia de URL', () => {
    expect(obtenerBaseUrlEditorial({ PONT3LA10_CODEX_API_BASE_URL: 'http://localhost:3001' })).toBe('http://localhost:3001')
    expect(obtenerBaseUrlEditorial({ PONT3LA10_CODEX_EDITORIAL_API_BASE_URL: '  ', PONT3LA10_CODEX_API_BASE_URL: 'https://pont3la10.com' })).toBe('https://pont3la10.com')
    expect(obtenerBaseUrlEditorial({})).toBe('')
  })

  it('no oculta una configuración editorial explícita tras el destino heredado', () => {
    expect(obtenerBaseUrlEditorial({ PONT3LA10_CODEX_EDITORIAL_API_BASE_URL: ' inválida ', PONT3LA10_CODEX_API_BASE_URL: 'http://localhost:3001' })).toBe('inválida')
  })
})

describe('diagnóstico de transporte sin datos privados', () => {
  it('distingue servidor local apagado, DNS, timeout y certificado', () => {
    expect(diagnosticarTransporteEditorial({ cause: { code: 'ECONNREFUSED' } })).toContain('Conexión rechazada')
    expect(diagnosticarTransporteEditorial({ cause: { code: 'ENOTFOUND' } })).toContain('resolver el dominio')
    expect(diagnosticarTransporteEditorial({ name: 'TimeoutError' })).toContain('tiempo de espera')
    expect(diagnosticarTransporteEditorial({ cause: { code: 'CERT_HAS_EXPIRED' } })).toContain('certificado HTTPS')
  })

  it('omite mensajes, códigos desconocidos y URL con credenciales', () => {
    const error = { message: 'https://usuario:secreto@host/', cause: { code: 'TOKEN_PRIVADO', message: 'secreto' } }
    expect(diagnosticarTransporteEditorial(error)).toBe('La API privada no respondió.')
  })
})
