// Selector del tema del documental de los viernes (docs/PLAN_DOCUMENTAL_SEMANAL.md, fase 1).
// Cruza el banco (config/bancoDocumentales.json) con las tendencias de los últimos 7 días y propone el tema
// más un par de suplentes. Manda la tendencia: si la semana pasada un portero fue noticia, su historia sube.
//
// Uso:
//   node scripts/documental-elegir.mjs [--actualizar] [--noticias] [--hoy AAAA-MM-DD] [--salida archivo.json] [--top 5]
//     --actualizar  corre el radar de tendencias de hoy y guarda la foto en videos/documentales/tendencias/<fecha>.json
//     --noticias    además cuenta las notas de los últimos 7 días de cada tema en Bing Noticias (red)
// Solo propone: la elección la aprueba el responsable. No escribe en el banco.
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { normalizar } from './tendencias-futbol-internacional.mjs'

const ejecutar = promisify(execFile)
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
export const DIR_TENDENCIAS = join(RAIZ, 'videos', 'documentales', 'tendencias')
const DIA = 24 * 3_600_000

const escaparRegex = texto => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** ¿Aparece el alias como palabra completa en el texto? (sin tildes ni mayúsculas) */
export function mencionaAlias(texto, alias) {
  const limpio = normalizar(texto)
  return alias.some(a => {
    const n = normalizar(a)
    return n.length >= 3 && new RegExp(`(^|[^a-z0-9])${escaparRegex(n)}([^a-z0-9]|$)`).test(limpio)
  })
}

/** Señal de tendencia (0–100) de un tema en las fotos de tendencias de la semana más las notas recientes. */
export function senalTendencia(tema, fotos = [], notasSemana = 0) {
  let maximo = 0
  let menciones = 0
  for (const foto of fotos) {
    for (const t of foto?.temas || []) {
      const textoTema = [t.tema, ...(t.entidades || [])].join(' · ')
      if (mencionaAlias(textoTema, tema.alias)) maximo = Math.max(maximo, Number(t.puntaje) || 0)
      menciones += (t.titulares || []).filter(h => mencionaAlias(h.titulo, tema.alias)).length
    }
  }
  // Manda el pico del radar (Google Trends y noticias del día). Las menciones y las notas solo suman un poco: las
  // superestrellas salen en las noticias todas las semanas y no deben tapar al protagonista real de la semana.
  return Math.min(100, Math.round(maximo + Math.min(25, menciones * 2) + Math.min(15, notasSemana * 2)))
}

/** Días hasta la próxima efeméride (MM-DD) contando desde `hoy`; null si no tiene. */
export function diasHastaEfemeride(efemeride, hoy) {
  if (!/^\d\d-\d\d$/.test(String(efemeride || ''))) return null
  const base = new Date(`${hoy}T00:00:00Z`)
  let fecha = new Date(`${base.getUTCFullYear()}-${efemeride}T00:00:00Z`)
  if (fecha < base) fecha = new Date(`${base.getUTCFullYear() + 1}-${efemeride}T00:00:00Z`)
  return Math.round((fecha - base) / DIA)
}

/**
 * Puntúa los temas del banco. Devuelve la lista ordenada, sin los publicados hace menos de `diasSinRepetir`.
 * `notas` es un mapa id → cantidad de notas de la semana (opcional).
 */
export function puntuarTemas(banco, fotos, { hoy, notas = {} } = {}) {
  const { pesos, diasSinRepetir, bonoEfemerideDias, bonoEfemeride } = banco.reglas
  const ahora = Date.parse(`${hoy}T12:00:00Z`)
  const salida = []
  for (const tema of banco.temas) {
    const diasDesde = tema.publicado ? Math.floor((ahora - Date.parse(tema.publicado)) / DIA) : null
    if (diasDesde !== null && diasDesde < diasSinRepetir) continue
    const tendencia = senalTendencia(tema, fotos, notas[tema.id] || 0)
    const interes = Number.isFinite(tema.interesFondo) ? tema.interesFondo : 50
    const hueco = diasDesde === null ? 100 : Math.min(100, Math.round(diasDesde / diasSinRepetir * 50))
    const dias = diasHastaEfemeride(tema.efemeride, hoy)
    const bono = dias !== null && dias <= bonoEfemerideDias ? bonoEfemeride : 0
    const total = Math.round(pesos.tendencia * tendencia + pesos.interes * interes + pesos.hueco * hueco + bono)
    const razones = []
    if (tendencia >= 30) razones.push(`en tendencia esta semana (${tendencia}/100)`)
    if (Number.isFinite(tema.interesFondo)) razones.push(`interés de fondo medido ${tema.interesFondo}/100`)
    if (bono) razones.push(`efeméride en ${dias} día(s)`)
    if (tema.sensible) razones.push('tema sensible: requiere fuentes de primer nivel y aprobación expresa')
    salida.push({ id: tema.id, nombre: tema.nombre, tipo: tema.tipo, angulo: tema.angulo, total, tendencia, interes, hueco, bono, sensible: tema.sensible, razones })
  }
  return salida.sort((a, b) => b.total - a.total || b.tendencia - a.tendencia)
}

