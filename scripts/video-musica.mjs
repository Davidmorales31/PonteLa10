// Música de fondo del video diario: biblioteca con licencia verificada (config/musicaLibre.json),
// descarga bajo demanda y mezcla DESPUÉS del render, con la música bajando sola cuando hay voz.
// Uso:
//   node scripts/video-musica.mjs descargar [id]          descarga (y verifica la licencia de) una o todas las pistas
//   node scripts/video-musica.mjs mezclar <video> <id> <salida>
// El estudio ya no pide elegir música para el video largo: planMusica() asigna una canción distinta por noticia.
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const ejecutar = promisify(execFile)
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
export const CARPETA_MUSICA = join(RAIZ, 'videos', 'musica')
const LICENCIAS_PERMITIDAS = ['cc0', 'by', 'pdm']

export async function leerBiblioteca() {
  return JSON.parse(await readFile(join(RAIZ, 'config', 'musicaLibre.json'), 'utf8'))
}

export const rutaPista = id => join(CARPETA_MUSICA, `${id}.m4a`)

// Solo pistas con licencia libre para uso comercial y sin obligación de compartir igual.
export function licenciaPermitida(licencia) {
  return LICENCIAS_PERMITIDAS.includes(String(licencia || '').toLowerCase().trim())
}

// Confirma en Openverse que la licencia sigue siendo la del catálogo antes de descargar.
export async function verificarLicencia(pista, fetchFn = fetch) {
  const respuesta = await fetchFn(`https://api.openverse.org/v1/audio/${pista.openverseId}/`, { headers: { 'user-agent': 'Pont3la10-estudio/1.0' }, signal: AbortSignal.timeout(20_000) })
  if (!respuesta.ok) throw new Error(`No se pudo verificar la licencia de «${pista.titulo}» (HTTP ${respuesta.status}).`)
  const datos = await respuesta.json()
  if (!licenciaPermitida(datos.license)) throw new Error(`La licencia de «${pista.titulo}» ya no es libre para uso comercial (${datos.license}).`)
  return datos.license
}

export async function descargarPista(id, { fetchFn = fetch } = {}) {
  const biblioteca = await leerBiblioteca()
  const pista = biblioteca.pistas.find(p => p.id === id)
  if (!pista) throw Object.assign(new Error('Esa pista no está en la biblioteca.'), { estado: 404 })
  const destino = rutaPista(id)
  if (existsSync(destino)) return destino
  await verificarLicencia(pista, fetchFn)
  await mkdir(CARPETA_MUSICA, { recursive: true })
  const respuesta = await fetchFn(pista.archivo, { headers: { 'user-agent': 'Pont3la10-estudio/1.0' }, signal: AbortSignal.timeout(120_000) })
  if (!respuesta.ok) throw new Error(`No se pudo descargar «${pista.titulo}» (HTTP ${respuesta.status}).`)
  const temporal = join(CARPETA_MUSICA, `${id}.descarga`)
  await writeFile(temporal, Buffer.from(await respuesta.arrayBuffer()))
  // Se normaliza a AAC estéreo 48 kHz para mezclar sin sorpresas.
  try {
    await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', temporal, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', `${destino}.tmp.m4a`])
    await rename(`${destino}.tmp.m4a`, destino)
  } finally {
    await rm(temporal, { force: true })
  }
  return destino
}

// Nivel de cada pista antes de mezclar (LUFS) y compresión con la voz como «llave». Medido el 2026-11-22 con una
// toma real (2026-11-21, voz a -14 LUFS): la cama queda ~16 dB por debajo mientras hablas (antes iba 32 dB por debajo y no se oía)
// y sube a ~10 dB por debajo en las pausas y transiciones.
export const NIVEL_CAMA = -24
const DUCKING = 'sidechaincompress=threshold=0.05:ratio=2.5:attack=30:release=600:level_sc=1'
const CRUCE = 0.75

const fijo = n => Math.max(0, n).toFixed(2)

