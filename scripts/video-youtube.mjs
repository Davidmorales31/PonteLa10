// Conexión LOCAL del estudio de video con YouTube (YouTube Data API v3).
//
// Qué hace: con tu autorización (OAuth con PKCE, en tu navegador) sube el video final como PRIVADO o NO LISTADO,
// y pone la miniatura y el título elegidos en un video de tu canal. Nunca lo publica: eso lo haces tú en YouTube Studio.
//
// Dónde vive lo privado: fuera del repositorio, en %USERPROFILE%\.pont3la10\youtube (o PONT3LA10_YOUTUBE_DIR):
//   cliente.json  → credenciales «Aplicación de escritorio» descargadas de Google Cloud (las pones tú)
//   token.json    → lo crea este módulo al conectar; nunca viaja a la página ni se muestra
import { createHash, randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, open, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const ALCANCE = 'https://www.googleapis.com/auth/youtube.force-ssl'
// Permiso opcional para leer retención y tiempo de visualización (YouTube Analytics). Solo se pide si activas
// PONT3LA10_YOUTUBE_ANALITICA=1 antes de conectar; sin él, la conexión es exactamente la de siempre.
export const ALCANCE_ANALITICA = 'https://www.googleapis.com/auth/yt-analytics.readonly'
const API_ANALITICA = 'https://youtubeanalytics.googleapis.com/v2'
const URL_AUTORIZACION = 'https://accounts.google.com/o/oauth2/v2/auth'
const URL_TOKEN = 'https://oauth2.googleapis.com/token'
const URL_REVOCAR = 'https://oauth2.googleapis.com/revoke'
const API = 'https://www.googleapis.com/youtube/v3'
const API_SUBIDA = 'https://www.googleapis.com/upload/youtube/v3'
export const LIMITE_MINIATURA = 2 * 1024 * 1024

const error = (estado, mensaje) => Object.assign(new Error(mensaje), { estado })

// Carpeta del usuario (no AppData): si el estudio se abre desde la app de Claude, Windows redirige AppData\Local a otra
// carpeta del paquete y el estudio no vería el archivo que pusiste a mano.
export function dirYoutube(entorno = process.env) {
  return entorno.PONT3LA10_YOUTUBE_DIR || join(homedir(), '.pont3la10', 'youtube')
}

/** ID del video (11 caracteres) a partir de un enlace de YouTube o del ID suelto; null si no es válido. */
export function idVideoDe(texto) {
  const valor = String(texto || '').trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(valor)) return valor
  try {
    const url = new URL(valor)
    const host = url.hostname.replace(/^www\.|^m\./, '')
    let candidato = null
    if (host === 'youtu.be') candidato = url.pathname.split('/')[1]
    else if (host === 'youtube.com' || host === 'studio.youtube.com') {
      const partes = url.pathname.split('/').filter(Boolean)
      if (url.searchParams.get('v')) candidato = url.searchParams.get('v')
      else if (['shorts', 'embed', 'live', 'video'].includes(partes[0])) candidato = partes[1]
    }
    return /^[A-Za-z0-9_-]{11}$/.test(candidato || '') ? candidato : null
  } catch { return null }
}

const base64Url = buffer => buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function crearDesafio() {
  const verificador = base64Url(randomBytes(32))
  return { verificador, desafio: base64Url(createHash('sha256').update(verificador).digest()) }
}

export function urlAutorizacion({ clientId, redirect, estado, desafio, analitica = false }) {
  const parametros = new URLSearchParams({
    client_id: clientId, redirect_uri: redirect, response_type: 'code', scope: analitica ? `${ALCANCE} ${ALCANCE_ANALITICA}` : ALCANCE,
    access_type: 'offline', prompt: 'consent', state: estado,
    code_challenge: desafio, code_challenge_method: 'S256'
  })
  return `${URL_AUTORIZACION}?${parametros}`
}

/** Credenciales de Google Cloud (JSON descargado: «installed» o «web»). null si falta o es inválido. */
export async function leerCliente(dir = dirYoutube()) {
  const ruta = join(dir, 'cliente.json')
  if (!existsSync(ruta)) return null
  try {
    const json = JSON.parse(await readFile(ruta, 'utf8'))
    const datos = json.installed || json.web || json
    return datos.client_id && datos.client_secret ? { clientId: String(datos.client_id), clientSecret: String(datos.client_secret) } : null
  } catch { return null }
}

