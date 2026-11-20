import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as youtube from '../../scripts/video-youtube.mjs'

const yt = youtube as unknown as {
  ALCANCE: string
  idVideoDe: (t: unknown) => string | null
  crearDesafio: () => { verificador: string, desafio: string }
  urlAutorizacion: (o: Record<string, string>) => string
  leerCliente: (dir: string) => Promise<{ clientId: string, clientSecret: string } | null>
  accesoVigente: (o: Record<string, unknown>) => Promise<string>
  completarConexion: (o: Record<string, unknown>) => Promise<{ id: string, titulo: string }>
  ponerTitulo: (o: Record<string, unknown>) => Promise<{ titulo: string, anterior: string }>
  programarPublicacion: (o: Record<string, unknown>) => Promise<{ publishAt: string }>
  ponerMiniatura: (o: Record<string, unknown>) => Promise<{ ok: boolean }>
  estadoConexion: (dir: string) => Promise<{ configurado: boolean, conectado: boolean }>
  tituloValido: (t: unknown) => boolean
  subirVideo: (o: Record<string, unknown>) => Promise<{ id: string, titulo: string, privacidad: string }>
  eliminarVideo: (o: Record<string, unknown>) => Promise<{ ok: boolean }>
}

const respuesta = (datos: unknown, estado = 200, cabeceras: Record<string, string> = {}) => ({ ok: estado < 400, status: estado, json: async () => datos, headers: { get: (n: string) => cabeceras[n.toLowerCase()] ?? null } })
const carpeta = () => mkdtempSync(join(tmpdir(), 'yt-'))
const cliente = { installed: { client_id: 'id-prueba', client_secret: 'secreto-prueba' } }

