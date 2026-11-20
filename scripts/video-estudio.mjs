// Estudio local del video diario: teleprompter, grabación de voz y cara por tramo, fotos por noticia,
// «Armar video» y render. Solo escucha en 127.0.0.1 y trabaja sobre videos/diario/<proyecto>/.
// Uso: npm run video:estudio   (o node scripts/video-estudio.mjs) y abrir http://localhost:4810
import http from 'node:http'
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs'
import { readFile, writeFile, readdir, stat, mkdir, rm, rename, copyFile } from 'node:fs/promises'
import { join, resolve, extname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { randomBytes } from 'node:crypto'
import { generarProyecto } from './video-generar-proyecto.mjs'
import { generarReel, crearProyectosReels, descripcionDeReel } from './video-generar-reel.mjs'
import { mezclarMusica, leerBiblioteca, rutaPista, descargarPista, atribucionDe } from './video-musica.mjs'
import { buscarFotosProyecto } from './video-buscar-fotos.mjs'
import { crearEncargo } from './video-encargo-miniaturas.mjs'
import { descripcionYoutube } from './video-descripcion.mjs'
import { accesoVigente, completarConexion, crearDesafio, desconectar, dirYoutube, estadoConexion, idVideoDe, leerCliente, leerToken, leerVideo, ponerMiniatura, ponerTitulo, subirVideo, tituloValido, urlAutorizacion } from './video-youtube.mjs'
import { crearClienteRedes, publicarReel, cancelarProgramacionReel, refrescarEstados, leerEstadoPublicaciones, MODOS } from './video-publicar-reels.mjs'

const ejecutar = promisify(execFile)
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const DIARIO = join(RAIZ, 'videos', 'diario')
const PAGINA = join(RAIZ, 'scripts', 'video-estudio', 'estudio.html')
const PUERTO = Number(process.env.VIDEO_ESTUDIO_PUERTO || 4810)
const HOST = '127.0.0.1'
const LIMITE_GRABACION = 400 * 1024 * 1024
const LIMITE_FOTO = 25 * 1024 * 1024
const TIPOS = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.webm': 'video/webm' }

export const proyectoValido = nombre => /^\d{4}-\d{2}-\d{2}(-[a-z0-9-]{1,30})?$/.test(String(nombre))
export const tramoValido = id => /^(gancho|presentacion|pregunta|cierre|[a-z0-9_]{1,20}-(cara|voz))$/.test(String(id))
// Tramos que se graban a cámara (salvo que el proyecto esté en modo «sin cámara»).
export const tramoDeCara = id => ['gancho', 'cierre'].includes(String(id)) || String(id).endsWith('-cara')
export const nombreValido = nombre => typeof nombre === 'string' && nombre.trim().length <= 60 && !/[<>]/.test(nombre) && ![...nombre].some(c => c.charCodeAt(0) < 32)
export const claveFotosValida = clave => /^(presentacion|pregunta|[a-z0-9_]{1,20})$/.test(String(clave))

// Resuelve una ruta relativa dentro de una carpeta base; null si intenta salir de ella.
export function rutaSegura(base, relativa) {
  const destino = resolve(base, relativa)
  const raiz = resolve(base)
  return destino === raiz || destino.startsWith(raiz + sep) ? destino : null
}

// Solo se aceptan peticiones dirigidas a este servidor local y, si traen Origin, desde la propia página.
export function peticionPermitida({ host, origin, metodo }, puerto = PUERTO) {
  const hosts = [`127.0.0.1:${puerto}`, `localhost:${puerto}`]
  if (!hosts.includes(String(host || ''))) return false
  if (metodo === 'GET' || metodo === 'HEAD') return !origin || hosts.some(h => origin === `http://${h}`)
  return Boolean(origin) && hosts.some(h => origin === `http://${h}`)
}

export const idReelValido = id => /^[a-z0-9_]{1,20}$/.test(String(id))

// La llave de redes vive en el .env de la raíz y solo la usa este servidor; nunca viaja a la página.
function cargarEntorno() {
  try { process.loadEnvFile(join(RAIZ, '.env')) } catch { /* sin .env: las funciones de redes avisan que falta la llave */ }
}
export function redesDisponibles() { cargarEntorno(); return Boolean(process.env.PONT3LA10_AGENTES_REDES_KEY) }
function clienteRedes() {
  cargarEntorno()
  return crearClienteRedes({ llave: process.env.PONT3LA10_AGENTES_REDES_KEY, base: process.env.PONT3LA10_AGENTES_REDES_BASE_URL || undefined })
}

const renders = new Map()
const conexionesYoutube = new Map()
const trabajosYoutube = new Map()
const REDIRECT_YOUTUBE = `http://127.0.0.1:${PUERTO}/oauth/youtube/callback`
const publicando = new Set()
const trabajosReels = new Map()
const ocupados = new Set()

async function iniciarConexionYoutube() {
  const cliente = await leerCliente()
  if (!cliente) throw Object.assign(new Error(`Falta cliente.json de Google Cloud en ${dirYoutube()} (ver docs/ESTUDIO_YOUTUBE.md).`), { estado: 409 })
  const estado = randomBytes(16).toString('hex')
  const { verificador, desafio } = crearDesafio()
  for (const [clave, pendiente] of conexionesYoutube) if (pendiente.expira < Date.now()) conexionesYoutube.delete(clave)
  conexionesYoutube.set(estado, { verificador, expira: Date.now() + 10 * 60_000 })
  return { url: urlAutorizacion({ clientId: cliente.clientId, redirect: REDIRECT_YOUTUBE, estado, desafio }) }
}

const escaparHtml = texto => String(texto).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
function paginaConexion(res, estado, titulo, mensaje) {
  res.writeHead(estado, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" })
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaparHtml(titulo)}</title><body style="font:16px system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem;color:#08204a"><h1>${escaparHtml(titulo)}</h1><p>${escaparHtml(mensaje)}</p><p><a href="/">Volver al estudio</a></p></body>`)
}

// Google vuelve aquí con ?code y ?state; el estado es de un solo uso y vence a los 10 minutos.
async function terminarConexionYoutube(res, url) {
  const estado = url.searchParams.get('state') || ''
  const pendiente = conexionesYoutube.get(estado)
  conexionesYoutube.delete(estado)
  if (url.searchParams.get('error')) return paginaConexion(res, 400, 'No se conectó YouTube', 'Cancelaste la autorización o Google la rechazó. Puedes intentarlo de nuevo desde el estudio.')
  if (!pendiente || pendiente.expira < Date.now() || !url.searchParams.get('code')) return paginaConexion(res, 400, 'Enlace no válido', 'Esta conexión venció o no se inició desde el estudio. Vuelve y pulsa «Conectar con YouTube».')
  try {
    const canal = await completarConexion({ codigo: url.searchParams.get('code'), verificador: pendiente.verificador, redirect: REDIRECT_YOUTUBE })
    return paginaConexion(res, 200, 'YouTube conectado', `Canal: ${canal.titulo}. Ya puedes cerrar esta pestaña y volver al estudio.`)
  } catch (error) {
    return paginaConexion(res, error.estado || 500, 'No se pudo conectar', error.estado ? error.message : 'Ocurrió un error al conectar. Intenta de nuevo.')
  }
}

// Sube el video final en segundo plano (privado o no listado) y vincula el proyecto al video creado.
function subirVideoProyecto({ proyecto, titulo, descripcion, privacidad, acceso }) {
  const trabajo = { estado: 'subiendo', subido: 0, total: 0, error: null }
  trabajosYoutube.set(proyecto, trabajo)
  void (async () => {
    try {
      const video = await subirVideo({ ruta: join(carpetaDe(proyecto), 'renders', 'final.mp4'), titulo, descripcion, privacidad, acceso, alProgresar: (subido, total) => { trabajo.subido = subido; trabajo.total = total } })
      if (!video.id) throw Object.assign(new Error('YouTube no devolvió el ID del video; revísalo en YouTube Studio.'), { estado: 502 })
      await guardarEstudio(proyecto, estudio => { estudio.youtube = { idVideo: video.id, titulo: video.titulo, privacidad: video.privacidad } })
      trabajo.estado = 'listo'
    } catch (error) {
      trabajo.estado = 'error'
      trabajo.error = error.estado ? error.message : 'No se pudo subir el video. Intenta de nuevo.'
      if (!error.estado) process.stderr.write(`[estudio] subida a YouTube: ${error?.stack || error}
`)
    }
  })()
}

function responder(res, estado, cuerpo) {
  res.writeHead(estado, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(cuerpo))
}

async function leerCuerpo(req, limite) {
  const partes = []
  let total = 0
  for await (const parte of req) {
    total += parte.length
    if (total > limite) throw Object.assign(new Error('El archivo es demasiado grande.'), { estado: 413 })
    partes.push(parte)
  }
  return Buffer.concat(partes)
}

const leerJson = async ruta => (existsSync(ruta) ? JSON.parse(await readFile(ruta, 'utf8')) : null)
const carpetaDe = proyecto => join(DIARIO, proyecto)

async function duracionDe(archivo) {
  const { stdout } = await ejecutar('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo])
  return Math.round(Number(stdout.trim()) * 100) / 100
}

async function listarProyectos() {
  if (!existsSync(DIARIO)) return []
  const salida = []
  // Primero el día más reciente; dentro de un día, el video y después sus Reels (reel-1, reel-2…).
  const orden = (a, b) => b.slice(0, 10).localeCompare(a.slice(0, 10)) || a.localeCompare(b, 'es', { numeric: true })
  for (const nombre of (await readdir(DIARIO)).sort(orden)) {
    if (!proyectoValido(nombre)) continue
    const carpeta = join(DIARIO, nombre)
    const manifiesto = await leerJson(join(carpeta, 'manifiesto.json'))
    if (!manifiesto) continue
    const estudio = (await leerJson(join(carpeta, 'estudio.json'))) || {}
    const grabaciones = estudio.grabaciones || {}
    const reels = await leerJson(join(carpeta, 'renders', 'reels', 'reels.json'))
    const final = join(carpeta, 'renders', 'final.mp4')
    salida.push({
      nombre,
      apodo: estudio.nombre || '',
      fecha: manifiesto.fecha,
      titulo: manifiesto.tituloVideo,
      duracion: manifiesto.duracion,
      tramos: manifiesto.segmentos.length,
      grabados: manifiesto.segmentos.filter(s => grabaciones[s.id]).length,
      vacios: (manifiesto.fotos || []).reduce((suma, f) => suma + (f.vacios || 0), 0),
      sinCamara: Boolean(estudio.sinCamara),
      tipo: manifiesto.tipo || 'video',
      renderizado: existsSync(final),
      reels: reels?.reels?.length || 0,
      actualizado: estudio.actualizado || (await stat(join(carpeta, 'manifiesto.json'))).mtime.toISOString()
    })
  }
  return salida
}

async function detalleProyecto(proyecto) {
  const carpeta = carpetaDe(proyecto)
  const manifiesto = await leerJson(join(carpeta, 'manifiesto.json'))
  if (!manifiesto) return null
  const estudio = (await leerJson(join(carpeta, 'estudio.json'))) || {}
  const render = renders.get(proyecto)
  const trabajoReels = trabajosReels.get(proyecto)
  const final = join(carpeta, 'renders', 'final.mp4')
  const reels = await leerJson(join(carpeta, 'renders', 'reels', 'reels.json'))
  const publicaciones = await leerEstadoPublicaciones(carpeta)
  const guion = (await leerJson(join(carpeta, 'guion.json'))) || {}
  const biblioteca = await leerBiblioteca()
  const carpetaMiniaturas = join(carpeta, 'renders', 'miniaturas')
  const miniaturas = existsSync(carpetaMiniaturas) ? (await readdir(carpetaMiniaturas)).filter(n => /^miniatura-[a-z0-9-]{1,30}\.jpg$/.test(n)).sort() : []
  const encargo = join(carpetaMiniaturas, 'ENCARGO-CODEX.md')
  return {
    proyecto, manifiesto, estudio,
    render: render ? { estado: render.estado, registro: render.registro.slice(-1200) } : null,
    videoFinal: existsSync(final) ? `/archivos/${proyecto}/renders/final.mp4?v=${(await stat(final)).mtimeMs}` : null,
    reelsEstado: trabajoReels ? { estado: trabajoReels.estado, registro: trabajoReels.registro.slice(-600) } : null,
    redes: { disponible: redesDisponibles() },
    youtube: {
      ...(await estadoConexion()), video: estudio.youtube || null,
      subida: trabajosYoutube.get(proyecto) ? { estado: trabajosYoutube.get(proyecto).estado, subido: trabajosYoutube.get(proyecto).subido, total: trabajosYoutube.get(proyecto).total, error: trabajosYoutube.get(proyecto).error } : null,
      puedeSubir: existsSync(final)
    },
    musica: { elegida: estudio.musica || null, pistas: biblioteca.pistas.map(p => ({ id: p.id, titulo: p.titulo, autor: p.autor, licencia: p.licencia, estilo: p.estilo, descargada: existsSync(rutaPista(p.id)) })) },
    tipo: guion.tipo === 'reel' ? 'reel' : 'video',
    guionReels: existsSync(join(carpeta, 'guion-reels.json')) ? ((await leerJson(join(carpeta, 'guion-reels.json')))?.reels?.length || 0) : 0,
    titulos: guion.titulos?.length ? guion.titulos : [guion.tituloVideo || guion.titulo].filter(Boolean),
    miniaturaTexto: guion.miniatura || null,
    descripcionYoutube: guion.tipo === 'reel' ? descripcionDeReel(guion, await atribucionDe(estudio.musica)) : descripcionYoutube({ guion, manifiesto, estudio, titulares: manifiesto.titulares || {}, atribucionMusica: await atribucionDe(estudio.musica) }),
    miniaturas: await Promise.all(miniaturas.map(async n => ({ nombre: n, url: `/archivos/${proyecto}/renders/miniaturas/${n}?v=${(await stat(join(carpetaMiniaturas, n))).mtimeMs}` }))),
    encargo: existsSync(encargo) ? await readFile(encargo, 'utf8') : null,
    reels: reels ? reels.reels.map(r => ({ ...r, url: `/archivos/${proyecto}/${r.archivo}?v=${Date.parse(reels.creado)}`, publicacion: publicaciones[r.id] || null })) : []
  }
}

async function guardarEstudio(proyecto, cambio) {
  const ruta = join(carpetaDe(proyecto), 'estudio.json')
  const estudio = (await leerJson(ruta)) || {}
  cambio(estudio)
  estudio.actualizado = new Date().toISOString()
  await writeFile(ruta, JSON.stringify(estudio, null, 2))
  return estudio
}

async function guardarGrabacion(proyecto, tramo, cuerpo) {
  const carpeta = carpetaDe(proyecto)
  const manifiesto = await leerJson(join(carpeta, 'manifiesto.json'))
  const segmento = manifiesto?.segmentos.find(s => s.id === tramo)
  if (!segmento) throw Object.assign(new Error('Ese tramo no existe en el proyecto.'), { estado: 404 })
  if (cuerpo.length < 1000) throw Object.assign(new Error('La grabación está vacía.'), { estado: 422 })
  await mkdir(join(carpeta, 'assets', 'grabaciones'), { recursive: true })
  const original = join(carpeta, 'assets', 'grabaciones', `${tramo}.original.webm`)
  await writeFile(original, cuerpo)
  const estudioActual = (await leerJson(join(carpeta, 'estudio.json'))) || {}
  const esVideo = tramoDeCara(tramo) && !estudioActual.sinCamara
  const relativo = `assets/grabaciones/${tramo}.${esVideo ? 'mp4' : 'm4a'}`
  const destino = join(carpeta, relativo)
  const temporal = `${destino}.tmp${esVideo ? '.mp4' : '.m4a'}`
  // Voz normalizada para redes (-16 LUFS) y video con un cuadro clave por segundo para que el editor busque bien.
  const audio = ['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000']
  const video = esVideo ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-g', '30', '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080'] : ['-vn']
  await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', original, ...video, ...audio, temporal], { maxBuffer: 10 * 1024 * 1024 })
  await rename(temporal, destino)
  const duracion = await duracionDe(destino)
  await guardarEstudio(proyecto, estudio => {
    estudio.grabaciones = estudio.grabaciones || {}
    estudio.grabaciones[tramo] = { archivo: relativo, duracion, tipo: esVideo ? 'cara' : 'voz', guardado: new Date().toISOString() }
  })
  return { tramo, archivo: relativo, duracion }
}

async function borrarGrabacion(proyecto, tramo) {
  const carpeta = carpetaDe(proyecto)
  await guardarEstudio(proyecto, estudio => { if (estudio.grabaciones) delete estudio.grabaciones[tramo] })
  for (const ext of ['mp4', 'm4a', 'original.webm']) await rm(join(carpeta, 'assets', 'grabaciones', `${tramo}.${ext}`), { force: true })
}

async function guardarFoto(proyecto, clave, cuerpo, credito) {
  const carpeta = carpetaDe(proyecto)
  const manifiesto = await leerJson(join(carpeta, 'manifiesto.json'))
  if (!manifiesto?.fotos?.some(f => f.clave === clave)) throw Object.assign(new Error('Esa noticia no existe en el proyecto.'), { estado: 404 })
  const textoCredito = String(credito || '').trim()
  if (textoCredito.length < 2 || textoCredito.length > 120) throw Object.assign(new Error('Escribe el crédito de la foto (2 a 120 caracteres).'), { estado: 422 })
  if (cuerpo.length < 1000) throw Object.assign(new Error('La imagen está vacía.'), { estado: 422 })
  await mkdir(join(carpeta, 'assets', 'fotos'), { recursive: true })
  const marca = Date.now().toString(36)
  const original = join(carpeta, 'assets', 'fotos', `subida-${clave}-${marca}.original`)
  const relativo = `assets/fotos/subida-${clave}-${marca}.jpg`
  await writeFile(original, cuerpo)
  try {
    await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', original, '-vf', "scale='min(2400,iw)':-2", '-q:v', '2', join(carpeta, relativo)])
  } catch {
    throw Object.assign(new Error('No se pudo leer la imagen. Usa JPG, PNG o WebP.'), { estado: 422 })
  } finally {
    await rm(original, { force: true })
  }
  await guardarEstudio(proyecto, estudio => {
    estudio.fotosExtra = estudio.fotosExtra || {}
    estudio.fotosExtra[clave] = [...(estudio.fotosExtra[clave] || []), { ruta: relativo, credito: textoCredito }]
  })
  return { clave, ruta: relativo }
}

async function borrarFoto(proyecto, clave, indice) {
  const carpeta = carpetaDe(proyecto)
  let ruta = null
  await guardarEstudio(proyecto, estudio => {
    const lista = estudio.fotosExtra?.[clave] || []
    ruta = lista[indice]?.ruta || null
    // Una foto automática que Juan quita no vuelve a aparecer en la siguiente búsqueda.
    const origen = lista[indice]?.auto && lista[indice].origenImagen
    if (origen) estudio.fotosDescartadas = [...new Set([...(estudio.fotosDescartadas || []), origen])].slice(-500)
    estudio.fotosExtra[clave] = lista.filter((_, i) => i !== indice)
  })
  const archivo = ruta && rutaSegura(carpeta, ruta)
  if (archivo) await rm(archivo, { force: true })
}

// Miniatura entregada (por Codex o a mano): se normaliza a JPG 1280×720 de menos de 2 MB, como pide YouTube.
async function guardarMiniatura(proyecto, cuerpo) {
  if (cuerpo.length < 1000) throw Object.assign(new Error('La imagen está vacía.'), { estado: 422 })
  const carpeta = join(carpetaDe(proyecto), 'renders', 'miniaturas')
  await mkdir(carpeta, { recursive: true })
  const existentes = (await readdir(carpeta)).filter(n => /^miniatura-[a-z]\.jpg$/.test(n))
  const letra = 'abcdefghij'.split('').find(l => !existentes.includes(`miniatura-${l}.jpg`))
  if (!letra) throw Object.assign(new Error('Ya hay 10 miniaturas: borra alguna.'), { estado: 409 })
  const original = join(carpeta, `subida-${Date.now()}.original`)
  const nombre = `miniatura-${letra}.jpg`
  await writeFile(original, cuerpo)
  try {
    await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', original, '-vf', 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720', '-q:v', '3', join(carpeta, nombre)])
  } catch {
    throw Object.assign(new Error('No se pudo leer la imagen. Usa JPG, PNG o WebP.'), { estado: 422 })
  } finally {
    await rm(original, { force: true })
  }
  if ((await stat(join(carpeta, nombre))).size > 2 * 1024 * 1024) {
    await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(carpeta, nombre), '-q:v', '6', join(carpeta, `${nombre}.tmp.jpg`)])
    await rename(join(carpeta, `${nombre}.tmp.jpg`), join(carpeta, nombre))
  }
  return { nombre }
}

async function armar(proyecto) {
  const carpeta = carpetaDe(proyecto)
  const guion = await leerJson(join(carpeta, 'guion.json'))
  if (!guion) throw Object.assign(new Error('El proyecto no tiene guion.json: vuelve a generarlo con el script.'), { estado: 409 })
  // Un Reel con guion propio tiene su propio generador (vertical, subtítulos y cortes sincronizados con la voz).
  if (guion.tipo === 'reel') return generarReel({ guion, salida: carpeta })
  return generarProyecto({ guion, salida: carpeta })
}

// Volumen medio (dB) de un tramo del video; null si no se pudo medir.
async function volumenMedio(archivo, inicio, duracion) {
  try {
    const { stderr } = await ejecutar('ffmpeg', ['-hide_banner', '-ss', String(inicio), '-t', String(duracion), '-i', archivo, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { maxBuffer: 10 * 1024 * 1024 })
    const medio = /mean_volume:\s*(-?[\d.]+|-inf)/.exec(stderr)?.[1]
    return medio === undefined ? null : medio === '-inf' ? -120 : Number(medio)
  } catch { return null }
}

// Comprueba que la voz grabada se oye en el video renderizado (la voz de Juan debe quedar por encima de −35 dB).
export async function vozPresente(carpeta, video) {
  const estudio = (await leerJson(join(carpeta, 'estudio.json'))) || {}
  const manifiesto = (await leerJson(join(carpeta, 'manifiesto.json'))) || { segmentos: [] }
  const grabados = manifiesto.segmentos.filter(s => estudio.grabaciones?.[s.id] && s.fin - s.inicio >= 6)
  if (!grabados.length) return { ok: true, medidos: 0 }
  const muestras = [grabados[0], grabados[Math.floor(grabados.length / 2)], grabados.at(-1)]
  const niveles = []
  for (const s of muestras) {
    const nivel = await volumenMedio(video, s.inicio + 1, Math.min(5, s.fin - s.inicio - 1))
    if (nivel !== null) niveles.push(nivel)
  }
  return { ok: niveles.length === 0 || niveles.some(n => n > -35), medidos: niveles.length, niveles }
}

function renderizar(proyecto) {
  const carpeta = carpetaDe(proyecto)
  const estado = { estado: 'renderizando', registro: '' }
  renders.set(proyecto, estado)
  const proceso = spawn('npx', ['hyperframes', 'render', '--output', 'renders/final-voz.mp4'], { cwd: carpeta, shell: true, windowsHide: true })
  const anotar = parte => { estado.registro = (estado.registro + parte.toString()).slice(-20000) }
  proceso.stdout.on('data', anotar)
  proceso.stderr.on('data', anotar)
  proceso.on('close', async codigo => {
    if (codigo !== 0) { estado.estado = 'error'; ocupados.delete(proyecto); return }
    // Con la voz ya renderizada se mezcla la música elegida (baja sola cuando hablas).
    try {
      const estudio = (await leerJson(join(carpeta, 'estudio.json'))) || {}
      const voz = join(carpeta, 'renders', 'final-voz.mp4')
      const final = join(carpeta, 'renders', 'final.mp4')
      const control = await vozPresente(carpeta, voz)
      if (!control.ok) {
        estado.registro += '\nEl video salió SIN tu voz (las tomas no quedaron dentro del render). Pulsa Renderizar otra vez; si se repite, avísale a Claude.\n'
        estado.estado = 'error'
        ocupados.delete(proyecto)
        return
      }
      if (estudio.musica) { estado.registro += '\nMezclando la música…\n'; await mezclarMusica({ video: voz, id: estudio.musica, salida: final }) } else await copyFile(voz, final)
      // Un Reel con guion propio queda listo para publicarse desde «Ver Reels» (Facebook e Instagram).
      const guion = (await leerJson(join(carpeta, 'guion.json'))) || {}
      if (guion.tipo === 'reel') {
        await mkdir(join(carpeta, 'renders', 'reels'), { recursive: true })
        const manifiesto = (await leerJson(join(carpeta, 'manifiesto.json'))) || {}
        const reel = { id: String(guion.id || 'r1'), archivo: 'renders/final.mp4', duracion: manifiesto.duracion || 0, club: guion.club || '', descripcion: descripcionDeReel(guion, await atribucionDe(estudio.musica)), articulo: guion.articuloSlug || '' }
        await writeFile(join(carpeta, 'renders', 'reels', 'reels.json'), JSON.stringify({ creado: new Date().toISOString(), reels: [reel] }, null, 2))
      }
      estado.estado = 'listo'
    } catch (error) { estado.registro += `\nNo se pudo mezclar la música: ${error.message}\n`; estado.estado = 'error' }
    ocupados.delete(proyecto)
  })
}

// Reels: lanza scripts/video-reels.mjs (sin shell) y deja el avance en `trabajosReels`.
function crearReelsProyecto(proyecto) {
  const estado = { estado: 'creando', registro: '' }
  trabajosReels.set(proyecto, estado)
  const proceso = spawn(process.execPath, [join(RAIZ, 'scripts', 'video-reels.mjs'), proyecto], { cwd: RAIZ, windowsHide: true })
  const anotar = parte => { estado.registro = (estado.registro + parte.toString()).slice(-4000) }
  proceso.stdout.on('data', anotar)
  proceso.stderr.on('data', anotar)
  proceso.on('error', error => { estado.registro += error.message })
  proceso.on('close', codigo => { estado.estado = codigo === 0 ? 'listo' : 'error'; ocupados.delete(proyecto) })
}

async function servirArchivo(req, res, proyecto, relativo) {
  return servirRuta(req, res, rutaSegura(carpetaDe(proyecto), decodeURIComponent(relativo)))
}

async function servirRuta(req, res, archivo) {
  if (!archivo || !existsSync(archivo)) return responder(res, 404, { error: 'No encontrado.' })
  const info = await stat(archivo)
  const tipo = TIPOS[extname(archivo).toLowerCase()] || 'application/octet-stream'
  const rango = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '')
  if (rango) {
    const inicio = rango[1] ? Number(rango[1]) : 0
    const fin = rango[2] ? Math.min(Number(rango[2]), info.size - 1) : info.size - 1
    res.writeHead(206, { 'content-type': tipo, 'content-range': `bytes ${inicio}-${fin}/${info.size}`, 'accept-ranges': 'bytes', 'content-length': fin - inicio + 1, 'cache-control': 'no-store' })
    return createReadStream(archivo, { start: inicio, end: fin }).pipe(res)
  }
  res.writeHead(200, { 'content-type': tipo, 'content-length': info.size, 'accept-ranges': 'bytes', 'cache-control': 'no-store' })
  createReadStream(archivo).pipe(res)
}

// Huella del código del estudio: si cambia mientras corre (llegó una actualización), el proceso viejo ya no
// conoce las rutas nuevas que pide la página. El acceso directo del escritorio lo relanza con el código 75.
export const CODIGO_REINICIO = 75
export function huellaCodigo(carpeta = join(RAIZ, 'scripts')) {
  try {
    return String(Math.max(0, ...readdirSync(carpeta).filter(n => /^video-.*\.mjs$/.test(n)).map(n => statSync(join(carpeta, n)).mtimeMs)))
  } catch { return '0' }
}
const VERSION_INICIAL = huellaCodigo()
const reiniciable = process.env.PONT3LA10_ESTUDIO_REINICIABLE === '1'
const trabajando = () => ocupados.size > 0 || publicando.size > 0 || [...renders.values()].some(r => r.estado === 'renderizando') || [...trabajosReels.values()].some(r => r.estado === 'creando') || [...trabajosYoutube.values()].some(t => t.estado === 'subiendo')

export function crearServidor() {
  return http.createServer(async (req, res) => {
    try {
      if (!peticionPermitida({ host: req.headers.host, origin: req.headers.origin, metodo: req.method })) return responder(res, 403, { error: 'Solo se permite el estudio local.' })
      const url = new URL(req.url, `http://${req.headers.host}`)
      const partes = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
      res.setHeader('x-content-type-options', 'nosniff')

      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'content-security-policy': "default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'" })
        return res.end(await readFile(PAGINA))
      }
      if (partes[0] === 'archivos' && req.method === 'GET' && proyectoValido(partes[1])) return servirArchivo(req, res, partes[1], partes.slice(2).join('/'))
      if (partes[0] === 'musica' && req.method === 'GET' && /^[a-z0-9-]{1,40}\.m4a$/.test(partes[1] || '')) return servirRuta(req, res, rutaPista(partes[1].slice(0, -4)))
      // La página pregunta (solo cuando no estás grabando) si el estudio quedó desactualizado.
      if (partes[0] === 'api' && partes[1] === 'estudio' && partes[2] === 'estado' && req.method === 'GET') {
        const desactualizado = huellaCodigo() !== VERSION_INICIAL
        const reiniciando = desactualizado && reiniciable && !trabajando() && url.searchParams.get('reiniciar') === '1'
        responder(res, 200, { version: VERSION_INICIAL, desactualizado, reiniciable, reiniciando })
        if (reiniciando) setTimeout(() => process.exit(CODIGO_REINICIO), 300)
        return
      }
      if (req.method === 'GET' && url.pathname === '/oauth/youtube/callback') return terminarConexionYoutube(res, url)
      if (partes[0] === 'api' && partes[1] === 'youtube') {
        if (partes.length === 2 && req.method === 'GET') return responder(res, 200, await estadoConexion())
        if (partes[2] === 'conectar' && req.method === 'POST') return responder(res, 200, await iniciarConexionYoutube())
        if (partes[2] === 'desconectar' && req.method === 'POST') { await desconectar(); return responder(res, 200, await estadoConexion()) }
        return responder(res, 404, { error: 'No encontrado.' })
      }
      if (partes[0] !== 'api' || partes[1] !== 'proyectos') return responder(res, 404, { error: 'No encontrado.' })
      if (partes.length === 2 && req.method === 'GET') return responder(res, 200, { proyectos: await listarProyectos() })

      const proyecto = partes[2]
      if (!proyectoValido(proyecto) || !existsSync(join(carpetaDe(proyecto), 'manifiesto.json'))) return responder(res, 404, { error: 'Proyecto no encontrado.' })
      const accion = partes[3]

      if (!accion && req.method === 'GET') return responder(res, 200, await detalleProyecto(proyecto))
      if (accion === 'grabaciones' && tramoValido(partes[4])) {
        if (req.method === 'POST') return responder(res, 200, await guardarGrabacion(proyecto, partes[4], await leerCuerpo(req, LIMITE_GRABACION)))
        if (req.method === 'DELETE') { await borrarGrabacion(proyecto, partes[4]); return responder(res, 200, { ok: true }) }
      }
      if (accion === 'fotos' && claveFotosValida(partes[4])) {
        if (req.method === 'POST') return responder(res, 200, await guardarFoto(proyecto, partes[4], await leerCuerpo(req, LIMITE_FOTO), decodeURIComponent(String(req.headers['x-credito'] || ''))))
        if (req.method === 'DELETE' && /^\d{1,3}$/.test(partes[5] || '')) { await borrarFoto(proyecto, partes[4], Number(partes[5])); return responder(res, 200, { ok: true }) }
      }
      if (accion === 'musica' && req.method === 'POST') {
        let datos = {}
        try { datos = JSON.parse((await leerCuerpo(req, 2048)).toString('utf8') || '{}') } catch { return responder(res, 400, { error: 'Solicitud no válida.' }) }
        const biblioteca = await leerBiblioteca()
        const id = datos.id ? String(datos.id) : ''
        if (id && !biblioteca.pistas.some(p => p.id === id)) return responder(res, 404, { error: 'Esa pista no está en la biblioteca.' })
        if (id) await descargarPista(id)
        await guardarEstudio(proyecto, estudio => { estudio.musica = id || null })
        return responder(res, 200, { musica: id || null })
      }
      if (accion === 'reels-propios' && req.method === 'POST') {
        if (ocupados.has(proyecto)) return responder(res, 409, { error: 'El proyecto está ocupado: espera a que termine.' })
        ocupados.add(proyecto)
        try { return responder(res, 200, { reels: await crearProyectosReels({ proyecto }) }) } finally { ocupados.delete(proyecto) }
      }
      if (accion === 'buscar-fotos' && req.method === 'POST' && ((await leerJson(join(carpetaDe(proyecto), 'guion.json'))) || {}).tipo === 'reel') {
        return responder(res, 409, { error: 'En los Reels las fotos vienen del guion. Si quieres otra, súbela en el beat que corresponda.' })
      }
      if (accion === 'buscar-fotos' && req.method === 'POST') {
        if (ocupados.has(proyecto)) return responder(res, 409, { error: 'El proyecto está ocupado: espera a que termine.' })
        ocupados.add(proyecto)
        try {
          const r = await buscarFotosProyecto({ carpeta: carpetaDe(proyecto), registro: () => {} })
          return responder(res, 200, { agregadas: r.agregadas, vacios: r.vacios, resumen: r.resumen })
        } finally { ocupados.delete(proyecto) }
      }
      if ((accion === 'nombre' || accion === 'sin-camara') && req.method === 'POST') {
        let datos = {}
        try { datos = JSON.parse((await leerCuerpo(req, 2048)).toString('utf8') || '{}') } catch { return responder(res, 400, { error: 'Solicitud no válida.' }) }
        if (accion === 'nombre') {
          if (!nombreValido(datos.nombre)) return responder(res, 422, { error: 'El nombre debe tener máximo 60 caracteres.' })
          await guardarEstudio(proyecto, estudio => { estudio.nombre = datos.nombre.trim() })
          return responder(res, 200, { nombre: datos.nombre.trim() })
        }
        if (typeof datos.activo !== 'boolean') return responder(res, 422, { error: 'Indica si el proyecto va sin cámara.' })
        if (ocupados.has(proyecto)) return responder(res, 409, { error: 'El proyecto está ocupado: espera a que termine.' })
        ocupados.add(proyecto)
        try {
          await guardarEstudio(proyecto, estudio => { estudio.sinCamara = datos.activo })
          // Se vuelve a armar para que las entradas a cámara pasen a ser voz sobre fotos (o al revés).
          return responder(res, 200, { sinCamara: datos.activo, ...(await armar(proyecto)) })
        } finally { ocupados.delete(proyecto) }
      }
      if (accion === 'miniaturas') {
        const carpetaMiniaturas = join(carpetaDe(proyecto), 'renders', 'miniaturas')
        if (partes[4] === 'encargo' && req.method === 'POST') return responder(res, 200, await crearEncargo(carpetaDe(proyecto)))
        if (partes[4] === 'abrir' && req.method === 'POST') {
          await mkdir(carpetaMiniaturas, { recursive: true })
          spawn('explorer.exe', [carpetaMiniaturas], { detached: true, stdio: 'ignore' }).unref()
          return responder(res, 200, { ok: true })
        }
        if (!partes[4] && req.method === 'POST') return responder(res, 200, await guardarMiniatura(proyecto, await leerCuerpo(req, LIMITE_FOTO)))
        if (req.method === 'DELETE' && /^miniatura-[a-z0-9-]{1,30}\.jpg$/.test(partes[4] || '')) { await rm(join(carpetaMiniaturas, partes[4]), { force: true }); return responder(res, 200, { ok: true }) }
        return responder(res, 404, { error: 'No encontrado.' })
      }
      if (accion === 'youtube' && partes[4] === 'subir' && req.method === 'POST') {
        let datos = {}
        try { datos = JSON.parse((await leerCuerpo(req, 4096)).toString('utf8') || '{}') } catch { return responder(res, 400, { error: 'Solicitud no válida.' }) }
        if (trabajosYoutube.get(proyecto)?.estado === 'subiendo') return responder(res, 409, { error: 'Ya se está subiendo el video: espera a que termine.' })
        if (((await leerJson(join(carpetaDe(proyecto), 'estudio.json'))) || {}).youtube?.idVideo) return responder(res, 409, { error: 'Este proyecto ya tiene un video de YouTube vinculado. Desvincúlalo (campo vacío + Vincular) si quieres subir otro.' })
        if (!existsSync(join(carpetaDe(proyecto), 'renders', 'final.mp4'))) return responder(res, 409, { error: 'Primero renderiza el video final.' })
        if (!tituloValido(datos.titulo)) return responder(res, 422, { error: 'El título debe tener entre 5 y 100 caracteres y no puede llevar < ni >.' })
        const acceso = await accesoVigente()
        subirVideoProyecto({ proyecto, titulo: datos.titulo, descripcion: (await detalleProyecto(proyecto)).descripcionYoutube || '', privacidad: datos.privacidad === 'unlisted' ? 'unlisted' : 'private', acceso })
        return responder(res, 202, { estado: 'subiendo' })
      }
      if (accion === 'youtube' && req.method === 'POST' && ['video', 'miniatura', 'titulo'].includes(partes[4])) {
        let datos = {}
        try { datos = JSON.parse((await leerCuerpo(req, 4096)).toString('utf8') || '{}') } catch { return responder(res, 400, { error: 'Solicitud no válida.' }) }
        const clave = `youtube:${proyecto}`
        if (publicando.has(clave)) return responder(res, 409, { error: 'Ya hay una acción de YouTube en curso: espera a que termine.' })
        publicando.add(clave)
        try {
          if (partes[4] === 'video' && datos.video === '') {
            await guardarEstudio(proyecto, estudio => { delete estudio.youtube })
            return responder(res, 200, { video: null })
          }
          const acceso = await accesoVigente()
          const canalId = (await leerToken())?.canal?.id
          if (partes[4] === 'video') {
            const idVideo = idVideoDe(datos.video)
            if (!idVideo) return responder(res, 422, { error: 'Pega el enlace del video de YouTube (o su ID de 11 caracteres).' })
            const video = await leerVideo({ idVideo, acceso, canalId })
            const guardado = { idVideo, titulo: video.titulo, privacidad: video.privacidad }
            await guardarEstudio(proyecto, estudio => { estudio.youtube = guardado })
            return responder(res, 200, { video: guardado })
          }
          const vinculado = ((await leerJson(join(carpetaDe(proyecto), 'estudio.json'))) || {}).youtube
          if (!vinculado?.idVideo) return responder(res, 409, { error: 'Primero vincula el video de YouTube de este proyecto.' })
          if (partes[4] === 'miniatura') {
            if (!/^miniatura-[a-z0-9-]{1,30}\.jpg$/.test(String(datos.nombre || ''))) return responder(res, 422, { error: 'Miniatura no válida.' })
            const archivo = join(carpetaDe(proyecto), 'renders', 'miniaturas', datos.nombre)
            if (!existsSync(archivo)) return responder(res, 404, { error: 'Esa miniatura no existe en el proyecto.' })
            await ponerMiniatura({ idVideo: vinculado.idVideo, imagen: await readFile(archivo), acceso })
            await guardarEstudio(proyecto, estudio => { estudio.youtube = { ...estudio.youtube, miniatura: { nombre: datos.nombre, en: new Date().toISOString() } } })
            return responder(res, 200, { miniatura: datos.nombre })
          }
          const resultado = await ponerTitulo({ idVideo: vinculado.idVideo, titulo: datos.titulo, acceso, canalId })
          await guardarEstudio(proyecto, estudio => { estudio.youtube = { ...estudio.youtube, titulo: resultado.titulo } })
          return responder(res, 200, resultado)
        } finally { publicando.delete(clave) }
      }
      if (accion === 'reels' && partes[4]) {
        const carpeta = carpetaDe(proyecto)
        if (partes[4] === 'estado' && req.method === 'GET') return responder(res, 200, { publicaciones: redesDisponibles() ? await refrescarEstados({ carpeta, cliente: clienteRedes() }) : await leerEstadoPublicaciones(carpeta) })
        if (!idReelValido(partes[4]) || req.method !== 'POST') return responder(res, 404, { error: 'No encontrado.' })
        const lista = await leerJson(join(carpeta, 'renders', 'reels', 'reels.json'))
        const reel = lista?.reels.find(r => r.id === partes[4])
        if (!reel) return responder(res, 404, { error: 'Ese Reel no existe en el proyecto.' })
        const clave = `${proyecto}:${reel.id}`
        if (publicando.has(clave)) return responder(res, 409, { error: 'Este Reel ya se está procesando: espera a que termine.' })
        publicando.add(clave)
        try {
          if (partes[5] === 'publicar') {
            let datos = {}
            try { datos = JSON.parse((await leerCuerpo(req, 8 * 1024)).toString('utf8') || '{}') } catch { return responder(res, 400, { error: 'Solicitud no válida.' }) }
            if (!MODOS.includes(datos.modo)) return responder(res, 422, { error: 'Modo de publicación no válido.' })
            return responder(res, 200, await publicarReel({ proyecto, carpeta, reel, creado: lista.creado, modo: datos.modo, fecha: datos.fecha, cliente: clienteRedes() }))
          }
          if (partes[5] === 'cancelar') return responder(res, 200, await cancelarProgramacionReel({ carpeta, reel, cliente: clienteRedes() }))
        } finally { publicando.delete(clave) }
        return responder(res, 404, { error: 'No encontrado.' })
      }
      if ((accion === 'armar' || accion === 'render' || accion === 'reels') && req.method === 'POST') {
        if (ocupados.has(proyecto)) return responder(res, 409, { error: 'El proyecto está ocupado: espera a que termine.' })
        if (accion === 'reels' && !existsSync(join(carpetaDe(proyecto), 'renders', 'final.mp4'))) return responder(res, 409, { error: 'Primero renderiza el video final.' })
        ocupados.add(proyecto)
        if (accion === 'render') {
          // Siempre se vuelve a armar antes de renderizar: si las tomas o las fotos son más nuevas que el último
          // armado, el render saldría con los huecos del teleprompter y sin la voz (pasó el 2026-11-18).
          try { await armar(proyecto) } catch (error) { ocupados.delete(proyecto); throw error }
          renderizar(proyecto)
          return responder(res, 202, { estado: 'renderizando' })
        }
        if (accion === 'reels') { crearReelsProyecto(proyecto); return responder(res, 202, { estado: 'creando' }) }
        try { return responder(res, 200, await armar(proyecto)) } finally { ocupados.delete(proyecto) }
      }
      return responder(res, 404, { error: 'No encontrado.' })
    } catch (error) {
      // El mensaje técnico va a la consola del estudio (nunca a la página) para poder diagnosticar el «error interno».
      if (!error.estado) process.stderr.write(`[estudio] ${req.method} ${String(req.url).split('?')[0]}: ${error?.stack || error}\n`)
      return responder(res, error.estado || 500, { error: error.estado ? error.message : 'Error interno del estudio.' })
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  crearServidor().listen(PUERTO, HOST, () => {
    process.stdout.write(`Estudio de video listo en http://localhost:${PUERTO}\nProyectos: ${DIARIO}\n`)
  })
}