export async function leerToken(dir = dirYoutube()) {
  const ruta = join(dir, 'token.json')
  if (!existsSync(ruta)) return null
  try { return JSON.parse(await readFile(ruta, 'utf8')) } catch { return null }
}

async function guardarToken(dir, token) {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'token.json'), JSON.stringify(token, null, 2), { mode: 0o600 })
}

/** Resumen público del estado (sin tokens). */
export async function estadoConexion(dir = dirYoutube()) {
  const cliente = await leerCliente(dir)
  const token = await leerToken(dir)
  return { dir, configurado: Boolean(cliente), conectado: Boolean(cliente && token?.refresh_token), canal: token?.canal || null, analitica: String(token?.scope || '').split(' ').includes(ALCANCE_ANALITICA) }
}

async function pedirToken(cuerpo, transporte) {
  const respuesta = await transporte(URL_TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(cuerpo) })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) {
    if (datos.error === 'invalid_grant') throw error(401, 'La conexión con YouTube venció o fue revocada: vuelve a conectar.')
    throw error(502, `Google rechazó la autorización (${String(datos.error || respuesta.status).slice(0, 60)}).`)
  }
  return datos
}

export async function canjearCodigo({ cliente, codigo, verificador, redirect, transporte = globalThis.fetch }) {
  const datos = await pedirToken({
    client_id: cliente.clientId, client_secret: cliente.clientSecret, code: codigo,
    code_verifier: verificador, redirect_uri: redirect, grant_type: 'authorization_code'
  }, transporte)
  if (!String(datos.scope || '').split(' ').includes(ALCANCE)) throw error(403, 'Faltó el permiso para gestionar el video en YouTube: vuelve a conectar y acéptalo.')
  if (!datos.refresh_token) throw error(502, 'Google no entregó una conexión duradera: revoca el acceso previo y vuelve a conectar.')
  return { access_token: datos.access_token, refresh_token: datos.refresh_token, expira: Date.now() + Number(datos.expires_in || 3600) * 1000, scope: String(datos.scope || '') }
}

/** Token de acceso vigente (lo renueva con el refresh token cuando vence). */
export async function accesoVigente({ dir = dirYoutube(), transporte = globalThis.fetch, ahora = () => Date.now() } = {}) {
  const cliente = await leerCliente(dir)
  const token = await leerToken(dir)
  if (!cliente) throw error(409, 'Falta el archivo cliente.json de Google Cloud (ver docs/ESTUDIO_YOUTUBE.md).')
  if (!token?.refresh_token) throw error(409, 'YouTube no está conectado: pulsa «Conectar con YouTube».')
  if (token.access_token && token.expira && token.expira - 60_000 > ahora()) return token.access_token
  const datos = await pedirToken({
    client_id: cliente.clientId, client_secret: cliente.clientSecret, refresh_token: token.refresh_token, grant_type: 'refresh_token'
  }, transporte)
  await guardarToken(dir, { ...token, access_token: datos.access_token, expira: ahora() + Number(datos.expires_in || 3600) * 1000 })
  return datos.access_token
}

export async function desconectar({ dir = dirYoutube(), transporte = globalThis.fetch } = {}) {
  const token = await leerToken(dir)
  if (token?.refresh_token) {
    try { await transporte(URL_REVOCAR, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: token.refresh_token }) }) } catch { /* se borra igual en local */ }
  }
  await rm(join(dir, 'token.json'), { force: true })
}

function mensajeDeApi(estado, cuerpo) {
  const razon = cuerpo?.error?.errors?.[0]?.reason || cuerpo?.error?.status || ''
  if (razon === 'quotaExceeded' || razon === 'dailyLimitExceeded') return 'Se agotó la cuota diaria de YouTube. Se renueva a medianoche (hora del Pacífico); intenta mañana.'
  if (razon === 'forbidden' || estado === 403) return 'YouTube no permitió la acción. Revisa que el canal esté verificado para miniaturas personalizadas y que el video sea de este canal.'
  if (razon === 'videoNotFound' || estado === 404) return 'YouTube no encontró ese video en este canal.'
  if (estado === 401) return 'La conexión con YouTube venció: vuelve a conectar.'
  if (razon === 'invalidImage' || razon === 'mediaBodyRequired') return 'YouTube no aceptó la imagen: usa un JPG o PNG de 1280×720, de menos de 2 MB.'
  return `YouTube respondió con un error (${estado}${razon ? `: ${String(razon).slice(0, 60)}` : ''}).`
}

