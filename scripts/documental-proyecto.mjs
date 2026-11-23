// Convierte el guion del documental (videos/documentales/<carpeta>/guion.json) en un proyecto del estudio de video,
// para que el responsable lo grabe con el teleprompter como el video diario: un tramo de voz por capítulo, más el cierre.
// Uso: node scripts/documental-proyecto.mjs videos/documentales/2026-11-27-vozinha/guion.json
// Crea videos/diario/<fecha>-documental-<tema>/ (manifiesto.json, estudio.json y una copia del guion). Nunca pisa
// grabaciones ya hechas: si el proyecto existe, solo actualiza los textos de los tramos.
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const PALABRAS_POR_MINUTO = 160
const contar = texto => String(texto || '').trim().split(/\s+/).filter(Boolean).length
const redondear = n => Math.round(n * 100) / 100

export function nombreProyecto(guion) {
  const tema = String(guion.tema || 'documental').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 18)
  return `${guion.fecha}-documental-${tema}`.replace(/-+/g, '-')
}

/** Manifiesto del estudio: un tramo de voz por capítulo (id `cNN-voz`) y el cierre con la pregunta final. */
export function manifiestoDesdeGuion(guion) {
  const segmentos = []
  let t = 0
  for (const acto of guion.actos || []) {
    for (const capitulo of acto.capitulos || []) {
      const duracion = contar(capitulo.voz) / PALABRAS_POR_MINUTO * 60
      segmentos.push({ id: `${capitulo.id}-voz`, tipo: 'voz', etiqueta: `${acto.titulo} · ${capitulo.titulo}`, bloque: acto.id, inicio: redondear(t), fin: redondear(t + duracion), texto: capitulo.voz, grabado: false })
      t += duracion
    }
  }
  const cierre = [guion.preguntaFinal, guion.cierre].filter(Boolean).join(' ')
  const duracionCierre = contar(cierre) / PALABRAS_POR_MINUTO * 60
  segmentos.push({ id: 'cierre', tipo: 'voz', etiqueta: 'Cierre', bloque: null, inicio: redondear(t), fin: redondear(t + duracionCierre), texto: cierre, grabado: false })
  return {
    fecha: guion.fecha,
    tipo: 'documental',
    tituloVideo: guion.titulos?.[0] || guion.protagonista,
    sinCamara: true,
    duracion: redondear(t + duracionCierre),
    segmentos,
    fotos: [],
    titulares: guion.titulos || []
  }
}

async function main() {
  const archivo = process.argv[2]
  if (!archivo) { process.stderr.write('Uso: node scripts/documental-proyecto.mjs <guion.json>\n'); process.exit(2) }
  const guion = JSON.parse(await readFile(resolve(archivo), 'utf8'))
  if (guion.tipo !== 'documental' || !/^\d{4}-\d{2}-\d{2}$/.test(String(guion.fecha))) throw new Error('El guion debe ser de tipo documental y tener "fecha" (AAAA-MM-DD).')
  const nombre = nombreProyecto(guion)
  const carpeta = join(RAIZ, 'videos', 'diario', nombre)
  await mkdir(carpeta, { recursive: true })
  const manifiesto = manifiestoDesdeGuion(guion)
  await writeFile(join(carpeta, 'manifiesto.json'), JSON.stringify(manifiesto, null, 2))
  await writeFile(join(carpeta, 'guion.json'), JSON.stringify(guion, null, 2))
  const rutaEstudio = join(carpeta, 'estudio.json')
  const estudio = existsSync(rutaEstudio) ? JSON.parse(await readFile(rutaEstudio, 'utf8')) : { creado: new Date().toISOString() }
  estudio.sinCamara = true
  estudio.nombre = estudio.nombre || `Documental · ${guion.protagonista}`
  await writeFile(rutaEstudio, JSON.stringify(estudio, null, 2))
  process.stdout.write(`Proyecto del estudio listo: ${nombre} (${manifiesto.segmentos.length} tramos, ~${Math.round(manifiesto.duracion / 60)} min). Ábrelo en el estudio y graba capítulo por capítulo.\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exit(1) })
}
