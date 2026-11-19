// Buscador automático de fotos del video diario: llena los espacios de cada noticia con fotos reales y su crédito.
// Decisión de Juan (2026-11-18): el agente consigue todas las imágenes; criterio de licencia bajo, pero siempre
// fotos reales (nada generado por IA, ilustraciones ni montajes) y siempre con crédito.
// Fuentes, en orden: la nota original de la noticia y la página de su foto de portada, otras notas de Pont3la10
// sobre el mismo club, y Wikimedia Commons. Si aun así faltan, el generador repite las fotos de la noticia.
// Uso: node scripts/video-buscar-fotos.mjs <proyecto|carpeta> [--por-noticia 10] [--sin-armar]
//      node scripts/video-buscar-fotos.mjs <proyecto> --hoja                       hoja de contactos numerada (renders/fotos-auto.jpg) para revisar
//      node scripts/video-buscar-fotos.mjs <proyecto> --quitar 3,7,12              quita esas fotos automáticas (números de la hoja) y vuelve a armar
import { readFile, writeFile, readdir, mkdir, rm, rename } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { generarProyecto } from './video-generar-proyecto.mjs'

const ejecutar = promisify(execFile)
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SITIO = 'https://www.pont3la10.com'
const AGENTE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Pont3la10-estudio'
const LIMITE_IMAGEN = 15 * 1024 * 1024
const ANCHO_MINIMO = 640
// Dos fotos cuya huella visual difiere en 6 bits o menos (de 64) son la misma foto en otro tamaño o recorte.
const DISTANCIA_DUPLICADO = 6
const DESCARTAR = /logo|icon|avatar|sprite|banner|placeholder|pixel|blank|loading|publicidad|advert|\/ads?\/|emoji|badge|escudo|whatsapp|facebook|twitter|instagram|youtube|tiktok|google|apple-touch|favicon|\.svg|\.gif|posiciones|tabla|grafic|infograf|asi-quedo|como-quedo|calendario|fixture|programacion|ilustraci|clasificad|resultados|parrilla|probabilidad/i

const MEDIOS = {
  'futbolred.com': 'Futbolred', 'eltiempo.com': 'El Tiempo', 'winsports.co': 'Win Sports', 'infobae.com': 'Infobae',
  'as.com': 'AS', 'epimg.net': 'AS', 'dimayor.com.co': 'DIMAYOR', 'clarosports.com': 'Claro Sports', 'elcolombiano.com': 'El Colombiano',
  'semana.com': 'Semana', 'elespectador.com': 'El Espectador', 'antena2.com': 'Antena 2', 'bluradio.com': 'Blu Radio',
  'caracoltv.com': 'Caracol TV', 'noticiascaracol.com': 'Noticias Caracol', 'pulzo.com': 'Pulzo', 'fcf.com.co': 'FCF',
  'qhubo.com': 'Q’hubo', 'qhubomedellin.com': 'Q’hubo Medellín', 'qhubocali.com': 'Q’hubo Cali', 'vanguardia.com': 'Vanguardia',
  'elheraldo.co': 'El Heraldo', 'elpais.com.co': 'El País Cali', 'golcaracol.com': 'Gol Caracol', 'espn.com.co': 'ESPN'
}
const AMBIGUAS = new Set(['cali', 'medellin', 'bogota', 'santa', 'barranquilla', 'manizales'])
const GENERICOS = new Set(['liga', 'betplay', 'torneo', 'copa', 'futbol', 'colombiano', 'colombia', 'deportivo', 'club', 'atletico', 'independiente', 'america', 'final', 'fecha', 'tabla', 'grupo', 'cuadrangulares', 'partido', 'para', 'como', 'cual', 'que', 'tras', 'ante', 'contra', 'sera', 'esta', 'este', 'todo', 'todos', 'nuevo', 'nueva', 'quien', 'donde', 'cuando', 'porque', 'precios', 'boleteria'])

// Solo URLs públicas http(s): nada de la red local.
export function urlPublica(texto) {
  try {
    const url = new URL(texto)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    const host = url.hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '0.0.0.0' || host.startsWith('[')) return null
    if (/^(127|10|192\.168|169\.254)\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null
    return url
  } catch { return null }
}

