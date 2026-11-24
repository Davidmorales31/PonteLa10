// Salud de las fuentes RSS de las corridas editoriales y del video diario: pregunta a cada feed de
// config/fuentesFutbolInternacional.json y config/fuentesFutbolLatam.json si responde, cuántas notas trae y de cuándo es la
// más reciente. Los medios cambian o retiran sus RSS sin avisar (en la revisión del 2026-11-24 fallaron 9 de 27 candidatos
// y Marca y AS estaban desactualizados): conviene correrlo cada semana y quitar o reemplazar lo que salga en rojo.
//
// Uso: node scripts/fuentes-salud.mjs [--horas 48] [--json]
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const RAIZ = resolve(import.meta.dirname, '..')
const AGENTE = 'Mozilla/5.0 (compatible; Pont3la10-fuentes/1.0)'

const MARCAS_ITEM = /<item[\s>]|<entry[\s>]/g
const FECHAS = /<pubDate>([^<]+)<\/pubDate>|<updated>([^<]+)<\/updated>|<published>([^<]+)<\/published>/g

/**
 * Resume el XML de un feed: cuántas notas trae y la fecha de la más reciente. `ahora` (ms) permite probarlo sin reloj.
 * `activo` es true si trae notas y la más reciente tiene menos de `maximoHoras` horas.
 */
export function resumirFeed(xml, { ahora = Date.now(), maximoHoras = 48 } = {}) {
  const texto = String(xml || '')
  const notas = (texto.match(MARCAS_ITEM) || []).length
  let masReciente = null
  for (const m of texto.matchAll(FECHAS)) {
    const crudo = m[1] || m[2] || m[3]
    const ms = Date.parse(crudo)
    if (Number.isFinite(ms) && ms <= ahora + 24 * 3_600_000 && (masReciente === null || ms > masReciente)) masReciente = ms
  }
  const horas = masReciente === null ? null : Math.max(0, Math.round((ahora - masReciente) / 3_600_000))
  return { notas, ultima: masReciente === null ? null : new Date(masReciente).toISOString(), horas, activo: notas > 0 && horas !== null && horas <= maximoHoras }
}

/** Todos los feeds declarados en las configuraciones (nombre, url, origen). */
export function feedsDeConfiguracion({ internacional, latam }) {
  return [
    ...(internacional?.rss || []).map(f => ({ ...f, origen: 'internacional' })),
    ...(latam?.rss?.feeds || []).map(f => ({ ...f, origen: 'latam' }))
  ]
}

async function revisar(feed, opciones) {
  try {
    const r = await fetch(feed.url, { headers: { 'user-agent': AGENTE, accept: 'application/rss+xml, application/xml, text/xml, */*' }, signal: AbortSignal.timeout(20_000) })
    if (!r.ok) return { ...feed, estado: `HTTP ${r.status}`, notas: 0, activo: false }
    return { ...feed, estado: 'ok', ...resumirFeed(await r.text(), opciones) }
  } catch (error) {
    return { ...feed, estado: `error: ${error.name}`, notas: 0, activo: false }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : null }
  const maximoHoras = Number(valor('--horas')) || 48
  const leer = async archivo => JSON.parse(await readFile(resolve(RAIZ, 'config', archivo), 'utf8'))
  const feeds = feedsDeConfiguracion({ internacional: await leer('fuentesFutbolInternacional.json'), latam: await leer('fuentesFutbolLatam.json') })
  const resultados = await Promise.all(feeds.map(f => revisar(f, { maximoHoras })))
  if (args.includes('--json')) { process.stdout.write(`${JSON.stringify(resultados, null, 2)}\n`); return }
  for (const r of resultados) {
    const edad = r.horas === null || r.horas === undefined ? 'sin fecha' : `hace ${r.horas} h`
    process.stdout.write(`${r.activo ? 'OK  ' : 'MAL '} [${r.origen}] ${r.nombre.padEnd(30)} ${String(r.estado).padEnd(12)} notas=${String(r.notas).padStart(3)}  ${edad}\n`)
  }
  const malos = resultados.filter(r => !r.activo)
  process.stdout.write(`\n${resultados.length - malos.length} de ${resultados.length} fuentes sanas (límite ${maximoHoras} h).${malos.length ? ` Revisar: ${malos.map(m => m.nombre).join(', ')}.` : ''}\n`)
  if (malos.length) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
