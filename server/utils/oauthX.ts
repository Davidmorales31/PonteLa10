import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { createError } from 'h3'
import { z } from 'zod'

export const rutaRetornoX = '/api/admin/redes/oauth/x/callback'
export const nombreCookieX = 'pont3la10-x-oauth'
export const permisosOAuthX = ['tweet.read', 'users.read', 'tweet.write', 'media.write', 'offline.access'] as const
const campoErrorOAuthX = 'error' as const
export const esquemaRetornoX = z.object({ state: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code: z.string().min(1).max(2048).optional(), [campoErrorOAuthX]: z.string().max(200).optional() })
export interface ConfiguracionOAuthX { clientId: string, clientSecret: string, redirectUri: string, clave: string }

export function huellaOAuthX(valor: string) { return createHash('sha256').update(valor).digest('hex') }
export function cifrarOAuthX(valor: unknown, clave: string, contexto: string): string {
  if (!/^[a-f0-9]{64}$/i.test(clave)) throw createError({ statusCode: 503, statusMessage: 'Falta configurar el cifrado de las cuentas sociales.' })
  const nonce = randomBytes(12)
  const cifrador = createCipheriv('aes-256-gcm', Buffer.from(clave, 'hex'), nonce)
  cifrador.setAAD(Buffer.from(contexto))
  const bytes = Buffer.concat([cifrador.update(JSON.stringify(valor), 'utf8'), cifrador.final()])
  return ['v1', nonce.toString('base64url'), cifrador.getAuthTag().toString('base64url'), bytes.toString('base64url')].join('.')
}
export function descifrarOAuthX(valor: string, clave: string, contexto: string): unknown {
  try {
    if (!/^[a-f0-9]{64}$/i.test(clave) || valor.length > 24000) throw new Error()
    const partes = valor.split('.')
    if (partes.length !== 4 || partes[0] !== 'v1' || partes.slice(1).some(parte => !/^[A-Za-z0-9_-]+$/.test(parte))) throw new Error()
    const nonce = Buffer.from(partes[1]!, 'base64url'), etiqueta = Buffer.from(partes[2]!, 'base64url')
    if (nonce.length !== 12 || etiqueta.length !== 16) throw new Error()
    const descifrador = createDecipheriv('aes-256-gcm', Buffer.from(clave, 'hex'), nonce)
    descifrador.setAAD(Buffer.from(contexto)); descifrador.setAuthTag(etiqueta)
    return JSON.parse(Buffer.concat([descifrador.update(Buffer.from(partes[3]!, 'base64url')), descifrador.final()]).toString('utf8'))
  } catch { throw createError({ statusCode: 409, statusMessage: 'La autorización no es válida. Inicia una conexión nueva.' }) }
}
export function validarConfiguracionOAuthX(config: { xClientId?: unknown, xClientSecret?: unknown, xRedirectUri?: unknown, socialEncryptionKey?: unknown }): ConfiguracionOAuthX {
  const clientId = String(config.xClientId || ''), clientSecret = String(config.xClientSecret || '')
  const clave = String(config.socialEncryptionKey || '')
  try {
    const retorno = new URL(String(config.xRedirectUri || ''))
    const local = ['localhost','127.0.0.1','[::1]'].includes(retorno.hostname)
    if (!clientId || !clientSecret || !/^[a-f0-9]{64}$/i.test(clave) || retorno.pathname !== rutaRetornoX
      || retorno.username || retorno.password || retorno.hash || retorno.search
      || (retorno.protocol !== 'https:' && !(local && retorno.protocol === 'http:'))) throw new Error()
    return { clientId, clientSecret, clave, redirectUri: retorno.toString() }
  } catch { throw createError({ statusCode: 503, statusMessage: 'Falta completar la configuración privada de X en el servidor.' }) }
}
export function crearSolicitudOAuthX(config: ConfiguracionOAuthX) {
  const state = randomBytes(32).toString('base64url'), navegador = randomBytes(32).toString('base64url')
  const verifier = randomBytes(48).toString('base64url')
  const url = new URL('https://x.com/i/oauth2/authorize')
  url.search = new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: config.redirectUri,
    scope: permisosOAuthX.join(' '), state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString()
  const stateHash = huellaOAuthX(state)
  return { url: url.toString(), navegador, stateHash, browserHash: huellaOAuthX(navegador),
    flow: cifrarOAuthX({ verifier, redirectUri: config.redirectUri }, config.clave, `x:flow:${stateHash}`) }
}
export async function intercambiarCodigoOAuthX(config: ConfiguracionOAuthX, code: string, verifier: string, transporte = fetch) {
  // No reintentar: el código es de un solo uso. No propagar errores/cuerpos con secretos.
  const datosToken = await consultarX('https://api.x.com/2/oauth2/token', {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, grant_type: 'authorization_code', client_id: config.clientId, redirect_uri: config.redirectUri, code_verifier: verifier })
  }, transporte)
  const token = z.object({ access_token: z.string().min(1).max(8192), refresh_token: z.string().min(1).max(8192),
    token_type: z.string().refine(valor => valor.toLowerCase() === 'bearer'), expires_in: z.number().int().min(1).max(31_536_000), scope: z.string().max(1000) }).safeParse(datosToken)
  if (!token.success || permisosOAuthX.some(permiso => !token.data.scope.split(' ').includes(permiso))) throw createError({ statusCode: 422, statusMessage: 'X no concedió todos los permisos solicitados.' })
  const perfil = z.object({ data: z.object({ id: z.string().regex(/^\d{1,30}$/), username: z.string().regex(/^[A-Za-z0-9_]{1,15}$/) }) }).safeParse(
    await consultarX('https://api.x.com/2/users/me', { headers: { Authorization: `Bearer ${token.data.access_token}` } }, transporte))
  if (!perfil.success) throw createError({ statusCode: 502, statusMessage: 'No se pudo verificar la identidad de X.' })
  if (perfil.data.data.username.toLowerCase() !== 'pont3la10') throw createError({ statusCode: 422,
    statusMessage: 'Autoriza la cuenta @Pont3la10. No se conectó otra cuenta.', data: { codigo: 'CUENTA_X_INCORRECTA' } })
  return { perfil: perfil.data.data, token: token.data }
}
export async function renovarTokenOAuthX(config: ConfiguracionOAuthX, refreshToken: string, transporte = fetch) {
  const datos = await consultarX('https://api.x.com/2/oauth2/token', {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
  }, transporte)
  const token = z.object({ access_token: z.string().min(1).max(8192), refresh_token: z.string().min(1).max(8192).optional(),
    token_type: z.string().refine(valor => valor.toLowerCase() === 'bearer'), expires_in: z.number().int().min(1).max(31_536_000),
    scope: z.string().max(1000).optional() }).safeParse(datos)
  if (!token.success) throw createError({ statusCode: 502, statusMessage: 'X no pudo renovar la autorización. Vuelve a conectar la cuenta.' })
  const scopes = token.data.scope?.split(' ') || [...permisosOAuthX]
  if (permisosOAuthX.some(permiso => !scopes.includes(permiso))) throw createError({ statusCode: 422,
    statusMessage: 'La autorización renovada no incluye los permisos para publicar. Conecta X de nuevo.' })
  return { ...token.data, refresh_token: token.data.refresh_token || refreshToken, scope: scopes.join(' ') }
}

