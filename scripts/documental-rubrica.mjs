// Rúbrica ejecutable del guion del documental de los viernes (docs/PLAN_DOCUMENTAL_SEMANAL.md, fase 2).
// Uso: node scripts/documental-rubrica.mjs <guion.json> [--json]
// Sale con código 1 si el guion no se aprueba. Parámetros: config/documental.json. Además imprime los capítulos
// para la descripción de YouTube (tiempos estimados por palabras; el render los corrige con la voz real).
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
export const contarPalabras = texto => String(texto || '').trim().split(/\s+/).filter(Boolean).length
const sinTildes = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const EMOJI = /\p{Extended_Pictographic}/u
const esHttps = url => { try { return new URL(url).protocol === 'https:' } catch { return false } }

/** ¿Habla al público? Una pregunta con «ustedes», «tú», «comenten»… */
export function preguntaAlPublico(texto) {
  return String(texto || '').split(/(?<=[?¿.!])\s+/).some(frase => frase.includes('?') && /\b(ustedes|usted|tu|tú|te|comenten|cuentenme|cuéntenme|dejen|creen|crees|piensas|piensan)\b/i.test(frase))
}

/** Citas textuales sin atribución en la misma frase (riesgo de cita inventada). */
export function citasSinAtribucion(texto, verbos) {
  const frases = String(texto || '').split(/(?<=[.!?])\s+/)
  return frases.filter(f => /«[^»]{12,}»|“[^”]{12,}”|"[^"]{12,}"/.test(f) && !verbos.some(v => sinTildes(f).includes(sinTildes(v))))
}

/** Palabras con contenido (≥5 letras) para comparar la pregunta del inicio con el cierre. */
const palabrasClave = texto => new Set(sinTildes(texto).match(/[a-zñ]{5,}/g) || [])

export function capitulosYoutube(guion, ppm) {
  let segundos = 0
  const lineas = []
  for (const acto of guion.actos || []) {
    for (const capitulo of acto.capitulos || []) {
      const m = Math.floor(segundos / 60)
      const s = Math.floor(segundos % 60)
      lineas.push(`${m}:${String(s).padStart(2, '0')} ${capitulo.titulo || acto.titulo || capitulo.id}`)
      segundos += contarPalabras(capitulo.voz) / ppm * 60
    }
  }
  return lineas
}

