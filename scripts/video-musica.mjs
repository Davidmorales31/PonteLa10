// Música de fondo del video diario: biblioteca con licencia verificada (config/musicaLibre.json),
// descarga bajo demanda y mezcla DESPUÉS del render, con la música bajando sola cuando hay voz.
// Uso:
//   node scripts/video-musica.mjs descargar [id]          descarga (y verifica la licencia de) una o todas las pistas
//   node scripts/video-musica.mjs mezclar <video> <id> <salida>
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

// Filtro de mezcla: la música se repite hasta cubrir el video, entra y sale con fundido, y se comprime
// con la voz como «llave» (sidechain): cuando hablas baja sola y sube en las pausas y transiciones.
export function filtroMezcla({ duracion, volumen = 0.32 }) {
  const fin = Math.max(0, duracion - 3).toFixed(2)
  return [
    `[1:a]atrim=0:${duracion.toFixed(2)},asetpts=N/SR/TB,volume=${volumen},afade=t=in:st=0:d=1.5,afade=t=out:st=${fin}:d=3[musica]`,
    '[0:a]asplit=2[voz][llave]',
    '[musica][llave]sidechaincompress=threshold=0.004:ratio=16:level_sc=3:attack=20:release=450:makeup=1[cama]',
    '[voz][cama]amix=inputs=2:duration=first:normalize=0[mezcla]',
    '[mezcla]loudnorm=I=-14:TP=-1.5:LRA=11[a]'
  ].join(';')
}

export async function mezclarMusica({ video, id, salida, volumen }) {
  const biblioteca = await leerBiblioteca()
  const pista = await descargarPista(id)
  const { stdout } = await ejecutar('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video])
  const duracion = Number(stdout.trim())
  if (!(duracion > 0)) throw new Error('No se pudo leer la duración del video.')
  const temporal = `${salida}.tmp.mp4`
  await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', video, '-stream_loop', '-1', '-i', pista, '-filter_complex', filtroMezcla({ duracion, volumen: volumen ?? biblioteca.volumenCama }), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', temporal], { maxBuffer: 10 * 1024 * 1024 })
  await rename(temporal, salida)
  return salida
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
    process.stdout.write(`${await mezclarMusica({ video: resolve(resto[0]), id: resto[1], salida: resolve(resto[2]) })}\n`)
    return
  }
  process.stderr.write('Uso: node scripts/video-musica.mjs descargar [id] | mezclar <video> <id> <salida>\n')
  process.exit(2)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
