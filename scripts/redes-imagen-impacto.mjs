// Portada de impacto para redes (estilo «una palabra gigante»): recorte del protagonista, palabra del titular en Anton,
// línea fina, subtítulo y logo, en 1080×1350. Todo local: sharp + opentype.js + rembg (Python). No usa agentes ni modelos
// de lenguaje.  Uso: node scripts/redes-imagen-impacto.mjs <slug> [--salida <carpeta>]
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import opentype from 'opentype.js'
import sharp from 'sharp'

const ejecutar = promisify(execFile)
export const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SITIO = 'https://www.pont3la10.com'
export const LIENZO = { ancho: 1080, alto: 1350 }
export const AZUL = '#08204a'
export const AMARILLO = '#ffd800'

// Palabras fuertes que suelen resumir una noticia de fútbol. Se prefiere la primera que aparezca en el titular.
// Más arriba = más fuerte: gana la palabra del titular que esté primero en esta lista, no la primera que aparezca en la frase.
const LEXICO = ['adiós', 'fuera', 'histórico', 'histórica', 'goleada', 'golpe', 'bomba', 'crisis', 'polémica', 'sorpresa', 'descenso', 'descienden', 'eliminado',
  'campeón', 'despide', 'expulsado', 'lesión', 'tragedia', 'milagro', 'remontada', 'récord', 'regresa', 'vuelve', 'renueva', 'fichaje', 'oficial', 'denuncia',
  'exige', 'compra', 'vende', 'clasifica', 'derrota', 'victoria', 'gana', 'pierde', 'penal', 'salvado', 'sueño', 'ilusión', 'cierra']
const NEXOS = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'al', 'y', 'o', 'en', 'con', 'por', 'para', 'que', 'se', 'su', 'sus', 'a', 'ante', 'tras', 'sobre', 'entre', 'como', 'más', 'pide', 'queda'])

