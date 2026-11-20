// Formatos visuales de las publicaciones de imagen (estudio de Cracks y La Gambeta, docs/ESTUDIO_FORMATOS_REDES_COMPETENCIA.md).
// Todos en 1080×1350, locales (sharp + opentype.js + rembg), sin agentes. Cada formato recibe fotos ya descargadas (Buffers).
//   node scripts/redes-formatos.mjs <slug> [--contra <otro-slug>] [--formato id|todos] [--salida <carpeta>]
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import opentype from 'opentype.js'
import sharp from 'sharp'
import { AMARILLO, AZUL, LIENZO, RAIZ, componerImpacto, envolver, palabraDeImpacto, recortar } from './redes-imagen-impacto.mjs'

const { ancho: W, alto: H } = LIENZO
const BLANCO = '#ffffff'

export function cargarFuentes() {
  return {
    anton: opentype.loadSync(join(RAIZ, 'public/fonts/Anton-Regular.ttf')),
    mont: opentype.loadSync(join(RAIZ, 'public/fonts/Montserrat-Bold.ttf'))
  }
}

/** Trazados SVG de un texto centrado (o alineado) en x, con base en y. */
export function trazo(fuente, texto, { x, y, medida, color = BLANCO, ancla = 'centro', opacidad = 1 }) {
  const w = fuente.getAdvanceWidth(texto, medida)
  const x0 = ancla === 'centro' ? x - w / 2 : ancla === 'derecha' ? x - w : x
  return `<path fill="${color}" fill-opacity="${opacidad}" d="${fuente.getPath(texto, x0, y, medida).toPathData(2)}"/>`
}

