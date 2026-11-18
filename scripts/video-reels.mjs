// Divisor de Reels: del video final del día saca 4–5 piezas verticales (1080×1920) con subtítulos.
// Cada Reel es una noticia completa (toma a cámara + voz) del video largo.
// Uso: node scripts/video-reels.mjs <proyecto|carpeta> [--bloques b1,b3] [--max 5]
// Requiere videos/diario/<proyecto>/renders/final.mp4 (se genera con «Renderizar» en el estudio).
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, isAbsolute } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { atribucionDe } from './video-musica.mjs'

const ejecutar = promisify(execFile)
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SITIO = 'https://www.pont3la10.com'
export const LIMITES = { minimo: 20, maximo: 75, ideal: [35, 60], maximoReels: 5 }
const redondear = valor => Math.round(valor * 100) / 100

// Elige las noticias que mejor funcionan como Reel: duración entre 20 y 75 s, con dato o marcador,
// sin rumores y de clubes distintos. Devuelve ids de bloque en el orden del video.
export function elegirBloques(manifiesto, guion, { max = LIMITES.maximoReels, forzar = [] } = {}) {
  const segmentos = manifiesto?.segmentos || []
  const candidatos = []
  for (const [orden, bloque] of (guion?.bloques || []).entries()) {
    const cara = segmentos.find(s => s.id === `${bloque.id}-cara`)
    const voz = segmentos.find(s => s.id === `${bloque.id}-voz`)
    if (!cara || !voz) continue
    const duracion = redondear(voz.fin - cara.inicio)
    if (forzar.length) { if (forzar.includes(bloque.id)) candidatos.push({ bloque, orden, cara, voz, duracion, puntaje: 0 }); continue }
    if (duracion < LIMITES.minimo || duracion > LIMITES.maximo) continue
    const puntaje = (bloque.marcador ? 2 : 0) + (bloque.dato ? 2 : 0) + (bloque.rumor ? 0 : 1) + (duracion >= LIMITES.ideal[0] && duracion <= LIMITES.ideal[1] ? 1 : 0)
    candidatos.push({ bloque, orden, cara, voz, duracion, puntaje })
  }
  if (forzar.length) return candidatos.sort((a, b) => a.orden - b.orden)
  const porPuntaje = candidatos.slice().sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden)
  const elegidos = []
  const clubes = new Set()
  for (const candidato of porPuntaje) { // primero uno por club
    const club = String(candidato.bloque.club || candidato.bloque.id)
    if (clubes.has(club)) continue
    clubes.add(club)
    elegidos.push(candidato)
    if (elegidos.length >= max) break
  }
  for (const candidato of porPuntaje) { // si faltan, se completa con repetidos
    if (elegidos.length >= max) break
    if (!elegidos.includes(candidato)) elegidos.push(candidato)
  }
  return elegidos.sort((a, b) => a.orden - b.orden)
}

// Agrupa palabras en bloques de subtítulo cortos (máx. 3 palabras o 1,6 s) que no cruzan una pausa larga.
export function agruparPalabras(palabras, { maxPalabras = 3, maxSegundos = 1.6 } = {}) {
  const grupos = []
  let actual = []
  for (const palabra of palabras) {
    const anterior = actual.at(-1)
    const corta = anterior && (palabra.inicio - anterior.fin > 0.6 || /[.?!]$/.test(anterior.texto))
    if (actual.length && (actual.length >= maxPalabras || palabra.fin - actual[0].inicio > maxSegundos || corta)) { grupos.push(actual); actual = [] }
    actual.push(palabra)
  }
  if (actual.length) grupos.push(actual)
  return grupos
}

const escaparAss = texto => String(texto).replace(/[{}\\]/g, '').replace(/\r?\n/g, ' ')
const tiempoAss = s => {
  const cs = Math.round(Math.max(0, s) * 100)
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, '0')}:${String(Math.floor(cs / 100) % 60).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`
}

// Subtítulos estilo Reels: texto grande abajo con la palabra que se dice en amarillo, y la etiqueta del club arriba.
export function construirAss(palabras, { etiqueta = '', duracion = 0 } = {}) {
  const encabezado = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Arial Black,84,&H00FFFFFF,&H00FFFFFF,&H00200808,&H80000000,0,0,0,0,100,100,0,0,1,8,3,2,60,60,430,1
Style: Etiqueta,Arial Black,50,&H00502008,&H00FFFFFF,&H0000D8FF,&H0000D8FF,0,0,0,0,100,100,2,0,3,16,0,8,60,60,330,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
  const lineas = []
  if (etiqueta) lineas.push(`Dialogue: 0,${tiempoAss(0)},${tiempoAss(duracion || (palabras.at(-1)?.fin ?? 5) + 1)},Etiqueta,,0,0,0,,${escaparAss(String(etiqueta).toUpperCase())}`)
  const siguiente = new Map(palabras.map((p, i) => [p, palabras[i + 1]]))
  for (const grupo of agruparPalabras(palabras)) {
    grupo.forEach((palabra, i) => {
      const inicio = palabra.inicio
      // Cada subtítulo termina antes de que empiece el siguiente: nunca se ven dos a la vez.
      const proxima = siguiente.get(palabra)
      const natural = i === grupo.length - 1 ? Math.max(palabra.fin, palabra.inicio + 0.25) : grupo[i + 1].inicio
      if (proxima && proxima.inicio <= inicio + 0.01) return // el siguiente empieza a la vez: este no llega a verse
      const fin = proxima ? Math.min(natural, proxima.inicio) : natural
      const texto = grupo.map((p, j) => (j === i ? `{\\c&H0000D8FF&}${escaparAss(p.texto.toUpperCase())}{\\c&HFFFFFF&}` : escaparAss(p.texto.toUpperCase()))).join(' ')
      lineas.push(`Dialogue: 1,${tiempoAss(inicio)},${tiempoAss(fin)},Sub,,0,0,0,,${texto}`)
    })
  }
  return encabezado + lineas.join('\n') + '\n'
}

export function descripcionReel({ titular, resumen, slug, credito, musica }) {
  const partes = [String(titular || '').trim()]
  if (resumen) partes.push(String(resumen).trim())
  partes.push(`Nota completa: ${SITIO}/articulos/${slug}`)
  if (credito) partes.push(`Foto: ${credito}`)
  if (musica) partes.push(musica)
  partes.push('#FutbolColombiano #LigaBetPlay #Pont3la10')
  return partes.filter(Boolean).join('\n\n').slice(0, 2200)
}

async function datosArticulo(slug) {
  try {
    const articulo = await (await fetch(`${SITIO}/api/articulos/${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(20_000) })).json()
    return { titular: articulo.tituloPortada || articulo.titulo, resumen: articulo.resumen, credito: articulo.portada?.credito }
  } catch { return {} }
}