/** Figuras en tendencia que no están en el banco (para que el agente las agregue con sus fuentes). */
export function candidatosNuevos(banco, fotos, minimo = 30, excluir = []) {
  const conocidos = banco.temas.flatMap(t => t.alias)
  const vistos = new Map()
  for (const foto of fotos) {
    for (const t of foto?.temas || []) {
      if ((Number(t.puntaje) || 0) < minimo || !(t.entidades || []).length) continue
      if (mencionaAlias([t.tema, ...t.entidades].join(' · '), conocidos)) continue
      // Solo personas: nombre propio con mayúscula, que no sea un club ni una competición.
      if (!/^[A-ZÁÉÍÓÚÑ]/.test(String(t.tema)) || mencionaAlias(t.tema, excluir)) continue
      const previo = vistos.get(t.tema) || 0
      vistos.set(t.tema, Math.max(previo, Number(t.puntaje) || 0))
    }
  }
  return [...vistos].map(([tema, puntaje]) => ({ tema, puntaje })).sort((a, b) => b.puntaje - a.puntaje).slice(0, 10)
}

export async function leerFotosSemana(hoy, dir = DIR_TENDENCIAS) {
  if (!existsSync(dir)) return []
  const limite = Date.parse(`${hoy}T00:00:00Z`) - 7 * DIA
  const fotos = []
  for (const nombre of (await readdir(dir)).filter(n => /^\d{4}-\d{2}-\d{2}\.json$/.test(n))) {
    if (Date.parse(`${nombre.slice(0, 10)}T00:00:00Z`) < limite) continue
    try { fotos.push(JSON.parse(await readFile(join(dir, nombre), 'utf8'))) } catch { /* foto dañada: se ignora */ }
  }
  return fotos
}

async function contarNotasSemana(tema, transporte = fetch) {
  const consulta = encodeURIComponent(`"${tema.alias[0]}" fútbol`)
  try {
    const xml = await (await transporte(`https://www.bing.com/news/search?q=${consulta}&format=rss&setlang=es&cc=CO`, { headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20_000) })).text()
    const limite = Date.now() - 7 * DIA
    return [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].filter(m => Date.parse(m[1]) >= limite).length
  } catch { return 0 }
}

async function nombresNoPersonas() {
  try {
    const fuentes = JSON.parse(await readFile(join(RAIZ, 'config', 'fuentesFutbolInternacional.json'), 'utf8'))
    return [...(fuentes.clubesDeMayorInteres || []), ...(fuentes.competiciones || [])].flatMap(x => [x.nombre, ...(x.terminos || [])])
  } catch { return [] }
}

const fechaBogota = (ms = Date.now()) => new Date(ms - 5 * 3_600_000).toISOString().slice(0, 10)

async function main() {
  const args = process.argv.slice(2)
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : undefined }
  const hoy = valor('--hoy') || fechaBogota()
  const banco = JSON.parse(await readFile(join(RAIZ, 'config', 'bancoDocumentales.json'), 'utf8'))
  if (args.includes('--actualizar')) {
    await mkdir(DIR_TENDENCIAS, { recursive: true })
    const destino = join(DIR_TENDENCIAS, `${hoy}.json`)
    await ejecutar(process.execPath, [join(RAIZ, 'scripts', 'tendencias-futbol-internacional.mjs'), '--salida', destino], { cwd: RAIZ, maxBuffer: 20 * 1024 * 1024 })
    process.stdout.write(`Tendencias de hoy guardadas en ${destino}\n`)
  }
  const fotos = await leerFotosSemana(hoy)
  const notas = {}
  if (args.includes('--noticias')) for (const tema of banco.temas) notas[tema.id] = await contarNotasSemana(tema)
  const ranking = puntuarTemas(banco, fotos, { hoy, notas })
  const top = Number(valor('--top') || 5)
  const resultado = { fecha: hoy, fotosDeTendencias: fotos.length, propuesta: ranking[0] || null, suplentes: ranking.slice(1, 3), ranking: ranking.slice(0, top), candidatosNuevos: candidatosNuevos(banco, fotos, 30, await nombresNoPersonas()) }
  if (valor('--salida')) await writeFile(resolve(valor('--salida')), JSON.stringify(resultado, null, 2))
  process.stdout.write(`Documental del viernes · ${hoy} · ${fotos.length} foto(s) de tendencias de la semana\n`)
  for (const [i, t] of resultado.ranking.entries()) process.stdout.write(`${i + 1}. ${t.nombre} — ${t.total} pts (tendencia ${t.tendencia}, interés ${t.interes}, hueco ${t.hueco}${t.bono ? `, efeméride +${t.bono}` : ''})\n   ${t.angulo}${t.razones.length ? `\n   ${t.razones.join(' · ')}` : ''}\n`)
  if (resultado.candidatosNuevos.length) process.stdout.write(`\nEn tendencia y fuera del banco: ${resultado.candidatosNuevos.map(c => `${c.tema} (${c.puntaje})`).join(', ')}\n`)
  if (!fotos.length) process.stdout.write('\nAviso: no hay fotos de tendencias de la semana; corre con --actualizar (lo ideal es una vez al día).\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
