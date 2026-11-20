import { describe, expect, it } from 'vitest'
import { resolve, sep } from 'node:path'
import * as estudio from '../../scripts/video-estudio.mjs'

const proyectoValido = estudio.proyectoValido as (n: string) => boolean
const tramoValido = estudio.tramoValido as (n: string) => boolean
const claveFotosValida = estudio.claveFotosValida as (n: string) => boolean
const idReelValido = estudio.idReelValido as (n: string) => boolean
const rutaSegura = estudio.rutaSegura as (base: string, relativa: string) => string | null
const peticionPermitida = estudio.peticionPermitida as (p: { host?: string, origin?: string, metodo: string }, puerto?: number) => boolean

describe('estudio local del video diario', () => {
  it('acepta solo nombres de proyecto, tramo y clave esperados', () => {
    expect(proyectoValido('2026-11-18')).toBe(true)
    expect(proyectoValido('2026-11-18-v2')).toBe(true)
    expect(proyectoValido('../2026-11-18')).toBe(false)
    expect(proyectoValido('2026-11-18/..')).toBe(false)
    for (const t of ['gancho', 'presentacion', 'pregunta', 'cierre', 'b1-cara', 'b12-voz']) expect(tramoValido(t)).toBe(true)
    for (const t of ['b1', 'b1-otro', '../gancho', 'gancho.mp4']) expect(tramoValido(t)).toBe(false)
    expect(claveFotosValida('b3')).toBe(true)
    expect(claveFotosValida('b3/../x')).toBe(false)
  })

  it('detecta cuándo cambió el código del estudio (para reiniciarse solo)', async () => {
    const { mkdtempSync, writeFileSync, utimesSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const huellaCodigo = estudio.huellaCodigo as unknown as (carpeta?: string) => string
    const carpeta = mkdtempSync(join(tmpdir(), 'estudio-'))
    writeFileSync(join(carpeta, 'video-a.mjs'), 'x')
    writeFileSync(join(carpeta, 'otro.mjs'), 'x')
    utimesSync(join(carpeta, 'video-a.mjs'), 1000, 1000)
    const antes = huellaCodigo(carpeta)
    utimesSync(join(carpeta, 'otro.mjs'), 5000, 5000)
    expect(huellaCodigo(carpeta)).toBe(antes)
    utimesSync(join(carpeta, 'video-a.mjs'), 2000, 2000)
    expect(huellaCodigo(carpeta)).not.toBe(antes)
    expect(estudio.CODIGO_REINICIO).toBe(75)
  })

  it('sin tomas grabadas no exige voz en el render', async () => {
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const vozPresente = estudio.vozPresente as unknown as (carpeta: string, video: string) => Promise<{ ok: boolean, medidos: number }>
    const carpeta = mkdtempSync(join(tmpdir(), 'estudio-voz-'))
    writeFileSync(join(carpeta, 'manifiesto.json'), JSON.stringify({ segmentos: [{ id: 'gancho', inicio: 4, fin: 20 }] }))
    writeFileSync(join(carpeta, 'estudio.json'), JSON.stringify({ grabaciones: {} }))
    expect(await vozPresente(carpeta, join(carpeta, 'no-existe.mp4'))).toEqual({ ok: true, medidos: 0 })
  })

  it('reconoce los tramos de cámara y valida el nombre del proyecto', () => {
    const tramoDeCara = estudio.tramoDeCara as unknown as (id: string) => boolean
    const nombreValido = estudio.nombreValido as unknown as (n: unknown) => boolean
    for (const t of ['gancho', 'cierre', 'b1-cara']) expect(tramoDeCara(t)).toBe(true)
    for (const t of ['presentacion', 'pregunta', 'b1-voz']) expect(tramoDeCara(t)).toBe(false)
    for (const n of ['', 'Diario 18-nov · sin cámara', 'a'.repeat(60)]) expect(nombreValido(n)).toBe(true)
    for (const n of ['a'.repeat(61), '<b>hola</b>', 'linea\nnueva', 12, null]) expect(nombreValido(n)).toBe(false)
  })

  it('acepta solo ids de Reel simples (sin rutas ni caracteres raros)', () => {
    for (const id of ['b1', 'b12', 'b_3']) expect(idReelValido(id)).toBe(true)
    for (const id of ['', '../b1', 'b1/publicar', 'B1', 'b'.repeat(21)]) expect(idReelValido(id)).toBe(false)
  })

  it('no deja salir de la carpeta del proyecto', () => {
    const base = resolve('videos', 'diario', '2026-11-18')
    expect(rutaSegura(base, 'assets/fotos/a.jpg')).toBe(resolve(base, 'assets/fotos/a.jpg'))
    expect(rutaSegura(base, '../2026-11-17/estudio.json')).toBeNull()
    expect(rutaSegura(base, '..' + sep + '..' + sep + '.env')).toBeNull()
    expect(rutaSegura(base, resolve('/etc/passwd'))).toBeNull()
  })

  it('solo atiende peticiones locales y de su propia página', () => {
    expect(peticionPermitida({ host: 'localhost:4810', metodo: 'GET' }, 4810)).toBe(true)
    expect(peticionPermitida({ host: '127.0.0.1:4810', origin: 'http://127.0.0.1:4810', metodo: 'POST' }, 4810)).toBe(true)
    expect(peticionPermitida({ host: 'localhost:4810', origin: 'https://sitio-malicioso.com', metodo: 'POST' }, 4810)).toBe(false)
    expect(peticionPermitida({ host: 'localhost:4810', metodo: 'POST' }, 4810)).toBe(false)
    expect(peticionPermitida({ host: 'evil.com', metodo: 'GET' }, 4810)).toBe(false)
    expect(peticionPermitida({ host: 'localhost:4810', origin: 'https://sitio-malicioso.com', metodo: 'GET' }, 4810)).toBe(false)
  })
})

describe('medición de miniaturas en el estudio', () => {
  it('dice si una miniatura cae en lo medido y qué corregir si no', async () => {
    const { mkdtempSync, writeFileSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const sharp = (await import('sharp')).default
    const carpeta = mkdtempSync(resolve(tmpdir(), 'mini-'))
    const lisa = resolve(carpeta, 'miniatura-a.jpg')
    writeFileSync(lisa, await sharp({ create: { width: 1280, height: 720, channels: 3, background: '#1a2a5a' } }).jpeg().toBuffer())
    const medicionDeMiniatura = estudio.medicionDeMiniatura as (a: string, m: number) => Promise<{ ok: boolean, pendientes: Array<{ criterio: string, ayuda: string }> } | null>
    const m = await medicionDeMiniatura(lisa, 1)
    expect(m?.ok).toBe(false)
    expect(m?.pendientes.some(p => p.criterio === 'bordes' && /vacía/.test(p.ayuda))).toBe(true)
    expect(await medicionDeMiniatura(resolve(carpeta, 'no-existe.jpg'), 1)).toBeNull()
  })
})

describe('horas de publicación de los Reels', () => {
  it('propone franjas de Bogotá sin chocar con lo programado ni caer en la madrugada', async () => {
    const { proponerHoras } = await import('../../scripts/video-horarios.mjs') as { proponerHoras: (o: Record<string, unknown>) => string[] }
    const ahora = Date.parse('2026-11-20T15:30:00Z') // 10:30 en Bogotá
    expect(proponerHoras({ ahora, cantidad: 3 })).toEqual(['2026-11-20T17:30:00.000Z', '2026-11-20T21:30:00.000Z', '2026-11-21T00:30:00.000Z'])
    const conOcupada = proponerHoras({ ahora, cantidad: 2, ocupadas: ['2026-11-20T17:30:00Z'] })
    expect(conOcupada).toEqual(['2026-11-20T21:30:00.000Z', '2026-11-21T00:30:00.000Z'])
    for (const h of proponerHoras({ ahora, cantidad: 12 })) {
      const hora = new Date(Date.parse(h) - 5 * 3_600_000).getUTCHours()
      expect(hora >= 6 && hora < 23).toBe(true)
    }
  })
})

describe('piloto automático de Reels', () => {
  const base = { activo: true, tipo: 'reel', tramos: 5, grabados: 5, ultimaTomaMs: 0, ahora: 30 * 60_000, tieneFinal: false, publicacion: null, ocupado: false, intentos: 0 }
  it('renderiza al completar la voz y luego programa; respeta lo apagado, lo incompleto y lo cancelado', async () => {
    const { decidirAccion } = await import('../../scripts/video-autopiloto-reels.mjs') as unknown as { decidirAccion: (o: Record<string, unknown>) => string | null }
    expect(decidirAccion(base)).toBe('render')
    expect(decidirAccion({ ...base, tieneFinal: true })).toBe('programar')
    expect(decidirAccion({ ...base, activo: false })).toBeNull()
    expect(decidirAccion({ ...base, grabados: 4 })).toBeNull()
    expect(decidirAccion({ ...base, ahora: 5 * 60_000 })).toBeNull() // todavía dentro del margen de corrección
    expect(decidirAccion({ ...base, ocupado: true })).toBeNull()
    expect(decidirAccion({ ...base, intentos: 2 })).toBeNull()
    expect(decidirAccion({ ...base, tieneFinal: true, publicacion: { estado: 'borrador' } })).toBeNull() // cancelado a mano: no se reprograma
    expect(decidirAccion({ ...base, tipo: 'video' })).toBeNull()
  })
})