const svg = (contenido, defs = '') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs>${contenido}</svg>`)
const cubrir = (buffer, w = W, h = H, posicion = 'attention') => sharp(buffer).resize(w, h, { fit: 'cover', position: posicion })
const degradadoAbajo = (desde = .45, opacidad = .92) => svg(`<rect width="${W}" height="${H}" fill="url(#g)"/>`,
  `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="${desde}" stop-color="#041229" stop-opacity="0"/><stop offset=".85" stop-color="#041229" stop-opacity="${opacidad}"/><stop offset="1" stop-color="#041229"/></linearGradient>`)

async function logoArriba(logo, capas, izquierda = Math.round((W - 230) / 2), arriba = 44) {
  if (!logo) return
  capas.push({ input: await sharp(logo).resize({ width: 230 }).toBuffer(), left: izquierda, top: arriba })
}

/** Formato 2: igual que la portada de impacto, pero con la foto real de fondo desenfocada y oscurecida. */
export async function componerImpactoDesenfocado({ original, recorte, palabra, subtitulo, logo }) {
  const fondo = await cubrir(original).blur(22).modulate({ brightness: .62, saturation: 1.25 }).toBuffer()
  const base = await componerImpacto({ recorte, palabra, subtitulo, logo, fondo })
  return base
}

/** Formato 3: cita. Foto de fondo, comillas grandes, frase y autor. */
export async function componerCita({ original, cita, autor, logo }) {
  const { anton, mont } = cargarFuentes()
  const lineas = envolver(anton, cita, 74, W * .82).slice(0, 6)
  const alto = lineas.length * 92
  const y0 = 1130 - alto
  const t = [trazo(anton, '“', { x: W / 2, y: y0 - 40, medida: 330, color: AMARILLO })]
  lineas.forEach((l, i) => t.push(trazo(anton, l, { x: W / 2, y: y0 + i * 92 + 70, medida: 74 })))
  if (autor) t.push(trazo(mont, autor.toUpperCase(), { x: W / 2, y: 1190, medida: 30, color: AMARILLO }))
  const capas = [{ input: await degradadoAbajo(.3, .95), left: 0, top: 0 }, { input: svg(t.join('')), left: 0, top: 0 }]
  await logoArriba(logo, capas)
  return cubrir(original).composite(capas).jpeg({ quality: 90 }).toBuffer()
}

/** Formato 4: versus. Dos fotos, «VS» al centro y los nombres abajo. */
export async function componerVersus({ fotoA, fotoB, nombreA, nombreB, titulo, logo }) {
  const { anton } = cargarFuentes()
  const mitad = Math.round(W / 2) - 3
  const [a, b] = await Promise.all([cubrir(fotoA, mitad, H).toBuffer(), cubrir(fotoB, mitad, H).toBuffer()])
  const t = [
    `<rect x="${mitad}" y="0" width="6" height="${H}" fill="${BLANCO}"/>`,
    `<circle cx="${W / 2}" cy="560" r="100" fill="${AMARILLO}" stroke="${AZUL}" stroke-width="8"/>`,
    trazo(anton, 'VS', { x: W / 2, y: 602, medida: 130, color: AZUL }),
    trazo(anton, nombreA.toUpperCase(), { x: mitad / 2, y: 1130, medida: 84 }),
    trazo(anton, nombreB.toUpperCase(), { x: mitad + 6 + mitad / 2, y: 1130, medida: 84 })
  ]
  if (titulo) {
    t.push(`<rect x="0" y="1190" width="${W}" height="110" fill="${AMARILLO}"/>`, trazo(anton, titulo.toUpperCase(), { x: W / 2, y: 1272, medida: 84, color: AZUL }))
  }
  const capas = [{ input: a, left: 0, top: 0 }, { input: b, left: mitad + 6, top: 0 }, { input: await degradadoAbajo(.55, .9), left: 0, top: 0 }, { input: svg(t.join('')), left: 0, top: 0 }]
  await logoArriba(logo, capas)
  return sharp({ create: { width: W, height: H, channels: 3, background: AZUL } }).composite(capas).jpeg({ quality: 90 }).toBuffer()
}

/** Formato 5: ficha con cifra grande (el «Tchouameni 2032» de Cracks). */
export async function componerFicha({ original, nombre, concepto, cifra, logo }) {
  const { anton, mont } = cargarFuentes()
  const t = [
    `<rect x="70" y="1085" width="5" height="120" fill="${BLANCO}"/>`,
    trazo(mont, nombre, { x: 100, y: 1135, medida: 54, ancla: 'izquierda' }),
    trazo(mont, concepto.toUpperCase(), { x: 100, y: 1190, medida: 26, ancla: 'izquierda', opacidad: .75 })
  ]
  let medida = 400
  while (medida > 150 && anton.getAdvanceWidth(cifra, medida) > W * .5) medida -= 10
  t.push(trazo(anton, cifra, { x: W - 60, y: 1190, medida, ancla: 'derecha', color: AMARILLO }))
  const capas = [{ input: await degradadoAbajo(.5, .95), left: 0, top: 0 }, { input: svg(t.join('')), left: 0, top: 0 }]
  await logoArriba(logo, capas)
  return cubrir(original).composite(capas).jpeg({ quality: 90 }).toBuffer()
}

/** Formato 6: contexto con círculo. La portada de impacto más una segunda foto en un círculo con borde blanco. */
export async function componerContextoCirculo({ original, recorte, circulo, palabra, subtitulo, logo }) {
  const d = 360
  const foto = await cubrir(circulo, d, d).composite([{ input: Buffer.from(`<svg width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}"/></svg>`), blend: 'dest-in' }]).png().toBuffer()
  const anillo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${d + 20}" height="${d + 20}"><circle cx="${(d + 20) / 2}" cy="${(d + 20) / 2}" r="${d / 2 + 4}" fill="none" stroke="#fff" stroke-width="12"/></svg>`)
  const base = await componerImpactoDesenfocado({ original, recorte, palabra, subtitulo, logo })
  return sharp(base).composite([{ input: foto, left: 60, top: 150 }, { input: anillo, left: 50, top: 140 }]).jpeg({ quality: 90 }).toBuffer()
}

/** Formato 7: foto a toda la imagen, titular en Anton arriba a la izquierda y banda amarilla con el subtítulo (estilo La Gambeta). */
export async function componerBanda({ original, titular, subtitulo, logo }) {
  const { anton, mont } = cargarFuentes()
  const lineas = envolver(anton, titular.toUpperCase(), 104, W * .88).slice(0, 4)
  const t = lineas.map((l, i) => trazo(anton, l, { x: 60, y: 1135 - (lineas.length - 1 - i) * 112, medida: 104, ancla: 'izquierda', color: i === lineas.length - 1 ? AMARILLO : BLANCO }))
  t.push(`<rect x="0" y="1170" width="${W}" height="140" fill="${AMARILLO}"/>`)
  envolver(mont, corto(subtitulo, 86).toUpperCase(), 30, W * .9).slice(0, 2).forEach((l, i) => t.push(trazo(mont, l, { x: W / 2, y: 1228 + i * 42, medida: 30, color: AZUL })))
  const capas = [{ input: await degradadoAbajo(.3, .92), left: 0, top: 0 }, { input: svg(t.join('')), left: 0, top: 0 }]
  await logoArriba(logo, capas, W - 290)
  return cubrir(original).composite(capas).jpeg({ quality: 90 }).toBuffer()
}

