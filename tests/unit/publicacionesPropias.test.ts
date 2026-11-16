import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'opentype.js'
import { cajaElementoPropio, celdaEnPuntoPropio, componerSvgPropio, geometriaCeldaPropia, limitarPosicionPropia } from '~/utils/editorial/composicionPropia'
import {
  avisosPublicacionPropia, cambiarPlantillaPropia, crearDiapositivaPropia, crearDocumentoPropio, crearElementoLogo, crearElementoTexto,
  esquemaDocumentoPropio, esquemaGuardarPublicacionPropia, esquemaProgramarPublicacionPropia, formatosPropios, plantillasPropias
} from '~/utils/editorial/publicacionesPropias'
import type { PlantillaPropia } from '~/utils/editorial/publicacionesPropias'

const bytes = readFileSync(new URL('../../public/fonts/Montserrat-Bold.ttf', import.meta.url))
const fuente = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
const logo = `data:image/png;base64,${readFileSync(new URL('../../server/assets/redes/logo.png', import.meta.url)).toString('base64')}`
const imagen = { url: 'data:image/png;base64,iVBORw0KGgo=', ancho: 1600, alto: 1200 }
const idMedio = '7f4b1c9e-1d1a-4c7a-8f30-6a7c5a1e9b10'

describe('publicaciones propias: modelo', () => {
  it('cada plantilla define entre 1 y 4 celdas dentro del lienzo y sin solaparse', () => {
    for (const [id, plantilla] of Object.entries(plantillasPropias)) {
      expect(plantilla.celdas.length, id).toBeGreaterThanOrEqual(1)
      expect(plantilla.celdas.length, id).toBeLessThanOrEqual(4)
      let area = 0
      for (const [x, y, w, h] of plantilla.celdas) {
        expect(x + w, id).toBeLessThanOrEqual(1.0001)
        expect(y + h, id).toBeLessThanOrEqual(1.0001)
        area += w * h
      }
      expect(area, id).toBeCloseTo(1, 5)
    }
  })

  it('crea documentos válidos y exige tantas imágenes como celdas', () => {
    const documento = crearDocumentoPropio()
    expect(esquemaDocumentoPropio.safeParse(documento).success).toBe(true)
    const incompleta = { ...documento, diapositivas: [{ ...documento.diapositivas[0]!, plantilla: 'dos-lado' as const }] }
    expect(esquemaDocumentoPropio.safeParse(incompleta).success).toBe(false)
  })

  it('cambiar de plantilla conserva las imágenes elegidas y descarta las sobrantes', () => {
    const tres = crearDiapositivaPropia('tres-izquierda', [idMedio, 'a'.repeat(8) + '-1111-4111-8111-' + 'b'.repeat(12), null])
    const dos = cambiarPlantillaPropia(tres, 'dos-lado')
    expect(dos.medios).toHaveLength(2)
    expect(dos.medios[0]!.medioId).toBe(idMedio)
    const cuatro = cambiarPlantillaPropia(dos, 'cuatro')
    expect(cuatro.medios).toHaveLength(4)
    expect(cuatro.medios[0]!.medioId).toBe(idMedio)
    expect(cuatro.medios[3]!.medioId).toBeNull()
  })

  it('valida carrusel, límites de elementos y de textos', () => {
    const base = crearDocumentoPropio()
    const diapositivas = Array.from({ length: 11 }, () => crearDiapositivaPropia('una', [idMedio]))
    expect(esquemaDocumentoPropio.safeParse({ ...base, diapositivas }).success).toBe(false)
    const conMuchos = crearDiapositivaPropia('una', [idMedio])
    conMuchos.elementos = Array.from({ length: 9 }, () => crearElementoTexto())
    expect(esquemaDocumentoPropio.safeParse({ ...base, diapositivas: [conMuchos] }).success).toBe(false)
    expect(esquemaDocumentoPropio.safeParse({ ...base, textos: { facebook: '', instagram: 'x'.repeat(2201) } }).success).toBe(false)
  })

  it('rechaza campos desconocidos y fechas sin zona horaria', () => {
    const documento = crearDocumentoPropio()
    expect(esquemaGuardarPublicacionPropia.safeParse({ titulo: 'Mi pieza', documento, destinos: ['facebook'], revision: 1 }).success).toBe(true)
    expect(esquemaGuardarPublicacionPropia.safeParse({ titulo: 'Mi pieza', documento, destinos: ['facebook'], revision: 1, extra: true }).success).toBe(false)
    expect(esquemaGuardarPublicacionPropia.safeParse({ titulo: 'Mi pieza', documento, destinos: ['x'], revision: 1 }).success).toBe(false)
    expect(esquemaProgramarPublicacionPropia.safeParse({ fecha: '2026-11-20T10:00:00', revision: 1, confirmar: true }).success).toBe(false)
    expect(esquemaProgramarPublicacionPropia.safeParse({ fecha: '2026-11-20T10:00:00-05:00', revision: 1, confirmar: true }).success).toBe(true)
  })

  it('avisa cuando faltan imágenes, descripción o el formato no sirve para Instagram', () => {
    const documento = crearDocumentoPropio()
    expect(avisosPublicacionPropia(documento, ['facebook'])).toEqual(expect.arrayContaining([expect.stringContaining('Faltan 1 imagen'), expect.stringContaining('descripción de Facebook')]))
    documento.formato = 'web'
    expect(avisosPublicacionPropia(documento, ['instagram']).join(' ')).toContain('Instagram no admite el formato horizontal')
  })
})

