import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { componerImpacto, LIENZO, palabraDeImpacto } from '../../scripts/redes-imagen-impacto.mjs'

const pixel = async (jpg: Buffer, x: number, y: number) => { const { data, info } = await sharp(jpg).raw().toBuffer({ resolveWithObject: true }); const i = (y * info.width + x) * info.channels; return [data[i]!, data[i + 1]!, data[i + 2]!] }

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
    const jpg = await (componerImpacto as unknown as (o: Record<string, unknown>) => Promise<Buffer>)({ recorte, palabra: 'FUERA', subtitulo: 'Águilas queda fuera de los cuadrangulares de la Liga', logo: null })
    const meta = await sharp(jpg).metadata()
    expect([meta.width, meta.height, meta.format]).toEqual([LIENZO.ancho, LIENZO.alto, 'jpeg'])
  })
})

describe('foto completa y nítida (sin fondo desenfocado)', () => {
  // Foto rayada de 1200×675 (16:9): si se desenfocara, las rayas desaparecerían; si se recortara, perdería los bordes.
  const rayas = async () => sharp({ create: { width: 1200, height: 675, channels: 3, background: { r: 230, g: 230, b: 230 } } })
    .composite([{ input: await sharp({ create: { width: 1200, height: 40, channels: 3, background: { r: 200, g: 0, b: 0 } } }).png().toBuffer(), left: 0, top: 0 }]).jpeg().toBuffer()
  const compose = componerImpacto as unknown as (o: Record<string, unknown>) => Promise<Buffer>

  it('muestra la foto entera sobre un fondo casi negro, no sobre una copia borrosa ni azul/amarillo', async () => {
    const jpg = await compose({ original: await rayas(), palabra: 'FUERA', subtitulo: 'Titular de prueba', logo: null })
    const meta = await sharp(jpg).metadata()
    expect([meta.width, meta.height]).toEqual([LIENZO.ancho, LIENZO.alto])
    const [r, g, b] = await pixel(jpg, 5, 60) // esquina superior: fondo neutro
    expect(Math.max(r, g, b)).toBeLessThan(40)
    expect(Math.abs(r - b)).toBeLessThan(15) // sin tinte azul
    const [fr, fg] = await pixel(jpg, 540, 400) // centro: la foto, nítida
    expect(fr).toBeGreaterThan(200)
    expect(fg).toBeGreaterThan(200)
  })

  it('la foto llega a los dos bordes laterales (completa, sin recortar)', async () => {
    const jpg = await compose({ original: await rayas(), palabra: 'FUERA', subtitulo: 'Titular de prueba', logo: null })
    const [r, g] = await pixel(jpg, 2, 400)
    const [r2, g2] = await pixel(jpg, 1077, 400)
    expect(Math.min(r, g, r2, g2)).toBeGreaterThan(190)
  })

  it('el enfoque conserva el borde de una raya fina', async () => {
    const jpg = await compose({ original: await rayas(), palabra: 'FUERA', subtitulo: 'Titular de prueba', logo: null })
    // La foto (1080×608) se centra en la franja 130–930: arriba = 226. La raya roja de 40 px (36 px escalada) está ahí.
    const dentro = await pixel(jpg, 540, 226 + 8)
    const fuera = await pixel(jpg, 540, 226 + 60)
    expect(dentro[0]).toBeGreaterThan(150)
    expect(dentro[1]).toBeLessThan(80)
    expect(fuera[1]).toBeGreaterThan(200)
  })
})
