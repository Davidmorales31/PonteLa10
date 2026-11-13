import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { cifrarOAuthX, crearSolicitudOAuthX, descifrarOAuthX, huellaOAuthX,
  crearPublicacionX, intercambiarCodigoOAuthX, permisosOAuthX, renovarTokenOAuthX, subirImagenX, validarConfiguracionOAuthX } from '~/server/utils/oauthX'

const clave = 'ab'.repeat(32)
const config = { clientId: 'cliente-prueba', clientSecret: 'secreto-prueba', clave,
  redirectUri: 'http://localhost:3001/api/admin/redes/oauth/x/callback' }
const datosConfig = { xClientId: config.clientId, xClientSecret: config.clientSecret, socialEncryptionKey: clave, xRedirectUri: config.redirectUri }
const token = { access_token: 'acceso-no-real', refresh_token: 'renovacion-no-real', token_type: 'bearer', expires_in: 7200, scope: permisosOAuthX.join(' ') }
describe('OAuth X: configuración, PKCE y cifrado', () => {
  it('rechaza callbacks inseguros, inesperados y configuración incompleta', () => {
    expect(validarConfiguracionOAuthX(datosConfig)).toEqual(config)
    for (const uri of ['http://ajeno.test/api/admin/redes/oauth/x/callback', 'https://user:password@ejemplo.test/api/admin/redes/oauth/x/callback',
      'https://ejemplo.test/api/admin/redes/oauth/x/callback?redirect=https://ajeno.test','https://ejemplo.test/otra-ruta']) {
      expect(() => validarConfiguracionOAuthX({ ...datosConfig, xRedirectUri: uri })).toThrow()
    }
    expect(() => validarConfiguracionOAuthX({ ...datosConfig, socialEncryptionKey: 'abc' })).toThrow()
    expect(() => validarConfiguracionOAuthX({ ...datosConfig, xClientSecret: '' })).toThrow()
  })
  it('construye una URL pública sin secretos y un PKCE S256 ligado al verificador cifrado', () => {
    const solicitud = crearSolicitudOAuthX(config), url = new URL(solicitud.url)
    const flujo = descifrarOAuthX(solicitud.flow, clave, `x:flow:${solicitud.stateHash}`) as { verifier: string }
    expect(url.origin).toBe('https://x.com')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe(createHash('sha256').update(flujo.verifier).digest('base64url'))
    expect(huellaOAuthX(url.searchParams.get('state')!)).toBe(solicitud.stateHash)
    expect(solicitud.browserHash).toBe(huellaOAuthX(solicitud.navegador))
    expect(solicitud.url).not.toContain(config.clientSecret)
    expect(solicitud.url).not.toContain(flujo.verifier)
    expect(solicitud.url).not.toContain('dm.write')
    expect(crearSolicitudOAuthX(config).stateHash).not.toBe(solicitud.stateHash)
  })
  it('el cifrado autentica propósito y clave y detecta manipulación', () => {
    const cifrado = cifrarOAuthX(token, clave, 'tokens')
    expect(cifrado).not.toContain(token.access_token)
    expect(descifrarOAuthX(cifrado, clave, 'tokens')).toEqual(token)
    expect(cifrarOAuthX(token, clave, 'tokens')).not.toBe(cifrado)
    expect(() => descifrarOAuthX(cifrado, 'cd'.repeat(32), 'tokens')).toThrow()
    expect(() => descifrarOAuthX(cifrado, clave, 'flow')).toThrow()
    const partes = cifrado.split('.'); partes[3] = `${partes[3]!.startsWith('a') ? 'b' : 'a'}${partes[3]!.slice(1)}`
    expect(() => descifrarOAuthX(partes.join('.'), clave, 'tokens')).toThrow()
  })
})
describe('intercambio y cuenta autorizada de X', () => {
  it('acepta únicamente Pont3la10, con autenticación confidencial y endpoints fijos sin redirecciones', async () => {
    const transporte = vi.fn().mockResolvedValueOnce(Response.json(token)).mockResolvedValueOnce(Response.json({ data: { id: '123', username: 'Pont3la10' } }))
    const resultado = await intercambiarCodigoOAuthX(config, 'codigo', 'verificador', transporte)
    expect(resultado.perfil.username).toBe('Pont3la10')
    expect(transporte).toHaveBeenNthCalledWith(1, 'https://api.x.com/2/oauth2/token', expect.objectContaining({ method: 'POST', redirect: 'error', headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }) }))
    expect(transporte).toHaveBeenNthCalledWith(2, 'https://api.x.com/2/users/me', expect.objectContaining({ headers: { Authorization: 'Bearer acceso-no-real' } }))
  })
  it('rechaza la cuenta personal y permisos insuficientes', async () => {
    const transporte = vi.fn().mockResolvedValueOnce(Response.json(token)).mockResolvedValueOnce(Response.json({ data: { id: '987', username: 'otra_cuenta' } }))
    await expect(intercambiarCodigoOAuthX(config, 'codigo', 'verificador', transporte)).rejects.toMatchObject({ data: { codigo: 'CUENTA_X_INCORRECTA' } })
    transporte.mockReset().mockResolvedValueOnce(Response.json({ ...token, scope: 'users.read tweet.read' }))
    await expect(intercambiarCodigoOAuthX(config, 'codigo', 'verificador', transporte)).rejects.toMatchObject({ statusCode: 422 })
    expect(transporte).toHaveBeenCalledTimes(1)
  })
  it('no reintenta ni expone respuestas sensibles del proveedor', async () => {
    const transporte = vi.fn().mockRejectedValue(new Error('secreto-del-proveedor'))
    await expect(intercambiarCodigoOAuthX(config, 'codigo', 'verificador', transporte)).rejects.not.toHaveProperty('message', 'secreto-del-proveedor')
    expect(transporte).toHaveBeenCalledTimes(1)
  })
})