export function evaluarDocumental(guion, config, { banco = null } = {}) {
  const errores = []
  const avisos = []
  const actos = Array.isArray(guion?.actos) ? guion.actos : []
  const capitulos = actos.flatMap(a => (a.capitulos || []).map(c => ({ ...c, acto: a.id })))
  const textoTotal = [...capitulos.map(c => c.voz), guion?.preguntaFinal, guion?.cierre].join(' ')
  const palabras = contarPalabras(capitulos.map(c => c.voz).join(' ')) + contarPalabras(guion?.preguntaFinal) + contarPalabras(guion?.cierre)
  const minutos = palabras / config.palabrasPorMinuto

  if (guion?.tipo !== 'documental') errores.push('El guion debe tener "tipo": "documental".')
  if (!String(guion?.protagonista || '').trim()) errores.push('Falta "protagonista" (la persona o el suceso).')
  if (!String(guion?.preguntaCentral || '').includes('?')) errores.push('Falta "preguntaCentral": la pregunta que el documental responde.')
  if (palabras < config.palabras.minimo || palabras > config.palabras.maximo) {
    errores.push(`Largo: ${palabras} palabras (~${minutos.toFixed(1)} min). Debe estar entre ${config.palabras.minimo} y ${config.palabras.maximo} (unos 21–30 min).`)
  }

  // Actos en el orden de la estructura medida.
  const ids = actos.map(a => a.id)
  if (JSON.stringify(ids) !== JSON.stringify(config.actos)) errores.push(`Los actos deben ser, en orden: ${config.actos.join(', ')}. Hay: ${ids.join(', ') || 'ninguno'}.`)

  // Acto 0: la pregunta, sin saludo.
  const pregunta = actos.find(a => a.id === 'pregunta')
  const textoPregunta = (pregunta?.capitulos || []).map(c => c.voz).join(' ')
  if (pregunta) {
    if (contarPalabras(textoPregunta) > config.pregunta.maximoPalabras) errores.push(`La apertura tiene ${contarPalabras(textoPregunta)} palabras: máximo ${config.pregunta.maximoPalabras} (unos 45 s).`)
    if (!textoPregunta.includes('?')) errores.push('La apertura debe plantear la pregunta central (con signo de interrogación).')
    const inicio = sinTildes(textoPregunta).trim()
    const prohibida = config.aperturasProhibidas.find(p => inicio.startsWith(sinTildes(p)))
    if (prohibida) errores.push(`La apertura no puede empezar con «${prohibida}»: arranca con la escena o la paradoja.`)
  }

  // Capítulos: cantidad, largo, fuentes y visuales.
  if (capitulos.length < config.capitulos.minimo || capitulos.length > config.capitulos.maximo) {
    errores.push(`Hay ${capitulos.length} capítulos: deben ser entre ${config.capitulos.minimo} y ${config.capitulos.maximo} (se graban uno por uno).`)
  }
  const fuentes = Array.isArray(guion?.fuentes) ? guion.fuentes : []
  const idsFuentes = new Set(fuentes.map(f => f.id))
  const idsCapitulos = new Set()
  let conFoto = 0
  for (const c of capitulos) {
    const n = contarPalabras(c.voz)
    if (!c.id || idsCapitulos.has(c.id)) errores.push(`Capítulo sin id o repetido (${c.id || 'sin id'}).`)
    idsCapitulos.add(c.id)
    if (!String(c.titulo || '').trim()) errores.push(`El capítulo ${c.id} no tiene título (va a los capítulos de YouTube).`)
    if (c.acto !== 'pregunta' && (n < config.capitulos.minimoPalabras || n > config.capitulos.maximoPalabras)) {
      errores.push(`El capítulo ${c.id} tiene ${n} palabras: entre ${config.capitulos.minimoPalabras} y ${config.capitulos.maximoPalabras} (1–3 min de grabación).`)
    }
    const propias = Array.isArray(c.fuentes) ? c.fuentes : []
    if (c.acto !== 'pregunta' && !propias.length) errores.push(`El capítulo ${c.id} no cita fuentes: cada dato sale de una fuente leída.`)
    for (const id of propias) if (!idsFuentes.has(id)) errores.push(`El capítulo ${c.id} cita la fuente «${id}», que no está en "fuentes".`)
    const visuales = Array.isArray(c.visuales) ? c.visuales : []
    if (!visuales.length) errores.push(`El capítulo ${c.id} no tiene visuales.`)
    for (const v of visuales) {
      if (v.tipo === 'foto') {
        if (!esHttps(v.imagen) || !String(v.credito || '').trim()) errores.push(`Foto sin URL https o sin crédito en el capítulo ${c.id}.`)
      } else if (!['linea-tiempo', 'mapa', 'ficha', 'titular', 'cita', 'clip-oficial'].includes(v.tipo)) {
        errores.push(`Visual desconocido «${v.tipo}» en el capítulo ${c.id}.`)
      }
      if (v.tipo === 'clip-oficial' && !String(v.credito || '').trim()) errores.push(`Clip sin crédito de la cuenta oficial en el capítulo ${c.id}.`)
    }
    if (visuales.some(v => v.tipo === 'foto')) conFoto += 1
    for (const frase of citasSinAtribucion(c.voz, config.verbosDeAtribucion)) errores.push(`Cita sin atribución en ${c.id}: «${frase.slice(0, 70)}…». Di quién lo dijo y dónde.`)
  }
  if (capitulos.length && conFoto / capitulos.length < config.proporcionCapitulosConFoto) {
    errores.push(`Solo ${conFoto} de ${capitulos.length} capítulos tienen foto real: al menos la mitad.`)
  }

  // Fuentes.
  const urls = fuentes.map(f => f.url)
  if (fuentes.length < config.fuentes.minimo) errores.push(`Hay ${fuentes.length} fuentes: mínimo ${config.fuentes.minimo}.`)
  if (new Set(urls).size !== urls.length) errores.push('Hay fuentes repetidas.')
  for (const f of fuentes) if (!f.id || !esHttps(f.url) || !String(f.medio || '').trim()) errores.push(`Fuente incompleta: ${f.id || f.url || 'sin datos'} (id, url https y medio).`)
  if (new Set(fuentes.map(f => sinTildes(f.medio))).size < config.fuentes.mediosDistintos) errores.push(`Las fuentes deben venir de al menos ${config.fuentes.mediosDistintos} medios distintos.`)

  // Preguntas al público, cierre y regreso a la pregunta central.
  const actosConPregunta = actos.filter(a => a.id !== 'pregunta' && preguntaAlPublico((a.capitulos || []).map(c => c.voz).join(' '))).length
  if (actosConPregunta < config.actosConPreguntaAlPublico) errores.push(`Solo ${actosConPregunta} actos hablan al público con una pregunta: mínimo ${config.actosConPreguntaAlPublico}.`)
  if (!String(guion?.preguntaFinal || '').includes('?')) errores.push('Falta "preguntaFinal" para invitar a comentar.')
  if (contarPalabras(guion?.cierre) > config.cierre.maximoPalabras || !String(guion?.cierre || '').trim()) errores.push(`El cierre debe existir y tener máximo ${config.cierre.maximoPalabras} palabras.`)
  const legado = actos.find(a => a.id === 'legado')
  const textoFinal = [(legado?.capitulos || []).map(c => c.voz).join(' '), guion?.preguntaFinal, guion?.cierre].join(' ')
  const comunes = [...palabrasClave(guion?.preguntaCentral)].filter(p => palabrasClave(textoFinal).has(p))
  if (comunes.length < 2) errores.push('El final no vuelve a la pregunta central: retómala con sus palabras y respóndela.')

  // Títulos y miniatura (molde medido: CONFLICTO | Nombre | Documental).
  const titulos = Array.isArray(guion?.titulos) ? guion.titulos.map(t => String(t || '').trim()) : []
  if (titulos.length < config.titulos.minimo || titulos.length > config.titulos.maximo) errores.push(`Debe haber entre ${config.titulos.minimo} y ${config.titulos.maximo} títulos para la prueba A/B.`)
  if (new Set(titulos.map(sinTildes)).size !== titulos.length) errores.push('Los títulos deben ser distintos entre sí.')
  for (const t of titulos) {
    if (t.length > config.titulos.maximoCaracteres) errores.push(`Título largo (${t.length} caracteres): «${t}».`)
    if (!t.includes('|')) errores.push(`El título sigue el molde «CONFLICTO | Nombre | Documental»: «${t}».`)
    if (!/\b[A-ZÁÉÍÓÚÑ]{4,}\b/.test(t)) errores.push(`El título necesita la palabra del conflicto en mayúsculas: «${t}».`)
    if (!sinTildes(t).includes(sinTildes(String(guion?.protagonista || '').split(/[\s(]/)[0]))) avisos.push(`El título no nombra al protagonista: «${t}».`)
  }
  const textoMiniatura = String(guion?.miniatura?.texto || '').trim()
  if (!textoMiniatura || contarPalabras(textoMiniatura) > 4) errores.push('La miniatura lleva un texto de 1 a 4 palabras (el conflicto).')

  if (EMOJI.test(textoTotal)) errores.push('El texto que se lee no lleva emojis.')

  // Temas sensibles: revisión expresa del responsable.
  const tema = banco?.temas?.find(t => t.id === guion?.tema)
  if (tema?.sensible && guion?.revisionSensible !== true) errores.push('Tema sensible: necesita "revisionSensible": true después de que el responsable apruebe el enfoque.')
  if (banco && guion?.tema && !tema) avisos.push(`El tema «${guion.tema}» no está en el banco: agrégalo para no repetirlo.`)

  return {
    estado: errores.length ? 'RECHAZADO' : 'APROBADO',
    errores,
    avisos,
    metricas: { palabras, minutos: Number(minutos.toFixed(1)), capitulos: capitulos.length, fuentes: fuentes.length, actosConPregunta },
    capitulosYoutube: capitulosYoutube(guion, config.palabrasPorMinuto)
  }
}

async function main() {
  const archivo = process.argv[2]
  if (!archivo) { process.stderr.write('Uso: node scripts/documental-rubrica.mjs <guion.json> [--json]\n'); process.exit(2) }
  const config = JSON.parse(await readFile(join(RAIZ, 'config', 'documental.json'), 'utf8'))
  const banco = JSON.parse(await readFile(join(RAIZ, 'config', 'bancoDocumentales.json'), 'utf8'))
  const guion = JSON.parse(await readFile(resolve(archivo), 'utf8'))
  const r = evaluarDocumental(guion, config, { banco })
  if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(r, null, 2)}\n`)
  else {
    process.stdout.write(`${r.estado} · ${r.metricas.palabras} palabras (~${r.metricas.minutos} min) · ${r.metricas.capitulos} capítulos · ${r.metricas.fuentes} fuentes\n`)
    for (const e of r.errores) process.stdout.write(`  ✗ ${e}\n`)
    for (const a of r.avisos) process.stdout.write(`  ! ${a}\n`)
    process.stdout.write(`\nCapítulos para YouTube (estimados):\n${r.capitulosYoutube.join('\n')}\n`)
  }
  if (r.estado !== 'APROBADO') process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