const sinTildes = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Una o dos palabras en mayúsculas que resuman el titular (para la palabra gigante). */
export function palabraDeImpacto(titular) {
  const palabras = String(titular || '').replace(/[«»"“”.,;:!?¡¿()]/g, ' ').split(/\s+/).filter(Boolean)
  const prioridad = p => LEXICO.findIndex(l => sinTildes(l) === sinTildes(p))
  const fuertes = palabras.filter(p => prioridad(p) >= 0).sort((a, b) => prioridad(a) - prioridad(b))
  if (fuertes.length) return fuertes[0].toUpperCase()
  const util = palabras.filter(p => !NEXOS.has(sinTildes(p)) && p.length >= 5)
  return (util[0] || palabras[0] || '').toUpperCase()
}

export function envolver(fuente, texto, medida, maximo) {
  const lineas = [[]]
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const prueba = [...lineas.at(-1), palabra].join(' ')
    if (lineas.at(-1).length && fuente.getAdvanceWidth(prueba, medida) > maximo) lineas.push([palabra])
    else lineas.at(-1).push(palabra)
  }
  return lineas.map(l => l.join(' '))
}

/** SVG (texto como trazados) con la capa de tipografía de la pieza. */
export function capaTexto({ palabra, subtitulo, anton, montserrat }) {
  const { ancho } = LIENZO
  let medida = 300
  while (medida > 120 && anton.getAdvanceWidth(palabra, medida) > ancho * .9) medida -= 6
  const anchoPalabra = anton.getAdvanceWidth(palabra, medida)
  const yPalabra = 1160
  const trazos = [`<path fill="#ffffff" d="${anton.getPath(palabra, (ancho - anchoPalabra) / 2, yPalabra, medida).toPathData(2)}"/>`]
  trazos.push(`<rect x="${ancho / 2 - 160}" y="${yPalabra + 28}" width="320" height="4" rx="2" fill="#ffffff"/>`)
  const lineas = envolver(montserrat, subtitulo.toUpperCase(), 30, ancho * .84).slice(0, 2)
  lineas.forEach((linea, i) => {
    const w = montserrat.getAdvanceWidth(linea, 30)
    trazos.push(`<path fill="${AMARILLO}" d="${montserrat.getPath(linea, (ancho - w) / 2, yPalabra + 78 + i * 40, 30).toPathData(2)}"/>`)
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LIENZO.ancho}" height="${LIENZO.alto}">${trazos.join('')}</svg>`
}

/** Color de las sombras y del fondo neutro: casi negro (sin tono de marca). */
export const SOMBRA = '#05070a'
/** Salida JPG de todas las piezas: calidad alta y color sin submuestreo, para que el texto y los bordes se vean limpios. */
export const JPG = { quality: 95, chromaSubsampling: '4:4:4' }

/**
 * Mejora de nitidez («HD») de la foto antes de ponerla en la pieza (decisión del responsable, 2026-11-22). No inventa
 * detalle: reescala con Lanczos3 al tamaño exacto en que se verá (así casi nunca se amplía) y aplica un enfoque suave
 * que recupera el borde que se pierde con la compresión de las fuentes. Devuelve un PNG sin pérdida.
 */
export async function mejorarFoto(original, anchoDestino) {
  const meta = await sharp(original).metadata()
  const ancho = (meta.orientation || 1) >= 5 ? meta.height : meta.width
  const ampliando = anchoDestino > (ancho || anchoDestino) * 1.05
  return sharp(original).rotate().resize({ width: anchoDestino, kernel: 'lanczos3' })
    .sharpen(ampliando ? { sigma: 1.3, m1: 1, m2: 2.5 } : { sigma: 0.8, m1: 0.6, m2: 1.4 })
    .png().toBuffer({ resolveWithObject: true })
}

/**
 * Lienzo neutro con la foto COMPLETA (sin recortar, sin desenfocar), centrada dentro de la franja [arriba, arriba + alto].
 * Sin foto, solo el fondo neutro. Devuelve un PNG (la pieza final se guarda en JPG una sola vez).
 */
export async function fotoSobreNegro(original, { arriba = 130, alto = 800, margen = 0, fondo = SOMBRA } = {}) {
  const { ancho, alto: altoLienzo } = LIENZO
  const lienzo = sharp({ create: { width: ancho, height: altoLienzo, channels: 3, background: fondo } })
  if (!original) return lienzo.png().toBuffer()
  const meta = await sharp(original).metadata()
  const [w, h] = (meta.orientation || 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height]
  const escala = Math.min((ancho - margen * 2) / w, alto / h)
  const foto = await mejorarFoto(original, Math.max(1, Math.round(w * escala)))
  return lienzo.composite([{ input: foto.data, left: Math.round((ancho - foto.info.width) / 2), top: Math.round(arriba + (alto - foto.info.height) / 2) }]).png().toBuffer()
}

/** Portada de impacto: la foto completa y nítida, la palabra gigante del titular debajo, línea fina, subtítulo y logo. Devuelve un JPG. */
export async function componerImpacto({ recorte, palabra, subtitulo, logo, original = null, fondo: fondoPropio }) {
  const { ancho, alto } = LIENZO
  const anton = opentype.loadSync(join(RAIZ, 'public/fonts/Anton-Regular.ttf'))
  const montserrat = opentype.loadSync(join(RAIZ, 'public/fonts/Montserrat-Bold.ttf'))
  const fondo = fondoPropio || await fotoSobreNegro(original ?? recorte, { arriba: 130, alto: 800 })
  const sombra = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stop-color="${SOMBRA}" stop-opacity="0"/><stop offset=".85" stop-color="${SOMBRA}" stop-opacity=".85"/><stop offset="1" stop-color="${SOMBRA}"/></linearGradient></defs><rect width="${ancho}" height="${alto}" fill="url(#s)"/></svg>`)
  const marca = logo ? await sharp(logo).resize({ width: 230 }).toBuffer() : null
  const capas = [
    { input: sombra, left: 0, top: 0 },
    { input: Buffer.from(capaTexto({ palabra, subtitulo, anton, montserrat })), left: 0, top: 0 }
  ]
  if (marca) capas.push({ input: marca, left: Math.round((ancho - 230) / 2), top: 44 })
  return sharp(fondo).composite(capas).jpeg(JPG).toBuffer()
}

export async function recortar(urlImagen, carpeta, nombre) {
  const respuesta = await fetch(urlImagen, { signal: AbortSignal.timeout(30_000) })
  if (!respuesta.ok) throw new Error(`No se pudo descargar la portada (HTTP ${respuesta.status}).`)
  const original = join(carpeta, `${nombre}-original.jpg`)
  await writeFile(original, await sharp(Buffer.from(await respuesta.arrayBuffer())).jpeg({ quality: 92 }).toBuffer())
  const salida = join(carpeta, `${nombre}-recorte.png`)
  await ejecutar('python', [join(RAIZ, 'scripts/redes_recortar.py'), original, salida], { timeout: 300_000 })
  return readFile(salida)
}

export async function imagenImpactoDeArticulo(slug, carpeta) {
  const articulo = await (await fetch(`${SITIO}/api/articulos/${encodeURIComponent(slug)}`)).json()
  const titular = String(articulo.tituloPortada || articulo.titulo || '').trim()
  const url = articulo.portada?.url
  if (!titular || !url) throw new Error('La nota no tiene titular o portada.')
  await mkdir(carpeta, { recursive: true })
  await recortar(url, carpeta, slug.slice(0, 40))
  const original = await readFile(join(carpeta, `${slug.slice(0, 40)}-original.jpg`))
  const jpg = await componerImpacto({ original, palabra: palabraDeImpacto(titular), subtitulo: titular, logo: join(RAIZ, 'public/brand/pont3la10_logo_login_blanco.png') })
  const ruta = join(carpeta, `${slug.slice(0, 40)}-impacto.jpg`)
  await writeFile(ruta, jpg)
  return { ruta, palabra: palabraDeImpacto(titular), titular }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  const slug = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--salida')
  const i = args.indexOf('--salida')
  const carpeta = resolve(i >= 0 ? args[i + 1] : join(tmpdir(), 'pont3la10-redes'))
  if (!slug) { process.stderr.write('Uso: node scripts/redes-imagen-impacto.mjs <slug> [--salida <carpeta>]\n'); process.exit(2) }
  const r = await imagenImpactoDeArticulo(slug, carpeta)
  process.stdout.write(`${r.ruta}\nPalabra: ${r.palabra}\n`)
}
