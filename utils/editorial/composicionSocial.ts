import type { Font } from 'opentype.js'
import { formatosSociales } from './publicacionesSociales'
import type { DiapositivaSocial, FormatoSocial } from './publicacionesSociales'

const escapar = (texto: string) => texto.replace(/[&<>"']/g, valor => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[valor]!)
interface PalabraVisual { texto: string, resaltada: boolean }
const opcionesTitular = { kerning: true, letterSpacing: -.018 }
const medirTitular = (fuente: Font, texto: string, medida: number) => fuente.getAdvanceWidth(texto, medida, opcionesTitular)

function palabrasVisuales(texto: string): PalabraVisual[] {
  let resaltada = false
  return texto.split(/(\*\*|\n)/).flatMap(fragmento => {
    if (fragmento === '**') { resaltada = !resaltada; return [] }
    if (fragmento === '\n') return [{ texto: '\n', resaltada }]
    return fragmento.trim().split(/\s+/).filter(Boolean).map(texto => ({ texto, resaltada }))
  })
}

export function distribuirTitularSocial(fuente: Font, titular: string, ancho: number, tamano: number) {
  const palabras = palabrasVisuales(titular)
  for (let medida = tamano; medida >= 32; medida -= 2) {
    const lineas: PalabraVisual[][] = [[]]
    let anchoLinea = 0
    let palabraLarga = false
    for (const palabra of palabras) {
      if (palabra.texto === '\n') { lineas.push([]); anchoLinea = 0; continue }
      const anchoPalabra = medirTitular(fuente, palabra.texto, medida)
      if (anchoPalabra > ancho) palabraLarga = true
      const linea = lineas.at(-1)!
      const espacio = linea.length ? medirTitular(fuente, ' ', medida) : 0
      if (anchoLinea + espacio + anchoPalabra > ancho && linea.length) {
        lineas.push([palabra]); anchoLinea = anchoPalabra
      } else { linea.push(palabra); anchoLinea += espacio + anchoPalabra }
    }
    const noVacias = lineas.filter(linea => linea.length)
    if (noVacias.length <= 4 && !palabraLarga) return { lineas: noVacias, tamano: medida }
  }
  throw new Error('El titular no cabe en cuatro líneas. Acórtalo antes de exportar.')
}

/** SVG sin texto dependiente de fuentes: las letras se convierten en trazados.
 * Vista previa y exportación usan exactamente la misma geometría. */
export function componerSvgSocial(entrada: {
  diapositiva: DiapositivaSocial, formato: FormatoSocial, fuente: Font,
  imagen: { url: string, ancho: number, alto: number } | null,
  logo: string, dominio: string, credito?: string, imagenCta?: string
}): string {
  const { diapositiva, formato, fuente, imagen, logo, dominio } = entrada
  const { ancho, alto } = formatosSociales[formato]
  const ajuste = diapositiva.encuadres[formato]
  const margen = ancho * .065
  const capas: string[] = []
  const rutaTexto = (texto: string, x: number, y: number, medida: number, color = '#fff', esTitular = false) =>
    `<path fill="${color}" d="${fuente.getPath(texto, x, y, medida, esTitular ? opcionesTitular : undefined).toPathData(2)}"/>`
  const centrado = (texto: string, y: number, medida: number, color = '#fff') =>
    rutaTexto(texto, (ancho - fuente.getAdvanceWidth(texto, medida)) / 2, y, medida, color)
  const textoDominio = dominio.startsWith('www.') ? dominio : `www.${dominio}`
  const medidaPie = Math.min(26, ancho * .023)
  const anchoPie = fuente.getAdvanceWidth(textoDominio, medidaPie)
  const derechaPie = ancho - ancho * .025
  const pieDominio = `<g aria-label="${escapar(textoDominio)}" data-pie-dominio="true"><rect x="${derechaPie - anchoPie - 12}" y="${alto - 30 - medidaPie}" width="${anchoPie + 24}" height="${medidaPie + 20}" rx="7" fill="#08204a" fill-opacity=".94"/>${rutaTexto(textoDominio, derechaPie - anchoPie, alto - 24, medidaPie)}</g>`
  capas.push(`<rect width="${ancho}" height="${alto}" fill="#08204a"/>`)
  if (diapositiva.tipo === 'cta' && diapositiva.varianteCta === 'promocional') {
    if (!entrada.imagenCta) throw new Error('La imagen promocional no está disponible.')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">${capas.join('')}<image href="${escapar(entrada.imagenCta)}" width="${ancho}" height="${alto}" preserveAspectRatio="xMidYMid meet"/>${pieDominio}</svg>`
  }
  if (diapositiva.tipo === 'cta') {
    if (diapositiva.varianteCta === 'deportivo') {
      capas.push(`<path d="M0 ${alto * .45} L${ancho} 0 V${alto * .3} L0 ${alto * .9}Z" fill="#174ea6" opacity=".65"/>`)
    }
    if (diapositiva.varianteCta === 'editorial') {
      capas.push(`<rect x="${margen / 2}" y="${margen / 2}" width="${ancho - margen}" height="${alto - margen}" fill="none" stroke="#ffd800" stroke-width="3"/><path d="M${margen} ${alto * .31} H${ancho - margen}" stroke="#ffd800" stroke-width="2"/>`)
    }
    capas.push(`<image href="${escapar(logo)}" x="${ancho * .34}" y="${alto * .15}" width="${ancho * .32}" height="${alto * .1}" preserveAspectRatio="xMidYMid meet"/>`)
    const texto = distribuirTitularSocial(fuente, diapositiva.titular, ancho - margen * 2, ancho * .055)
    texto.lineas.forEach((linea, indice) => {
      const contenido = linea.map(p => p.texto).join(' ')
      capas.push(rutaTexto(contenido, (ancho - medirTitular(fuente, contenido, texto.tamano)) / 2,
        alto * .37 + indice * texto.tamano * 1.12, texto.tamano, '#ffd800', true))
    })
    const cajaY = alto * .60
    capas.push(`<rect x="${margen}" y="${cajaY}" width="${ancho - margen * 2}" height="${alto * .13}" rx="${alto * .065}" fill="white"/>`)
    const iconoX = ancho - margen - 65, iconoY = cajaY + alto * .06
    capas.push(`<circle cx="${iconoX}" cy="${iconoY}" r="18" fill="none" stroke="#08204a" stroke-width="6"/><path d="M${iconoX + 13} ${iconoY + 13} l18 18" stroke="#08204a" stroke-width="6" stroke-linecap="round"/>`)
    const medidaDominio = Math.min(54, (ancho - margen * 5) / fuente.getAdvanceWidth(dominio, 1))
    capas.push(centrado(dominio, cajaY + alto * .082, medidaDominio, '#08204a'))
    capas.push(centrado('Búscanos y descubre todos los detalles', alto * .84, ancho * .027))
  } else {
    if (!imagen || imagen.ancho <= 0 || imagen.alto <= 0) throw new Error('Selecciona una imagen válida.')
    const escala = Math.max(ancho / imagen.ancho, alto / imagen.alto) * ajuste.zoom
    const anchoImagen = imagen.ancho * escala, altoImagen = imagen.alto * escala
    const x = (ancho - anchoImagen) / 2 + ajuste.x / 100 * (anchoImagen - ancho) / 2
    const y = (alto - altoImagen) / 2 + ajuste.y / 100 * (altoImagen - alto) / 2
    capas.push(`<image href="${escapar(imagen.url)}" x="${x}" y="${y}" width="${anchoImagen}" height="${altoImagen}"/>`)
    capas.push(`<defs><linearGradient id="sombraSocial" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#041229" stop-opacity="0"/><stop offset="1" stop-color="#041229" stop-opacity="${ajuste.degradado / 100 + .1}"/></linearGradient></defs><rect y="${alto * .34}" width="${ancho}" height="${alto * .66}" fill="url(#sombraSocial)"/>`)
    const texto = distribuirTitularSocial(fuente, diapositiva.titular, ancho - margen * 2, ajuste.tamanoTexto * ancho / 1080 * (ancho > alto ? .8 : 1))
    const paso = texto.tamano * 1.12
    const inicio = alto - alto * .09 - (texto.lineas.length - 1) * paso
    const logoY = inicio - texto.tamano - alto * .12
    capas.push(`<image href="${escapar(logo)}" x="${ancho * .35}" y="${logoY}" width="${ancho * .3}" height="${alto * .085}" preserveAspectRatio="xMidYMid meet"/>`)
    capas.push(`<path d="M${ancho * .15} ${logoY + alto * .045} H${ancho * .31} M${ancho * .69} ${logoY + alto * .045} H${ancho * .85}" stroke="#ffd800" stroke-width="5" stroke-linecap="round"/>`)
    texto.lineas.forEach((linea, indice) => {
      const anchoLinea = medirTitular(fuente, linea.map(p => p.texto).join(' '), texto.tamano)
      let cursor = (ancho - anchoLinea) / 2
      linea.forEach(palabra => {
        capas.push(rutaTexto(palabra.texto, cursor, inicio + indice * paso, texto.tamano, palabra.resaltada ? '#ffd800' : '#fff', true))
        cursor += medirTitular(fuente, `${palabra.texto} `, texto.tamano)
      })
    })
    if (entrada.credito) {
      const credito = entrada.credito.slice(0, 160)
      capas.push(rutaTexto(credito, margen, alto - 24, Math.min(18, (derechaPie - anchoPie - margen - 40) / fuente.getAdvanceWidth(credito, 1))))
    }
  }
  if (diapositiva.varianteCta !== 'minimalista' || diapositiva.tipo !== 'cta') capas.push(`<path d="M0 0 H${ancho * .16} L${ancho * .07} ${alto * .12} H0Z M${ancho} ${alto} H${ancho * .86} L${ancho} ${alto * .87}Z" fill="#ffd800"/>`)
  capas.push(pieDominio)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" overflow="hidden">${capas.join('')}</svg>`
}
