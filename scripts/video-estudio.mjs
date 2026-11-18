// Estudio local del video diario: teleprompter, grabación de voz y cara por tramo, fotos por noticia,
// «Armar video» y render. Solo escucha en 127.0.0.1 y trabaja sobre videos/diario/<proyecto>/.
// Uso: npm run video:estudio   (o node scripts/video-estudio.mjs) y abrir http://localhost:4810
import http from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { readFile, writeFile, readdir, stat, mkdir, rm, rename } from 'node:fs/promises'
import { join, resolve, extname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { generarProyecto } from './video-generar-proyecto.mjs'

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

const renders = new Map()
const ocupados = new Set()

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
  for (const nombre of (await readdir(DIARIO)).sort().reverse()) {
    if (!proyectoValido(nombre)) continue
    const manifiesto = await leerJson(join(DIARIO, nombre, 'manifiesto.json'))
    if (!manifiesto) continue
    salida.push({ nombre, fecha: manifiesto.fecha, titulo: manifiesto.tituloVideo, duracion: manifiesto.duracion, tramos: manifiesto.segmentos.length, grabados: manifiesto.segmentos.filter(s => s.grabado).length })
  }
  return salida
}

async function detalleProyecto(proyecto) {
  const carpeta = carpetaDe(proyecto)
  const manifiesto = await leerJson(join(carpeta, 'manifiesto.json'))
  if (!manifiesto) return null
  const estudio = (await leerJson(join(carpeta, 'estudio.json'))) || {}
  const render = renders.get(proyecto)
  const final = join(carpeta, 'renders', 'final.mp4')
  return { proyecto, manifiesto, estudio, render: render ? { estado: render.estado, registro: render.registro.slice(-1200) } : null, videoFinal: existsSync(final) ? `/archivos/${proyecto}/renders/final.mp4?v=${(await stat(final)).mtimeMs}` : null }
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
  const esVideo = segmento.tipo === 'cara'
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
    estudio.grabaciones[tramo] = { archivo: relativo, duracion, tipo: segmento.tipo, guardado: new Date().toISOString() }
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
    estudio.fotosExtra[clave] = lista.filter((_, i) => i !== indice)
  })
  const archivo = ruta && rutaSegura(carpeta, ruta)
  if (archivo) await rm(archivo, { force: true })
}

async function armar(proyecto) {
  const carpeta = carpetaDe(proyecto)
  const guion = await leerJson(join(carpeta, 'guion.json'))
  if (!guion) throw Object.assign(new Error('El proyecto no tiene guion.json: vuelve a generarlo con el script.'), { estado: 409 })
  return generarProyecto({ guion, salida: carpeta })
}

function renderizar(proyecto) {
  const carpeta = carpetaDe(proyecto)
  const estado = { estado: 'renderizando', registro: '' }
  renders.set(proyecto, estado)
  const proceso = spawn('npx', ['hyperframes', 'render', '--output', 'renders/final.mp4'], { cwd: carpeta, shell: true, windowsHide: true })
  const anotar = parte => { estado.registro = (estado.registro + parte.toString()).slice(-20000) }
  proceso.stdout.on('data', anotar)
  proceso.stderr.on('data', anotar)
  proceso.on('close', codigo => { estado.estado = codigo === 0 ? 'listo' : 'error'; ocupados.delete(proyecto) })
}

async function servirArchivo(req, res, proyecto, relativo) {
  const archivo = rutaSegura(carpetaDe(proyecto), decodeURIComponent(relativo))
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
      if ((accion === 'armar' || accion === 'render') && req.method === 'POST') {
        if (ocupados.has(proyecto)) return responder(res, 409, { error: 'El proyecto está ocupado: espera a que termine.' })
        ocupados.add(proyecto)
        if (accion === 'render') { renderizar(proyecto); return responder(res, 202, { estado: 'renderizando' }) }
        try { return responder(res, 200, await armar(proyecto)) } finally { ocupados.delete(proyecto) }
      }
      return responder(res, 404, { error: 'No encontrado.' })
    } catch (error) {
      return responder(res, error.estado || 500, { error: error.estado ? error.message : 'Error interno del estudio.' })
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  crearServidor().listen(PUERTO, HOST, () => {
    process.stdout.write(`Estudio de video listo en http://localhost:${PUERTO}\nProyectos: ${DIARIO}\n`)
  })
}
