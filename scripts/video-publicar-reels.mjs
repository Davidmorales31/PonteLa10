// Publicación y programación de los Reels en Facebook e Instagram, con la misma API de agentes de redes
// que usan las fotos (PONT3LA10_AGENTES_REDES_KEY en el .env de la raíz; nunca se imprime ni sale del servidor).
// Flujo por Reel: subir el MP4 → crear la publicación de tipo «video» → validar → borrador, programar o pedir aprobación.
import { readFile, writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const SITIO = 'https://www.pont3la10.com'
const MINUTOS_MINIMOS = 10
const DIAS_MAXIMOS = 30
export const MODOS = ['borrador', 'programar', 'aprobacion']

const archivoEstado = carpeta => join(carpeta, 'renders', 'reels', 'publicaciones.json')

export async function leerEstadoPublicaciones(carpeta) {
  try { return JSON.parse(await readFile(archivoEstado(carpeta), 'utf8')) } catch { return {} }
}
async function guardarEstadoPublicaciones(carpeta, estado) {
  await writeFile(archivoEstado(carpeta), JSON.stringify(estado, null, 2))
}

// La fecha debe ser ISO con zona, entre 10 minutos y 30 días desde ahora (las reglas de la API de redes).
export function validarFecha(fecha, ahora = Date.now()) {
  const instante = Date.parse(fecha)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(fecha)) || Number.isNaN(instante)) return 'La fecha no es válida.'
  if (instante < ahora + MINUTOS_MINIMOS * 60_000) return `Elige una hora a más de ${MINUTOS_MINIMOS} minutos desde ahora.`
  if (instante > ahora + DIAS_MAXIMOS * 86_400_000) return `Solo se puede programar hasta ${DIAS_MAXIMOS} días hacia adelante.`
  return ''
}

// Horas escalonadas para publicar varios Reels a lo largo del día.
export function escalonar(inicioIso, cadaHoras, cantidad) {
  const inicio = Date.parse(inicioIso)
  if (Number.isNaN(inicio) || !(cadaHoras > 0) || cantidad < 1) return []
  return Array.from({ length: cantidad }, (_, i) => new Date(inicio + i * cadaHoras * 3_600_000).toISOString())
}

export const claveReel = (proyecto, idReel, creado) => `reel-${proyecto}-${idReel}-${String(creado).replace(/\D/g, '').slice(0, 14)}`.slice(0, 100)

// Instagram no hace clic en enlaces de los textos: la nota se nombra sin enlace.
export function textosReel(descripcion) {
  const facebook = String(descripcion || '').trim().slice(0, 5000)
  const instagram = facebook.replace(/Nota completa: https?:\/\/(?:www\.)?pont3la10\.com\S*/i, 'Nota completa en pont3la10.com').slice(0, 2200)
  return { facebook, instagram }
}

export const tituloInterno = reel => `Reel · ${reel.club || reel.id} · ${String(reel.descripcion || '').split('\n')[0]}`.slice(0, 120)

export function destinoPermitido(base) {
  const url = new URL(base)
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) return false
  return ['pont3la10.com', 'www.pont3la10.com', 'localhost', '127.0.0.1'].includes(url.hostname)
}

export function crearClienteRedes({ llave, base = `${SITIO}/api/agentes/redes/v1`, fetchFn = fetch } = {}) {
  if (!llave) throw Object.assign(new Error('Falta la llave de redes: una persona debe crearla en Panel → Contenido para redes → Agentes IA y guardarla en el .env como PONT3LA10_AGENTES_REDES_KEY.'), { estado: 409 })
  if (!destinoPermitido(base)) throw Object.assign(new Error('Destino de la API de redes no permitido.'), { estado: 500 })
  const llamar = async (metodo, ruta, cuerpo, { cabeceras = {}, crudo = false } = {}) => {
    const respuesta = await fetchFn(`${base}${ruta}`, {
      method: metodo,
      headers: { authorization: `Bearer ${llave}`, ...(cuerpo !== undefined && !crudo ? { 'content-type': 'application/json' } : {}), ...cabeceras },
      body: cuerpo === undefined ? undefined : (crudo ? cuerpo : JSON.stringify(cuerpo)),
      signal: AbortSignal.timeout(120_000)
    })
    const datos = await respuesta.json().catch(() => null)
    if (!respuesta.ok) {
      const mensaje = datos?.error?.mensaje ? String(datos.error.mensaje).slice(0, 240) : `HTTP ${respuesta.status}`
      throw Object.assign(new Error(`Redes rechazó la operación (${datos?.error?.codigo || respuesta.status}): ${mensaje}`), { estado: respuesta.status === 429 ? 429 : 502 })
    }
    return datos
  }
  return { llamar }
}

async function subirVideo(cliente, archivo, fetchFn) {
  const bytes = await readFile(archivo)
  const inicio = await cliente.llamar('POST', '/medios/subidas', { nombre: basename(archivo), tipoMime: 'video/mp4', tamano: bytes.length })
  const subida = inicio?.subida
  if (!inicio?.id || !subida?.url) throw Object.assign(new Error('La API de redes no devolvió dónde subir el video.'), { estado: 502 })
  const respuesta = await fetchFn(subida.url, { method: subida.metodo || 'PUT', headers: subida.encabezados || { 'content-type': 'video/mp4' }, body: bytes, signal: AbortSignal.timeout(10 * 60_000) })
  if (!respuesta.ok) throw Object.assign(new Error(`No se pudo subir el video (HTTP ${respuesta.status}).`), { estado: 502 })
  await cliente.llamar('POST', `/medios/subidas/${inicio.id}/confirmar`, {})
  return inicio.id
}