async function llamar(url, { metodo = 'GET', acceso, cuerpo, tipo, transporte = globalThis.fetch }) {
  const encabezados = { authorization: `Bearer ${acceso}` }
  if (tipo) encabezados['content-type'] = tipo
  const respuesta = await transporte(url, { method: metodo, headers: encabezados, body: cuerpo })
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw error(respuesta.status === 401 ? 401 : 502, mensajeDeApi(respuesta.status, datos))
  return datos
}

export async function canalConectado({ acceso, transporte }) {
  const datos = await llamar(`${API}/channels?part=snippet&mine=true`, { acceso, transporte })
  const canal = datos.items?.[0]
  if (!canal) throw error(409, 'Esa cuenta de Google no tiene un canal de YouTube.')
  return { id: canal.id, titulo: String(canal.snippet?.title || '') }
}

/** Termina la conexión: canjea el código, identifica el canal y guarda el token fuera del repositorio. */
export async function completarConexion({ dir = dirYoutube(), codigo, verificador, redirect, transporte = globalThis.fetch }) {
  const cliente = await leerCliente(dir)
  if (!cliente) throw error(409, 'Falta el archivo cliente.json de Google Cloud (ver docs/ESTUDIO_YOUTUBE.md).')
  const token = await canjearCodigo({ cliente, codigo, verificador, redirect, transporte })
  const canal = await canalConectado({ acceso: token.access_token, transporte })
  await guardarToken(dir, { ...token, canal })
  return canal
}

/** Lee un video del canal conectado; falla si es de otro canal. */
export async function leerVideo({ idVideo, acceso, canalId, transporte }) {
  const datos = await llamar(`${API}/videos?part=snippet,status&id=${encodeURIComponent(idVideo)}`, { acceso, transporte })
  const video = datos.items?.[0]
  if (!video) throw error(404, 'YouTube no encontró ese video en este canal.')
  if (canalId && video.snippet?.channelId !== canalId) throw error(403, 'Ese video no es de tu canal conectado.')
  return { id: video.id, titulo: String(video.snippet?.title || ''), privacidad: String(video.status?.privacyStatus || ''), snippet: video.snippet }
}

/**
 * Estadísticas públicas de hasta 50 videos por llamada (vistas, me gusta, comentarios, estado y fecha).
 * Con el permiso actual (youtube.force-ssl) no hay retención ni tiempo de visualización: eso exige YouTube Analytics.
 */
export async function estadisticasVideos({ ids, acceso, transporte }) {
  const lista = [...new Set((ids || []).filter(id => /^[A-Za-z0-9_-]{11}$/.test(String(id))))]
  const salida = []
  for (let i = 0; i < lista.length; i += 50) {
    const datos = await llamar(`${API}/videos?part=snippet,statistics,status,contentDetails&id=${lista.slice(i, i + 50).join(',')}`, { acceso, transporte })
    for (const v of datos.items || []) {
      salida.push({
        id: v.id,
        titulo: String(v.snippet?.title || ''),
        publicado: v.status?.publishAt || v.snippet?.publishedAt || null,
        privacidad: String(v.status?.privacyStatus || ''),
        duracion: String(v.contentDetails?.duration || ''),
        vistas: Number(v.statistics?.viewCount || 0),
        meGusta: Number(v.statistics?.likeCount || 0),
        comentarios: Number(v.statistics?.commentCount || 0)
      })
    }
  }
  return salida
}

/** Filas de un reporte de YouTube Analytics como objetos { video, views, … } (columnHeaders + rows). */
export function filasDeReporte(datos) {
  const columnas = (datos?.columnHeaders || []).map(c => c.name)
  return (datos?.rows || []).map(fila => Object.fromEntries(columnas.map((nombre, i) => [nombre, fila[i]])))
}

/**
 * Métricas de YouTube Analytics por video del canal conectado entre dos fechas (AAAA-MM-DD): vistas, minutos vistos, duración
 * media, porcentaje medio visto y suscriptores ganados. Exige el permiso opcional yt-analytics.readonly y la API de YouTube
 * Analytics activada en el proyecto de Google Cloud.
 */
