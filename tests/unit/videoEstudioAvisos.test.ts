import { createDecipheriv, createECDH, createPublicKey, hkdfSync, randomBytes, verify } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import * as avisos from '../../scripts/video-estudio-avisos.mjs'

// Lado del teléfono (lo que hace Safari al recibir): descifra según RFC 8291.
function descifrar(cuerpo: Buffer, ua: ReturnType<typeof createECDH>, auth: Buffer) {
  const salt = cuerpo.subarray(0, 16)
  const largo = cuerpo[20]
  const clavePublicaAs = cuerpo.subarray(21, 21 + largo)
  const cifrado = cuerpo.subarray(21 + largo)
  const secreto = ua.computeSecret(clavePublicaAs)
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), clavePublicaAs])
  const ikm = Buffer.from(hkdfSync('sha256', secreto, auth, info, 32))
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16))
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12))
  const d = createDecipheriv('aes-128-gcm', cek, nonce)
  d.setAuthTag(cifrado.subarray(cifrado.length - 16))
  const plano = Buffer.concat([d.update(cifrado.subarray(0, cifrado.length - 16)), d.final()])
  expect(plano[plano.length - 1]).toBe(2)
  return plano.subarray(0, plano.length - 1).toString('utf8')
}

function suscripcionFalsa() {
  const ua = createECDH('prime256v1'); ua.generateKeys()
  const auth = randomBytes(16)
  return { ua, auth, sub: { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: ua.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } } }
}

describe('avisos Web Push', () => {
  let dir = ''
  afterAll(async () => { if (dir) await rm(dir, { recursive: true, force: true }) })

  it('cifra el mensaje de forma que el teléfono lo puede leer (RFC 8291)', () => {
    const { ua, auth, sub } = suscripcionFalsa()
    const cuerpo = avisos.cifrarMensaje('{"titulo":"Render listo"}', sub.keys)
    expect(cuerpo.readUInt32BE(16)).toBe(4096)
    expect(descifrar(cuerpo, ua, auth)).toBe('{"titulo":"Render listo"}')
  })

  it('firma VAPID válida para el servidor push', async () => {
    dir = await mkdtemp(join(tmpdir(), 'estudio-avisos-'))
    const config = await avisos.configuracionAvisos(dir)
    const jwt = avisos.firmaVapid('https://web.push.apple.com/xyz', config.vapid, Date.parse('2026-11-23T12:00:00Z'))
    const [cab, cuerpo, firma] = jwt.split('.')
    expect(JSON.parse(Buffer.from(cuerpo, 'base64url').toString()).aud).toBe('https://web.push.apple.com')
    const publica = Buffer.from(config.vapid.publica, 'base64url')
    expect(publica.length).toBe(65)
    const llave = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: publica.subarray(1, 33).toString('base64url'), y: publica.subarray(33).toString('base64url') }, format: 'jwk' })
    expect(verify('sha256', Buffer.from(`${cab}.${cuerpo}`), { key: llave, dsaEncoding: 'ieee-p1363' }, Buffer.from(firma, 'base64url'))).toBe(true)
    // Las llaves no cambian entre llamadas.
    expect((await avisos.configuracionAvisos(dir)).vapid.publica).toBe(config.vapid.publica)
  })

  it('guarda suscripciones válidas, rechaza las malas y borra las muertas al enviar', async () => {
    const { sub } = suscripcionFalsa()
    await expect(avisos.guardarSuscripcion({ endpoint: 'http://malo', keys: sub.keys }, dir)).rejects.toThrow()
    expect(await avisos.guardarSuscripcion(sub, dir)).toBe(1)
    expect(await avisos.guardarSuscripcion(sub, dir)).toBe(1)
    const llamadas: Array<{ url: string, headers: Record<string, string> }> = []
    const r1 = await avisos.notificar({ titulo: 'Hola' }, { dir, transporte: (async (url: string, op: { headers: Record<string, string> }) => { llamadas.push({ url, headers: op.headers }); return { ok: true, status: 201 } }) as never })
    expect(r1.enviados).toBe(1)
    expect(llamadas[0].headers['content-encoding']).toBe('aes128gcm')
    expect(llamadas[0].headers.authorization).toMatch(/^vapid t=.+, k=.+/)
    await avisos.notificar({ titulo: 'Hola' }, { dir, transporte: (async () => ({ ok: false, status: 410 })) as never })
    expect((await avisos.leerAvisos(dir))?.suscripciones).toHaveLength(0)
  })
})