export async function subirImagenX(accessToken: string, bytes: Buffer, transporte = fetch) {
  try {
    const respuesta = await transporte('https://api.x.com/2/media/upload', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ media: bytes.toString('base64'), media_category: 'tweet_image' })
    })
    if (!respuesta.ok) throw createError({ statusCode: 502, statusMessage: 'X rechazó una de las imágenes. No se publicó el contenido.',
      data: { codigo: 'X_MEDIA_RECHAZADA' } })
    const resultado = z.object({ data: z.object({ id: z.string().regex(/^[0-9]{1,30}$/) }) }).safeParse(await respuesta.json())
    if (!resultado.success) throw createError({ statusCode: 502, statusMessage: 'X no devolvió un identificador de imagen válido.',
      data: { codigo: 'X_MEDIA_RECHAZADA' } })
    return resultado.data.data.id
  } catch (fallo) {
    if (fallo && typeof fallo === 'object' && 'data' in fallo) throw fallo
    throw createError({ statusCode: 502, statusMessage: 'X no pudo recibir una imagen. No se publicó el contenido.',
      data: { codigo: 'X_MEDIA_RECHAZADA' } })
  }
}

export async function crearPublicacionX(accessToken: string, texto: string, mediaIds: string[], transporte = fetch) {
  let respuesta: Response
  try {
    respuesta = await transporte('https://api.x.com/2/tweets', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texto, media: { media_ids: mediaIds } })
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'X no confirmó el resultado. Revisa la cuenta antes de volver a intentar.',
      data: { codigo: 'X_RESPUESTA_INCIERTA' } })
  }
  if (!respuesta.ok) {
    if (respuesta.status >= 500) throw createError({ statusCode: 502,
      statusMessage: 'X no confirmó el resultado. Revisa la cuenta antes de volver a intentar.',
      data: { codigo: 'X_RESPUESTA_INCIERTA' } })
    // Clasificar solo códigos conocidos; nunca propagar el cuerpo del proveedor.
    const problema = await respuesta.json().catch(() => null) as { type?: unknown } | null
    const tipo = typeof problema?.type === 'string' ? problema.type : ''
    const sinCreditos = respuesta.status === 402 || /\/credits-depleted\/?$/.test(tipo)
    const motivo = sinCreditos ? 'sin_creditos' : respuesta.status === 429 ? 'limite_temporal' : 'rechazo_proveedor'
    const mensaje = sinCreditos
      ? 'X no tiene créditos de API disponibles para publicar. Recarga en console.x.com y vuelve a confirmar el envío.'
      : respuesta.status === 429
        ? 'X alcanzó su límite temporal de publicaciones. Espera antes de volver a confirmar el envío.'
        : respuesta.status === 401
          ? 'X rechazó la autorización. Vuelve a conectar @Pont3la10 desde Cuentas sociales.'
          : `X rechazó la publicación (HTTP ${respuesta.status}). Revisa el contenido y el acceso de la aplicación en la consola de X.`
    throw createError({ statusCode: sinCreditos ? 402 : respuesta.status === 429 ? 429 : 502,
      statusMessage: mensaje, data: { codigo: 'X_PUBLICACION_RECHAZADA', motivo, estadoProveedor: respuesta.status } })
  }
  let cuerpo: unknown
  try { cuerpo = await respuesta.json() } catch {
    throw createError({ statusCode: 502, statusMessage: 'X respondió sin un recibo verificable. Revisa la cuenta antes de volver a intentar.',
      data: { codigo: 'X_RESPUESTA_INCIERTA' } })
  }
  const resultado = z.object({ data: z.object({ id: z.string().regex(/^[0-9]{1,30}$/) }) }).safeParse(cuerpo)
  if (!resultado.success) throw createError({ statusCode: 502,
    statusMessage: 'X respondió sin un recibo verificable. Revisa la cuenta antes de volver a intentar.',
    data: { codigo: 'X_RESPUESTA_INCIERTA' } })
  return resultado.data.data.id
}

async function consultarX(url: string, init: RequestInit, transporte: typeof fetch): Promise<unknown> {
  try {
    const respuesta = await transporte(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10_000) })
    if (!respuesta.ok) throw new Error()
    return await respuesta.json()
  } catch { throw createError({ statusCode: 502, statusMessage: 'X no pudo completar la autorización. Inicia la conexión de nuevo.' }) }
}