export async function analiticaVideos({ acceso, transporte, desde, hasta, maximo = 50 }) {
  if (![desde, hasta].every(f => /^\d{4}-\d{2}-\d{2}$/.test(String(f)))) throw error(400, 'Las fechas van como AAAA-MM-DD.')
  const parametros = new URLSearchParams({
    ids: 'channel==MINE', startDate: desde, endDate: hasta, dimensions: 'video', sort: '-views', maxResults: String(Math.min(200, Math.max(1, maximo))),
    metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained'
  })
  try {
    return filasDeReporte(await llamar(`${API_ANALITICA}/reports?${parametros}`, { acceso, transporte }))
  } catch (falla) {
    if (/no permitió la acción/.test(falla.message)) throw error(403, 'YouTube no dio acceso a Analytics: conecta con PONT3LA10_YOUTUBE_ANALITICA=1 y activa «YouTube Analytics API» en Google Cloud (ver docs/ESTUDIO_YOUTUBE.md).')
    throw falla
  }
}

export async function ponerMiniatura({ idVideo, imagen, tipo = 'image/jpeg', acceso, transporte }) {
  if (!Buffer.isBuffer(imagen) || imagen.length < 1000) throw error(422, 'La imagen está vacía.')
  if (imagen.length > LIMITE_MINIATURA) throw error(422, 'La miniatura pesa más de 2 MB: YouTube no la acepta.')
  if (!['image/jpeg', 'image/png'].includes(tipo)) throw error(422, 'La miniatura debe ser JPG o PNG.')
  await llamar(`${API_SUBIDA}/thumbnails/set?videoId=${encodeURIComponent(idVideo)}&uploadType=media`, { metodo: 'POST', acceso, cuerpo: imagen, tipo, transporte })
  return { ok: true }
}

export const tituloValido = titulo => typeof titulo === 'string' && titulo.trim().length >= 5 && titulo.trim().length <= 100 && !/[<>]/.test(titulo)

const CAMPOS_EDITABLES = ['description', 'tags', 'categoryId', 'defaultLanguage', 'defaultAudioLanguage']

/** Cambia SOLO el título: reenvía el resto del snippet tal cual porque YouTube borra lo que no se envía. */
export async function ponerTitulo({ idVideo, titulo, acceso, canalId, transporte }) {
  if (!tituloValido(titulo)) throw error(422, 'El título debe tener entre 5 y 100 caracteres y no puede llevar < ni >.')
  const actual = await leerVideo({ idVideo, acceso, canalId, transporte })
  const snippet = { title: titulo.trim() }
  for (const campo of CAMPOS_EDITABLES) if (actual.snippet?.[campo] !== undefined) snippet[campo] = actual.snippet[campo]
  await llamar(`${API}/videos?part=snippet`, { metodo: 'PUT', acceso, tipo: 'application/json', cuerpo: JSON.stringify({ id: idVideo, snippet }), transporte })
  return { titulo: snippet.title, anterior: actual.titulo }
}

/**
 * Programa que un video privado se haga público a una hora (YouTube `status.publishAt`). Solo para el piloto automático,
 * que el responsable autorizó el 2026-11-20. Reenvía el resto del estado tal cual porque YouTube borra lo que no se envía.
 */
export async function programarPublicacion({ idVideo, fecha, acceso, canalId, transporte }) {
  const instante = Date.parse(fecha)
  if (!Number.isFinite(instante) || instante < Date.now() + 5 * 60_000) throw error(422, 'La hora de publicación debe ser al menos 5 minutos hacia adelante.')
  const datos = await llamar(`${API}/videos?part=status,snippet&id=${encodeURIComponent(idVideo)}`, { acceso, transporte })
  const video = datos.items?.[0]
  if (!video) throw error(404, 'YouTube no encontró ese video en este canal.')
  if (canalId && video.snippet?.channelId !== canalId) throw error(403, 'Ese video no es de tu canal conectado.')
  const status = { privacyStatus: 'private', publishAt: new Date(instante).toISOString(), selfDeclaredMadeForKids: video.status?.selfDeclaredMadeForKids === true }
  for (const campo of ['license', 'embeddable', 'publicStatsViewable']) if (video.status?.[campo] !== undefined) status[campo] = video.status[campo]
  await llamar(`${API}/videos?part=status`, { metodo: 'PUT', acceso, tipo: 'application/json', cuerpo: JSON.stringify({ id: idVideo, status }), transporte })
  return { publishAt: status.publishAt }
}

const TROZO = 16 * 1024 * 1024 // múltiplo de 256 KiB, como exige la subida reanudable
export const PRIVACIDADES_SUBIDA = ['private', 'unlisted']

