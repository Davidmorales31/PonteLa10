import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import * as modulo from '../../scripts/video-medir-miniatura.mjs'

type Medidas = { ancho: number, alto: number, pesoKb: number, luminancia: number, contraste: number, saturacion: number, oscuros: number, blancos: number, amarillos: number, bordes: number }
type Evaluacion = { ok: boolean, criterios: Array<{ criterio: string, ok: boolean, ayuda: string }> }
const medirMiniatura = modulo.medirMiniatura as (b: Buffer, o?: { peso?: number }) => Promise<Medidas>
const evaluarMiniatura = modulo.evaluarMiniatura as (m: Medidas) => Evaluacion

const lienzo = (fondo: string, ancho = 1280, alto = 720) => sharp({ create: { width: ancho, height: alto, channels: 3, background: fondo } })

describe('medidor de miniaturas', () => {
  it('mide color y brillo de una imagen lisa', async () => {
    const negra = await medirMiniatura(await lienzo('#000000').jpeg().toBuffer())
    expect(negra).toMatchObject({ ancho: 1280, alto: 720, luminancia: 0, oscuros: 1, bordes: 0 })
    const amarilla = await medirMiniatura(await lienzo('#ffd800').jpeg().toBuffer())
    expect(amarilla.amarillos).toBeGreaterThan(0.95)
    expect(amarilla.saturacion).toBeGreaterThan(0.9)
    const blanca = await medirMiniatura(await lienzo('#ffffff').jpeg().toBuffer())
    expect(blanca.blancos).toBeGreaterThan(0.95)
  })

  it('cuenta los bordes: una imagen con muchos detalles ocupa más que una lisa', async () => {
    const franjas = Buffer.alloc(1280 * 720 * 3)
    for (let y = 0; y < 720; y++) for (let x = 0; x < 1280; x++) { const v = Math.floor(x / 16) % 2 ? 230 : 40; const i = (y * 1280 + x) * 3; franjas[i] = v; franjas[i + 1] = v; franjas[i + 2] = v }
    const con = await medirMiniatura(await sharp(franjas, { raw: { width: 1280, height: 720, channels: 3 } }).png().toBuffer())
    const sin = await medirMiniatura(await lienzo('#555555').png().toBuffer())
    expect(con.bordes).toBeGreaterThan(sin.bordes + 0.05)
    expect(con.contraste).toBeGreaterThan(0.25)
  })

  it('rechaza lo que no cabe en lo medido y explica qué corregir', async () => {
    const mala = evaluarMiniatura(await medirMiniatura(await lienzo('#000000', 800, 450).jpeg().toBuffer()))
    expect(mala.ok).toBe(false)
    const falla = new Map(mala.criterios.map(c => [c.criterio, c]))
    expect(falla.get('tamaño')?.ok).toBe(false)
    expect(falla.get('luminancia')?.ayuda).toMatch(/oscura/)
    expect(falla.get('bordes')?.ayuda).toMatch(/vacía/)
  })

  it('acepta una medida típica de La Gambeta y Cracks', () => {
    const tipica: Medidas = { ancho: 1280, alto: 720, pesoKb: 300, luminancia: 0.43, contraste: 0.28, saturacion: 0.49, oscuros: 0.12, blancos: 0.07, amarillos: 0.02, bordes: 0.19 }
    expect(evaluarMiniatura(tipica).ok).toBe(true)
    expect(evaluarMiniatura({ ...tipica, pesoKb: 3000 }).ok).toBe(false)
  })
})