/**
 * Filtro de mezcla. La entrada 0 es el video con la voz y las entradas 1..n son las pistas, una por tramo
 * ({ inicio, fin } en segundos). Cada pista se nivela a NIVEL_CAMA, entra y sale con fundido cruzado y se
 * comprime con la voz: baja sola cuando hablas, sin desaparecer. Sin tramos, una sola pista cubre todo.
 */
export function filtroMezcla({ duracion, tramos = [{ inicio: 0, fin: duracion }], nivel = NIVEL_CAMA }) {
  const partes = []
  tramos.forEach((tramo, i) => {
    const primero = i === 0
    const ultimo = i === tramos.length - 1
    const inicio = primero ? 0 : Math.max(0, tramo.inicio - CRUCE)
    const fin = ultimo ? duracion : Math.min(duracion, tramo.fin + CRUCE)
    const largo = Math.max(0.5, fin - inicio)
    const entrada = primero ? 1.5 : CRUCE * 2
    const salida = ultimo ? Math.min(3, largo / 2) : CRUCE * 2
    const retraso = Math.round(inicio * 1000)
    partes.push(`[${i + 1}:a]atrim=0:${fijo(largo)},asetpts=N/SR/TB,aformat=channel_layouts=stereo,loudnorm=I=${nivel}:TP=-3:LRA=11,aresample=48000,afade=t=in:st=0:d=${fijo(entrada)},afade=t=out:st=${fijo(largo - salida)}:d=${fijo(salida)},adelay=${retraso}|${retraso}[m${i}]`)
  })
  partes.push(tramos.length > 1 ? `${tramos.map((_, i) => `[m${i}]`).join('')}amix=inputs=${tramos.length}:duration=longest:normalize=0[musica]` : '[m0]anull[musica]')
  partes.push('[0:a]aresample=48000,aformat=channel_layouts=stereo,asplit=2[voz][llave]')
  partes.push(`[musica][llave]${DUCKING}[cama]`)
  partes.push('[voz][cama]amix=inputs=2:duration=first:normalize=0[mezcla]')
  partes.push('[mezcla]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]')
  return partes.join(';')
}

/**
 * Tramos de música de un video largo: uno por noticia (bloques b1, b2…), a partir de los segmentos del manifiesto.
 * Lo que va antes de la primera noticia se une a ella; el cierre (pregunta y despedida) lleva pista propia si dura
 * 8 s o más. Los tramos quedan pegados: cada uno termina donde empieza el siguiente.
 */
export function tramosDeManifiesto(manifiesto, duracion) {
  const segmentos = [...(manifiesto?.segmentos || [])].filter(s => Number.isFinite(Number(s.inicio))).sort((a, b) => a.inicio - b.inicio)
  const grupos = []
  for (const segmento of segmentos) {
    const bloque = /^(b\d+)(-|$)/.exec(String(segmento.id || ''))?.[1]
    const clave = bloque || (grupos.some(g => g.bloque) ? 'cierre' : 'apertura')
    const ultimo = grupos.at(-1)
    if (ultimo && ultimo.clave === clave) continue
    grupos.push({ clave, bloque: Boolean(bloque), inicio: Number(segmento.inicio) })
  }
  // La apertura se une a la primera noticia; un cierre corto se une a la última.
  while (grupos.length > 1 && !grupos[0].bloque) {
    const apertura = grupos.shift()
    grupos[0] = { ...grupos[0], inicio: apertura.inicio }
  }
  const tramos = grupos.map((g, i) => ({ clave: g.clave, inicio: i === 0 ? 0 : g.inicio, fin: grupos[i + 1]?.inicio ?? duracion }))
  const final = tramos.at(-1)
  if (tramos.length > 1 && final.clave === 'cierre' && final.fin - final.inicio < 8) { tramos.pop(); tramos.at(-1).fin = duracion }
  return tramos.length ? tramos : [{ clave: 'todo', inicio: 0, fin: duracion }]
}

