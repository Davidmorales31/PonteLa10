import type { Font } from 'opentype.js'
import { distribuirTitularSocial } from './composicionSocial'
import { coloresTextoPropio, formatosPropios, plantillasPropias } from './publicacionesPropias'
import type { DiapositivaPropia, ElementoPropio, FormatoPropio } from './publicacionesPropias'

const escapar = (texto: string) => texto.replace(/[&<>"']/g, valor => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[valor]!)
const hueco = 6
// El logo real mide 598×115 px.
const proporcionLogo = 115 / 598

export interface ImagenPropia { url: string, ancho: number, alto: number }

/** Rectángulo (en px) que ocupa un elemento sobre el lienzo; el editor lo usa para el área de arrastre. */
export function cajaElementoPropio(elemento: ElementoPropio, formato: FormatoPropio, fuente: Font | null) {
  const { ancho, alto } = formatosPropios[formato]
  if (elemento.tipo === 'logo') {
    const w = ancho * elemento.ancho / 100, h = w * proporcionLogo
    return { x: ancho * elemento.x / 100 - w / 2, y: alto * elemento.y / 100 - h / 2, ancho: w, alto: h }
  }
  let medida = elemento.tamano * ancho / 1080
  const maximo = ancho * .88
  let lineas = 1, mayor = maximo * .5
  if (fuente) {
    try {
      const distribuido = distribuirTitularSocial(fuente, elemento.texto, maximo, medida)
      medida = distribuido.tamano // si el texto se reduce para caber, la banda se reduce con él
      lineas = distribuido.lineas.length
      mayor = Math.max(...distribuido.lineas.map(linea => fuente.getAdvanceWidth(linea.map(p => p.texto).join(' '), distribuido.tamano, { kerning: true, letterSpacing: -.018 })))
    } catch { /* El texto demasiado largo se informa al componer la pieza. */ }
  }
  const w = mayor + medida * .9, h = lineas * medida * 1.12 + medida * .7
  return { x: ancho * elemento.x / 100 - w / 2, y: alto * elemento.y / 100 - h / 2, ancho: w, alto: h }
}

/** Mantiene el elemento completo dentro del lienzo: x e y (en %) se limitan según el tamaño de su caja. */
export function limitarPosicionPropia(elemento: ElementoPropio, formato: FormatoPropio, fuente: Font | null, x: number, y: number) {
  const { ancho, alto } = formatosPropios[formato]
  const caja = cajaElementoPropio(elemento, formato, fuente)
  const mitadX = Math.min(50, caja.ancho / 2 / ancho * 100), mitadY = Math.min(50, caja.alto / 2 / alto * 100)
  const redondear = (valor: number) => Math.round(valor * 10) / 10
  return { x: redondear(Math.max(mitadX, Math.min(100 - mitadX, x))), y: redondear(Math.max(mitadY, Math.min(100 - mitadY, y))) }
}

/** SVG con el texto convertido en trazados: la vista previa y la exportación usan la misma geometría. */
export function componerSvgPropio(entrada: {
  diapositiva: DiapositivaPropia, formato: FormatoPropio, fuente: Font, logo: string,
  imagenes: Array<ImagenPropia | null>
}): string {
  const { diapositiva, formato, fuente, logo } = entrada
  const { ancho, alto } = formatosPropios[formato]
  const celdas = plantillasPropias[diapositiva.plantilla].celdas
  const capas: string[] = [`<rect width="${ancho}" height="${alto}" fill="#08204a"/>`]
  const definiciones: string[] = []
  celdas.forEach(([fx, fy, fw, fh], indice) => {
    const imagen = entrada.imagenes[indice]
    const x0 = fx * ancho + (fx > 0 ? hueco / 2 : 0), y0 = fy * alto + (fy > 0 ? hueco / 2 : 0)
    const x1 = (fx + fw) * ancho - (fx + fw < .999 ? hueco / 2 : 0), y1 = (fy + fh) * alto - (fy + fh < .999 ? hueco / 2 : 0)
    const w = x1 - x0, h = y1 - y0
    if (!imagen || imagen.ancho <= 0 || imagen.alto <= 0) throw new Error(`Falta la imagen ${indice + 1} de la diapositiva.`)
    const encuadre = diapositiva.medios[indice]!.encuadre
    const escala = Math.max(w / imagen.ancho, h / imagen.alto) * encuadre.zoom
    const iw = imagen.ancho * escala, ih = imagen.alto * escala
    const x = x0 + (w - iw) / 2 + encuadre.x / 100 * (iw - w) / 2
    const y = y0 + (h - ih) / 2 + encuadre.y / 100 * (ih - h) / 2
    definiciones.push(`<clipPath id="celda${indice}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}"/></clipPath>`)
    capas.push(`<image href="${escapar(imagen.url)}" x="${x}" y="${y}" width="${iw}" height="${ih}" clip-path="url(#celda${indice})"/>`)
  })
  for (const elemento of diapositiva.elementos) {
    const caja = cajaElementoPropio(elemento, formato, fuente)
    if (elemento.tipo === 'logo') {
      capas.push(`<image href="${escapar(logo)}" x="${caja.x}" y="${caja.y}" width="${caja.ancho}" height="${caja.alto}" preserveAspectRatio="xMidYMid meet"/>`)
      continue
    }
    const medida = elemento.tamano * ancho / 1080
    const texto = distribuirTitularSocial(fuente, elemento.texto, ancho * .88, medida)
    const paso = texto.tamano * 1.12
    const alturaBloque = (texto.lineas.length - 1) * paso
    const base = alto * elemento.y / 100 - alturaBloque / 2 + texto.tamano * .35
    if (elemento.banda) {
      capas.push(`<rect x="${caja.x}" y="${caja.y}" width="${caja.ancho}" height="${caja.alto}" rx="${texto.tamano * .25}" fill="#08204a" fill-opacity=".82"/>`)
    }
    texto.lineas.forEach((linea, indice) => {
      const contenido = linea.map(palabra => palabra.texto).join(' ')
      const anchoLinea = fuente.getAdvanceWidth(contenido, texto.tamano, { kerning: true, letterSpacing: -.018 })
      let cursor = ancho * elemento.x / 100 - anchoLinea / 2
      for (const palabra of linea) {
        capas.push(`<path fill="${palabra.resaltada ? coloresTextoPropio.amarillo : coloresTextoPropio[elemento.color]}" d="${fuente.getPath(palabra.texto, cursor, base + indice * paso, texto.tamano, { kerning: true, letterSpacing: -.018 }).toPathData(2)}"/>`)
        cursor += fuente.getAdvanceWidth(`${palabra.texto} `, texto.tamano, { kerning: true, letterSpacing: -.018 })
      }
    })
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" overflow="hidden"><defs>${definiciones.join('')}</defs>${capas.join('')}</svg>`
}
