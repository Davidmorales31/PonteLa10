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