const semillaDe = texto => [...String(texto || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/**
 * Elige las pistas sin intervención: rota la biblioteca desde un punto que cambia cada día (semilla = proyecto),
 * así dos noticias seguidas nunca comparten canción y no se repite ninguna mientras haya pistas suficientes.
 */
export function elegirPistas(cantidad, disponibles, semilla) {
  if (!disponibles.length) return []
  const inicio = semillaDe(semilla) % disponibles.length
  return Array.from({ length: cantidad }, (_, i) => disponibles[(inicio + i) % disponibles.length])
}

/** Pistas de la biblioteca ya descargadas en disco (la mezcla automática nunca descarga nada). */
export async function pistasDisponibles() {
  const biblioteca = await leerBiblioteca()
  return biblioteca.pistas.map(p => p.id).filter(id => existsSync(rutaPista(id)))
}

export async function duracionDe(video) {
  const { stdout } = await ejecutar('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video])
  const duracion = Number(stdout.trim())
  if (!(duracion > 0)) throw new Error('No se pudo leer la duración del video.')
  return duracion
}

/** Mezcla una o varias pistas: `ids` en el mismo orden que `tramos` (sin tramos, la primera cubre todo el video). */
export async function mezclarMusica({ video, id, ids, tramos, salida }) {
  const lista = ids?.length ? ids : [id]
  const rutas = []
  for (const pista of lista) rutas.push(await descargarPista(pista))
  const duracion = await duracionDe(video)
  const cortes = tramos?.length === lista.length ? tramos : [{ inicio: 0, fin: duracion }]
  const entradas = rutas.slice(0, cortes.length).flatMap(ruta => ['-stream_loop', '-1', '-i', ruta])
  const temporal = `${salida}.tmp.mp4`
  await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, ...entradas, '-filter_complex', filtroMezcla({ duracion, tramos: cortes }), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', temporal], { maxBuffer: 10 * 1024 * 1024 })
  await rename(temporal, salida)
  return salida
}

/**
 * Plan de música automático de un proyecto: el video largo lleva una canción distinta por noticia; un Reel, una
 * sola. `fija` (la pista que se haya elegido a mano en el estudio) solo se respeta en los Reels.
 */
export async function planMusica({ guion, manifiesto, duracion, semilla, fija, disponibles }) {
  const pistas = disponibles || await pistasDisponibles()
  if (guion?.tipo === 'reel') {
    // Una pista retirada de la biblioteca (p. ej. por reclamo de Content ID) no se usa aunque se haya elegido a mano.
    const id = (fija && pistas.includes(fija) ? fija : null) || elegirPistas(1, pistas, semilla)[0]
    return id ? { ids: [id], tramos: [{ clave: 'todo', inicio: 0, fin: duracion }] } : null
  }
  const tramos = tramosDeManifiesto(manifiesto, duracion)
  const ids = elegirPistas(tramos.length, pistas, semilla)
  return ids.length ? { ids, tramos } : null
}

/** Atribuciones CC BY de varias pistas, sin repetir, para la descripción. */
export async function atribucionesDe(ids = []) {
  const biblioteca = await leerBiblioteca()
  return [...new Set(ids)].map(id => biblioteca.pistas.find(p => p.id === id)?.atribucion).filter(Boolean).join('\n')
}

export async function atribucionDe(id) {
  if (!id) return ''
  const biblioteca = await leerBiblioteca()
  return biblioteca.pistas.find(p => p.id === id)?.atribucion || ''
}

async function main() {
  const [accion, ...resto] = process.argv.slice(2)
  if (accion === 'descargar') {
    const biblioteca = await leerBiblioteca()
    for (const pista of biblioteca.pistas.filter(p => !resto[0] || p.id === resto[0])) {
      try { process.stdout.write(`${pista.id}: ${await descargarPista(pista.id)}\n`) } catch (error) { process.stdout.write(`${pista.id}: ERROR ${error.message}\n`) }
    }
    return
  }
  if (accion === 'mezclar' && resto.length === 3) {
    process.stdout.write(`${await mezclarMusica({ video: resolve(resto[0]), ids: resto[1].split(','), salida: resolve(resto[2]) })}\n`)
    return
  }
  process.stderr.write('Uso: node scripts/video-musica.mjs descargar [id] | mezclar <video> <id> <salida>\n')
  process.exit(2)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
