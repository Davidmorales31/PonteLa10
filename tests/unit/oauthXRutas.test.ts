import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
import { cifrarOAuthX, huellaOAuthX, permisosOAuthX } from '~/server/utils/oauthX'
const dobles = vi.hoisted(() => ({ permiso: vi.fn(), rpc: vi.fn(), getCookie: vi.fn(), getQuery: vi.fn(),
  setCookie: vi.fn(), deleteCookie: vi.fn(), setHeader: vi.fn(), getHeader: vi.fn(), getRequestURL: vi.fn(), sendRedirect: vi.fn() }))
vi.mock('h3', async original => ({ ...await original<typeof import('h3')>(), ...Object.fromEntries(
  ['getCookie','getQuery','setCookie','deleteCookie','setHeader','getHeader','getRequestURL','sendRedirect'].map(nombre => [nombre,dobles[nombre as keyof typeof dobles]])) }))
vi.mock('~/server/utils/autorizacionEditorial', () => ({ exigirPermisoEditorial: dobles.permiso }))
vi.mock('~/server/utils/clienteSupabasePrivado', () => ({ obtenerClienteSupabasePrivado: () => ({ rpc: dobles.rpc }) }))
let conectar: (evento: H3Event) => Promise<unknown>, callback: (evento: H3Event) => Promise<unknown>
const evento = {} as H3Event
const clave = 'ab'.repeat(32), navegador = 'n'.repeat(43), state = 's'.repeat(43)
const configuracion = { xClientId: 'cliente', xClientSecret: 'secreto', socialEncryptionKey: clave,
  xRedirectUri: 'http://localhost:3001/api/admin/redes/oauth/x/callback' }
beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('createError', (await import('h3')).createError)
  conectar = (await import('~/server/api/admin/redes/oauth/x/conectar.post')).default as unknown as typeof conectar
  callback = (await import('~/server/api/admin/redes/oauth/x/callback.get')).default as unknown as typeof callback
})
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('useRuntimeConfig', () => configuracion)
  dobles.permiso.mockResolvedValue({ usuario: { id: '11111111-1111-4111-8111-111111111111' } })
  dobles.rpc.mockResolvedValue({ data: 'reserva', error: null })
  dobles.getHeader.mockImplementation((_e, nombre) => nombre === 'origin' ? 'http://localhost:3001' : 'application/json')
  dobles.getRequestURL.mockReturnValue(new URL('http://localhost:3001/api/admin/redes/oauth/x/conectar'))
  dobles.getCookie.mockReturnValue(navegador)
  dobles.getQuery.mockReturnValue({ state, code: 'codigo-no-real' })
})
afterAll(() => vi.unstubAllGlobals())
describe('rutas OAuth X privadas', () => {
  it('exige permiso y MFA antes de reservar e impide orígenes cruzados', async () => {
    await conectar(evento)
    expect(dobles.permiso).toHaveBeenCalledWith(evento, 'configuracion.gestionar', { exigirMfa: true })
    expect(dobles.setCookie).toHaveBeenCalledWith(evento, 'pont3la10-x-oauth', expect.any(String), expect.objectContaining({ httpOnly: true, sameSite: 'lax', maxAge: 600 }))
    dobles.rpc.mockClear()
    dobles.getHeader.mockImplementation((_e, nombre) => nombre === 'origin' ? 'https://ajeno.test' : 'application/json')
    await expect(conectar(evento)).rejects.toMatchObject({ statusCode: 403 })
    expect(dobles.rpc).not.toHaveBeenCalled()
  })
  it('no reserva ni redirige cuando se deniega acceso o falta MFA', async () => {
    dobles.permiso.mockRejectedValueOnce(Object.assign(new Error(), { statusCode: 403 }))
    await expect(conectar(evento)).rejects.toMatchObject({ statusCode: 403 })
    expect(dobles.rpc).not.toHaveBeenCalled()
  })
  it('rechaza retorno sin cookie o con estado malformado sin llamar al proveedor', async () => {
    const transporte = vi.fn(); vi.stubGlobal('fetch', transporte)
    dobles.getCookie.mockReturnValue(undefined)
    await callback(evento)
    expect(dobles.rpc).not.toHaveBeenCalled()
    expect(transporte).not.toHaveBeenCalled()
    expect(dobles.sendRedirect).toHaveBeenLastCalledWith(evento, '/admin/redes/cuentas?resultadoX=autorizacion_invalida', 303)
  })
  it('el callback verifica sesión/MFA e impide replay antes del intercambio', async () => {
    const transporte = vi.fn(); vi.stubGlobal('fetch', transporte)
    dobles.rpc.mockResolvedValue({ data: null, error: null })
    await callback(evento)
    expect(dobles.permiso).toHaveBeenCalledWith(evento, 'configuracion.gestionar', { exigirMfa: true })
    expect(dobles.rpc).toHaveBeenCalledWith('consume_social_x_oauth', expect.objectContaining({ p_state_hash: huellaOAuthX(state), p_browser_hash: huellaOAuthX(navegador) }))
    expect(transporte).not.toHaveBeenCalled()
  })
  it('guarda solo ciphertext y limpia los parámetros sensibles al regresar', async () => {
    dobles.rpc.mockResolvedValueOnce({ data: { id: '22222222-2222-4222-8222-222222222222', encrypted_flow:
      cifrarOAuthX({ verifier: 'v'.repeat(64), redirectUri: configuracion.xRedirectUri }, clave, `x:flow:${huellaOAuthX(state)}`) }, error: null })
      .mockResolvedValueOnce({ data: null, error: null })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ access_token: 'acceso', refresh_token: 'renovar', token_type: 'bearer', expires_in: 7200, scope: permisosOAuthX.join(' ') }))
      .mockResolvedValueOnce(Response.json({ data: { id: '123', username: 'Pont3la10' } })))
    await callback(evento)
    const guardado = dobles.rpc.mock.calls[1]!
    expect(guardado[0]).toBe('save_social_x_connection')
    expect(JSON.stringify(guardado[1])).not.toContain('renovar')
    expect(guardado[1].p_token_cipher).toMatch(/^v1\./)
    expect(dobles.sendRedirect).toHaveBeenLastCalledWith(evento, '/admin/redes/cuentas?resultadoX=conectada', 303)
  })
})