// Sube el Reel, crea la publicación y la deja como borrador, programada o pendiente de aprobación.
export async function publicarReel({ proyecto, carpeta, reel, creado, modo, fecha, cliente, fetchFn = fetch, ahora = Date.now() }) {
  if (!MODOS.includes(modo)) throw Object.assign(new Error('Modo de publicación no válido.'), { estado: 422 })
  if (modo !== 'borrador') {
    const error = validarFecha(fecha, ahora)
    if (modo === 'programar' && error) throw Object.assign(new Error(error), { estado: 422 })
  }
  const archivo = join(carpeta, reel.archivo)
  if (!existsSync(archivo)) throw Object.assign(new Error('El archivo del Reel no existe.'), { estado: 404 })
  const estado = await leerEstadoPublicaciones(carpeta)
  const previo = estado[reel.id]
  const clave = claveReel(proyecto, reel.id, creado)
  if (previo && previo.clave === clave && ['programada', 'publicada'].includes(previo.estado)) {
    throw Object.assign(new Error(previo.estado === 'publicada' ? 'Este Reel ya se publicó.' : 'Este Reel ya está programado: cancela la programación para cambiarlo.'), { estado: 409 })
  }

  let publicacionId = previo && previo.clave === clave ? previo.publicacionId : null
  if (!publicacionId) {
    const medioId = await subirVideo(cliente, archivo, fetchFn)
    const textos = textosReel(reel.descripcion)
    const creada = await cliente.llamar('POST', '/publicaciones', { tipo: 'video', titulo: tituloInterno(reel), destinos: ['facebook', 'instagram'], descripcion: textos, videoMedioId: medioId, claveIdempotencia: clave })
    publicacionId = creada?.id || creada?.publicacion?.id
    if (!publicacionId) throw Object.assign(new Error('La API de redes no devolvió el identificador de la publicación.'), { estado: 502 })
    estado[reel.id] = { publicacionId, clave, estado: 'borrador', fecha: null, actualizado: new Date().toISOString(), tamano: (await stat(archivo)).size }
    await guardarEstadoPublicaciones(carpeta, estado)
  }

  const leida = await cliente.llamar('GET', `/publicaciones/${publicacionId}`)
  const revision = leida?.revision ?? leida?.publicacion?.revision
  if (!Number.isInteger(revision)) throw Object.assign(new Error('No se pudo leer la revisión de la publicación.'), { estado: 502 })
  const validacion = await cliente.llamar('POST', `/publicaciones/${publicacionId}/validar`, {})
  if (validacion?.listo === false && modo !== 'borrador') {
    throw Object.assign(new Error(`La publicación no está lista: ${(validacion.motivos || []).join('; ') || 'revisa el panel de redes'}.`), { estado: 422 })
  }

  if (modo === 'programar') {
    await cliente.llamar('POST', `/publicaciones/${publicacionId}/programar`, { id: publicacionId, revision, fecha: new Date(fecha).toISOString() })
    estado[reel.id] = { ...estado[reel.id], estado: 'programada', fecha: new Date(fecha).toISOString(), actualizado: new Date().toISOString() }
  } else if (modo === 'aprobacion') {
    await cliente.llamar('POST', `/publicaciones/${publicacionId}/solicitar-aprobacion`, { id: publicacionId, revision, nota: `Reel de ${reel.club || reel.id} del video del ${proyecto}.`, ...(validarFecha(fecha, ahora) ? {} : { horaSugerida: new Date(fecha).toISOString() }) })
    estado[reel.id] = { ...estado[reel.id], estado: 'aprobacion', fecha: fecha ? new Date(fecha).toISOString() : null, actualizado: new Date().toISOString() }
  }
  await guardarEstadoPublicaciones(carpeta, estado)
  return { reel: reel.id, publicacionId, estado: estado[reel.id].estado, fecha: estado[reel.id].fecha, validacion: { listo: validacion?.listo !== false, motivos: validacion?.motivos || [] } }
}

export async function cancelarProgramacionReel({ carpeta, reel, cliente }) {
  const estado = await leerEstadoPublicaciones(carpeta)
  const actual = estado[reel.id]
  if (!actual?.publicacionId || actual.estado !== 'programada') throw Object.assign(new Error('Este Reel no está programado.'), { estado: 409 })
  await cliente.llamar('POST', `/publicaciones/${actual.publicacionId}/cancelar-programacion`, { id: actual.publicacionId })
  estado[reel.id] = { ...actual, estado: 'borrador', fecha: null, actualizado: new Date().toISOString() }
  await guardarEstadoPublicaciones(carpeta, estado)
  return estado[reel.id]
}

// Actualiza el estado local con lo que dice la API (publicada, fallida, programada…).
export async function refrescarEstados({ carpeta, cliente }) {
  const estado = await leerEstadoPublicaciones(carpeta)
  const traduccion = { draft: 'borrador', scheduled: 'programada', publishing: 'publicando', published: 'publicada', failed: 'fallida' }
  let cambio = false
  for (const [id, actual] of Object.entries(estado)) {
    if (!actual.publicacionId || ['publicada'].includes(actual.estado)) continue
    try {
      const leida = await cliente.llamar('GET', `/publicaciones/${actual.publicacionId}`)
      const nuevo = traduccion[leida?.estado ?? leida?.publicacion?.estado]
      if (nuevo && nuevo !== actual.estado && !(actual.estado === 'aprobacion' && nuevo === 'borrador')) { estado[id] = { ...actual, estado: nuevo, actualizado: new Date().toISOString() }; cambio = true }
    } catch { /* se conserva el estado local */ }
  }
  if (cambio) await guardarEstadoPublicaciones(carpeta, estado)
  return estado
}
