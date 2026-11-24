import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { credencialesFacebook, subirYProgramarVideoFacebook, validarFechaFacebook } from '../../scripts/video-facebook-directo.mjs'

let carpeta = ''
beforeEach(() => { carpeta = mkdtempSync(join(tmpdir(), 'fb-')) })
afterEach(() => rmSync(carpeta, { recursive: true, force: true }))

const credenciales = { pagina: '1432682403259329', token: 'token-de-prueba' }
const en = (ms: number) => new Date(Date.now() + ms).toISOString()
const json = (cuerpo: unknown, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado })

describe('subida directa a Facebook', () => {
  it('solo usa la página objetivo y exige token', () => {
    expect(credencialesFacebook({ NUXT_META_FACEBOOK_PAGE_ID: '1432682403259329', NUXT_META_FACEBOOK_PAGE_ACCESS_TOKEN: 'x' })).toEqual({ pagina: '1432682403259329', token: 'x' })
    expect(credencialesFacebook({ NUXT_META_FACEBOOK_PAGE_ID: '999', NUXT_META_FACEBOOK_PAGE_ACCESS_TOKEN: 'x' })).toBeNull()
    expect(credencialesFacebook({ NUXT_META_FACEBOOK_PAGE_ID: '1432682403259329' })).toBeNull()
  })

  it('valida la fecha: más de 10 minutos y hasta 29 días', () => {
    expect(validarFechaFacebook(en(5 * 60_000))).toContain('minutos')
    expect(validarFechaFacebook(en(40 * 86_400_000))).toContain('días')
    expect(validarFechaFacebook(en(3 * 3_600_000))).toBe('')
    expect(validarFechaFacebook('mañana')).toContain('no es válida')
  })

  it('sube por trozos, reintenta un fallo y programa sin publicar', async () => {
    const ruta = join(carpeta, 'v.mp4')
    writeFileSync(ruta, Buffer.alloc(100))
    const fase: string[] = []
    let fallaUnaVez = true
    let desde = 0
    const transporte = (async (_url: string, init: { body: URLSearchParams | FormData, headers: Record<string, string> }) => {
      expect(init.headers.authorization).toBe('Bearer token-de-prueba')
      const cuerpo = init.body
      const f = String(cuerpo.get('upload_phase'))
      fase.push(f)
      if (f === 'start') return json({ upload_session_id: 's1', video_id: '555', start_offset: '0', end_offset: '60' })
      if (f === 'transfer') {
        if (fallaUnaVez) { fallaUnaVez = false; return json({ error: { code: 1, message: 'temporal' } }, 500) }
        desde = Math.min(100, desde + 60)
        return json({ start_offset: String(desde), end_offset: String(desde >= 100 ? 100 : 100) })
      }
      expect(cuerpo.get('published')).toBe('false')
      expect(Number(cuerpo.get('scheduled_publish_time'))).toBeGreaterThan(Date.now() / 1000)
      return json({ success: true })
    }) as unknown as typeof fetch
    const r = await subirYProgramarVideoFacebook({ ruta, titulo: 'Título', descripcion: 'd', fecha: en(3 * 3_600_000), credenciales, transporte, espera: async () => {} })
    expect(r.videoId).toBe('555')
    expect(fase).toEqual(['start', 'transfer', 'transfer', 'transfer', 'finish'])
  })

  it('no filtra el token en los errores y se detiene si el token venció', async () => {
    const ruta = join(carpeta, 'v.mp4')
    writeFileSync(ruta, Buffer.alloc(10))
    const transporte = (async () => json({ error: { code: 190, message: 'token token-de-prueba vencido' } }, 401)) as unknown as typeof fetch
    const error = await subirYProgramarVideoFacebook({ ruta, titulo: 't', fecha: en(3 * 3_600_000), credenciales, transporte, espera: async () => {} }).catch(e => e)
    expect(String(error.message)).toContain('autorización')
    expect(String(error.message)).not.toContain('token-de-prueba')
  })

  it('exige credenciales y fecha válida antes de tocar la red', async () => {
    const ruta = join(carpeta, 'v.mp4')
    writeFileSync(ruta, Buffer.alloc(10))
    await expect(subirYProgramarVideoFacebook({ ruta, titulo: 't', fecha: en(3_600_000), credenciales: null })).rejects.toThrow(/token/)
    await expect(subirYProgramarVideoFacebook({ ruta, titulo: 't', fecha: en(60_000), credenciales })).rejects.toThrow(/minutos/)
  })
})
