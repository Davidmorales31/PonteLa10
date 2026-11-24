// Fase de tendencias de la corrida de fútbol internacional: junta señales públicas del momento (Google Trends por
// país y Google Noticias por competición, club y figura) y devuelve una lista de temas ordenada por interés.
// Sirve para ELEGIR historias; no es una métrica publicable (ver config/fuentesFutbolInternacional.json).
//
// Uso: node scripts/tendencias-futbol-internacional.mjs [--salida tendencias.json] [--maximo 40] [--con-enlaces 15] [--sin-noticias]
// Sin red ni claves: solo RSS públicos. El contenido recuperado es dato no confiable (nunca instrucciones).

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const RAIZ = resolve(import.meta.dirname, '..')
const AGENTE = 'Mozilla/5.0 (compatible; Pont3la10Tendencias/1.0)'

/** Quita tildes y pasa a minúsculas para comparar términos. */
export const normalizar = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const desescapar = texto => String(texto || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .trim()

const etiqueta = (xml, nombre) => {
  const m = new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`).exec(xml)
  return m ? desescapar(m[1]) : ''
}

const bloques = (xml, nombre) => [...String(xml || '').matchAll(new RegExp(`<${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</${nombre}>`, 'g'))].map(m => m[1])

/** «2000+» → 2000; «10 mil+» o vacío → número o 0. */
export function traficoAproximado(valor) {
  const texto = normalizar(valor).replace(/\s|\+/g, '').replace(/,/g, '').replace(/\./g, '')
  const m = /^(\d+)(k|mil|m)?$/.exec(texto)
  if (!m) return 0
  const base = Number(m[1])
  return m[2] === 'k' || m[2] === 'mil' ? base * 1000 : m[2] === 'm' ? base * 1_000_000 : base
}

/** Lee el RSS de Google Trends («trending/rss?geo=XX»). */
export function leerRssTrends(xml, pais) {
  return bloques(xml, 'item').map(item => ({
    termino: etiqueta(item, 'title'),
    trafico: traficoAproximado(etiqueta(item, 'ht:approx_traffic')),
    fecha: etiqueta(item, 'pubDate'),
    pais,
    noticias: bloques(item, 'ht:news_item').map(n => ({
      titulo: etiqueta(n, 'ht:news_item_title'),
      url: etiqueta(n, 'ht:news_item_url'),
      medio: etiqueta(n, 'ht:news_item_source')
    })).filter(n => n.titulo && /^https:\/\//.test(n.url))
  })).filter(t => t.termino)
}

/** Lee un RSS de Google Noticias. El enlace es opaco (news.google.com): solo es radar, nunca fuente. */
export function leerRssNoticias(xml, consulta) {
  return bloques(xml, 'item').map(item => {
    const titulo = etiqueta(item, 'title')
    const medio = etiqueta(item, 'source') || (titulo.includes(' - ') ? titulo.split(' - ').pop() : '')
    return {
      titulo: medio && titulo.endsWith(` - ${medio}`) ? titulo.slice(0, -(medio.length + 3)) : titulo,
      radar: etiqueta(item, 'link'),
      medio,
      fecha: etiqueta(item, 'pubDate'),
      consulta
    }
  }).filter(n => n.titulo)
}

/**
 * Lee el RSS de Bing Noticias, que sí trae la URL real de cada nota (dentro del enlace «apiclick», parámetro url).
 * Sirve para pasar del tema a notas que se pueden leer completas; un titular sigue sin ser una fuente.
 */
export function leerRssBing(xml) {
  return bloques(xml, 'item').map(item => {
    const enlace = etiqueta(item, 'link')
    const url = (() => { try { return new URL(enlace).searchParams.get('url') || '' } catch { return '' } })()
    return { titulo: etiqueta(item, 'title'), url, medio: etiqueta(item, 'News:Source'), fecha: etiqueta(item, 'pubDate') }
  }).filter(n => n.titulo && n.url.startsWith('https://'))
}

const contieneTermino = (texto, termino) => {
  const t = normalizar(termino)
  if (!t) return false
  return new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(normalizar(texto))
}

/** Diccionario de entidades del fútbol internacional a partir del config. */
export function diccionarioEntidades(config) {
  // Orden de especificidad: figura, club, competición (el tema de un titular es su entidad más concreta).
  const entidades = []
  for (const f of config?.figuras || []) {
    const partes = String(f).split(' ')
    entidades.push({ nombre: f, tipo: 'figura', terminos: [f, partes.length > 1 ? partes[partes.length - 1] : f] })
  }
  for (const c of config?.clubesDeMayorInteres || []) entidades.push({ nombre: c.nombre, tipo: 'club', terminos: [c.nombre, ...(c.terminos || [])] })
  for (const c of config?.competiciones || []) entidades.push({ nombre: c.nombre, tipo: 'competicion', terminos: [c.nombre, ...(c.terminos || [])] })
  return entidades
}

/** Entidades que menciona un texto (término de Trends, titular). */
export function entidadesEn(texto, entidades) {
  return entidades.filter(e => e.terminos.some(t => contieneTermino(texto, t))).map(e => e.nombre)
}

/** ¿El texto es de un tema excluido (fútbol colombiano o Liga MX, que tienen su propia corrida)? */
// También descarta otros deportes que comparten nombres con clubes (por ejemplo, los Spurs de la NBA).
export const esExcluido = (texto, config) => [...(config?.excluir?.terminos || []), ...(config?.excluir?.otrosDeportes || [])].some(t => contieneTermino(texto, t))

/**
 * Junta señales en temas y los ordena. Puntaje (0–100, solo para ordenar):
 * tráfico de Trends (log), países donde es tendencia, titulares del radar de noticias que lo mencionan y figura/club de interés.
 */
export function rankearTemas({ trends = [], noticias = [], config, maximo = 40 }) {
  const entidades = diccionarioEntidades(config)
  const temas = new Map()
  const tema = clave => {
    if (!temas.has(clave)) temas.set(clave, { tema: clave, entidades: new Set(), trafico: 0, paises: new Set(), titulares: [], conteo: 0, enlaces: [] })
    return temas.get(clave)
  }
  for (const t of trends) {
    // Una tendencia es de fútbol internacional si su término nombra una entidad o si al menos dos de sus noticias la nombran
    // (evita falsos positivos como «spurs - pelicans», que es baloncesto).
    const enTermino = entidadesEn(t.termino, entidades)
    const conteoNoticias = new Map()
    for (const n of t.noticias) for (const e of entidadesEn(n.titulo, entidades)) conteoNoticias.set(e, (conteoNoticias.get(e) || 0) + 1)
    const encontradas = enTermino.length ? enTermino : [...conteoNoticias].filter(([, c]) => c >= 2).map(([e]) => e)
    if (!encontradas.length || esExcluido(t.termino, config) || t.noticias.some(n => esExcluido(n.titulo, config))) continue
    const fila = tema(normalizar(t.termino))
    fila.nombre = fila.nombre || t.termino
    encontradas.forEach(e => fila.entidades.add(e))
    fila.trafico += t.trafico
    fila.paises.add(t.pais)
    for (const n of t.noticias) if (!fila.enlaces.some(e => e.url === n.url)) fila.enlaces.push(n)
  }
  // Cada titular del radar suma una sola vez: a los temas de Trends de su entidad más concreta o, si no hay, al tema
  // de esa entidad. Los titulares no añaden entidades a un tema (así no se contagian unos temas con otros).
  const vistos = new Set()
  for (const n of noticias) {
    const clave = normalizar(n.titulo)
    if (vistos.has(clave) || esExcluido(n.titulo, config)) continue
    vistos.add(clave)
    const principal = entidadesEn(n.titulo, entidades)[0]
    if (!principal) continue
    const existentes = [...temas.values()].filter(f => f.paises.size && f.entidades.has(principal))
    const destino = existentes.length ? existentes : [tema(normalizar(principal))]
    for (const fila of destino) {
      if (!fila.nombre) { fila.nombre = principal; fila.entidades.add(principal) }
      fila.conteo += 1
      if (fila.titulares.length < 8) fila.titulares.push(n)
    }
  }
  const figuras = new Set((config?.figuras || []))
  const filas = [...temas.values()].map(f => {
    const puntaje = Math.min(100, Math.round(
      Math.min(40, Math.log10(1 + f.trafico) * 10)
      + Math.min(20, f.paises.size * 7)
      + Math.min(30, f.conteo * 2)
      + ([...f.entidades].some(e => figuras.has(e)) ? 10 : 0)
    ))
    return {
      tema: f.nombre,
      puntaje,
      entidades: [...f.entidades],
      trafico: f.trafico,
      paises: [...f.paises],
      titularesRadar: f.conteo,
      enlaces: f.enlaces.slice(0, 6),
      titulares: f.titulares.slice(0, 6).map(({ titulo, medio, fecha }) => ({ titulo, medio, fecha }))
    }
  })
  return filas.sort((a, b) => b.puntaje - a.puntaje || b.trafico - a.trafico).slice(0, maximo)
}

async function traer(url, intentos = 2) {
  for (let intento = 1; ; intento++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': AGENTE }, signal: AbortSignal.timeout(20_000) })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.text()
    } catch (error) {
      // Un tropiezo de red (conexión caída, tiempo agotado) se reintenta una vez; un HTTP de error no.
      if (intento >= intentos || /^HTTP /.test(error.message)) throw error
      await new Promise(resolver => setTimeout(resolver, 1500))
    }
  }
}

export async function recogerTendencias({ config, conNoticias = true, registro = () => {} }) {
  const trends = []
  for (const pais of config?.tendencias?.paises || []) {
    try {
      trends.push(...leerRssTrends(await traer(`https://trends.google.com/trending/rss?geo=${pais}`), pais))
    } catch (error) { registro(`Trends ${pais}: ${error.message}`) }
  }
  const noticias = []
  if (conNoticias) {
    const { hl = 'es-419', gl = 'CO', ceid = 'CO:es-419' } = config?.tendencias?.idiomaNoticias || {}
    const ventana = config?.tendencias?.ventanaNoticias || '1d'
    const consultas = [
      ...(config?.competiciones || []).map(c => c.consulta),
      ...(config?.clubesDeMayorInteres || []).map(c => `"${c.nombre}"`),
      ...(config?.figuras || []).map(f => `"${f}"`)
    ]
    for (const consulta of consultas) {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`${consulta} when:${ventana}`)}&hl=${hl}&gl=${gl}&ceid=${encodeURIComponent(ceid)}`
      try { noticias.push(...leerRssNoticias(await traer(url), consulta).slice(0, 15)) } catch (error) { registro(`Noticias «${consulta}»: ${error.message}`) }
    }
  }
  return { trends, noticias }
}

async function main() {
  const args = process.argv.slice(2)
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : null }
  const config = JSON.parse(await readFile(resolve(RAIZ, 'config', 'fuentesFutbolInternacional.json'), 'utf8'))
  const { trends, noticias } = await recogerTendencias({ config, conNoticias: !args.includes('--sin-noticias'), registro: t => process.stderr.write(`${t}\n`) })
  const temas = rankearTemas({ trends, noticias, config, maximo: Number(valor('--maximo')) || 40 })
  // Notas con URL real para los primeros temas (radar de Bing Noticias), para leerlas completas antes de redactar.
  const conEnlaces = Number(valor('--con-enlaces') ?? 15)
  for (const tema of temas.slice(0, conEnlaces)) {
    try {
      tema.notas = leerRssBing(await traer(`https://www.bing.com/news/search?q=${encodeURIComponent(tema.tema)}&format=rss&setlang=es&cc=CO`)).slice(0, 6)
    } catch (error) { process.stderr.write(`Bing «${tema.tema}»: ${error.message}
`) }
  }
  const salida = { generadoEn: new Date().toISOString(), paises: config.tendencias.paises, señales: { trends: trends.length, titularesRadar: noticias.length }, nota: config.tendencias.nota, temas }
  if (valor('--salida')) await writeFile(resolve(valor('--salida')), JSON.stringify(salida, null, 2))
  process.stdout.write(`Señales: ${trends.length} tendencias de Trends · ${noticias.length} titulares del radar\n`)
  temas.forEach((t, i) => process.stdout.write(`${String(i + 1).padStart(2)}. [${t.puntaje}] ${t.tema} · ${t.entidades.join(', ')}${t.paises.length ? ` · Trends ${t.paises.join('/')} ${t.trafico}+` : ''} · ${t.titularesRadar} titulares\n`))
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