/** Recorta en el límite de una palabra y añade «…» si hizo falta. */
export function corto(texto, maximo) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim()
  if (limpio.length <= maximo) return limpio
  return `${limpio.slice(0, maximo).replace(/\s+\S*$/, '')}…`
}

/** Formato 8: carrusel de tres diapositivas: portada con «DESLIZA», puntos clave y cierre con pregunta. */
export async function componerCarrusel({ original, recorte, palabra, subtitulo, puntos, pregunta, logo }) {
  const { anton, mont } = cargarFuentes()
  const portada = await componerImpactoDesenfocado({ original, recorte, palabra, subtitulo, logo })
  const marca = svg(`${trazo(mont, 'DESLIZA  ›››', { x: W / 2, y: 1318, medida: 34, color: AMARILLO })}`)
  const s1 = await sharp(portada).composite([{ input: marca, left: 0, top: 0 }]).jpeg({ quality: 90 }).toBuffer()
  const filas = []
  puntos.slice(0, 3).forEach((p, i) => {
    const y = 330 + i * 290
    filas.push(trazo(anton, String(i + 1), { x: 130, y: y + 100, medida: 200, color: AMARILLO }))
    envolver(mont, p, 40, W * .62).slice(0, 4).forEach((l, j) => filas.push(trazo(mont, l, { x: 250, y: y + 40 + j * 54, medida: 40, ancla: 'izquierda' })))
    if (i < 2) filas.push(`<rect x="70" y="${y + 215}" width="940" height="3" fill="${BLANCO}" fill-opacity=".25"/>`)
  })
  filas.unshift(trazo(anton, 'LO QUE DEBES SABER', { x: W / 2, y: 230, medida: 100 }))
  const capas2 = [{ input: svg(filas.join('')), left: 0, top: 0 }]
  await logoArriba(logo, capas2)
  const s2 = await sharp({ create: { width: W, height: H, channels: 3, background: AZUL } }).composite(capas2).jpeg({ quality: 90 }).toBuffer()
  const q = envolver(anton, pregunta.toUpperCase(), 100, W * .84).slice(0, 5)
  const cierre = q.map((l, i) => trazo(anton, l, { x: W / 2, y: 520 + i * 125, medida: 100 }))
  cierre.push(trazo(mont, 'COMENTA TU OPINIÓN', { x: W / 2, y: 520 + q.length * 125 + 50, medida: 38, color: AMARILLO }))
  cierre.push(trazo(mont, 'NOTA COMPLETA EN PONT3LA10.COM', { x: W / 2, y: 1240, medida: 30, color: BLANCO, opacidad: .85 }))
  const capas3 = [{ input: svg(cierre.join('')), left: 0, top: 0 }]
  await logoArriba(logo, capas3)
  const s3 = await sharp({ create: { width: W, height: H, channels: 3, background: AZUL } }).composite(capas3).jpeg({ quality: 90 }).toBuffer()
  return [s1, s2, s3]
}

export const FORMATOS = ['impacto', 'impacto-desenfocado', 'cita', 'versus', 'ficha', 'circulo', 'banda', 'carrusel']

