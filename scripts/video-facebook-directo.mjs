// Subida directa de video a la página de Facebook desde el estudio local (Graph API, subida reanudable por trozos).
// No pasa por el almacenamiento temporal de Supabase (50 MB por archivo): sirve para el video largo de 8–10 min.
// Decisión y responsabilidad del responsable (2026-11-21): el estudio usa el token de la página que ya está en el .env de la raíz
// (NUXT_META_FACEBOOK_PAGE_ACCESS_TOKEN / NUXT_META_FACEBOOK_PAGE_ID). El token nunca se imprime, se registra ni sale de este proceso.
// El video queda PROGRAMADO (published=false + scheduled_publish_time): nunca se publica al instante.
import { open, stat } from 'node:fs/promises'

const VERSION = 'v27.0'
const PAGINA_OBJETIVO = '1432682403259329' // misma página que valida el servidor (server/utils/publicacionMeta.ts)
const MINUTOS_MINIMOS = 11 // Facebook pide entre 10 minutos y 30 días
const DIAS_MAXIMOS = 29

export function credencialesFacebook(entorno = process.env) {
  const pagina = String(entorno.NUXT_META_FACEBOOK_PAGE_ID || '')
  const token = String(entorno.NUXT_META_FACEBOOK_PAGE_ACCESS_TOKEN || '')
  if (pagina !== PAGINA_OBJETIVO || !token || token.length > 8192) return null
  return { pagina, token }
}

export function validarFechaFacebook(fecha, ahora = Date.now()) {
  const instante = Date.parse(fecha)
  if (!Number.isFinite(instante)) return 'La fecha no es válida.'
  if (instante < ahora + MINUTOS_MINIMOS * 60_000) return `Facebook pide programar a más de ${MINUTOS_MINIMOS - 1} minutos desde ahora.`
  if (instante > ahora + DIAS_MAXIMOS * 86_400_000) return `Facebook solo programa hasta ${DIAS_MAXIMOS} días hacia adelante.`
  return ''
}

const fallo = (estado, mensaje) => Object.assign(new Error(mensaje), { estado })

async function llamarMeta(url, { token, cuerpo, metodo = 'POST', transporte = globalThis.fetch }) {
  let respuesta
  try {
    respuesta = await transporte(url, { method: metodo, body: cuerpo, redirect: 'error', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10 * 60_000) })
  } catch { throw fallo(502, 'No se pudo hablar con Facebook (red).') }
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok || datos?.error) {
    const e = datos?.error || {}
    const motivo = respuesta.status === 401 || respuesta.status === 403 || e.code === 190 ? 'Facebook rechazó la autorización: el token venció o le faltan permisos.' : `Facebook rechazó la operación (HTTP ${respuesta.status}${e.code ? `, código ${e.code}` : ''}): ${String(e.message || '').slice(0, 160)}`
    throw fallo(502, motivo)
  }
  return datos
}

/**
 * Sube un video a la página y lo deja programado. Devuelve { videoId, fecha }.
 * `transporte` y `espera` se inyectan en las pruebas.
 */
export async function subirYProgramarVideoFacebook({ ruta, titulo, descripcion = '', fecha, credenciales, transporte = globalThis.fetch, espera = ms => new Promise(r => setTimeout(r, ms)), reintentos = 4, alProgresar = () => {} }) {
  if (!credenciales) throw fallo(409, 'Falta el token de la página de Facebook en el .env (NUXT_META_FACEBOOK_PAGE_ACCESS_TOKEN y NUXT_META_FACEBOOK_PAGE_ID).')
  const error = validarFechaFacebook(fecha)
  if (error) throw fallo(422, error)
  const total = (await stat(ruta)).size
  if (!total) throw fallo(422, 'El archivo de video está vacío.')
  const { pagina, token } = credenciales
  const url = `https://graph-video.facebook.com/${VERSION}/${pagina}/videos`

  const inicio = await llamarMeta(url, { token, transporte, cuerpo: new URLSearchParams({ upload_phase: 'start', file_size: String(total) }) })
  const sesion = String(inicio.upload_session_id || '')
  const videoId = String(inicio.video_id || '')
  if (!sesion || !/^[0-9]{1,40}$/.test(videoId)) throw fallo(502, 'Facebook no devolvió la sesión de subida.')

  const archivo = await open(ruta, 'r')
  try {
    let desde = Number(inicio.start_offset)
    let hasta = Number(inicio.end_offset)
    let fallos = 0
    while (desde < hasta) {
      const buffer = Buffer.alloc(hasta - desde)
      await archivo.read(buffer, 0, buffer.length, desde)
      const formulario = new FormData()
      formulario.set('upload_phase', 'transfer')
      formulario.set('upload_session_id', sesion)
      formulario.set('start_offset', String(desde))
      formulario.set('video_file_chunk', new Blob([new Uint8Array(buffer)], { type: 'application/octet-stream' }), 'trozo')
      try {
        const siguiente = await llamarMeta(url, { token, transporte, cuerpo: formulario })
        desde = Number(siguiente.start_offset)
        hasta = Number(siguiente.end_offset)
        fallos = 0
        alProgresar(desde, total)
      } catch (problema) {
        if (problema.estado === 502 && /autorización/.test(problema.message)) throw problema
        if (++fallos > reintentos) throw problema
        await espera(1500 * fallos)
      }
    }
  } finally { await archivo.close() }

  const fin = await llamarMeta(url, { token, transporte, cuerpo: new URLSearchParams({
    upload_phase: 'finish', upload_session_id: sesion, title: String(titulo).slice(0, 255), description: String(descripcion).slice(0, 5000),
    published: 'false', scheduled_publish_time: String(Math.floor(Date.parse(fecha) / 1000)) }) })
  if (fin.success === false) throw fallo(502, 'Facebook no confirmó la subida del video.')
  return { videoId, fecha: new Date(fecha).toISOString() }
}

/** Estado del video en la página (para comprobar que quedó programado). */
export async function estadoVideoFacebook({ videoId, credenciales, transporte = globalThis.fetch }) {
  const datos = await llamarMeta(`https://graph.facebook.com/${VERSION}/${videoId}?fields=published,scheduled_publish_time,status`, { token: credenciales.token, metodo: 'GET', transporte })
  return { publicado: datos.published === true, programadoPara: datos.scheduled_publish_time || null, estado: datos.status?.video_status || null }
}

/** Borra un video propio de la página (solo para limpiar pruebas). */
export async function borrarVideoFacebook({ videoId, credenciales, transporte = globalThis.fetch }) {
  if (!/^[0-9]{1,40}$/.test(String(videoId))) throw fallo(422, 'Identificador de video no válido.')
  return llamarMeta(`https://graph.facebook.com/${VERSION}/${videoId}`, { token: credenciales.token, metodo: 'DELETE', transporte })
}