describe('publicación de texto e imágenes en X', () => {
  it('renueva el token solo contra el endpoint fijo y conserva el refresh token rotado', async () => {
    const actualizado = { access_token: 'nuevo-acceso', refresh_token: 'nuevo-refresh', token_type: 'bearer',
      expires_in: 3600, scope: permisosOAuthX.join(' ') }
    const transporte = vi.fn().mockResolvedValue(Response.json(actualizado))
    await expect(renovarTokenOAuthX(config, 'refresh-anterior', transporte)).resolves.toMatchObject(actualizado)
    expect(transporte).toHaveBeenCalledWith('https://api.x.com/2/oauth2/token', expect.objectContaining({ method: 'POST',
      redirect: 'error', headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Basic /) }) }))
    expect(String(transporte.mock.calls[0]?.[1]?.body)).toContain('grant_type=refresh_token')
    expect(String(transporte.mock.calls[0]?.[1]?.body)).not.toContain(config.clientSecret)
  })
  it('sube la imagen renderizada como base64 tweet_image y valida el id devuelto', async () => {
    const transporte = vi.fn().mockResolvedValue(Response.json({ data: { id: '1234567890' } }))
    await expect(subirImagenX('acceso-no-real', Buffer.from('imagen-prueba'), transporte)).resolves.toBe('1234567890')
    expect(transporte).toHaveBeenCalledWith('https://api.x.com/2/media/upload', expect.objectContaining({
      method: 'POST', redirect: 'error', headers: expect.objectContaining({ Authorization: 'Bearer acceso-no-real' }),
      body: JSON.stringify({ media: Buffer.from('imagen-prueba').toString('base64'), media_category: 'tweet_image' })
    }))
  })
  it('publica un post con el texto y las imágenes en el orden indicado', async () => {
    const transporte = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: '987654321' } }), { status: 201 }))
    await expect(crearPublicacionX('acceso-no-real', 'Texto revisado', ['media-1', 'media-2'], transporte)).resolves.toBe('987654321')
    expect(transporte).toHaveBeenCalledWith('https://api.x.com/2/tweets', expect.objectContaining({
      method: 'POST', redirect: 'error', headers: expect.objectContaining({ Authorization: 'Bearer acceso-no-real' }),
      body: JSON.stringify({ text: 'Texto revisado', media: { media_ids: ['media-1', 'media-2'] } })
    }))
  })
  it('bloquea reintentos automáticos si el resultado del post quedó incierto', async () => {
    for (const transporte of [vi.fn().mockRejectedValue(new Error('conexión')), vi.fn().mockResolvedValue(new Response('', { status: 503 }))]) {
      await expect(crearPublicacionX('acceso-no-real', 'Texto', [], transporte)).rejects.toMatchObject({ data: { codigo: 'X_RESPUESTA_INCIERTA' } })
      expect(transporte).toHaveBeenCalledTimes(1)
    }
  })
  it('distingue el rechazo explícito de X sin mostrar el cuerpo del proveedor', async () => {
    const transporte = vi.fn().mockResolvedValue(new Response('detalle-secreto', { status: 400 }))
    await expect(crearPublicacionX('acceso-no-real', 'Texto', [], transporte)).rejects.toMatchObject({ data: { codigo: 'X_PUBLICACION_RECHAZADA' } })
    expect(transporte).toHaveBeenCalledTimes(1)
  })
  it('identifica la falta de créditos sin revelar datos del proveedor ni reintentar', async () => {
    const transporte = vi.fn().mockResolvedValue(Response.json({ type: 'https://api.x.com/2/problems/credits-depleted',
      detail: 'detalle-privado-del-proveedor' }, { status: 402 }))
    const fallo = await crearPublicacionX('acceso-no-real', 'Texto', [], transporte).catch(error => error)
    expect(fallo).toMatchObject({ statusCode: 402, data: { codigo: 'X_PUBLICACION_RECHAZADA', motivo: 'sin_creditos', estadoProveedor: 402 } })
    expect(fallo.statusMessage).toContain('console.x.com')
    expect(JSON.stringify(fallo)).not.toContain('detalle-privado-del-proveedor')
    expect(transporte).toHaveBeenCalledTimes(1)
  })
  it('distingue el límite temporal de un resultado incierto', async () => {
    const transporte = vi.fn().mockResolvedValue(Response.json({ title: 'Too Many Requests' }, { status: 429 }))
    await expect(crearPublicacionX('acceso-no-real', 'Texto', [], transporte)).rejects.toMatchObject({
      statusCode: 429, data: { codigo: 'X_PUBLICACION_RECHAZADA', motivo: 'limite_temporal', estadoProveedor: 429 }
    })
    expect(transporte).toHaveBeenCalledTimes(1)
  })
})
