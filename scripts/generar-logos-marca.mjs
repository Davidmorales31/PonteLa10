// Genera los logos de la marca «Ponte la 10» (texto nuevo) conservando el isotipo de la camiseta.
// Uso: node scripts/generar-logos-marca.mjs
// El isotipo sale de los logos existentes; el texto se dibuja con Montserrat Bold (public/fonts),
// engrosado y con inclinación para acercarlo al estilo deportivo original.
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const MARCA = 'public/brand/pont3la10_logo_'
const FUENTE = 'public/fonts/Montserrat-Bold.ttf'
const COLORES = { azulOscuro: '#002675', azul: '#0051E8', amarillo: '#FCC300', blanco: '#FFFFFF' }
const INCLINACION = 0.2

/** Máscara del tramo `activo` del texto, engrosada (blanco = visible). */
async function capaTexto(tramos, activo, engrosar) {
  const marcado = tramos.map((tramo, i) =>
    i === activo
      ? `<span foreground="#ffffff" weight="ultraheavy">${tramo}</span>`
      : `<span alpha="1" weight="ultraheavy">${tramo}</span>`).join('')
  const texto = await sharp({ text: { text: marcado, font: 'Montserrat 140', fontfile: FUENTE, rgba: true, dpi: 300 } })
    .png().toBuffer()
  const { data, info } = await sharp(texto).ensureAlpha()
    .extend({ left: 40, right: 40, top: 40, bottom: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extractChannel(3)
    .blur(engrosar).threshold(60).raw().toBuffer({ resolveWithObject: true })
  return { data, ancho: info.width, alto: info.height }
}

/** Texto «Ponte la 10» ya coloreado, inclinado y ajustado a la caja `ancho` × `alto` (con transparencia). */
async function textoMarca({ ancho, alto, colores }) {
  const tramos = ['Ponte la ', '1', '0']
  const capas = []
  for (let i = 0; i < tramos.length; i++) {
    const capa = await capaTexto(tramos, i, 6)
    capas.push(await sharp({ create: { width: capa.ancho, height: capa.alto, channels: 3, background: colores[i] } })
      .joinChannel(capa.data, { raw: { width: capa.ancho, height: capa.alto, channels: 1 } })
      .png().toBuffer())
  }
  const meta = await sharp(capas[0]).metadata()
  const plano = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(capas.map(input => ({ input }))).png().toBuffer()
  // Ampliar el lienzo antes de inclinar para que la inclinación no recorte los bordes
  const holgura = Math.ceil(INCLINACION * meta.height)
  const inclinado = await sharp(plano)
    .extend({ left: holgura, right: holgura, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .affine([[1, -INCLINACION], [0, 1]], { background: { r: 0, g: 0, b: 0, alpha: 0 }, odx: INCLINACION * meta.height })
    .png().toBuffer()
  if (process.env.DEBUG_LOGO) await sharp(inclinado).flatten({ background: '#888888' }).toFile(process.env.DEBUG_LOGO)
  return sharp(inclinado).trim().resize({ width: ancho, height: alto, fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()
}

async function recorte(archivo, region) {
  return sharp(await readFile(`${MARCA}${archivo}.png`)).extract(region).png().toBuffer()
}

async function lienzo({ ancho, alto, fondo, piezas }) {
  return sharp({ create: { width: ancho, height: alto, channels: 4, background: fondo || { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(piezas).png().toBuffer()
}

async function guardar(nombre, png, { ancho, alto }, variantes = []) {
  await writeFile(`${MARCA}${nombre}.png`, png)
  for (const v of variantes) {
    await sharp(png).resize({ width: v, height: Math.round(alto * v / ancho) }).webp({ quality: 90 }).toFile(`${MARCA}${nombre}-${v}.webp`)
  }
}

const coloresTexto = [COLORES.azulOscuro, COLORES.azul, COLORES.amarillo]
const blancos = [COLORES.blanco, COLORES.blanco, COLORES.blanco]

// 1. Cabecera: color sobre transparente (1474 × 325)
{
  const tam = { ancho: 1474, alto: 325 }
  const icono = await recorte('modo_blanco', { left: 0, top: 0, width: 421, height: 325 })
  const texto = await textoMarca({ ancho: 940, alto: 169, colores: coloresTexto })
  await guardar('modo_blanco', await lienzo({ ...tam, piezas: [{ input: icono, left: 0, top: 0 }, { input: texto, left: 510, top: 97 }] }), tam, [180, 360, 598])
}

// 2. Pie y login: blanco sobre transparente (598 × 115)
const iconoBlanco = await recorte('login_blanco', { left: 60, top: 0, width: 122, height: 115 })
{
  const tam = { ancho: 598, alto: 115 }
  const texto = await textoMarca({ ancho: 345, alto: 44, colores: blancos })
  await guardar('login_blanco', await lienzo({ ...tam, piezas: [{ input: iconoBlanco, left: 60, top: 0 }, { input: texto, left: 200, top: 33 }] }), tam, [180, 360, 598])
}

// 3. Pantalla de bloqueo: blanco sobre transparente (598 × 180)
{
  const tam = { ancho: 598, alto: 180 }
  const texto = await textoMarca({ ancho: 345, alto: 44, colores: blancos })
  await guardar('real_blanco_transparente', await lienzo({ ...tam, piezas: [{ input: iconoBlanco, left: 60, top: 32 }, { input: texto, left: 200, top: 65 }] }), tam, [180, 360, 598])
}

// 4. Logo de datos estructurados: color sobre blanco (900 × 320)
{
  const tam = { ancho: 900, alto: 320 }
  const alturaIcono = 232
  const anchoIcono = Math.round(421 * alturaIcono / 325)
  const icono = await sharp(await recorte('modo_blanco', { left: 0, top: 0, width: 421, height: 325 })).resize({ height: alturaIcono }).png().toBuffer()
  const texto = await textoMarca({ ancho: 500, alto: 100, colores: coloresTexto })
  await guardar('06_horizontal_sobre_blanco', await lienzo({ ...tam, fondo: '#FFFFFF', piezas: [{ input: icono, left: 30, top: 44 }, { input: texto, left: 30 + anchoIcono + 40, top: 110 }] }), tam)
}

console.log('Logos generados.')