// Nombre del medio para el crédito: primero la lista conocida; si no, el nombre del sitio (si es legible) o el dominio.
export function nombreMedio(url, sitio = '') {
  const host = new URL(url).hostname.replace(/^www\./, '')
  const clave = Object.keys(MEDIOS).find(d => host === d || host.endsWith(`.${d}`))
  if (clave) return MEDIOS[clave]
  const limpio = String(sitio || '').trim()
  if (limpio.length >= 4 && !/\.[a-z]{2,}$/i.test(limpio)) return limpio === limpio.toUpperCase() ? limpio.toLowerCase().replace(/(^|\s)\p{L}/gu, l => l.toUpperCase()) : limpio
  return host
}

export const normalizar = texto => String(texto || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

// Palabras que identifican la noticia: las del club y los nombres propios del título (sin las genéricas).
export function clavesNoticia(club, ...titulos) {
  const delClub = normalizar(club).split(/[^a-z0-9]+/)
  const nombres = titulos.flatMap(t => String(t || '').split(/\s+/).slice(1).filter(p => /^\p{Lu}/u.test(p))).map(normalizar)
  const claves = [...delClub, ...nombres].map(p => p.replace(/[^a-z0-9]/g, '')).filter(p => p.length > 3 && !GENERICOS.has(p) && !AMBIGUAS.has(p))
  // «América» es genérica por la Copa América, pero identifica al América de Cali.
  if (/\bamerica\b/.test(normalizar(club))) claves.push('america')
  const completo = normalizar(club).replace(/[^a-z0-9]+/g, ' ').trim()
  if (completo.includes(' ') && !completo.split(' ').every(p => GENERICOS.has(p))) claves.push(completo)
  return [...new Set(claves)]
}

// Llave del archivo: el último tramo de la ruta sin extensión (la misma foto suele servirse en varios tamaños).
export function llaveArchivo(url) {
  try {
    const ultimo = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || '')
    return ultimo.toLowerCase().replace(/\.[a-z0-9]{2,5}$/, '')
  } catch { return url }
}

