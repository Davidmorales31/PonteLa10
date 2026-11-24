// Métricas propias de los videos del canal y qué estructura rinde mejor. Cierra el ciclo de mejora: une lo que YouTube mide
// (vistas, minutos vistos, porcentaje medio visto, suscriptores ganados) con la estructura o el formato con que se hizo cada
// video (guion.json del proyecto), y dice qué repetir y qué cambiar. El registro de «apuestas» sale solo: cada proyecto del
// estudio que ya subió su video (estudio.json → youtube.idVideo) es una apuesta.
//
// Uso: node scripts/video-metricas.mjs [--dias 28] [--salida informe.md]
//   Con el permiso opcional de Analytics (PONT3LA10_YOUTUBE_ANALITICA=1 al conectar) trae retención y minutos vistos; sin él,
//   usa solo las vistas y los me gusta de la API de datos. No publica nada ni toca el canal.
import { existsSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { accesoVigente, analiticaVideos, estadisticasVideos, estadoConexion } from './video-youtube.mjs'

const RAIZ = resolve(import.meta.dirname, '..')
const mediana = valores => {
  const lista = valores.filter(Number.isFinite).sort((a, b) => a - b)
  if (!lista.length) return 0
  const m = Math.floor(lista.length / 2)
  return lista.length % 2 ? lista[m] : (lista[m - 1] + lista[m]) / 2
}

/** Tipo de apuesta de un guion: «noticias / top», «documental / epoca-club», «reel / leyenda»… */
export function claseDeGuion(guion) {
  if (guion?.tipo === 'documental') return { categoria: 'documental', estructura: guion.formato || 'biografia' }
  if (guion?.tipo === 'reel') return { categoria: 'reel', estructura: guion.formato || 'sin formato' }
  return { categoria: 'noticias', estructura: guion?.estructura || 'directa' }
}

/** Proyectos del estudio con video ya subido a YouTube: { id, proyecto, edicion, categoria, estructura, titulo }. */
export async function proyectosConVideo(carpeta = join(RAIZ, 'videos', 'diario')) {
  if (!existsSync(carpeta)) return []
  const salida = []
  for (const nombre of await readdir(carpeta)) {
    try {
      const estudio = JSON.parse(await readFile(join(carpeta, nombre, 'estudio.json'), 'utf8'))
      const id = estudio?.youtube?.idVideo
      if (!id) continue
      const guion = JSON.parse(await readFile(join(carpeta, nombre, 'guion.json'), 'utf8').catch(() => '{}'))
      salida.push({ id, proyecto: nombre, edicion: guion.edicion || (/-internacional$/.test(nombre) ? 'internacional' : 'colombia'), ...claseDeGuion(guion), titulo: estudio.youtube.titulo || '' })
    } catch { /* proyecto sin estudio.json o ilegible: se ignora */ }
  }
  return salida
}

/** Cruza las filas de métricas (por id de video) con los proyectos. Lo que no tiene proyecto queda como «sin proyecto». */
export function unirConProyectos(filas, proyectos) {
  const porId = new Map(proyectos.map(p => [p.id, p]))
  return filas.map(f => {
    const id = f.video || f.id
    const p = porId.get(id)
    return {
      id, proyecto: p?.proyecto || 'sin proyecto', categoria: p?.categoria || 'otros', estructura: p?.estructura || 'sin dato', edicion: p?.edicion || '', titulo: p?.titulo || f.titulo || '',
      vistas: Number(f.views ?? f.vistas ?? 0), minutosVistos: f.estimatedMinutesWatched ?? null, duracionMediaSeg: f.averageViewDuration ?? null,
      porcentajeMedio: f.averageViewPercentage ?? null, suscriptores: f.subscribersGained ?? null
    }
  })
}

/** Resumen por categoría y estructura (mediana de vistas y de porcentaje visto, suscriptores ganados), de mayor a menor. */
export function rendimientoPorEstructura(unidos) {
  const grupos = new Map()
  for (const u of unidos) {
    const clave = `${u.categoria} / ${u.estructura}`
    if (!grupos.has(clave)) grupos.set(clave, [])
    grupos.get(clave).push(u)
  }
  return [...grupos].map(([clave, lista]) => ({
    clave, videos: lista.length, medianaVistas: mediana(lista.map(u => u.vistas)),
    medianaPorcentaje: lista.some(u => u.porcentajeMedio != null) ? mediana(lista.map(u => u.porcentajeMedio)) : null,
    suscriptores: lista.reduce((s, u) => s + (Number(u.suscriptores) || 0), 0)
  })).sort((a, b) => b.medianaVistas - a.medianaVistas)
}

/**
 * Qué hacer con cada video: los que pasan `umbral` veces la mediana del canal merecen un segundo ángulo en 7 días; los que
 * quedan por debajo de la mitad, un cambio de estructura o de título. Con menos de 5 videos no se decide nada.
 */
export function decisiones(unidos, { umbral = 3 } = {}) {
  const base = mediana(unidos.map(u => u.vistas))
  if (unidos.length < 5 || !base) return { mediana: base, duplicar: [], revisar: [], nota: 'Muy pocos videos para decidir (mínimo 5).' }
  return {
    mediana: base,
    duplicar: unidos.filter(u => u.vistas >= umbral * base).map(u => ({ ...u, veces: Math.round(u.vistas / base * 10) / 10 })),
    revisar: unidos.filter(u => u.vistas < base / 2).map(u => ({ ...u, veces: Math.round(u.vistas / base * 10) / 10 })),
    nota: ''
  }
}

const formatoNumero = n => (n == null ? '—' : Number(n).toLocaleString('es-CO', { maximumFractionDigits: 1 }))

export function informe({ unidos, desde, hasta, conAnalitica }) {
  const filas = rendimientoPorEstructura(unidos)
  const d = decisiones(unidos)
  const lineas = [
    `# Métricas propias del canal · ${desde} a ${hasta}`, '',
    conAnalitica ? 'Fuente: YouTube Analytics (con retención).' : 'Fuente: API de datos de YouTube (solo vistas y me gusta; para retención hay que conectar con el permiso de Analytics).', '',
    '## Rendimiento por estructura', '',
    '| Categoría / estructura | Videos | Mediana de vistas | Mediana de % visto | Suscriptores ganados |', '| --- | ---: | ---: | ---: | ---: |',
    ...filas.map(f => `| ${f.clave} | ${f.videos} | ${formatoNumero(f.medianaVistas)} | ${formatoNumero(f.medianaPorcentaje)} | ${formatoNumero(f.suscriptores)} |`), '',
    `## Qué hacer (mediana del canal: ${formatoNumero(d.mediana)} vistas)`, ''
  ]
  if (d.nota) lineas.push(d.nota)
  else {
    lineas.push(d.duplicar.length ? `**Sacar un segundo ángulo en 7 días** (pasan 3 veces la mediana): ${d.duplicar.map(u => `${u.titulo || u.proyecto} (${u.veces}×)`).join('; ')}.` : 'Ningún video pasa 3 veces la mediana todavía.')
    lineas.push(d.revisar.length ? `**Cambiar estructura o título** (menos de la mitad de la mediana): ${d.revisar.map(u => `${u.titulo || u.proyecto} (${u.veces}×)`).join('; ')}.` : 'Ninguno queda por debajo de la mitad.')
  }
  return `${lineas.join('\n')}\n`
}

const fechaBogota = (ms = Date.now()) => new Date(ms - 5 * 3_600_000).toISOString().slice(0, 10)

async function main() {
  const args = process.argv.slice(2)
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : null }
  const dias = Number(valor('--dias')) || 28
  const hasta = fechaBogota()
  const desde = fechaBogota(Date.now() - dias * 86_400_000)
  const proyectos = await proyectosConVideo()
  if (!proyectos.length) throw new Error('Ningún proyecto del estudio tiene un video subido a YouTube todavía (estudio.json → youtube.idVideo).')
  const acceso = await accesoVigente()
  const estado = await estadoConexion()
  let filas
  if (estado.analitica) filas = await analiticaVideos({ acceso, desde, hasta })
  else filas = (await estadisticasVideos({ ids: proyectos.map(p => p.id), acceso })).map(v => ({ video: v.id, views: v.vistas, titulo: v.titulo }))
  const texto = informe({ unidos: unirConProyectos(filas, proyectos), desde, hasta, conAnalitica: estado.analitica })
  if (valor('--salida')) await writeFile(resolve(valor('--salida')), texto)
  process.stdout.write(texto)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
