// Conexión LOCAL del estudio de video con YouTube (YouTube Data API v3).
//
// Qué hace: con tu autorización (OAuth con PKCE, en tu navegador) pone la miniatura elegida y el título elegido
// en un video que YA subiste a tu canal. No sube el video, no lo publica y no cambia su privacidad.
//
// Dónde vive lo privado: fuera del repositorio, en %LOCALAPPDATA%\Pont3la10\youtube (o PONT3LA10_YOUTUBE_DIR):
//   cliente.json  → credenciales «Aplicación de escritorio» descargadas de Google Cloud (las pones tú)
//   token.json    → lo crea este módulo al conectar; nunca viaja a la página ni se muestra
import { createHash, randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const ALCANCE = 'https://www.googleapis.com/auth/youtube.force-ssl'
const URL_AUTORIZACION = 'https://accounts.google.com/o/oauth2/v2/auth'
const URL_TOKEN = 'https://oauth2.googleapis.com/token'
const URL_REVOCAR = 'https://oauth2.googleapis.com/revoke'
const API = 'https://www.googleapis.com/youtube/v3'
const API_SUBIDA = 'https://www.googleapis.com/upload/youtube/v3'
export const LIMITE_MINIATURA = 2 * 1024 * 1024

const error = (estado, mensaje) => Object.assign(new Error(mensaje), { estado })

export function dirYoutube(entorno = process.env) {
  return entorno.PONT3LA10_YOUTUBE_DIR || join(entorno.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'Pont3la10', 'youtube')
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

export function urlAutorizacion({ clientId, redirect, estado, desafio }) {
  const parametros = new URLSearchParams({
    client_id: clientId, redirect_uri: redirect, response_type: 'code', scope: ALCANCE,
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
  return { dir, configurado: Boolean(cliente), conectado: Boolean(cliente && token?.refresh_token), canal: token?.canal || null }
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
  return { access_token: datos.access_token, refresh_token: datos.refresh_token, expira: Date.now() + Number(datos.expires_in || 3600) * 1000 }
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
