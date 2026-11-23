import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import * as acceso from '../../scripts/video-estudio-acceso.mjs'

type Clasif = { permitido: boolean, remota?: boolean }
const clasificar = acceso.clasificarPeticion as (p: Record<string, unknown>, o: { puerto: number, remotos?: string[], usuarios?: string[] }) => Clasif
const REMOTO = 'mi-pc.tail1234.ts.net'
const op = { puerto: 4810, remotos: [REMOTO] }

describe('clasificación de peticiones del estudio', () => {
  it('en el PC sigue igual: localhost sin clave y escrituras solo desde la propia página', () => {
    expect(clasificar({ host: 'localhost:4810', metodo: 'GET' }, op)).toEqual({ permitido: true, remota: false })
    expect(clasificar({ host: '127.0.0.1:4810', origin: 'http://127.0.0.1:4810', metodo: 'POST' }, op)).toEqual({ permitido: true, remota: false })
    expect(clasificar({ host: 'localhost:4810', metodo: 'POST' }, op).permitido).toBe(false)
    expect(clasificar({ host: 'localhost:4810', origin: 'https://malo.com', metodo: 'POST' }, op).permitido).toBe(false)
    expect(clasificar({ host: 'malo.com', metodo: 'GET' }, op).permitido).toBe(false)
  })

  it('lo que llega por un proxy es remoto aunque el proxy reescriba el Host a 127.0.0.1', () => {
    expect(clasificar({ host: '127.0.0.1:4810', metodo: 'GET', reenviada: true }, op)).toEqual({ permitido: true, remota: true })
    expect(clasificar({ host: REMOTO, metodo: 'GET', reenviada: true }, op)).toEqual({ permitido: true, remota: true })
    expect(clasificar({ host: '127.0.0.1:4810', hostReenviado: REMOTO, origin: `https://${REMOTO}`, metodo: 'POST', reenviada: true }, op)).toEqual({ permitido: true, remota: true })
  })

  it('rechaza el acceso remoto si no está configurado, otro origen u otro host', () => {
    expect(clasificar({ host: '127.0.0.1:4810', metodo: 'GET', reenviada: true }, { puerto: 4810 }).permitido).toBe(false)
    expect(clasificar({ host: REMOTO, origin: 'https://malo.com', metodo: 'POST', reenviada: true }, op).permitido).toBe(false)
    expect(clasificar({ host: REMOTO, metodo: 'POST', reenviada: true }, op).permitido).toBe(false)
    expect(clasificar({ host: 'otro.ts.net', metodo: 'GET', reenviada: true }, op).permitido).toBe(false)
    expect(clasificar({ host: REMOTO, origin: `http://${REMOTO}`, metodo: 'POST', reenviada: true }, op).permitido).toBe(false)
  })

  it('si hay lista de usuarios de Tailscale, solo entran esos', () => {
    const conUsuarios = { ...op, usuarios: ['yo@correo.com'] }
    expect(clasificar({ host: REMOTO, metodo: 'GET', reenviada: true, usuarioTs: 'yo@correo.com' }, conUsuarios).permitido).toBe(true)
    expect(clasificar({ host: REMOTO, metodo: 'GET', reenviada: true, usuarioTs: 'otro@correo.com' }, conUsuarios).permitido).toBe(false)
  })

  it('detecta cabeceras de proxy', () => {
    expect(acceso.esReenviada({ 'x-forwarded-for': '100.1.2.3' })).toBe(true)
    expect(acceso.esReenviada({ 'tailscale-user-login': 'yo@correo.com' })).toBe(true)
    expect(acceso.esReenviada({ host: 'localhost:4810' })).toBe(false)
  })
})

describe('clave, sesión y límite de intentos', () => {
  it('verifica la clave con scrypt y rechaza otras', () => {
    const hash = acceso.hashClave('clave-larga-1')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(acceso.verificarClave('clave-larga-1', hash)).toBe(true)
    expect(acceso.verificarClave('clave-larga-2', hash)).toBe(false)
    expect(acceso.verificarClave('', 'basura')).toBe(false)
  })

  it('firma sesiones que vencen y no acepta firmas alteradas ni de otro secreto', () => {
    const ahora = Date.parse('2026-11-22T12:00:00Z')
    const token = acceso.crearSesion('secreto-a', ahora)
    expect(acceso.sesionValida(token, 'secreto-a', ahora + 1000)).toBe(true)
    expect(acceso.sesionValida(token, 'secreto-b', ahora + 1000)).toBe(false)
    expect(acceso.sesionValida(token, 'secreto-a', ahora + acceso.DURACION_SESION_MS + 1)).toBe(false)
    const [id, vence, firma] = token.split('.')
    expect(acceso.sesionValida(`${id}.${Number(vence) + 999999}.${firma}`, 'secreto-a', ahora)).toBe(false)
    expect(acceso.sesionValida('', 'secreto-a', ahora)).toBe(false)
  })

  it('lee la cookie y la crea segura', () => {
    expect(acceso.leerCookie('a=1; estudio_sesion=xyz.1.f; b=2')).toBe('xyz.1.f')
    const cookie = acceso.cookieSesion('t')
    for (const parte of ['HttpOnly', 'Secure', 'SameSite=Strict']) expect(cookie).toContain(parte)
  })

  it('bloquea 15 minutos tras 5 fallos y se libera con un acierto', () => {
    const lim = acceso.crearLimitador()
    const t = 1_000_000
    for (let i = 0; i < 4; i++) lim.fallo(t)
    expect(lim.bloqueado(t)).toBe(false)
    lim.fallo(t)
    expect(lim.bloqueado(t + 1000)).toBe(true)
    expect(lim.bloqueado(t + acceso.BLOQUEO_MS + 1)).toBe(false)
    lim.exito()
    expect(lim.bloqueado(t)).toBe(false)
  })
})

describe('configuración guardada', () => {
  let dir = ''
  afterAll(async () => { if (dir) await rm(dir, { recursive: true, force: true }) })

  it('guarda solo el hash, rota el secreto y conserva los hosts', async () => {
    dir = await mkdtemp(join(tmpdir(), 'estudio-acceso-'))
    await expect(acceso.guardarClave('corta', dir)).rejects.toThrow()
    const primera = await acceso.guardarClave('clave-larga-1', dir, [REMOTO, 'MAL HOST'])
    expect(primera.hostsRemotos).toEqual([REMOTO])
    const texto = await readFile(join(dir, 'acceso.json'), 'utf8')
    expect(texto).not.toContain('clave-larga-1')
    const segunda = await acceso.guardarClave('clave-larga-2', dir)
    expect(segunda.hostsRemotos).toEqual([REMOTO])
    expect(segunda.secreto).not.toBe(primera.secreto)
    expect(acceso.hostsRemotos({ VIDEO_ESTUDIO_HOSTS_REMOTOS: 'b.ts.net' }, segunda)).toEqual(['b.ts.net', REMOTO])
  })
})
