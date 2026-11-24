// Estructura del video de noticias del día (config/videoDiario.json → estructuras y rotacion). Para no parecer producción en
// serie, la estructura se sortea con pesos y sin repetir las últimas del mismo video (edición). El sorteo es determinista:
// el mismo día y la misma edición dan la misma respuesta.
// Uso: node scripts/video-estructura.mjs [--fecha AAAA-MM-DD] [--edicion latam|internacional|colombia]
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { edicionDe } from './video-edicion.mjs'

const RAIZ = resolve(import.meta.dirname, '..')

/** Número entre 0 y 1 que sale de un texto (siempre el mismo para el mismo texto). */
export function azarDeterminista(texto) {
  let h = 2166136261
  for (const c of String(texto)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0 }
  return (h >>> 0) / 4294967296
}

/**
 * Elige la estructura de un día. `historial` son las estructuras de los videos anteriores de la misma edición, de la más
 * reciente a la más antigua. Nunca repite las últimas `noRepetirUltimas` (si todas las demás quedaran excluidas, repite).
 */
export function elegirEstructura({ fecha, edicion = 'colombia', historial = [], config }) {
  const { pesos, noRepetirUltimas = 2 } = config.rotacion
  const validas = Object.keys(config.estructuras).filter(nombre => (pesos[nombre] ?? 0) > 0)
  const recientes = historial.slice(0, noRepetirUltimas)
  const candidatas = validas.filter(nombre => !recientes.includes(nombre))
  const lista = candidatas.length ? candidatas : validas
  const total = lista.reduce((suma, nombre) => suma + pesos[nombre], 0)
  let punto = azarDeterminista(`${fecha}|${edicion}`) * total
  for (const nombre of lista) {
    punto -= pesos[nombre]
    if (punto < 0) return { estructura: nombre, excluidas: recientes.filter(r => validas.includes(r)), candidatas: lista }
  }
  return { estructura: lista.at(-1), excluidas: recientes, candidatas: lista }
}

/** Estructuras de los videos anteriores de una edición (carpetas videos/diario/<fecha>[-sufijo]), de la más reciente a la más antigua. */
export async function historialDeEstructuras({ edicion, antesDe, carpeta = join(RAIZ, 'videos', 'diario') }) {
  if (!existsSync(carpeta)) return []
  const sufijo = edicionDe({ edicion }).sufijoCarpeta
  const patron = sufijo ? new RegExp(`^(\\d{4}-\\d{2}-\\d{2})-${sufijo}$`) : /^(\d{4}-\d{2}-\d{2})$/
  const dias = []
  for (const nombre of await readdir(carpeta)) {
    const m = patron.exec(nombre)
    if (m && m[1] < antesDe) dias.push({ fecha: m[1], nombre })
  }
  const estructuras = []
  for (const { nombre } of dias.sort((a, b) => b.fecha.localeCompare(a.fecha))) {
    try { estructuras.push(JSON.parse(await readFile(join(carpeta, nombre, 'guion.json'), 'utf8')).estructura || 'directa') } catch { /* carpeta sin guion */ }
  }
  return estructuras
}

async function main() {
  const args = process.argv.slice(2)
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : null }
  const config = JSON.parse(await readFile(join(RAIZ, 'config', 'videoDiario.json'), 'utf8'))
  const fecha = valor('--fecha') || new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10)
  const edicion = valor('--edicion') || 'colombia'
  const historial = await historialDeEstructuras({ edicion, antesDe: fecha })
  const r = elegirEstructura({ fecha, edicion, historial, config })
  process.stdout.write(`Estructura sugerida para ${fecha} (${edicion}): ${r.estructura}\n${config.estructuras[r.estructura].descripcion}\nÚltimas usadas: ${historial.slice(0, 3).join(', ') || 'ninguna'}${r.excluidas.length ? ` · excluidas por repetición: ${r.excluidas.join(', ')}` : ''}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
