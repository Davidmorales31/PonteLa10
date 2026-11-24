// Avisos al iPhone (Web Push) desde el estudio local, sin servicios de terceros más allá del servidor push del
// propio teléfono (Apple). Cifrado del contenido según RFC 8291 (aes128gcm) y firma VAPID (RFC 8292) con node:crypto.
// Las llaves y las suscripciones viven en ~/.pont3la10/estudio/avisos.json (fuera del repo).
// En iPhone exige iOS 16.4+ y el estudio instalado en la pantalla de inicio.
import { createCipheriv, createECDH, createPrivateKey, generateKeyPairSync, hkdfSync, randomBytes, sign } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { dirAcceso } from './video-estudio-acceso.mjs'

const b64u = buf => Buffer.from(buf).toString('base64url')
const desdeB64u = texto => Buffer.from(String(texto || ''), 'base64url')
const archivoAvisos = (dir = dirAcceso()) => join(dir, 'avisos.json')

export async function leerAvisos(dir = dirAcceso()) {
  try { return JSON.parse(await readFile(archivoAvisos(dir), 'utf8')) } catch { return null }
}

async function guardarAvisos(datos, dir = dirAcceso()) {
  await mkdir(dir, { recursive: true })
  await writeFile(archivoAvisos(dir), JSON.stringify(datos, null, 2), { mode: 0o600 })
}

/** Llaves VAPID (se crean una sola vez). Devuelve la configuración completa. */
export async function configuracionAvisos(dir = dirAcceso()) {
  const actual = await leerAvisos(dir)
  if (actual?.vapid?.privada && actual?.vapid?.publica) return actual
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const jwk = privateKey.export({ format: 'jwk' })
  const publica = b64u(Buffer.concat([Buffer.from([4]), desdeB64u(jwk.x), desdeB64u(jwk.y)]))
  const datos = { vapid: { privada: jwk, publica }, suscripciones: actual?.suscripciones || [] }
  await guardarAvisos(datos, dir)
  return datos
}

/** Valida y guarda una suscripción del navegador (sin duplicados por endpoint). */
export async function guardarSuscripcion(suscripcion, dir = dirAcceso()) {
  const endpoint = String(suscripcion?.endpoint || '')
  const p256dh = String(suscripcion?.keys?.p256dh || '')
  const auth = String(suscripcion?.keys?.auth || '')
  const url = (() => { try { return new URL(endpoint) } catch { return null } })()
  if (!url || url.protocol !== 'https:' || desdeB64u(p256dh).length !== 65 || desdeB64u(auth).length !== 16) {
    throw Object.assign(new Error('Suscripción de avisos no válida.'), { estado: 400 })
  }
  const datos = await configuracionAvisos(dir)
  datos.suscripciones = [...datos.suscripciones.filter(s => s.endpoint !== endpoint), { endpoint, keys: { p256dh, auth }, creada: new Date().toISOString() }].slice(-10)
  await guardarAvisos(datos, dir)
  return datos.suscripciones.length
}

/** Cifra un mensaje para una suscripción (RFC 8291, un solo registro). `asEcdh` y `sal` solo para pruebas. */
export function cifrarMensaje(texto, { p256dh, auth }, { asEcdh = null, sal = null } = {}) {
  const clavePublicaUa = desdeB64u(p256dh)
  const secretoAuth = desdeB64u(auth)
  const ecdh = asEcdh || createECDH('prime256v1')
  if (!asEcdh) ecdh.generateKeys()
  const clavePublicaAs = ecdh.getPublicKey()
  const secretoEcdh = ecdh.computeSecret(clavePublicaUa)
  const infoClave = Buffer.concat([Buffer.from('WebPush: info\0'), clavePublicaUa, clavePublicaAs])
  const ikm = Buffer.from(hkdfSync('sha256', secretoEcdh, secretoAuth, infoClave, 32))
  const salt = sal || randomBytes(16)
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16))
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12))
  const cifrador = createCipheriv('aes-128-gcm', cek, nonce)
  const cifrado = Buffer.concat([cifrador.update(Buffer.concat([Buffer.from(texto, 'utf8'), Buffer.from([2])])), cifrador.final(), cifrador.getAuthTag()])
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096)
  return Buffer.concat([salt, rs, Buffer.from([clavePublicaAs.length]), clavePublicaAs, cifrado])
}

/** JWT VAPID firmado con ES256 para el servidor push del endpoint. */
export function firmaVapid(endpoint, vapid, ahora = Date.now()) {
  const cabecera = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const cuerpo = b64u(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(ahora / 1000) + 12 * 3600, sub: 'https://www.pont3la10.com' }))
  const datos = `${cabecera}.${cuerpo}`
  const firma = sign('sha256', Buffer.from(datos), { key: createPrivateKey({ key: vapid.privada, format: 'jwk' }), dsaEncoding: 'ieee-p1363' })
  return `${datos}.${b64u(firma)}`
}

/**
 * Envía un aviso a todos los dispositivos suscritos. Nunca lanza: los avisos no deben tumbar el estudio.
 * Borra las suscripciones que el servidor push da por muertas (404/410).
 */
export async function notificar({ titulo, cuerpo = '', url = '/' }, { dir = dirAcceso(), transporte = globalThis.fetch } = {}) {
  try {
    const datos = await leerAvisos(dir)
    if (!datos?.suscripciones?.length) return { enviados: 0 }
    const mensaje = JSON.stringify({ titulo: String(titulo).slice(0, 80), cuerpo: String(cuerpo).slice(0, 200), url })
    const muertas = new Set()
    let enviados = 0
    for (const s of datos.suscripciones) {
      try {
        const respuesta = await transporte(s.endpoint, {
          method: 'POST',
          headers: { authorization: `vapid t=${firmaVapid(s.endpoint, datos.vapid)}, k=${datos.vapid.publica}`, 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: '86400', urgency: 'high' },
          body: cifrarMensaje(mensaje, s.keys),
          signal: AbortSignal.timeout(15_000)
        })
        if (respuesta.status === 404 || respuesta.status === 410) muertas.add(s.endpoint)
        else if (respuesta.ok) enviados += 1
      } catch { /* sin red: se pierde este aviso */ }
    }
    if (muertas.size) await guardarAvisos({ ...datos, suscripciones: datos.suscripciones.filter(s => !muertas.has(s.endpoint)) }, dir)
    return { enviados }
  } catch { return { enviados: 0 } }
}

export const SERVICE_WORKER = `// Service worker del estudio: muestra los avisos y abre el estudio al tocarlos.
self.addEventListener('push', (evento) => {
  let datos = {}
  try { datos = evento.data ? evento.data.json() : {} } catch { datos = { titulo: 'Estudio', cuerpo: evento.data ? evento.data.text() : '' } }
  evento.waitUntil(self.registration.showNotification(datos.titulo || 'Estudio · Ponte la 10', { body: datos.cuerpo || '', icon: '/icono-192.png', badge: '/icono-192.png', data: { url: datos.url || '/' } }))
})
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const destino = (evento.notification.data && evento.notification.data.url) || '/'
  evento.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
    for (const v of ventanas) { if ('focus' in v) { v.navigate(destino); return v.focus() } }
    return self.clients.openWindow(destino)
  }))
})
`
