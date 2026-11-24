// Reparto de las notas del día entre las dos ediciones del video diario: «latam» (Latinoamérica, Colombia incluida) e
// «internacional». No hay una corrida editorial de Latinoamérica: el video se arma con lo que ya publican la corrida de
// Colombia (categoría futbol-colombiano) y la internacional (futbol-mundial). Este módulo decide cuáles notas de
// futbol-mundial son de la región según config/fuentesFutbolLatam.json y reparte sin que una nota quede en las dos.
// Uso: node scripts/video-latam.mjs [--fecha AAAA-MM-DD] [--json]   (lista las historias candidatas de cada edición)
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SITIO_API } from './video-sitio.mjs'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SITIO = SITIO_API

const normalizar = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const contiene = (texto, termino) => {
  const t = normalizar(termino)
  if (!t) return false
  return new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(normalizar(texto))
}
/** Fecha (AAAA-MM-DD) en Bogotá, UTC−5 sin horario de verano. */
export const fechaBogota = (instante = Date.now()) => new Date(new Date(instante).getTime() - 5 * 3_600_000).toISOString().slice(0, 10)

/** Entidad de Latinoamérica que menciona un texto (país, competición, club o colombiano), o null. */
export function entidadLatam(texto, config) {
  for (const p of config?.paises || []) if ((p.terminos || []).some(t => contiene(texto, t))) return p.nombre
  for (const c of config?.competiciones || []) if ((c.terminos || []).some(t => contiene(texto, t))) return c.nombre
  for (const club of config?.clubes || []) if (contiene(texto, club)) return club
  if ((config?.colombianosEnElExterior?.terminos || []).some(t => contiene(texto, t))) return 'Colombia'
  const figura = (config?.figurasEnElExterior?.terminos || []).find(t => contiene(texto, t))
  if (figura) return `Figura: ${figura}`
  return null
}

const textoDe = articulo => `${articulo?.titulo || ''} ${articulo?.tituloPortada || ''} ${articulo?.resumen || ''}`

/**
 * Reparte notas ya traídas del sitio. Colombia (futbol-colombiano) es siempre de Latinoamérica; las de futbol-mundial
 * son de Latinoamérica si nombran un país, torneo, club o colombiano de la región, y si no, internacionales.
 * `usados` son slugs ya contados en un guion (no se repiten en el otro video del día).
 */
export function repartirEdiciones({ colombianas = [], mundiales = [], config, usados = [] }) {
  const yaUsados = new Set(usados)
  const latam = []
  const internacional = []
  for (const a of colombianas) if (!yaUsados.has(a.slug)) latam.push({ ...a, categoria: 'futbol-colombiano', pais: 'Colombia' })
  for (const a of mundiales) {
    if (yaUsados.has(a.slug)) continue
    const entidad = entidadLatam(textoDe(a), config)
    if (entidad) latam.push({ ...a, categoria: 'futbol-mundial', pais: entidad })
    else internacional.push({ ...a, categoria: 'futbol-mundial' })
  }
  return { latam, internacional }
}

/** Cuántas notas hay por país (para respetar «máximo de historias por país» al elegir). */
export function conteoPorPais(historias) {
  const cuenta = {}
  for (const h of historias) cuenta[h.pais || 'Otro'] = (cuenta[h.pais || 'Otro'] || 0) + 1
  return cuenta
}

/** Solo las notas publicadas en la fecha de Bogotá indicada. */
export const delDia = (articulos, fecha) => (articulos || []).filter(a => a.publicadoEn && fechaBogota(new Date(a.publicadoEn).getTime()) === fecha)

async function traer(categoria) {
  const respuesta = await fetch(`${SITIO}/api/articulos?categoria=${categoria}&limite=50`, { signal: AbortSignal.timeout(30_000) })
  if (!respuesta.ok) throw new Error(`El sitio respondió ${respuesta.status} en la categoría ${categoria}.`)
  const lista = await respuesta.json()
  return Array.isArray(lista) ? lista : []
}

async function main() {
  const valor = n => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined }
  const fecha = valor('--fecha') || fechaBogota()
  const config = JSON.parse(await readFile(join(RAIZ, 'config', 'fuentesFutbolLatam.json'), 'utf8'))
  const [colombianas, mundiales] = await Promise.all([traer('futbol-colombiano'), traer('futbol-mundial')])
  const { latam, internacional } = repartirEdiciones({ colombianas: delDia(colombianas, fecha), mundiales: delDia(mundiales, fecha), config })
  if (process.argv.includes('--json')) { process.stdout.write(`${JSON.stringify({ fecha, latam, internacional }, null, 2)}\n`); return }
  const fila = h => `  · [${h.pais || '—'}] ${h.titulo}  (${h.slug})`
  process.stdout.write(`Fecha ${fecha}\n\nLatinoamérica (${latam.length}) — por país: ${JSON.stringify(conteoPorPais(latam))}\n${latam.map(fila).join('\n')}\n\nInternacional (${internacional.length})\n${internacional.map(fila).join('\n')}\n`)
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
}