const decodificar = texto => String(texto || '').replace(/&amp;/g, '&').replace(/&#0?38;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x2F;/gi, '/')

// Saca las imágenes candidatas de una página de noticia: la principal (og:image / twitter:image) y las del cuerpo
// del artículo con su texto alternativo, eligiendo la versión más grande del srcset.
export function imagenesDePagina(html, base) {
  const salida = []
  const agregar = (src, texto, principal) => {
    if (!src) return
    let url
    try { url = new URL(decodificar(src.trim()), base) } catch { return }
    if (!urlPublica(url.href) || DESCARTAR.test(url.pathname)) return
    if (!salida.some(s => s.url === url.href)) salida.push({ url: url.href, texto: `${texto || ''} ${llaveArchivo(url.href)}`, principal })
  }
  const meta = nombre => {
    const patron = new RegExp(`<meta[^>]+(?:property|name)=["']${nombre}["'][^>]*>`, 'gi')
    return [...html.matchAll(patron)].map(m => /content=["']([^"']+)["']/i.exec(m[0])?.[1]).filter(Boolean)
  }
  for (const nombre of ['og:image', 'og:image:secure_url', 'twitter:image']) meta(nombre).forEach(src => agregar(src, '', true))
  const articulo = /<article[\s\S]*?<\/article>/i.exec(html)?.[0] || /<main[\s\S]*?<\/main>/i.exec(html)?.[0] || ''
  for (const etiqueta of articulo.match(/<(img|source)\b[^>]*>/gi) || []) {
    const alt = decodificar(/\balt=["']([^"']*)["']/i.exec(etiqueta)?.[1] || '')
    const srcset = /\b(?:data-srcset|srcset)=["']([^"']+)["']/i.exec(etiqueta)?.[1]
    if (srcset) {
      const opciones = srcset.split(',').map(p => p.trim().split(/\s+/)).map(([u, w]) => ({ u, w: Number.parseInt(w, 10) || 0 }))
      agregar(opciones.sort((a, b) => b.w - a.w)[0]?.u, alt, false)
      continue
    }
    agregar(/\b(?:data-src|data-original|src)=["']([^"']+)["']/i.exec(etiqueta)?.[1], alt, false)
  }
  return { imagenes: salida, sitio: decodificar(meta('og:site_name')[0] || '') }
}

// Las fotos del cuerpo solo valen si nombran algo de la noticia (evita las miniaturas de «noticias relacionadas»).
export function mencionaAlgo(texto, claves) {
  const limpio = ` ${normalizar(texto).replace(/[^a-z0-9]+/g, ' ')} `.replace(/ copa america /g, ' ')
  return claves.some(c => limpio.includes(c))
}
export const imagenRelevante = (imagen, claves) => imagen.principal || (claves.length > 0 && mencionaAlgo(imagen.texto, claves))

async function traer(url, { tipo = 'texto', timeout = 20_000 } = {}) {
  const segura = urlPublica(url)
  if (!segura) throw new Error('URL no permitida')
  const respuesta = await fetch(segura, { headers: { 'user-agent': AGENTE, accept: tipo === 'imagen' ? 'image/*' : 'text/html,application/json' }, redirect: 'follow', signal: AbortSignal.timeout(timeout) })
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
  if (tipo === 'json') return respuesta.json()
  if (tipo === 'texto') return respuesta.text()
  if (Number(respuesta.headers.get('content-length') || 0) > LIMITE_IMAGEN) throw new Error('imagen demasiado grande')
  const tipoContenido = respuesta.headers.get('content-type') || ''
  if (tipoContenido && !/^image\//i.test(tipoContenido)) throw new Error('no es una imagen')
  const datos = Buffer.from(await respuesta.arrayBuffer())
  if (datos.length > LIMITE_IMAGEN) throw new Error('imagen demasiado grande')
  return datos
}

async function medidas(archivo) {
  const { stdout } = await ejecutar('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', archivo])
  const [ancho, alto] = stdout.trim().split(',').map(Number)
  return { ancho, alto }
}

// Huella visual (promedio de 8×8 en grises): detecta la misma foto aunque cambie de tamaño o de compresión.
async function huellaVisual(archivo) {
  const { stdout } = await ejecutar('ffmpeg', ['-loglevel', 'error', '-i', archivo, '-vf', 'scale=8:8:flags=area,format=gray', '-frames:v', '1', '-f', 'rawvideo', '-'], { encoding: 'buffer', maxBuffer: 1024 * 1024 })
  const pixeles = [...stdout.subarray(0, 64)]
  const promedio = pixeles.reduce((s, v) => s + v, 0) / Math.max(1, pixeles.length)
  return pixeles.map(v => (v > promedio ? 1 : 0))
}
export const distancia = (a, b) => a.reduce((s, bit, i) => s + (bit !== b[i] ? 1 : 0), 0)

// Wikimedia Commons: fotos (no dibujos ni escudos) con su autor y licencia.
async function candidatasCommons(consulta, cantidad = 2, { excluir = /femenin|women|sub[- ]?\d|juvenil/i } = {}) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=${cantidad * 3}&gsrsearch=${encodeURIComponent(`${consulta} filetype:bitmap -logo -escudo -crest`)}&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1920`
  const datos = await traer(url, { tipo: 'json' })
  const salida = []
  for (const p of Object.values(datos?.query?.pages || {})) {
    const info = p.imageinfo?.[0]
    if (!info || !/jpe?g/i.test(info.mime || '') || (info.width || 0) < ANCHO_MINIMO || DESCARTAR.test(p.title) || (excluir && excluir.test(p.title))) continue
    const meta = info.extmetadata || {}
    const autor = String(meta.Artist?.value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(/\(|\n/)[0].trim().slice(0, 50) || 'Autor en Wikimedia Commons'
    const licencia = String(meta.LicenseShortName?.value || '').trim()
    if (salida.some(s => s.autor === autor)) continue
    salida.push({ url: info.thumburl || info.url, credito: `${autor} / Wikimedia Commons${licencia ? ` (${licencia})` : ''}`, origen: info.descriptionurl, autor })
    if (salida.length >= cantidad) break
  }
  return salida
}

// Recolecta candidatas para una noticia, en orden de preferencia.
async function candidatasDeNoticia(bloque, { recientes, registro }) {
  const candidatas = []
  const articulo = bloque.articuloSlug ? await traer(`${SITIO}/api/articulos/${encodeURIComponent(bloque.articuloSlug)}`, { tipo: 'json' }).catch(() => null) : null
  const claves = clavesNoticia(bloque.club, articulo?.titulo, articulo?.tituloPortada, bloque.titular)
  // 1) La nota original (fuente), la página de donde salió la portada y otras notas de la misma noticia que el
  //    agente haya encontrado en otros medios (bloque.fuentesFotos: URLs de páginas, no de imágenes).
  const extra = (Array.isArray(bloque.fuentesFotos) ? bloque.fuentesFotos : []).filter(u => typeof u === 'string' && urlPublica(u)).slice(0, 8)
  const paginas = [...new Set([articulo?.fuente?.url, articulo?.portada?.fuenteFotoUrl, ...extra].filter(Boolean))]
  for (const pagina of paginas) {
    try {
      const { imagenes, sitio } = imagenesDePagina(await traer(pagina), pagina)
      const medio = nombreMedio(pagina, sitio)
      for (const imagen of imagenes.filter(i => imagenRelevante(i, claves))) candidatas.push({ url: imagen.url, credito: medio, origen: pagina })
    } catch (error) { registro(`  · no se pudo leer ${new URL(pagina).hostname}: ${error.message}`) }
  }
  // 2) Otras notas del sitio cuyo TÍTULO nombra al club o a los protagonistas (traen foto real y crédito).
  const delClub = clavesNoticia(bloque.club)
  if (delClub.length) {
    const parecidas = recientes.filter(a => a.slug !== bloque.articuloSlug && a.imagen && mencionaAlgo(`${a.titulo} ${a.tituloPortada}`, delClub)).slice(0, 6)
    for (const otra of parecidas) {
      const detalle = await traer(`${SITIO}/api/articulos/${encodeURIComponent(otra.slug)}`, { tipo: 'json' }).catch(() => null)
      const descripcion = `${detalle?.portada?.textoAlternativo || ''} ${detalle?.portada?.pieDeFoto || ''}`
      if (detalle?.portada?.url && detalle.portada.credito && mencionaAlgo(descripcion, delClub)) candidatas.push({ url: detalle.portada.url, credito: detalle.portada.credito, origen: `${SITIO}/articulos/${otra.slug}` })
    }
  }
  // 3) Wikimedia Commons: con el nombre del club si es un club; si la noticia es de la liga en general, estadios del país.
  const esClub = normalizar(bloque.club).split(/[^a-z0-9]+/).some(p => p.length > 3 && !GENERICOS.has(p))
  const sobreFemenino = /femenin/.test(normalizar(`${articulo?.titulo || ''} ${bloque.club || ''}`))
  try { candidatas.push(...await candidatasCommons(esClub ? bloque.club : 'estadio fútbol Colombia hinchas', 2, { excluir: sobreFemenino ? null : undefined })) } catch (error) { registro(`  · Commons no respondió: ${error.message}`) }
  return candidatas
}

export async function buscarFotosProyecto({ carpeta, porNoticia = 10, armar = true, registro = texto => process.stdout.write(`${texto}\n`) }) {
  const guion = JSON.parse(await readFile(join(carpeta, 'guion.json'), 'utf8'))
  const rutaEstudio = join(carpeta, 'estudio.json')
  const leerEstudio = async () => (existsSync(rutaEstudio) ? JSON.parse(await readFile(rutaEstudio, 'utf8')) : {})
  const manifiesto = existsSync(join(carpeta, 'manifiesto.json')) ? JSON.parse(await readFile(join(carpeta, 'manifiesto.json'), 'utf8')) : { fotos: [] }
  const recientes = await traer(`${SITIO}/api/articulos?categoria=futbol-colombiano&limite=50`, { tipo: 'json' }).then(l => (Array.isArray(l) ? l : [])).catch(() => [])
  const carpetaFotos = join(carpeta, 'assets', 'fotos')
  await mkdir(carpetaFotos, { recursive: true })
  // Huellas de todo lo que ya está en el proyecto (portadas y fotos agregadas), para no repetir.
  const huellas = []
  for (const nombre of (await readdir(carpetaFotos)).filter(n => n.endsWith('.jpg'))) {
    try { huellas.push(await huellaVisual(join(carpetaFotos, nombre))) } catch { /* se ignora */ }
  }
  // Lo que Juan quitó antes no se vuelve a proponer.
  const llaves = new Set(((await leerEstudio()).fotosDescartadas || []).map(llaveArchivo))
  const resumen = []
  for (const bloque of guion.bloques || []) {
    const actuales = (await leerEstudio()).fotosExtra?.[bloque.id] || []
    actuales.forEach(f => f.origenImagen && llaves.add(llaveArchivo(f.origenImagen)))
    const espacios = manifiesto.fotos?.find(f => f.clave === bloque.id)
    // Los vacíos del manifiesto ya descuentan las fotos agregadas antes; el tope por noticia cuenta las automáticas.
    const faltan = Math.max(0, Math.min(espacios ? (espacios.sinFotoPropia ?? espacios.vacios) : porNoticia, porNoticia - actuales.filter(f => f.auto).length))
    if (!faltan) { resumen.push({ bloque: bloque.id, club: bloque.club, agregadas: 0 }); continue }
    registro(`${bloque.id} · ${bloque.club || ''}: buscando ${faltan} foto(s)…`)
    const nuevas = []
    for (const candidata of await candidatasDeNoticia(bloque, { recientes, registro })) {
      if (nuevas.length >= faltan) break
      const llave = llaveArchivo(candidata.url)
      if (llaves.has(llave)) continue
      llaves.add(llave)
      let datos
      try { datos = await traer(candidata.url, { tipo: 'imagen' }) } catch { continue }
      const nombre = `auto-${bloque.id}-${Date.now().toString(36)}${nuevas.length}`
      const base = join(carpetaFotos, nombre)
      await writeFile(`${base}.descarga`, datos)
      try {
        const { ancho, alto } = await medidas(`${base}.descarga`)
        // Fuera miniaturas, bandas y fotos verticales.
        if (!(ancho >= ANCHO_MINIMO) || !(alto >= 360) || ancho / alto < 1 || ancho / alto > 2.4) continue
        const huella = await huellaVisual(`${base}.descarga`)
        if (huellas.some(h => distancia(h, huella) <= DISTANCIA_DUPLICADO)) continue
        huellas.push(huella)
        await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', `${base}.descarga`, '-vf', 'scale=min(1920\\,iw):-2', '-q:v', '3', `${base}.tmp.jpg`])
        await rename(`${base}.tmp.jpg`, `${base}.jpg`)
        nuevas.push({ ruta: `assets/fotos/${nombre}.jpg`, credito: candidata.credito.slice(0, 120), auto: true, origen: candidata.origen, origenImagen: candidata.url })
      } catch { /* imagen dañada: se salta */ } finally { await rm(`${base}.descarga`, { force: true }) }
    }
    if (nuevas.length) {
      const estudio = await leerEstudio()
      estudio.fotosExtra = estudio.fotosExtra || {}
      estudio.fotosExtra[bloque.id] = [...(estudio.fotosExtra[bloque.id] || []), ...nuevas]
      estudio.actualizado = new Date().toISOString()
      await writeFile(rutaEstudio, JSON.stringify(estudio, null, 2))
    }
    registro(`  → ${nuevas.length} agregada(s)`)
    resumen.push({ bloque: bloque.id, club: bloque.club, agregadas: nuevas.length })
  }
  // Desde ahora el proyecto rellena con repetición los espacios que sigan sin foto (nunca queda un hueco en el video).
  const estudio = await leerEstudio()
  if (!estudio.repetirFotos) {
    estudio.repetirFotos = true
    await writeFile(rutaEstudio, JSON.stringify(estudio, null, 2))
  }
  const armado = armar ? await generarProyecto({ guion, salida: carpeta }) : null
  const nuevo = armado ? JSON.parse(await readFile(join(carpeta, 'manifiesto.json'), 'utf8')) : null
  const sinFotoPropia = nuevo ? nuevo.fotos.reduce((s, r) => s + (r.sinFotoPropia || 0), 0) : null
  return { resumen, agregadas: resumen.reduce((s, r) => s + r.agregadas, 0), vacios: sinFotoPropia }
}

// Fotos automáticas del proyecto en el orden de la hoja de contactos.
export function listaAutomaticas(estudio) {
  return Object.entries(estudio.fotosExtra || {}).flatMap(([clave, lista]) => lista.map((foto, indice) => ({ clave, indice, foto }))).filter(x => x.foto.auto)
}

// Hoja de contactos: cada foto automática numerada con su noticia, para revisarla de un vistazo.
export async function hojaDeContactos(carpeta) {
  const estudio = existsSync(join(carpeta, 'estudio.json')) ? JSON.parse(await readFile(join(carpeta, 'estudio.json'), 'utf8')) : {}
  const lista = listaAutomaticas(estudio)
  if (!lista.length) return { archivo: null, total: 0 }
  const temporal = join(carpeta, 'renders', 'hoja-temporal')
  await mkdir(temporal, { recursive: true })
  try {
    for (const [i, { foto }] of lista.entries()) {
      await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(carpeta, foto.ruta), '-vf', 'scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:black,format=yuvj420p', join(temporal, `${String(i + 1).padStart(3, '0')}.jpg`)])
    }
    const columnas = 6
    const filas = Math.ceil(lista.length / columnas)
    const archivo = join(carpeta, 'renders', 'fotos-auto.jpg')
    await ejecutar('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '1', '-i', join(temporal, '%03d.jpg'), '-vf', `tile=${columnas}x${filas}:padding=4:color=black`, '-frames:v', '1', archivo])
    const indice = lista.map(({ clave, foto }, i) => `${i + 1}. ${clave} — ${foto.credito} — ${foto.ruta}`).join('\n')
    await writeFile(join(carpeta, 'renders', 'fotos-auto.txt'), `Hoja: renders/fotos-auto.jpg (de izquierda a derecha, ${columnas} por fila)\n${indice}\n`)
    return { archivo, total: lista.length, indice }
  } finally { await rm(temporal, { recursive: true, force: true }) }
}

// Quita fotos automáticas por su número en la hoja: las borra, las anota como descartadas y vuelve a armar.
export async function quitarAutomaticas(carpeta, numeros, { armar = true } = {}) {
  const rutaEstudio = join(carpeta, 'estudio.json')
  const estudio = JSON.parse(await readFile(rutaEstudio, 'utf8'))
  const lista = listaAutomaticas(estudio)
  const elegidas = [...new Set(numeros)].map(n => lista[n - 1]).filter(Boolean)
  for (const { foto } of elegidas) {
    if (foto.origenImagen) estudio.fotosDescartadas = [...new Set([...(estudio.fotosDescartadas || []), foto.origenImagen])].slice(-500)
    if (/^assets\/fotos\/auto-[a-z0-9_-]+\.jpg$/.test(foto.ruta)) await rm(join(carpeta, foto.ruta), { force: true })
  }
  const quitar = new Set(elegidas.map(x => x.foto))
  for (const clave of Object.keys(estudio.fotosExtra || {})) estudio.fotosExtra[clave] = estudio.fotosExtra[clave].filter(foto => !quitar.has(foto))
  estudio.actualizado = new Date().toISOString()
  await writeFile(rutaEstudio, JSON.stringify(estudio, null, 2))
  if (armar) await generarProyecto({ guion: JSON.parse(await readFile(join(carpeta, 'guion.json'), 'utf8')), salida: carpeta })
  return elegidas.length
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  const entrada = args.find(a => !a.startsWith('--'))
  if (!entrada) { process.stderr.write('Uso: node scripts/video-buscar-fotos.mjs <proyecto|carpeta> [--por-noticia 10] [--sin-armar]\n'); process.exit(2) }
  const carpeta = entrada.includes('/') || entrada.includes('\\') ? resolve(entrada) : join(RAIZ, 'videos', 'diario', entrada)
  if (args.includes('--hoja')) {
    const r = await hojaDeContactos(carpeta)
    process.stdout.write(r.archivo ? `Hoja con ${r.total} fotos: ${r.archivo}\n${r.indice}\n` : 'No hay fotos automáticas.\n')
    process.exit(0)
  }
  const posicionQuitar = args.indexOf('--quitar')
  if (posicionQuitar >= 0) {
    const numeros = String(args[posicionQuitar + 1] || '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0)
    process.stdout.write(`Fotos quitadas: ${await quitarAutomaticas(carpeta, numeros, { armar: !args.includes('--sin-armar') })}\n`)
    process.exit(0)
  }
  const indice = args.indexOf('--por-noticia')
  const porNoticia = indice >= 0 ? Number(args[indice + 1]) || 10 : 10
  const r = await buscarFotosProyecto({ carpeta, porNoticia, armar: !args.includes('--sin-armar') })
  process.stdout.write(`Fotos agregadas: ${r.agregadas}${r.vacios === null ? '' : ` · espacios sin foto propia (se rellenan repitiendo): ${r.vacios}`}\n`)
}