/** Sube un video (subida reanudable por trozos). Nunca lo deja público: solo «private» o «unlisted». */
export async function subirVideo({ ruta, titulo, descripcion = '', privacidad = 'private', categoria = '17', acceso, transporte = globalThis.fetch, alProgresar = () => {}, trozo = TROZO, reintentos = 4, espera = ms => new Promise(r => setTimeout(r, ms)) }) {
  if (!tituloValido(titulo)) throw error(422, 'El título debe tener entre 5 y 100 caracteres y no puede llevar < ni >.')
  if (!PRIVACIDADES_SUBIDA.includes(privacidad)) throw error(422, 'El video se sube como privado o no listado; publicarlo lo haces tú en YouTube Studio.')
  if (String(descripcion).length > 5000 || /[<>]/.test(String(descripcion))) throw error(422, 'La descripción es demasiado larga o tiene caracteres no permitidos.')
  const total = (await stat(ruta)).size
  if (!total) throw error(422, 'El archivo de video está vacío.')

  const inicio = await transporte(`${API_SUBIDA}/videos?uploadType=resumable&part=snippet,status`, {
    method: 'POST',
    headers: { authorization: `Bearer ${acceso}`, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-length': String(total), 'x-upload-content-type': 'video/mp4' },
    body: JSON.stringify({
      snippet: { title: titulo.trim(), description: String(descripcion), categoryId: categoria, defaultLanguage: 'es', defaultAudioLanguage: 'es' },
      status: { privacyStatus: privacidad, selfDeclaredMadeForKids: false }
    })
  })
  if (!inicio.ok) throw error(inicio.status === 401 ? 401 : 502, mensajeDeApi(inicio.status, await inicio.json().catch(() => ({}))))
  const destino = inicio.headers.get('location')
  if (!destino) throw error(502, 'YouTube no entregó la dirección de subida.')

  const archivo = await open(ruta, 'r')
  try {
    let desplazamiento = 0
    let fallos = 0
    while (true) {
      const largo = Math.min(trozo, total - desplazamiento)
      const buffer = Buffer.alloc(largo)
      await archivo.read(buffer, 0, largo, desplazamiento)
      let respuesta
      try {
        respuesta = await transporte(destino, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-range': `bytes ${desplazamiento}-${desplazamiento + largo - 1}/${total}` }, body: buffer })
      } catch {
        respuesta = null
      }
      if (respuesta && (respuesta.status === 200 || respuesta.status === 201)) {
        const video = await respuesta.json().catch(() => ({}))
        alProgresar(total, total)
        return { id: video.id, titulo: String(video.snippet?.title || titulo), privacidad: String(video.status?.privacyStatus || privacidad) }
      }
      if (respuesta && respuesta.status === 308) {
        const rango = /bytes=0-(\d+)/.exec(respuesta.headers.get('range') || '')
        desplazamiento = rango ? Number(rango[1]) + 1 : 0
        fallos = 0
        alProgresar(desplazamiento, total)
        continue
      }
      if (respuesta && respuesta.status < 500 && respuesta.status !== 408 && respuesta.status !== 429) {
        throw error(respuesta.status === 401 ? 401 : 502, mensajeDeApi(respuesta.status, await respuesta.json().catch(() => ({}))))
      }
      // Error de red o del servidor: se pregunta cuánto recibió YouTube y se reanuda desde ahí.
      if (++fallos > reintentos) throw error(502, 'Se cortó la subida a YouTube y no se pudo reanudar. Intenta de nuevo.')
      await espera(1000 * fallos)
      try {
        const estado = await transporte(destino, { method: 'PUT', headers: { 'content-range': `bytes */${total}` } })
        if (estado.status === 200 || estado.status === 201) {
          const video = await estado.json().catch(() => ({}))
          alProgresar(total, total)
          return { id: video.id, titulo: String(video.snippet?.title || titulo), privacidad: String(video.status?.privacyStatus || privacidad) }
        }
        const rango = /bytes=0-(\d+)/.exec(estado.headers?.get?.('range') || '')
        desplazamiento = rango ? Number(rango[1]) + 1 : 0
      } catch { /* se reintenta el mismo trozo */ }
    }
  } finally {
    await archivo.close()
  }
}

/** Borra un video del canal conectado (solo para limpiar pruebas propias). */
export async function eliminarVideo({ idVideo, acceso, canalId, transporte = globalThis.fetch }) {
  await leerVideo({ idVideo, acceso, canalId, transporte })
  const respuesta = await transporte(`${API}/videos?id=${encodeURIComponent(idVideo)}`, { method: 'DELETE', headers: { authorization: `Bearer ${acceso}` } })
  if (!respuesta.ok && respuesta.status !== 204) throw error(502, mensajeDeApi(respuesta.status, await respuesta.json().catch(() => ({}))))
  return { ok: true }
}