/** Primera cita entre comillas del cuerpo de la nota (40–170 caracteres), o null. */
export function citaDeNota(articulo) {
  const textos = []
  const recorrer = nodo => { if (!nodo) return; if (typeof nodo.text === 'string') textos.push(nodo.text); (nodo.content || []).forEach(recorrer) }
  recorrer(articulo?.documento)
  const todo = textos.join(' ')
  for (const m of todo.matchAll(/[«“"]([^»”"]{40,170})[»”"]/g)) return m[1].trim()
  return null
}

/** Primera cifra destacada y las palabras que la acompañan, p. ej. «22» + «jugadores». */
export function cifraDeNota(texto) {
  const nexos = String.raw`(?!(?:el|la|los|las|un|una|de|del|al|y|o|en|con|por|para|que|se|su|sus|a|ante|tras|sobre|entre|como)\b)`
  const palabra = String.raw`[A-Za-zÁÉÍÓÚáéíóúñ]+`
  const m = String(texto || '').match(new RegExp(String.raw`(\$?\d[\d.,]*\s?(?:%|millones|mil)?)\s+${nexos}(${palabra}(?:\s+${nexos}${palabra})?)`))
  return m ? { cifra: m[1].trim(), concepto: m[2].trim() } : null
}

/** Puntos clave: las primeras oraciones del resumen y del cuerpo, cortas. */
export function puntosDeNota(articulo) {
  const textos = []
  const recorrer = nodo => { if (!nodo) return; if (typeof nodo.text === 'string') textos.push(nodo.text); (nodo.content || []).forEach(recorrer) }
  recorrer(articulo?.documento)
  const oraciones = [articulo?.resumen || '', ...textos].join(' ').split(/(?<=[.!?])\s+/).map(o => o.trim()).filter(o => o.length >= 30 && o.length <= 130)
  return [...new Set(oraciones)].slice(0, 3)
}

async function descargar(url) { return Buffer.from(await (await fetch(url, { signal: AbortSignal.timeout(30_000) })).arrayBuffer()) }

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  const valor = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
  const slug = args.find((a, i) => !a.startsWith('--') && !['--contra', '--formato', '--salida'].includes(args[i - 1]))
  const carpeta = resolve(valor('--salida') || join(tmpdir(), 'pont3la10-redes', 'formatos'))
  const elegidos = (valor('--formato') || 'todos') === 'todos' ? FORMATOS : [valor('--formato')]
  if (!slug) { process.stderr.write('Uso: node scripts/redes-formatos.mjs <slug> [--contra <slug>] [--formato id|todos] [--salida carpeta]\n'); process.exit(2) }
  await mkdir(carpeta, { recursive: true })
  const SITIO = 'https://www.pont3la10.com'
  const leer = async s => (await fetch(`${SITIO}/api/articulos/${encodeURIComponent(s)}`)).json()
  const art = await leer(slug)
  const titular = String(art.tituloPortada || art.titulo)
  const original = await descargar(art.portada.url)
  const recorte = await recortar(art.portada.url, carpeta, slug.slice(0, 30))
  const logo = join(RAIZ, 'public/brand/pont3la10_logo_login_blanco.png')
  const palabra = palabraDeImpacto(titular)
  const guardar = async (nombre, buf) => { const r = join(carpeta, `${slug.slice(0, 30)}-${nombre}.jpg`); await writeFile(r, buf); process.stdout.write(`${r}\n`) }
  for (const f of elegidos) {
    try {
      if (f === 'impacto') await guardar(f, await componerImpacto({ recorte, palabra, subtitulo: titular, logo }))
      if (f === 'impacto-desenfocado') await guardar(f, await componerImpactoDesenfocado({ original, recorte, palabra, subtitulo: titular, logo }))
      if (f === 'cita') { const c = citaDeNota(art); if (c) await guardar(f, await componerCita({ original, cita: c, autor: art.fuente?.nombre || '', logo })); else process.stdout.write('cita: la nota no trae una cita entre comillas\n') }
      if (f === 'versus') { const otro = valor('--contra'); if (otro) { const b = await leer(otro); await guardar(f, await componerVersus({ fotoA: original, fotoB: await descargar(b.portada.url), nombreA: palabra, nombreB: palabraDeImpacto(b.tituloPortada || b.titulo), titulo: 'Duelo', logo })) } else process.stdout.write('versus: usa --contra <otro-slug>\n') }
      if (f === 'ficha') { const c = cifraDeNota(`${titular} ${art.resumen}`); if (c) await guardar(f, await componerFicha({ original, nombre: art.autorNombre === 'Equipo Pont3la10' ? 'Pont3la10' : String(art.categoria || ''), concepto: c.concepto, cifra: c.cifra, logo })); else process.stdout.write('ficha: la nota no trae una cifra destacada\n') }
      if (f === 'circulo') await guardar(f, await componerContextoCirculo({ original, recorte, circulo: original, palabra, subtitulo: titular, logo }))
      if (f === 'banda') await guardar(f, await componerBanda({ original, titular: corto(titular, 60), subtitulo: String(art.resumen), logo }))
      if (f === 'carrusel') { const pts = puntosDeNota(art); const hojas = await componerCarrusel({ original, recorte, palabra, subtitulo: titular, puntos: pts, pregunta: '¿Qué opinas de esta noticia?', logo }); for (const [i, h] of hojas.entries()) await guardar(`carrusel-${i + 1}`, h) }
    } catch (e) { process.stdout.write(`${f}: ${e.message}\n`) }
  }
}
