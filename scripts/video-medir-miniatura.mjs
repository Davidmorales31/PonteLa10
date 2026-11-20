// Mide una miniatura con las mismas definiciones que se usaron para estudiar a La Gambeta y a Cracks
// (config/miniaturasReferencia.json) y dice si cae dentro de lo que funciona en ese tipo de canal.
//   node scripts/video-medir-miniatura.mjs <imagen.jpg> [más imágenes…]
import { readFile, stat } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'

const REFERENCIA = JSON.parse(readFileSync(fileURLToPath(new URL('../config/miniaturasReferencia.json', import.meta.url)), 'utf8'))

/** HSV de un píxel RGB (0–255): tono en grados, saturación y valor 0–1. */
function hsv(r, g, b) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const d = max - min
  let h = 0
  if (d > 1e-6) {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    if (max === rn) h = (((gn - bn) / d) % 6 + 6) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
  }
  return { h, s: max > 0 ? d / max : 0, v: max }
}

/** Métricas de una imagen (buffer). Se mide siempre sobre una copia de 320×180, como en el estudio de referencia. */
export async function medirMiniatura(buffer, { peso = buffer.length } = {}) {
  const meta = await sharp(buffer).metadata()
  const { data } = await sharp(buffer).removeAlpha().resize(320, 180, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  const ancho = 320
  const alto = 180
  const n = ancho * alto
  const lum = new Float64Array(n)
  let sumaLum = 0
  let sumaSat = 0
  let oscuros = 0
  let blancos = 0
  let amarillos = 0
  let rojos = 0
  let azules = 0
  for (let i = 0; i < n; i++) {
    const r = data[i * 3]
    const g = data[i * 3 + 1]
    const b = data[i * 3 + 2]
    const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    lum[i] = l
    sumaLum += l
    const { h, s, v } = hsv(r, g, b)
    sumaSat += s
    if (v < 0.15) oscuros++
    if (s < 0.12 && v > 0.9) blancos++
    if (h >= 45 && h <= 65 && s > 0.6 && v > 0.7) amarillos++
    if ((h < 12 || h > 345) && s > 0.6 && v > 0.5) rojos++
    if (h > 190 && h < 260 && s > 0.4 && v > 0.3) azules++
  }
  const media = sumaLum / n
  let varianza = 0
  for (let i = 0; i < n; i++) varianza += (lum[i] - media) ** 2
  let bordes = 0
  for (let y = 0; y < alto - 1; y++) {
    for (let x = 0; x < ancho - 1; x++) {
      const gx = Math.abs(lum[y * ancho + x + 1] - lum[y * ancho + x])
      const gy = Math.abs(lum[(y + 1) * ancho + x] - lum[y * ancho + x])
      if (gx + gy > 0.25) bordes++
    }
  }
  const r3 = x => Math.round(x * 1000) / 1000
  return {
    ancho: meta.width || 0,
    alto: meta.height || 0,
    pesoKb: Math.round(peso / 1024),
    luminancia: r3(media),
    contraste: r3(Math.sqrt(varianza / n)),
    saturacion: r3(sumaSat / n),
    oscuros: r3(oscuros / n),
    blancos: r3(blancos / n),
    amarillos: r3(amarillos / n),
    rojos: r3(rojos / n),
    azules: r3(azules / n),
    bordes: r3(bordes / ((ancho - 1) * (alto - 1)))
  }
}

const AYUDAS = {
  luminancia: ['muy oscura: sube la luz y aclara el fondo', 'muy clara o lavada: baja el brillo del fondo'],
  contraste: ['plana: oscurece las sombras y aclara los textos', 'demasiado dura: suaviza los extremos'],
  saturacion: ['apagada: sube la saturación de las fotos y los acentos', 'chillona: baja la saturación del fondo'],
  oscuros: ['sin negros: añade contorno y sombra al texto y a los sujetos', 'demasiado negro: aclara las zonas muertas'],
  bordes: ['vacía: agrega un sujeto más grande o un segundo elemento', 'saturada de detalle: quita elementos pequeños'],
  blancos: ['sin blancos: el texto o las camisetas no destacan', 'demasiado blanco: se ve lavada'],
  amarillos: ['sin acento: usa amarillo en una palabra', 'demasiado amarillo: reserva el acento a una línea']
}

/** Compara las métricas con los rangos de referencia. Devuelve cada criterio con su estado y una sugerencia. */
export function evaluarMiniatura(m, referencia = REFERENCIA) {
  const criterios = []
  const { ancho, alto, pesoMaxKb } = referencia.lienzo
  criterios.push({ criterio: 'tamaño', valor: `${m.ancho}×${m.alto}`, ok: m.ancho === ancho && m.alto === alto, ayuda: `debe ser ${ancho}×${alto}` })
  criterios.push({ criterio: 'peso', valor: `${m.pesoKb} KB`, ok: m.pesoKb > 0 && m.pesoKb <= pesoMaxKb, ayuda: `debe pesar menos de ${pesoMaxKb} KB` })
  for (const [nombre, def] of Object.entries(referencia.automaticas)) {
    const valor = m[nombre]
    const [min, max] = def.rango
    const ok = valor >= min && valor <= max
    criterios.push({ criterio: nombre, valor, rango: def.rango, ok, ayuda: ok ? '' : AYUDAS[nombre][valor < min ? 0 : 1] })
  }
  return { ok: criterios.every(c => c.ok), criterios }
}

async function principal(archivos) {
  if (!archivos.length) { console.error('Uso: node scripts/video-medir-miniatura.mjs <imagen.jpg> [más…]'); process.exitCode = 2; return }
  let todas = true
  for (const archivo of archivos) {
    const buffer = await readFile(archivo)
    const m = await medirMiniatura(buffer, { peso: (await stat(archivo)).size })
    const e = evaluarMiniatura(m)
    todas = todas && e.ok
    console.log(`\n${archivo} — ${e.ok ? 'DENTRO de lo medido' : 'REVISAR'}`)
    for (const c of e.criterios) console.log(`  ${c.ok ? 'ok ' : 'NO '} ${c.criterio.padEnd(11)} ${String(c.valor).padEnd(10)} ${c.rango ? `(${c.rango[0]}–${c.rango[1]})` : ''} ${c.ayuda}`)
  }
  if (!todas) process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await principal(process.argv.slice(2))
