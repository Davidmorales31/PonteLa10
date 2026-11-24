// Radar de tendencias del fútbol de Latinoamérica (Colombia incluida) para elegir las historias del video diario
// de la edición «latam» y los temas de los documentales. Reutiliza el radar internacional (Google Trends por país y Google
// Noticias por competición, club y figura) con la configuración de config/fuentesFutbolLatam.json, y suma los titulares de
// los feeds RSS de medios de la región que respondieron en la última revisión.
// Sirve para ELEGIR historias; no es una métrica publicable. El contenido recuperado es dato no confiable.
//
// Uso: node scripts/tendencias-futbol-latam.mjs [--salida tendencias-latam.json] [--maximo 40] [--con-enlaces 15] [--sin-noticias]
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { leerRssBing, leerRssNoticias, normalizar, rankearTemas, recogerTendencias } from './tendencias-futbol-internacional.mjs'

const RAIZ = resolve(import.meta.dirname, '..')
const AGENTE = 'Mozilla/5.0 (compatible; Pont3la10Tendencias/1.0)'

/** Convierte la configuración de Latinoamérica al formato que entiende el radar internacional. */
export function configRadarLatam(latam) {
  const competiciones = []
  const vistas = new Set()
  const agregar = (nombre, consulta, terminos) => {
    const clave = normalizar(nombre)
    if (!nombre || vistas.has(clave)) return
    vistas.add(clave)
    competiciones.push({ nombre, consulta: consulta || nombre, terminos: terminos?.length ? terminos : [nombre] })
  }
  for (const c of latam?.competiciones || []) agregar(c.nombre, c.nombre, [c.nombre, ...(c.terminos || [])])
  for (const q of latam?.busquedasGoogleNews?.consultas || []) agregar(q.consulta, q.consulta, [q.consulta])
  const nombresClubes = [...new Set([...(latam?.clubes || []), ...(latam?.clubesColombiaParaElRadar || [])])]
  return {
    competiciones,
    clubesDeMayorInteres: nombresClubes.map(nombre => ({ nombre, terminos: [nombre] })),
    figuras: latam?.figurasRadar || [],
    tendencias: latam?.tendencias || { paises: ['CO'], idiomaNoticias: { hl: 'es-419', gl: 'CO', ceid: 'CO:es-419' }, ventanaNoticias: '1d' },
    excluir: latam?.excluir || { terminos: [], otrosDeportes: [] }
  }
}

async function traer(url, intentos = 2) {
  for (let intento = 1; ; intento++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': AGENTE }, signal: AbortSignal.timeout(20_000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.text()
    } catch (error) {
      if (intento >= intentos || /^HTTP /.test(error.message)) throw error
      await new Promise(resolver => setTimeout(resolver, 1500))
    }
  }
}

/** Titulares de los feeds de medios de la región, con el nombre del medio (los feeds propios no lo traen en cada nota). */
export async function recogerFeeds(feeds, { leer = traer, registro = () => {} } = {}) {
  const noticias = []
  for (const feed of feeds || []) {
    try {
      for (const n of leerRssNoticias(await leer(feed.url), feed.nombre).slice(0, 20)) noticias.push({ ...n, medio: n.medio || feed.nombre, pais: feed.pais })
    } catch (error) { registro(`Feed ${feed.nombre}: ${error.message}`) }
  }
  return noticias
}

/** Una línea del listado: posición, puntaje, tema, entidades, Trends y el primer titular (texto u objeto con `titulo`). */
export function lineaDeTema(t, posicion) {
  const primero = t.titulares?.[0]
  const titular = typeof primero === 'string' ? primero : (primero?.titulo || '')
  const trends = t.paises?.length ? ` · Trends ${t.paises.join('/')} ${t.trafico}+` : ''
  return `${String(posicion).padStart(2)}. [${t.puntaje}] ${t.tema} · ${t.entidades.join(', ')}${trends}${titular ? ` · ${titular}` : ''}`
}

async function main() {
  const args = process.argv.slice(2)
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : null }
  const latam = JSON.parse(await readFile(resolve(RAIZ, 'config', 'fuentesFutbolLatam.json'), 'utf8'))
  const config = configRadarLatam(latam)
  const registro = t => process.stderr.write(`${t}\n`)
  const { trends, noticias } = await recogerTendencias({ config, conNoticias: !args.includes('--sin-noticias'), registro })
  const delosFeeds = args.includes('--sin-noticias') ? [] : await recogerFeeds(latam.rss?.feeds, { registro })
  const temas = rankearTemas({ trends, noticias: [...noticias, ...delosFeeds], config, maximo: Number(valor('--maximo')) || 40 })
  const conEnlaces = Number(valor('--con-enlaces') ?? 15)
  for (const tema of temas.slice(0, conEnlaces)) {
    try {
      tema.notas = leerRssBing(await traer(`https://www.bing.com/news/search?q=${encodeURIComponent(tema.tema)}&format=rss&setlang=es&cc=CO`)).slice(0, 6)
    } catch (error) { registro(`Bing «${tema.tema}»: ${error.message}`) }
  }
  const salida = { generadoEn: new Date().toISOString(), paises: config.tendencias.paises, señales: { trends: trends.length, titularesRadar: noticias.length, titularesFeeds: delosFeeds.length }, nota: config.tendencias.nota, temas }
  if (valor('--salida')) await writeFile(resolve(valor('--salida')), JSON.stringify(salida, null, 2))
  process.stdout.write(`Señales: ${trends.length} tendencias de Trends · ${noticias.length} titulares del radar · ${delosFeeds.length} de feeds de medios\n`)
  temas.forEach((t, i) => process.stdout.write(`${lineaDeTema(t, i + 1)}
`))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
