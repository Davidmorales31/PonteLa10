import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import * as formatos from '../../scripts/redes-formatos.mjs'

const f = formatos as unknown as Record<string, (...a: unknown[]) => unknown>
const foto = (r: number, g: number, b: number) => sharp({ create: { width: 800, height: 600, channels: 3, background: { r, g, b } } }).jpeg().toBuffer()
const recorte = () => sharp({ create: { width: 400, height: 700, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer()
const medida = async (b: Buffer) => { const m = await sharp(b).metadata(); return [m.width, m.height, m.format] }

describe('extractores de las notas', () => {
  it('encuentra la primera cita entre comillas de 40 a 170 caracteres', () => {
    const nota = { documento: { content: [{ content: [{ text: 'Dijo «Espero que por lo menos antes de que tengamos el primer partido de local» y se fue.' }] }] } }
    expect(f.citaDeNota(nota)).toBe('Espero que por lo menos antes de que tengamos el primer partido de local')
    expect(f.citaDeNota({ documento: { content: [{ text: 'Dijo «corta»' }] } })).toBeNull()
  })

  it('toma la primera cifra con su concepto y omite artículos y preposiciones', () => {
    expect(f.cifraDeNota('Pasto se queda con 22 jugadores menos')).toEqual({ cifra: '22', concepto: 'jugadores menos' })
    expect(f.cifraDeNota('Se fueron 22 de sus 25 jugadores')).toEqual({ cifra: '25', concepto: 'jugadores' })
    expect(f.cifraDeNota('Sin cifras aquí')).toBeNull()
  })

  it('recorta en límite de palabra y añade puntos suspensivos', () => {
    expect(f.corto('uno dos tres cuatro cinco', 14)).toBe('uno dos tres…')
    expect(f.corto('corto', 14)).toBe('corto')
  })

  it('arma hasta tres puntos clave con oraciones de longitud útil', () => {
    const puntos = f.puntosDeNota({ resumen: 'El técnico habló en la rueda de prensa previa al debut del equipo. Otra oración suficientemente larga para ser un punto clave.', documento: null }) as string[]
    expect(puntos.length).toBeGreaterThan(0)
    expect(puntos.length).toBeLessThanOrEqual(3)
  })
})

describe('formatos visuales', () => {
  it('cada formato produce JPG vertical de 1080×1350', async () => {
    const [a, b, r] = [await foto(30, 90, 160), await foto(160, 60, 30), await recorte()]
    const base = { original: a, recorte: r, palabra: 'FUERA', subtitulo: 'Águilas queda fuera de los cuadrangulares de la Liga', logo: null }
    const salidas = await Promise.all([
      f.componerImpactoDesenfocado(base),
      f.componerCita({ original: a, cita: 'Una cita suficientemente larga para ocupar varias líneas en la imagen de la publicación', autor: 'Win Sports', logo: null }),
      f.componerVersus({ fotoA: a, fotoB: b, nombreA: 'Nacional', nombreB: 'Junior', titulo: 'Duelo', logo: null }),
      f.componerFicha({ original: a, nombre: 'Pont3la10', concepto: 'jugadores menos', cifra: '22', logo: null }),
      f.componerContextoCirculo({ ...base, circulo: b }),
      f.componerBanda({ original: a, titular: 'Águilas queda fuera de los cuadrangulares', subtitulo: 'Cayó 0-1 ante Medellín y se quedó sin cupo', logo: null })
    ]) as Buffer[]
    for (const s of salidas) expect(await medida(s)).toEqual([1080, 1350, 'jpeg'])
  })

  it('el carrusel entrega tres diapositivas del mismo tamaño', async () => {
    const hojas = await f.componerCarrusel({ original: await foto(30, 90, 160), recorte: await recorte(), palabra: 'FUERA', subtitulo: 'Titular', puntos: ['Primer punto de la nota.', 'Segundo punto de la nota.'], pregunta: '¿Qué opinas?', logo: null }) as Buffer[]
    expect(hojas).toHaveLength(3)
    for (const h of hojas) expect(await medida(h)).toEqual([1080, 1350, 'jpeg'])
  })
})