describe('publicaciones propias: composición', () => {
  const componer = (plantilla: PlantillaPropia, formato: keyof typeof formatosPropios = 'cuadrado') => {
    const diapositiva = crearDiapositivaPropia(plantilla, plantillasPropias[plantilla].celdas.map(() => idMedio))
    diapositiva.elementos = [crearElementoLogo(), crearElementoTexto('Gol de **Nacional** en Manizales')]
    return componerSvgPropio({ diapositiva, formato, fuente, logo, imagenes: plantillasPropias[plantilla].celdas.map(() => imagen) })
  }

  it('dibuja una imagen recortada por celda más el logo y el texto como trazados', () => {
    for (const id of Object.keys(plantillasPropias) as PlantillaPropia[]) {
      const svg = componer(id)
      expect(svg.startsWith('<svg'), id).toBe(true)
      expect(svg.match(/<clipPath/g)?.length, id).toBe(plantillasPropias[id].celdas.length)
      expect(svg.match(/<image href="data:image\/png/g)?.length, id).toBe(plantillasPropias[id].celdas.length + 1) // celdas + logo
      expect(svg, id).not.toContain('<text')
    }
  })

  it('usa las dimensiones del formato y es determinista', () => {
    const vertical = componer('una', 'vertical')
    expect(vertical).toContain(`width="${formatosPropios.vertical.ancho}" height="${formatosPropios.vertical.alto}"`)
    expect(componer('cuatro')).toBe(componer('cuatro'))
  })

  it('resalta con amarillo las palabras entre ** y respeta el color elegido', () => {
    const diapositiva = crearDiapositivaPropia('una', [idMedio])
    const texto = crearElementoTexto('Un **titular** claro')
    if (texto.tipo === 'texto') texto.color = 'azul'
    diapositiva.elementos = [texto]
    const svg = componerSvgPropio({ diapositiva, formato: 'cuadrado', fuente, logo, imagenes: [imagen] })
    expect(svg).toContain('fill="#ffd800"')
    expect(svg).toContain('fill="#08204a"')
  })

  it('falla con un mensaje claro si falta una imagen o el texto no cabe', () => {
    const diapositiva = crearDiapositivaPropia('dos-lado', [idMedio, idMedio])
    expect(() => componerSvgPropio({ diapositiva, formato: 'cuadrado', fuente, logo, imagenes: [imagen, null] })).toThrow('Falta la imagen 2')
    const largo = crearDiapositivaPropia('una', [idMedio])
    const enorme = crearElementoTexto('palabra '.repeat(40))
    if (enorme.tipo === 'texto') enorme.tamano = 140
    largo.elementos = [enorme]
    expect(() => componerSvgPropio({ diapositiva: largo, formato: 'cuadrado', fuente, logo, imagenes: [imagen] })).toThrow()
  })

  it('el área de arrastre del logo y del texto queda dentro del lienzo por defecto', () => {
    const { ancho, alto } = formatosPropios.cuadrado
    for (const elemento of [crearElementoLogo(), crearElementoTexto('Titular de prueba')]) {
      const caja = cajaElementoPropio(elemento, 'cuadrado', fuente)
      expect(caja.x).toBeGreaterThanOrEqual(0)
      expect(caja.y).toBeGreaterThanOrEqual(0)
      expect(caja.x + caja.ancho).toBeLessThanOrEqual(ancho)
      expect(caja.y + caja.alto).toBeLessThanOrEqual(alto)
    }
  })
  it('limitar la posición mantiene la caja completa dentro del lienzo', () => {
    const { ancho, alto } = formatosPropios.cuadrado
    for (const elemento of [crearElementoLogo(), crearElementoTexto('Titular de prueba')]) {
      for (const [x, y] of [[-20, -20], [150, 150], [0, 100], [50, 50]] as const) {
        const posicion = limitarPosicionPropia(elemento, 'cuadrado', fuente, x, y)
        const caja = cajaElementoPropio({ ...elemento, ...posicion }, 'cuadrado', fuente)
        expect(caja.x).toBeGreaterThanOrEqual(-1)
        expect(caja.y).toBeGreaterThanOrEqual(-1)
        expect(caja.x + caja.ancho).toBeLessThanOrEqual(ancho + 1)
        expect(caja.y + caja.alto).toBeLessThanOrEqual(alto + 1)
      }
    }
  })

  it('un texto del tamaño mínimo (24) se compone sin error', () => {
    const base = crearDiapositivaPropia('una')
    const texto = crearElementoTexto('Texto pequeño de prueba')
    if (texto.tipo === 'texto') texto.tamano = 24
    base.elementos = [texto]
    base.medios[0]!.medioId = '11111111-1111-4111-8111-111111111111'
    const imagen = { url: 'data:image/png;base64,AAAA', ancho: 100, alto: 100 }
    expect(() => componerSvgPropio({ diapositiva: base, formato: 'cuadrado', fuente, logo: 'data:image/png;base64,AAAA', imagenes: [imagen] })).not.toThrow()
  })
  it('el texto nuevo usa el degradado de las noticias y las celdas vacías se pueden previsualizar', () => {
    const diapositiva = crearDiapositivaPropia('dos-lado', [null, null])
    diapositiva.elementos = [crearElementoTexto('Titular con **fuerza**')]
    const vista = componerSvgPropio({ diapositiva, formato: 'vertical', fuente, logo: 'data:image/png;base64,AAAA', imagenes: [null, null], permitirVacias: true })
    expect(vista).toContain('linearGradient')
    expect(vista).toContain('#ffd800')
    expect(() => componerSvgPropio({ diapositiva, formato: 'vertical', fuente, logo: 'data:image/png;base64,AAAA', imagenes: [null, null] })).toThrow('Falta la imagen 1')
  })

  it('la geometría de celdas permite ubicar el toque y calcular la holgura para mover la imagen', () => {
    const diapositiva = crearDiapositivaPropia('dos-lado', [null, null])
    expect(celdaEnPuntoPropio(diapositiva, 'cuadrado', 100, 500)).toBe(0)
    expect(celdaEnPuntoPropio(diapositiva, 'cuadrado', 900, 500)).toBe(1)
    const g = geometriaCeldaPropia(diapositiva, 'cuadrado', 0, { ancho: 1600, alto: 1000 })
    expect(g.iw).toBeGreaterThan(g.w)
    expect(g.ih).toBeCloseTo(g.h)
  })
})
