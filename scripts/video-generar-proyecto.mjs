// Generador del video diario: convierte un guion.json (skill pont3la10-video-diario-guion) en un
// proyecto de HyperFrames armado con el pack videos/pack-pont3la10.
// Uso:
//   node scripts/video-generar-proyecto.mjs <guion.json> [--salida videos/diario/<fecha>] [--repetir-fotos] [--sin-red]
// Reglas: siempre hay una imagen en pantalla; los gráficos son pequeños y van encima; un espacio sin
// foto queda marcado para que Juan ponga la suya (con --repetir-fotos se reutilizan las fotos del bloque).
import { readFile, writeFile, mkdir, copyFile, readdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const PACK = join(RAIZ, 'videos', 'pack-pont3la10')
const SITIO = 'https://www.pont3la10.com'

export const DURACIONES = { intro: 4.1, cierre: 6, suscribete: 4.5, rotulo: 5, datoMini: 5, marcadorMini: 5, segundosPorEspacio: 7, minimoSegmento: 2 }
export const PREFIJOS = {
  intro: 'intro-', galeria: 'gal-', rotulo: 'rotulo-', 'dato-mini': 'dm-', 'marcador-mini': 'mm-', ticker: 'ticker-',
  suscribete: 'sus-', cara: 'cara-', cierre: 'cierre-', 'transicion-barrido': 'barrido-', 'transicion-flash': 'flash-'
}
// Momento (s) del corte dentro de cada transición y del primer elemento que aterriza en cada superpuesto.
const CORTE = { 'transicion-barrido': 0.5, 'transicion-flash': 0.3 }
const DURACION_TRANSICION = { 'transicion-barrido': 1, 'transicion-flash': 0.6 }
const PICO = { 'whoosh-a': 0.162, 'whoosh-b': 0.197, pop: 0.12, clic: 0.073 }
const DURACION_SONIDO = { 'whoosh-a': 0.575, 'whoosh-b': 0.701, pop: 0.72, clic: 0.366 }
const CUADRO = 1 / 30

const redondear = valor => Math.round(valor * 100) / 100
export const contarPalabras = texto => String(texto || '').trim().split(/\s+/).filter(Boolean).length
export const segundosDeTexto = (texto, ppm) => redondear(Math.max(DURACIONES.minimoSegmento, contarPalabras(texto) / ppm * 60))

const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']
const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
export function fechaLarga(fechaIso) {
  const [anio, mes, dia] = String(fechaIso).split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  if (Number.isNaN(fecha.getTime())) return ''
  return `${DIAS[fecha.getUTCDay()]} ${dia} DE ${MESES[mes - 1]}`
}

// Copia una escena del pack con ids, composición y timeline propios, para montarla varias veces.
const atributo = valor => String(valor).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

export const IMAGEN_VACIA = 'assets/vacio.png'
// PNG transparente de 1×1: respaldo de las <img> cuya variable de foto viene vacía.
const PNG_VACIO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

export function instanciarEscena(html, escena, n, duracionInterna, variables = {}) {
  const prefijo = PREFIJOS[escena]
  if (!prefijo) throw new Error(`Escena desconocida: ${escena}`)
  const nuevo = `${prefijo.slice(0, -1)}${n}-`
  const id = `${escena}-${n}`
  const sinGuion = valor => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let salida = html
    // Primero los ids propios (sin tocar «data-composition-id»), luego la composición y su timeline.
    .replace(new RegExp(`(?<![-\\w])id="${sinGuion(prefijo)}`, 'g'), `id="${nuevo}`)
    .replaceAll(`#${prefijo}`, `#${nuevo}`)
    .replaceAll(`data-composition-id="${escena}"`, `data-composition-id="${id}"`)
    .replaceAll(`window.__timelines["${escena}"]`, `window.__timelines["${id}"]`)
  // Las fotos de ejemplo del pack no viajan al proyecto: cada <img> con variable usa su valor o un PNG vacío.
  salida = salida.replace(/src="[^"]*"(\s+data-var-src="([^"]+)")/g, (_, resto, clave) => `src="${atributo(variables[clave] || IMAGEN_VACIA)}"${resto}`)
  if (duracionInterna) {
    // El clip raíz de la escena dura lo que su espacio en la línea de tiempo.
    salida = salida.replace(/(class="clip" data-start="0" data-duration=")[\d.]+(")/, `$1${redondear(duracionInterna)}$2`)
  }
  return salida
}

function fotosDeBloque(bloque) {
  const vistas = new Set()
  const fotos = []
  for (const plano of bloque.planos || []) {
    if (!plano?.imagen || vistas.has(plano.imagen)) continue
    vistas.add(plano.imagen)
    fotos.push({ url: plano.imagen, credito: plano.credito || '' })
  }
  return fotos
}

// Reparte la voz de un bloque en galerías de hasta 3 espacios (uno cada ~7 s).
export function repartirGalerias(duracion, fotos, repetir) {
  const espacios = Math.max(1, Math.ceil(duracion / DURACIONES.segundosPorEspacio))
  const porEspacio = duracion / espacios
  const lista = Array.from({ length: espacios }, (_, i) => {
    if (i < fotos.length) return fotos[i]
    if (repetir && fotos.length) return fotos[i % fotos.length]
    return { url: '', credito: '' }
  })
  const galerias = []
  for (let i = 0; i < lista.length; i += 3) {
    const grupo = lista.slice(i, i + 3)
    galerias.push({ inicio: redondear(i * porEspacio), duracion: redondear(grupo.length * porEspacio), espacios: grupo, segundosPorFoto: redondear(porEspacio) })
  }
  return galerias
}

function variablesGaleria(galeria, rutaFoto) {
  const variables = { cantidad: galeria.espacios.length, segundosPorFoto: galeria.segundosPorFoto }
  galeria.espacios.forEach((espacio, i) => {
    variables[`foto${i + 1}`] = espacio.url ? rutaFoto(espacio.url) : ''
    variables[`credito${i + 1}`] = espacio.url && espacio.credito ? `Foto: ${espacio.credito}` : ''
  })
  for (let i = galeria.espacios.length + 1; i <= 3; i++) { variables[`foto${i}`] = ''; variables[`credito${i}`] = '' }
  return variables
}

// Arma la línea de tiempo completa sin tocar disco ni red.
export function planificar(guion, { ppm = 155, repetirFotos = false, titulares = {}, rutaFoto = url => url, estudio = {} } = {}) {
  const escenas = []
  const sonidos = []
  const segmentos = []
  const medios = []
  const resumenFotos = []
  const grabaciones = estudio.grabaciones || {}
  const extra = clave => (estudio.fotosExtra?.[clave] || []).filter(f => f?.ruta).map(f => ({ url: f.ruta, credito: f.credito || '' }))
  const bloques = Array.isArray(guion?.bloques) ? guion.bloques : []
  const fotosPorBloque = bloques.map(bloque => [...fotosDeBloque(bloque), ...extra(bloque.id)])
  const portada = fotosPorBloque.find(fotos => fotos.length)?.[0]
  let t = 0
  let transiciones = 0

  const sonido = (archivo, momento, volumen = 0.7, extra = {}) => {
    const inicio = redondear(Math.max(0, momento + CUADRO - (PICO[archivo] ?? 0)))
    sonidos.push({ archivo, inicio, duracion: DURACION_SONIDO[archivo] ?? 1, volumen, ...extra })
  }
  const transicion = (enSegundo) => {
    const escena = transiciones % 2 === 0 ? 'transicion-barrido' : 'transicion-flash'
    escenas.push({ escena, inicio: redondear(enSegundo - CORTE[escena]), duracion: DURACION_TRANSICION[escena], capa: 9 })
    sonido(transiciones % 2 === 0 ? 'whoosh-a' : 'whoosh-b', enSegundo, 0.75)
    transiciones++
  }
  const cara = (id, texto, etiqueta, bloque) => {
    const grabada = grabaciones[id]
    const duracion = grabada?.duracion > 0 ? redondear(grabada.duracion) : segundosDeTexto(texto, ppm)
    if (grabada?.archivo) medios.push({ tipo: 'video', id, archivo: grabada.archivo, inicio: t, duracion })
    else escenas.push({ escena: 'cara', inicio: t, duracion, capa: 1, variables: { duracion: `${String(duracion).replace('.', ',')} segundos`, guion: `«${String(texto || '').trim()}»` }, duracionInterna: duracion })
    segmentos.push({ id, tipo: 'cara', etiqueta, bloque, inicio: t, fin: redondear(t + duracion), texto: String(texto || '').trim(), grabado: Boolean(grabada?.archivo) })
    t = redondear(t + duracion)
  }
  const voz = (id, texto, etiqueta, bloque, fotos, claveFotos) => {
    const grabada = grabaciones[id]
    const duracion = grabada?.duracion > 0 ? redondear(grabada.duracion) : segundosDeTexto(texto, ppm)
    const inicio = t
    if (grabada?.archivo) medios.push({ tipo: 'audio', id, archivo: grabada.archivo, inicio, duracion })
    const galerias = repartirGalerias(duracion, fotos, repetirFotos)
    for (const galeria of galerias) {
      escenas.push({ escena: 'galeria', inicio: redondear(inicio + galeria.inicio), duracion: galeria.duracion, capa: 1, variables: variablesGaleria(galeria, rutaFoto), duracionInterna: galeria.duracion })
    }
    const espacios = galerias.reduce((suma, g) => suma + g.espacios.length, 0)
    resumenFotos.push({ clave: claveFotos, etiqueta, fotos: fotos.length, espacios, vacios: galerias.reduce((suma, g) => suma + g.espacios.filter(e => !e.url).length, 0) })
    segmentos.push({ id, tipo: 'voz', etiqueta, bloque, inicio, fin: redondear(inicio + duracion), texto: String(texto || '').trim(), grabado: Boolean(grabada?.archivo) })
    t = redondear(inicio + duracion)
    return { inicio, duracion }
  }

  // Intro con la foto principal del día.
  escenas.push({ escena: 'intro', inicio: 0, duracion: DURACIONES.intro, capa: 1, variables: { fondo: portada ? rutaFoto(portada.url) : '', kicker: 'NOTICIAS DEL FÚTBOL COLOMBIANO', fecha: fechaLarga(guion?.fecha) } })
  sonidos.push({ archivo: 'impacto', inicio: 0, duracion: 1.5, volumen: 0.8, mediaStart: 1.07 })
  t = DURACIONES.intro
  transicion(t)

  cara('gancho', guion?.gancho?.texto, 'Gancho', null)
  // Suscríbete al inicio (decisión de Juan): entra justo después del gancho, sobre la presentación.
  const inicioSuscribete = t
  escenas.push({ escena: 'suscribete', inicio: inicioSuscribete, duracion: DURACIONES.suscribete, capa: 5 })
  sonido('clic', inicioSuscribete + 1.35, 0.8)
  sonido('clic', inicioSuscribete + 2.4, 0.8)
  if (guion?.presentacion?.texto) {
    const fotos = [...fotosPorBloque.slice(0, 3).map(lista => lista[0]).filter(Boolean), ...extra('presentacion')]
    voz('presentacion', guion.presentacion.texto, 'Presentación', null, fotos, 'presentacion')
  }

  bloques.forEach((bloque, i) => {
    transicion(t)
    cara(`${bloque.id}-cara`, bloque.caraBreve, `Noticia ${i + 1} · toma a cámara`, bloque.id)
    const { inicio, duracion } = voz(`${bloque.id}-voz`, bloque.voz, `Noticia ${i + 1} · voz`, bloque.id, fotosPorBloque[i], bloque.id)
    const titular = bloque.titular || titulares[bloque.articuloSlug] || ''
    if (titular) {
      escenas.push({ escena: 'rotulo', inicio: redondear(inicio + 0.3), duracion: DURACIONES.rotulo, capa: 5, variables: { etiqueta: String(bloque.club || '').toUpperCase(), titular, fuente: bloque.fuente ? `Según ${bloque.fuente}` : '' } })
      sonido('pop', inicio + 0.4, 0.55)
    }
    if (bloque.marcador) {
      escenas.push({ escena: 'marcador-mini', inicio: redondear(inicio + 0.6), duracion: DURACIONES.marcadorMini, capa: 5, variables: bloque.marcador })
      sonido('pop', inicio + 0.7, 0.5)
    }
    if (bloque.dato && duracion >= 8) {
      const momento = redondear(inicio + Math.min(Math.max(6, duracion / 2), duracion - DURACIONES.datoMini))
      escenas.push({ escena: 'dato-mini', inicio: momento, duracion: DURACIONES.datoMini, capa: 5, variables: { fuente: bloque.fuente || '', ...bloque.dato } })
      sonido('pop', momento + 0.55, 0.55)
    }
  })

  if (guion?.preguntaFinal) {
    transicion(t)
    const ultimas = [...extra('pregunta'), ...(fotosPorBloque.slice().reverse().find(lista => lista.length) || [])]
    const { inicio } = voz('pregunta', guion.preguntaFinal, 'Pregunta final', null, ultimas, 'pregunta')
    escenas.push({ escena: 'rotulo', inicio: redondear(inicio + 0.2), duracion: DURACIONES.rotulo, capa: 5, variables: { etiqueta: 'TU OPINIÓN', titular: guion.preguntaFinal, fuente: 'Déjalo en los comentarios' } })
    sonido('pop', inicio + 0.3, 0.55)
  }

  if (guion?.cierre?.texto) cara('cierre', guion.cierre.texto, 'Cierre', null)

  transicion(t)
  escenas.push({ escena: 'cierre', inicio: t, duracion: DURACIONES.cierre, capa: 1, variables: { fondo: portada ? rutaFoto(portada.url) : '', web: 'pont3la10.com' } })
  t = redondear(t + DURACIONES.cierre)

  // Con voz grabada, los efectos bajan para no taparla.
  if (medios.length) for (const s of sonidos) s.volumen = redondear(s.volumen * 0.6)
  return { duracion: t, escenas, sonidos, segmentos, medios, resumenFotos }
}

export function armarIndex(plan, titulo) {
  const contadores = {}
  const hosts = plan.escenas.map((escena, i) => {
    contadores[escena.escena] = (contadores[escena.escena] || 0) + 1
    const id = `${escena.escena}-${contadores[escena.escena]}`
    escena.instancia = id
    escena.numero = contadores[escena.escena]
    const valores = escena.variables ? ` data-variable-values='${atributo(JSON.stringify(escena.variables))}'` : ''
    return `      <div id="${id}"${valores} data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-start="${escena.inicio}" data-duration="${escena.duracion}" data-track-index="${escena.capa === 1 ? 1 : escena.capa === 9 ? 5 : 3 + (i % 2)}" data-track-kind="graphics" data-width="1920" data-height="1080" style="z-index: ${escena.capa}"></div>`
  })
  const grabaciones = (plan.medios || []).map((m, i) => m.tipo === 'video'
    ? `      <video id="grabacion-${i + 1}" class="clip" src="${atributo(m.archivo)}" data-start="${m.inicio}" data-duration="${m.duracion}" data-track-index="2" playsinline data-has-audio="true" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; object-fit: cover; z-index: 1"></video>`
    : `      <audio id="grabacion-${i + 1}" class="clip" src="${atributo(m.archivo)}" data-start="${m.inicio}" data-duration="${m.duracion}" data-track-index="9" data-volume="1"></audio>`)
  const audios = plan.sonidos.map((s, i) => `      <audio id="sfx-${i + 1}" class="clip" src="assets/sonidos/${s.archivo}.mp3" data-start="${s.inicio}"${s.mediaStart ? ` data-media-start="${s.mediaStart}"` : ''} data-duration="${s.duracion}" data-track-index="${6 + (i % 3)}" data-volume="${s.volumen}"></audio>`)
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>${atributo(titulo)}</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; font-family: "Montserrat", sans-serif; }
    </style>
  </head>
  <body>
    <!-- Generado por scripts/video-generar-proyecto.mjs. Las escenas «cara» son los huecos de la toma a cámara;
         la voz se graba aparte y se agrega como <audio> en la fase de estudio. -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="${plan.duracion}" data-width="1920" data-height="1080">
${hosts.join('\n')}
${grabaciones.join('\n')}
${audios.join('\n')}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`
}

export function textoTeleprompter(plan) {
  const formato = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  return plan.segmentos.map(s => `[${formato(s.inicio)}–${formato(s.fin)}] ${s.tipo === 'cara' ? 'CARA' : 'VOZ'} · ${s.etiqueta}\n${s.texto}\n`).join('\n')
}

async function descargarFoto(url, destino) {
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
  const temporal = `${destino}.descarga`
  await writeFile(temporal, Buffer.from(await respuesta.arrayBuffer()))
  // Normaliza a JPG (las portadas llegan en WebP).
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', temporal, '-q:v', '2', destino])
  await rm(temporal, { force: true })
}

// Arma (o vuelve a armar) el proyecto. Si la carpeta tiene estudio.json, usa las grabaciones y fotos de Juan.
export async function generarProyecto({ guion, salida, repetirFotos = false, sinRed = false }) {
  const config = JSON.parse(await readFile(join(RAIZ, 'config', 'videoDiario.json'), 'utf8'))
  const rutaEstudio = join(salida, 'estudio.json')
  const estudio = existsSync(rutaEstudio) ? JSON.parse(await readFile(rutaEstudio, 'utf8')) : {}

  // Titulares de portada de cada artículo (para el rótulo), si el bloque no trae uno.
  const titulares = {}
  if (!sinRed) {
    for (const bloque of guion.bloques || []) {
      if (bloque.titular || !bloque.articuloSlug) continue
      try {
        const articulo = await (await fetch(`${SITIO}/api/articulos/${encodeURIComponent(bloque.articuloSlug)}`, { signal: AbortSignal.timeout(20_000) })).json()
        titulares[bloque.articuloSlug] = articulo?.tituloPortada || articulo?.titulo || ''
      } catch { /* sin titular: el bloque va sin rótulo */ }
    }
  }

  await mkdir(join(salida, 'compositions'), { recursive: true })
  await mkdir(join(salida, 'assets', 'fotos'), { recursive: true })
  await mkdir(join(salida, 'assets', 'sonidos'), { recursive: true })
  await writeFile(join(salida, 'guion.json'), JSON.stringify(guion, null, 1))

  // Fotos: una por URL única (se reutilizan si ya se descargaron); si falla, el espacio queda marcado.
  const rutas = new Map()
  const urls = [...new Set((guion.bloques || []).flatMap(b => (b.planos || []).map(p => p?.imagen).filter(Boolean)))]
  for (const [i, url] of urls.entries()) {
    const destino = `assets/fotos/foto-${i + 1}.jpg`
    if (existsSync(join(salida, destino))) { rutas.set(url, destino); continue }
    if (sinRed) { rutas.set(url, ''); continue }
    try { await descargarFoto(url, join(salida, destino)); rutas.set(url, destino) } catch (error) {
      process.stderr.write(`No se pudo descargar una foto (${error.message}); su espacio queda vacío.\n`)
      rutas.set(url, '')
    }
  }
  // Las fotos que sube Juan ya son rutas locales del proyecto.
  const rutaFoto = url => (String(url).startsWith('assets/') ? (existsSync(join(salida, url)) ? url : '') : (rutas.get(url) ?? ''))

  const plan = planificar(guion, { ppm: config.formato.palabrasPorMinuto, repetirFotos, titulares, rutaFoto, estudio })
  // Se borran las escenas de una generación anterior: el número de instancias cambia con los tiempos.
  for (const nombre of await readdir(join(salida, 'compositions'))) {
    if (nombre.endsWith('.html')) await rm(join(salida, 'compositions', nombre), { force: true })
  }
  await writeFile(join(salida, 'index.html'), armarIndex(plan, guion.tituloVideo || `Pont3la10 · ${guion.fecha}`))
  for (const escena of plan.escenas) {
    const html = await readFile(join(PACK, 'compositions', `${escena.escena}.html`), 'utf8')
    await writeFile(join(salida, 'compositions', `${escena.instancia}.html`), instanciarEscena(html, escena.escena, escena.numero, escena.duracionInterna, escena.variables))
  }
  await writeFile(join(salida, IMAGEN_VACIA), Buffer.from(PNG_VACIO, 'base64'))
  for (const nombre of ['logo-blanco.png', 'isotipo.png']) await copyFile(join(PACK, 'assets', nombre), join(salida, 'assets', nombre))
  for (const nombre of await readdir(join(PACK, 'assets', 'sonidos'))) await copyFile(join(PACK, 'assets', 'sonidos', nombre), join(salida, 'assets', 'sonidos', nombre))
  for (const nombre of ['hyperframes.json', 'package.json', 'meta.json']) {
    if (existsSync(join(PACK, nombre))) await copyFile(join(PACK, nombre), join(salida, nombre))
  }
  await writeFile(join(salida, 'teleprompter.txt'), textoTeleprompter(plan))
  await writeFile(join(salida, 'manifiesto.json'), JSON.stringify({ fecha: guion.fecha, tituloVideo: guion.tituloVideo, duracion: plan.duracion, segmentos: plan.segmentos, fotos: plan.resumenFotos, titulares }, null, 2))

  const vacios = plan.resumenFotos.reduce((suma, r) => suma + r.vacios, 0)
  return { salida, duracion: plan.duracion, escenas: plan.escenas.length, tomas: plan.segmentos.filter(s => s.tipo === 'cara').length, grabados: plan.segmentos.filter(s => s.grabado).length, tramos: plan.segmentos.length, vacios }
}

async function main() {
  const args = process.argv.slice(2)
  const archivo = args.find(a => !a.startsWith('--'))
  const valor = nombre => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : undefined }
  if (!archivo) {
    process.stderr.write('Uso: node scripts/video-generar-proyecto.mjs <guion.json> [--salida <dir>] [--repetir-fotos] [--sin-red]\n')
    process.exit(2)
  }
  const guion = JSON.parse(await readFile(resolve(archivo), 'utf8'))
  const salida = resolve(valor('--salida') || join(RAIZ, 'videos', 'diario', String(guion.fecha || 'sin-fecha')))
  const r = await generarProyecto({ guion, salida, repetirFotos: args.includes('--repetir-fotos'), sinRed: args.includes('--sin-red') })
  process.stdout.write(`Proyecto en ${r.salida}
Duración: ${r.duracion} s · ${r.escenas} escenas · ${r.tomas} tomas a cámara · ${r.grabados}/${r.tramos} tramos grabados · ${r.vacios} espacios de foto por llenar
`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
