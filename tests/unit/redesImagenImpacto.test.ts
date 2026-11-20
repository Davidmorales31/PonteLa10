import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { componerImpacto, LIENZO, palabraDeImpacto } from '../../scripts/redes-imagen-impacto.mjs'

describe('portada de impacto para redes', () => {
  const palabra = palabraDeImpacto as (t: string) => string

  it('elige la palabra más fuerte del titular, no la primera', () => {
    expect(palabra('Penal fallado y derrota con Medellín dejan a Águilas fuera de cuadrangulares')).toBe('FUERA')
    expect(palabra('Fortaleza se despide de 2026 sin cuadrangulares')).toBe('DESPIDE')
    expect(palabra('David González exige que se paguen los salarios')).toBe('EXIGE')
  })

  it('sin palabra fuerte usa la primera útil y nunca devuelve vacío', () => {
    expect(palabra('Bucaramanga mantiene la ilusión en el campeonato')).toBe('ILUSIÓN')
    expect(palabra('Tolima presenta camiseta nueva')).toBe('TOLIMA')
    expect(palabra('')).toBe('')
  })

  it('compone un JPG vertical de 1080×1350 con un recorte transparente', async () => {
    const recorte = await sharp({ create: { width: 600, height: 800, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer()
    const jpg = await (componerImpacto as (o: Record<string, unknown>) => Promise<Buffer>)({ recorte, palabra: 'FUERA', subtitulo: 'Águilas queda fuera de los cuadrangulares de la Liga', logo: null })
    const meta = await sharp(jpg).metadata()
    expect([meta.width, meta.height, meta.format]).toEqual([LIENZO.ancho, LIENZO.alto, 'jpeg'])
  })
})