async function transcribir(audio, salida) {
  await ejecutar('python', [join(RAIZ, 'scripts', 'video-transcribir.py'), audio, salida], { maxBuffer: 10 * 1024 * 1024, timeout: 15 * 60_000 })
  return JSON.parse(await readFile(salida, 'utf8'))
}

export async function crearReels({ carpeta, bloques = [], max = LIMITES.maximoReels, avisar = () => {} }) {
  const final = join(carpeta, 'renders', 'final.mp4')
  if (!existsSync(final)) throw Object.assign(new Error('Primero renderiza el video final.'), { estado: 409 })
  const manifiesto = JSON.parse(await readFile(join(carpeta, 'manifiesto.json'), 'utf8'))
  const guion = JSON.parse(await readFile(join(carpeta, 'guion.json'), 'utf8'))
  const elegidos = elegirBloques(manifiesto, guion, { max, forzar: bloques })
  if (!elegidos.length) throw Object.assign(new Error('Ninguna noticia sirve como Reel (duran entre 20 y 75 s).'), { estado: 422 })
  const salida = join(carpeta, 'renders', 'reels')
  const trabajo = join(salida, '.trabajo')
  await mkdir(trabajo, { recursive: true })
  const logo = join(carpeta, 'assets', 'logo-blanco.png')
  const estudio = existsSync(join(carpeta, 'estudio.json')) ? JSON.parse(await readFile(join(carpeta, 'estudio.json'), 'utf8')) : {}
  const musica = await atribucionDe(estudio.musica)
  const resultado = []
  for (const [n, { bloque, cara, duracion }] of elegidos.entries()) {
    avisar(`Reel ${n + 1} de ${elegidos.length}: ${bloque.club || bloque.id}`)
    const audio = join(trabajo, `${bloque.id}.wav`)
    await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(cara.inicio), '-t', String(duracion), '-i', final, '-vn', '-ac', '1', '-ar', '16000', audio])
    const palabras = await transcribir(audio, join(trabajo, `${bloque.id}.json`))
    await writeFile(join(trabajo, `${bloque.id}.ass`), construirAss(palabras, { etiqueta: bloque.club || '', duracion }))
    const archivo = `reel-${n + 1}-${bloque.id}.mp4`
    const filtro = [
      '[0:v]split=2[a][b]',
      '[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:6,eq=brightness=-0.18[fondo]',
      '[b]scale=1080:608[frente]',
      '[fondo][frente]overlay=0:(H-h)/2-70[v1]',
      '[1:v]scale=320:-1[logo]',
      '[v1][logo]overlay=(W-w)/2:150[v2]',
      `[v2]ass=${bloque.id}.ass[v]`
    ].join(';')
    // ffmpeg corre dentro de la carpeta de trabajo para que el filtro ass use una ruta simple (sin «C:\»).
    await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(cara.inicio), '-t', String(duracion), '-i', final, '-i', logo, '-filter_complex', filtro, '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', join('..', archivo)], { cwd: trabajo, maxBuffer: 10 * 1024 * 1024 })
    const articulo = bloque.articuloSlug ? await datosArticulo(bloque.articuloSlug) : {}
    resultado.push({ id: bloque.id, archivo: `renders/reels/${archivo}`, duracion: redondear(duracion), club: bloque.club || '', descripcion: descripcionReel({ ...articulo, slug: bloque.articuloSlug, musica }), articulo: bloque.articuloSlug || '' })
  }
  await writeFile(join(salida, 'reels.json'), JSON.stringify({ creado: new Date().toISOString(), reels: resultado }, null, 2))
  await rm(trabajo, { recursive: true, force: true })
  return resultado
}

async function main() {
  const args = process.argv.slice(2)
  const entrada = args.find(a => !a.startsWith('--'))
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : undefined }
  if (!entrada) { process.stderr.write('Uso: node scripts/video-reels.mjs <proyecto|carpeta> [--bloques b1,b3] [--max 5]\n'); process.exit(2) }
  const carpeta = isAbsolute(entrada) || entrada.includes('/') || entrada.includes('\\') ? resolve(entrada) : join(RAIZ, 'videos', 'diario', entrada)
  const reels = await crearReels({ carpeta, bloques: (valor('--bloques') || '').split(',').filter(Boolean), max: Number(valor('--max') || LIMITES.maximoReels), avisar: texto => process.stdout.write(`${texto}\n`) })
  process.stdout.write(`${reels.length} Reels en ${join(carpeta, 'renders', 'reels')}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
