// Banco de leyendas: saca de un documental (guion.json) el material para sus Shorts y Reels sin investigar de nuevo.
// Los Shorts que más rinden son mini-historias y curiosidades de leyendas (docs/ESTUDIO_COMPETENCIA_AMPLIADO_2026-11-24.md),
// y cada documental ya trae la investigación, las fuentes y las fotos acreditadas. Este script no escribe los Shorts: reúne
// y ordena el material (hechos con número y su fuente, citas, fichas, hitos, fotos) y propone qué estructura sale de cada
// parte. El guion de cada Short lo escribe el agente (skill pont3la10-reels-guion) y lo valida video-rubrica-reels.mjs.
//
// Uso: node scripts/documental-shorts.mjs <guion.json> [--salida material-shorts.json]
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const CONTRASTE = /\b(pero|sin embargo|aunque|a pesar de|y aun as[ií]|a[uú]n as[ií]|nadie|casi nadie|nunca|jam[aá]s)\b/i
const DATO = /\d/
const frases = texto => String(texto || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean)

/** Material de un documental para sus Shorts: hechos con número y fuente, citas, fichas, hitos, fotos y estructuras propuestas. */
export function materialParaShorts(guion, { maximoHechosPorCapitulo = 3 } = {}) {
  const fuentes = new Map((guion?.fuentes || []).map(f => [f.id, { id: f.id, medio: f.medio, url: f.url }]))
  const hechos = []
  const citas = []
  const fichas = []
  const contadores = []
  const hitos = []
  const fotos = new Map()
  const videos = []
  for (const acto of guion?.actos || []) {
    for (const capitulo of acto.capitulos || []) {
      const usables = (capitulo.fuentes || []).map(id => fuentes.get(id)).filter(Boolean)
      const candidatas = frases(capitulo.voz).filter(f => f.length >= 40 && f.length <= 280 && DATO.test(f) && !f.includes('?'))
      for (const frase of candidatas.slice(0, maximoHechosPorCapitulo)) {
        hechos.push({ id: `h${hechos.length + 1}`, acto: acto.id, capitulo: capitulo.id, frase, contraste: CONTRASTE.test(frase), fuentes: usables })
      }
      for (const v of capitulo.visuales || []) {
        if (v.tipo === 'cita' || v.tipo === 'testimonio') citas.push({ capitulo: capitulo.id, texto: v.texto, autor: v.autor || v.quien || '', fuentes: usables })
        else if (v.tipo === 'ficha') fichas.push({ capitulo: capitulo.id, texto: v.texto })
        else if (v.tipo === 'contador') contadores.push({ capitulo: capitulo.id, hasta: v.hasta, texto: v.texto, fuente: v.fuente || '' })
        else if (v.tipo === 'linea-tiempo') for (const h of v.hitos || []) hitos.push({ capitulo: capitulo.id, ...h })
        else if (v.tipo === 'foto' && v.imagen && !fotos.has(v.imagen)) fotos.set(v.imagen, { imagen: v.imagen, credito: v.credito, capitulo: capitulo.id })
        else if (v.tipo === 'video' && v.video && !v.entrevista) videos.push({ video: v.video, desde: v.desde, credito: v.credito, licencia: v.licencia, capitulo: capitulo.id })
      }
    }
  }

  const sugerencias = []
  // La leyenda en 45 s: tres hechos de actos distintos, en orden (origen → apogeo → giro).
  const porActo = []
  for (const h of hechos) if (!porActo.some(x => x.acto === h.acto) && h.acto !== 'pregunta') porActo.push(h)
  if (porActo.length >= 3) {
    sugerencias.push({ formato: 'leyenda', protagonista: guion.protagonista, hechos: porActo.slice(0, 3).map(h => h.id), nota: 'Gancho con un rasgo extremo y un nombre; origen, apogeo con un dato y un giro o rareza; cierre que engancha con la primera frase (bucle).' })
  }
  // El dato que no cuadra: una cifra con contraste en la misma frase.
  for (const h of hechos.filter(x => x.contraste && x.fuentes.length).slice(0, 4)) {
    sugerencias.push({ formato: 'dato-no-cuadra', hechos: [h.id], nota: 'Una cifra, la contradicción y la explicación en una frase; nombra la fuente en la voz.' })
  }
  // Antes y después: una línea de tiempo con al menos dos hitos.
  if (hitos.length >= 2) sugerencias.push({ formato: 'antes-despues', hitos: hitos.slice(0, 3), nota: 'Dos o tres épocas con foto y una línea de cambio (visual «dividida»).' })
  // Una cita o un testimonio da un Short corto de «lo que dijo».
  for (const c of citas.slice(0, 2)) sugerencias.push({ formato: 'noticia', cita: c, nota: 'Una cita atribuida con su contexto, en 25–35 s.' })

  return {
    protagonista: guion?.protagonista || '', tema: guion?.tema || '', preguntaCentral: guion?.preguntaCentral || '',
    fuentes: [...fuentes.values()], hechos, citas, fichas, contadores, hitos, fotos: [...fotos.values()], videos, sugerencias
  }
}

async function main() {
  const args = process.argv.slice(2)
  const archivo = args.find(a => !a.startsWith('--'))
  if (!archivo) { process.stderr.write('Uso: node scripts/documental-shorts.mjs <guion.json> [--salida material-shorts.json]\n'); process.exit(2) }
  const ruta = resolve(archivo)
  const guion = JSON.parse(await readFile(ruta, 'utf8'))
  const material = materialParaShorts(guion)
  const i = args.indexOf('--salida')
  const salida = i >= 0 ? resolve(args[i + 1]) : join(dirname(ruta), 'material-shorts.json')
  await writeFile(salida, JSON.stringify(material, null, 2))
  const porFormato = {}
  for (const s of material.sugerencias) porFormato[s.formato] = (porFormato[s.formato] || 0) + 1
  process.stdout.write(`${material.hechos.length} hechos con número · ${material.citas.length} citas · ${material.fotos.length} fotos acreditadas · ${material.hitos.length} hitos\nShorts que se pueden armar: ${JSON.stringify(porFormato)}\nMaterial: ${salida}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