describe('conexión local con YouTube', () => {
  it('extrae el ID del video de enlaces y de IDs sueltos, y rechaza lo demás', () => {
    const id = 'dQw4w9WgXcQ'
    for (const t of [id, `https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}?t=5`, `https://youtube.com/shorts/${id}`, `https://studio.youtube.com/video/${id}/edit`]) expect(yt.idVideoDe(t)).toBe(id)
    for (const t of ['', 'hola', 'https://evil.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=corto', null]) expect(yt.idVideoDe(t)).toBeNull()
  })

  it('usa PKCE S256 y pide solo el permiso necesario', () => {
    const { verificador, desafio } = yt.crearDesafio()
    expect(desafio).toBe(createHash('sha256').update(verificador).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''))
    const url = new URL(yt.urlAutorizacion({ clientId: 'c', redirect: 'http://127.0.0.1:4810/oauth/youtube/callback', estado: 'e', desafio }))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('scope')).toBe(yt.ALCANCE)
    expect(url.searchParams.get('access_type')).toBe('offline')
  })

  it('lee las credenciales de Google Cloud (escritorio o web) y avisa si faltan', async () => {
    const dir = carpeta()
    expect(await yt.leerCliente(dir)).toBeNull()
    writeFileSync(join(dir, 'cliente.json'), JSON.stringify(cliente))
    expect(await yt.leerCliente(dir)).toEqual({ clientId: 'id-prueba', clientSecret: 'secreto-prueba' })
    writeFileSync(join(dir, 'cliente.json'), JSON.stringify({ web: cliente.installed }))
    expect((await yt.leerCliente(dir))?.clientId).toBe('id-prueba')
    expect(await yt.estadoConexion(dir)).toMatchObject({ configurado: true, conectado: false })
  })

  it('al conectar guarda el token fuera de la página y exige el permiso completo', async () => {
    const dir = carpeta()
    writeFileSync(join(dir, 'cliente.json'), JSON.stringify(cliente))
    const llamadas: string[] = []
    const transporte = async (url: string) => {
      llamadas.push(url)
      if (url.includes('oauth2.googleapis.com/token')) return respuesta({ access_token: 'a1', refresh_token: 'r1', expires_in: 3600, scope: yt.ALCANCE })
      return respuesta({ items: [{ id: 'canal-1', snippet: { title: 'Mi canal' } }] })
    }
    const canal = await yt.completarConexion({ dir, codigo: 'c', verificador: 'v', redirect: 'http://127.0.0.1:4810/x', transporte })
    expect(canal).toEqual({ id: 'canal-1', titulo: 'Mi canal' })
    expect(await yt.estadoConexion(dir)).toMatchObject({ conectado: true })
    expect(JSON.parse(await readFile(join(dir, 'token.json'), 'utf8')).refresh_token).toBe('r1')

    const sinPermiso = async () => respuesta({ access_token: 'a', refresh_token: 'r', expires_in: 10, scope: 'otro' })
    const dir2 = carpeta()
    writeFileSync(join(dir2, 'cliente.json'), JSON.stringify(cliente))
    await expect(yt.completarConexion({ dir: dir2, codigo: 'c', verificador: 'v', redirect: 'x', transporte: sinPermiso })).rejects.toThrow(/permiso/)
    await expect(yt.completarConexion({ dir: carpeta(), codigo: 'c', verificador: 'v', redirect: 'x', transporte: sinPermiso })).rejects.toThrow(/cliente\.json/)
  })

  it('renueva el acceso cuando vence y pide reconectar si Google lo revocó', async () => {
    const dir = carpeta()
    writeFileSync(join(dir, 'cliente.json'), JSON.stringify(cliente))
    writeFileSync(join(dir, 'token.json'), JSON.stringify({ access_token: 'viejo', refresh_token: 'r', expira: 1000, canal: { id: 'c' } }))
    const ok = async () => respuesta({ access_token: 'nuevo', expires_in: 3600 })
    expect(await yt.accesoVigente({ dir, transporte: ok, ahora: () => 5_000_000 })).toBe('nuevo')
    expect(await yt.accesoVigente({ dir, transporte: async () => { throw new Error('no debería llamar') }, ahora: () => 5_000_001 })).toBe('nuevo')
    writeFileSync(join(dir, 'token.json'), JSON.stringify({ access_token: 'x', refresh_token: 'r', expira: 1 }))
    await expect(yt.accesoVigente({ dir, transporte: async () => respuesta({ error: 'invalid_grant' }, 400) })).rejects.toThrow(/venció o fue revocada/)
  })

  it('cambia solo el título y conserva descripción, etiquetas y categoría', async () => {
    const enviados: Array<{ url: string, metodo?: string, cuerpo?: string }> = []
    const transporte = async (url: string, opciones: { method?: string, body?: string }) => {
      enviados.push({ url, metodo: opciones.method, cuerpo: opciones.body })
      if (opciones.method === 'PUT') return respuesta({})
      return respuesta({ items: [{ id: 'dQw4w9WgXcQ', status: { privacyStatus: 'private' }, snippet: { channelId: 'canal-1', title: 'Viejo', description: 'Desc', tags: ['a'], categoryId: '17', thumbnails: {}, publishedAt: 'x' } }] })
    }
    const r = await yt.ponerTitulo({ idVideo: 'dQw4w9WgXcQ', titulo: 'Título nuevo de prueba', acceso: 't', canalId: 'canal-1', transporte })
    expect(r).toEqual({ titulo: 'Título nuevo de prueba', anterior: 'Viejo' })
    const put = enviados.find(e => e.metodo === 'PUT')!
    expect(JSON.parse(put.cuerpo!)).toEqual({ id: 'dQw4w9WgXcQ', snippet: { title: 'Título nuevo de prueba', description: 'Desc', tags: ['a'], categoryId: '17' } })
    await expect(yt.ponerTitulo({ idVideo: 'dQw4w9WgXcQ', titulo: 'Otro título válido', acceso: 't', canalId: 'otro-canal', transporte })).rejects.toThrow(/no es de tu canal/)
    await expect(yt.ponerTitulo({ idVideo: 'dQw4w9WgXcQ', titulo: '<b>x</b>', acceso: 't', transporte })).rejects.toThrow(/entre 5 y 100/)
  })

  it('programa la publicación de un video privado sin perder el resto del estado', async () => {
    const enviados: Array<{ metodo?: string, cuerpo?: string }> = []
    const transporte = async (_url: string, o: { method?: string, body?: string }) => {
      enviados.push({ metodo: o.method, cuerpo: o.body })
      if (o.method === 'PUT') return respuesta({})
      return respuesta({ items: [{ id: 'dQw4w9WgXcQ', status: { privacyStatus: 'private', license: 'youtube', embeddable: true, selfDeclaredMadeForKids: false }, snippet: { channelId: 'canal-1' } }] })
    }
    const fecha = new Date(Date.now() + 3_600_000).toISOString()
    expect((await yt.programarPublicacion({ idVideo: 'dQw4w9WgXcQ', fecha, acceso: 't', canalId: 'canal-1', transporte })).publishAt).toBe(fecha)
    expect(JSON.parse(enviados.find(e => e.metodo === 'PUT')!.cuerpo!)).toEqual({ id: 'dQw4w9WgXcQ', status: { privacyStatus: 'private', publishAt: fecha, selfDeclaredMadeForKids: false, license: 'youtube', embeddable: true } })
    await expect(yt.programarPublicacion({ idVideo: 'dQw4w9WgXcQ', fecha: new Date(Date.now() + 60_000).toISOString(), acceso: 't', transporte })).rejects.toThrow(/5 minutos/)
    await expect(yt.programarPublicacion({ idVideo: 'dQw4w9WgXcQ', fecha, acceso: 't', canalId: 'otro', transporte })).rejects.toThrow(/no es de tu canal/)
  })

  it('valida la miniatura y traduce los errores de YouTube a mensajes claros', async () => {
    const imagen = Buffer.alloc(5000, 1)
    const enviado: string[] = []
    const ok = async (url: string) => { enviado.push(url); return respuesta({}) }
    expect(await yt.ponerMiniatura({ idVideo: 'dQw4w9WgXcQ', imagen, acceso: 't', transporte: ok })).toEqual({ ok: true })
    expect(enviado[0]).toContain('thumbnails/set?videoId=dQw4w9WgXcQ')
    await expect(yt.ponerMiniatura({ idVideo: 'x', imagen: Buffer.alloc(10), acceso: 't', transporte: ok })).rejects.toThrow(/vacía/)
    await expect(yt.ponerMiniatura({ idVideo: 'x', imagen: Buffer.alloc(3 * 1024 * 1024), acceso: 't', transporte: ok })).rejects.toThrow(/2 MB/)
    const cuota = async () => respuesta({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403)
    await expect(yt.ponerMiniatura({ idVideo: 'x', imagen, acceso: 't', transporte: cuota })).rejects.toThrow(/cuota diaria/)
    expect(yt.tituloValido('Pasto se queda con 3 jugadores')).toBe(true)
    expect(yt.tituloValido('a'.repeat(101))).toBe(false)
  })

  it('sube el video por trozos, reanuda tras un corte y nunca lo deja público', async () => {
    const dir = carpeta()
    const archivo = join(dir, 'final.mp4')
    writeFileSync(archivo, Buffer.alloc(2500, 7))
    const llamadas: Array<{ url: string, metodo?: string, rango?: string, cuerpo?: unknown }> = []
    let fallar = true
    const transporte = async (url: string, o: { method?: string, headers?: Record<string, string>, body?: unknown }) => {
      llamadas.push({ url, metodo: o.method, rango: o.headers?.['content-range'], cuerpo: o.body })
      if (url.includes('uploadType=resumable')) return respuesta({}, 200, { location: 'https://upload.test/sesion' })
      const rango = o.headers?.['content-range'] || ''
      if (rango === 'bytes */2500') return respuesta({}, 308, { range: 'bytes=0-999' })
      if (rango.startsWith('bytes 1000-1999') && fallar) { fallar = false; throw new Error('red caída') }
      if (rango.startsWith('bytes 0-999')) return respuesta({}, 308, { range: 'bytes=0-999' })
      if (rango.startsWith('bytes 1000-1999')) return respuesta({}, 308, { range: 'bytes=0-1999' })
      return respuesta({ id: 'dQw4w9WgXcQ', snippet: { title: 'Mi video de prueba' }, status: { privacyStatus: 'private' } })
    }
    const progreso: number[] = []
    const r = await yt.subirVideo({ ruta: archivo, titulo: 'Mi video de prueba', descripcion: 'Hola', acceso: 't', transporte, trozo: 1000, espera: async () => {}, alProgresar: (s: number) => progreso.push(s) })
    expect(r).toEqual({ id: 'dQw4w9WgXcQ', titulo: 'Mi video de prueba', privacidad: 'private' })
    expect(JSON.parse(llamadas[0].cuerpo as string).status).toEqual({ privacyStatus: 'private', selfDeclaredMadeForKids: false })
    expect(llamadas.some(l => l.rango === 'bytes */2500')).toBe(true)
    expect(progreso.at(-1)).toBe(2500)
    await expect(yt.subirVideo({ ruta: archivo, titulo: 'Mi video de prueba', privacidad: 'public', acceso: 't', transporte })).rejects.toThrow(/privado o no listado/)
    await expect(yt.subirVideo({ ruta: archivo, titulo: 'x', acceso: 't', transporte })).rejects.toThrow(/entre 5 y 100/)
  })

  it('solo borra videos del canal conectado', async () => {
    const llamadas: string[] = []
    const transporte = async (url: string, o: { method?: string }) => {
      llamadas.push(`${o.method || 'GET'} ${url}`)
      if (o.method === 'DELETE') return respuesta({}, 204)
      return respuesta({ items: [{ id: 'dQw4w9WgXcQ', status: {}, snippet: { channelId: 'canal-1', title: 't' } }] })
    }
    expect(await yt.eliminarVideo({ idVideo: 'dQw4w9WgXcQ', acceso: 't', canalId: 'canal-1', transporte })).toEqual({ ok: true })
    await expect(yt.eliminarVideo({ idVideo: 'dQw4w9WgXcQ', acceso: 't', canalId: 'otro', transporte })).rejects.toThrow(/no es de tu canal/)
    expect(llamadas.filter(l => l.startsWith('DELETE'))).toHaveLength(1)
  })
})
