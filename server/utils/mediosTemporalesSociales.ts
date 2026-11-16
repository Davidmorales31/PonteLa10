import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { tiposTemporalesSociales } from '~/utils/editorial/mediosTemporales'
import type { MimeTemporalSocial, TemporalSocialVista, TipoTemporalSocial } from '~/utils/editorial/mediosTemporales'
import type { DocumentoPublicacionPropia } from '~/utils/editorial/publicacionesPropias'
import { idsMediosDocumentoPropio } from '~/utils/editorial/publicacionesPropias'

export const bucketTemporalSocial = 'social-temp-uploads'
const MB = 1024 * 1024

export interface ConfiguracionMediosTemporales {
  borrarAlPublicar: boolean, retencionBorradorDias: number, retencionHuerfanosHoras: number,
  maxImagenBytes: number, maxVideoBytes: number, urlFirmadaSegundos: number
}

function numero(valor: string | undefined, porDefecto: number, minimo: number, maximo: number) {
  const n = Number(valor)
  return Number.isFinite(n) && valor?.trim() ? Math.min(maximo, Math.max(minimo, n)) : porDefecto
}

/** Todo es parametrizable por variables de entorno privadas; los valores por defecto son prudentes. */
export function configuracionMediosTemporales(env: Record<string, string | undefined> = process.env): ConfiguracionMediosTemporales {
  return {
    borrarAlPublicar: !['0', 'false', 'no'].includes((env.SOCIAL_TEMP_BORRAR_AL_PUBLICAR || '').trim().toLowerCase()),
    retencionBorradorDias: numero(env.SOCIAL_TEMP_RETENCION_BORRADOR_DIAS, 14, 1, 90),
    retencionHuerfanosHoras: numero(env.SOCIAL_TEMP_RETENCION_HUERFANOS_HORAS, 24, 1, 720),
    maxImagenBytes: numero(env.SOCIAL_TEMP_MAX_IMAGEN_MB, 15, 1, 50) * MB,
    maxVideoBytes: numero(env.SOCIAL_TEMP_MAX_VIDEO_MB, 200, 1, 500) * MB,
    urlFirmadaSegundos: numero(env.SOCIAL_TEMP_URL_FIRMADA_MINUTOS, 120, 10, 720) * 60
  }
}

export interface FilaTemporalSocial {
  id: string, owner_id: string, post_id: string | null, kind: TipoTemporalSocial, mime_type: string, original_name: string,
  path: string, size_bytes: number | null, width: number | null, height: number | null, status: 'pending' | 'ready', keep_until: string | null
}
const columnas = 'id,owner_id,post_id,kind,mime_type,original_name,path,size_bytes,width,height,status,keep_until'

function falla(mensaje: string, codigo = 503): never { throw createError({ statusCode: codigo, statusMessage: mensaje }) }

export async function iniciarTemporalSocial(privado: SupabaseClient, actorId: string, entrada: { nombre: string, tipoMime: MimeTemporalSocial, tamano: number, publicacionId?: string },
  config = configuracionMediosTemporales()) {
  const tipo = tiposTemporalesSociales[entrada.tipoMime]
  const maximo = tipo.tipo === 'video' ? config.maxVideoBytes : config.maxImagenBytes
  if (entrada.tamano > maximo) falla(`El archivo supera el máximo de ${Math.round(maximo / MB)} MB.`, 413)
  if (entrada.publicacionId) {
    const post = await privado.from('social_custom_posts').select('id').eq('id', entrada.publicacionId).maybeSingle()
    if (post.error || !post.data) falla('La publicación no existe.', 404)
  }
  const id = randomUUID()
  const ruta = `${actorId}/${id}.${tipo.extension}`
  const insercion = await privado.from('social_temp_media').insert({ id, owner_id: actorId, post_id: entrada.publicacionId ?? null, kind: tipo.tipo,
    mime_type: entrada.tipoMime, original_name: entrada.nombre, path: ruta, size_bytes: entrada.tamano })
  if (insercion.error) falla('No se pudo preparar la subida.')
  const firma = await privado.storage.from(bucketTemporalSocial).createSignedUploadUrl(ruta)
  if (firma.error || !firma.data?.signedUrl) {
    await privado.from('social_temp_media').delete().eq('id', id)
    falla('No se pudo habilitar la subida directa. Revisa el almacenamiento temporal.')
  }
  return { id, tipo: tipo.tipo, urlSubida: firma.data.signedUrl }
}

/** Comprueba lo que realmente quedó en Storage (tamaño y contenido) antes de aceptar el archivo. */
export async function confirmarTemporalSocial(privado: SupabaseClient, actorId: string, id: string, config = configuracionMediosTemporales()): Promise<TemporalSocialVista> {
  const consulta = await privado.from('social_temp_media').select(columnas).eq('id', id).eq('owner_id', actorId).maybeSingle()
  if (consulta.error) falla('No se pudo consultar el archivo.')
  const fila = consulta.data as FilaTemporalSocial | null
  if (!fila) falla('El archivo no existe.', 404)
  const almacen = privado.storage.from(bucketTemporalSocial)
  const rechazar = async (mensaje: string): Promise<never> => {
    await almacen.remove([fila.path]).catch(() => undefined)
    await privado.from('social_temp_media').delete().eq('id', id)
    return falla(mensaje, 422)
  }
  const nombre = fila.path.split('/')[1]!
  const listado = await almacen.list(actorId, { search: nombre, limit: 5 })
  const objeto = listado.data?.find(item => item.name === nombre)
  const tamano = Number(objeto?.metadata?.size || 0)
  const maximo = fila.kind === 'video' ? config.maxVideoBytes : config.maxImagenBytes
  if (listado.error) falla('No se pudo verificar la subida.')
  if (!objeto || !tamano) return rechazar('La subida no llegó completa. Inténtalo de nuevo.')
  if (tamano > maximo) return rechazar(`El archivo supera el máximo de ${Math.round(maximo / MB)} MB.`)
  let ancho: number | null = null, alto: number | null = null
  if (fila.kind === 'imagen') {
    const descarga = await almacen.download(fila.path)
    if (descarga.error || !descarga.data) falla('No se pudo revisar la imagen.')
    try {
      const meta = await sharp(Buffer.from(await descarga.data.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate().metadata()
      const orientada = (meta.orientation ?? 1) >= 5
      ancho = (orientada ? meta.height : meta.width) ?? null; alto = (orientada ? meta.width : meta.height) ?? null
    } catch { return rechazar('La imagen no se pudo leer. Usa JPG, PNG o WebP.') }
    if (!ancho || !alto) return rechazar('La imagen no se pudo leer.')
  } else {
    const firma = await almacen.createSignedUrl(fila.path, 60)
    if (firma.error || !firma.data?.signedUrl) falla('No se pudo revisar el vídeo.')
    const cabecera = await fetch(firma.data.signedUrl, { headers: { Range: 'bytes=0-63' }, signal: AbortSignal.timeout(10_000) }).catch(() => null)
    const bytes = cabecera?.ok ? Buffer.from(await cabecera.arrayBuffer()) : null
    if (!bytes || bytes.subarray(4, 8).toString('latin1') !== 'ftyp') return rechazar('El vídeo no es un MP4 o MOV válido.')
  }
  const actualizado = await privado.from('social_temp_media').update({ status: 'ready', size_bytes: tamano, width: ancho, height: alto, ready_at: new Date().toISOString() }).eq('id', id)
  if (actualizado.error) falla('No se pudo registrar el archivo.')
  return vistaTemporalSocial(privado, { ...fila, status: 'ready', size_bytes: tamano, width: ancho, height: alto }, config)
}

/** Registra un archivo que el servidor ya tiene en memoria (p. ej. importado desde una URL) como temporal listo. */
export async function registrarTemporalDesdeBuffer(privado: SupabaseClient, actorId: string, entrada: { nombre: string, tipoMime: MimeTemporalSocial, buffer: Buffer, publicacionId?: string },
  config = configuracionMediosTemporales()): Promise<TemporalSocialVista> {
  const tipo = tiposTemporalesSociales[entrada.tipoMime]
  if (tipo.tipo !== 'imagen') falla('Solo se pueden importar imágenes.', 422)
  if (entrada.buffer.byteLength > config.maxImagenBytes) falla(`La imagen supera el máximo de ${Math.round(config.maxImagenBytes / MB)} MB.`, 413)
  let ancho: number | null = null, alto: number | null = null
  try {
    const meta = await sharp(entrada.buffer, { limitInputPixels: 40_000_000 }).rotate().metadata()
    const orientada = (meta.orientation ?? 1) >= 5
    ancho = (orientada ? meta.height : meta.width) ?? null; alto = (orientada ? meta.width : meta.height) ?? null
  } catch { falla('La imagen no se pudo leer. Usa JPG, PNG o WebP.', 422) }
  if (!ancho || !alto) falla('La imagen no se pudo leer.', 422)
  if (entrada.publicacionId) {
    const post = await privado.from('social_custom_posts').select('id').eq('id', entrada.publicacionId).maybeSingle()
    if (post.error || !post.data) falla('La publicación no existe.', 404)
  }
  const id = randomUUID()
  const ruta = `${actorId}/${id}.${tipo.extension}`
  const subida = await privado.storage.from(bucketTemporalSocial).upload(ruta, entrada.buffer, { contentType: entrada.tipoMime, upsert: false })
  if (subida.error) falla('No se pudo guardar la imagen temporal.')
  const insercion = await privado.from('social_temp_media').insert({ id, owner_id: actorId, post_id: entrada.publicacionId ?? null, kind: 'imagen',
    mime_type: entrada.tipoMime, original_name: entrada.nombre.slice(0, 200) || 'imagen', path: ruta, size_bytes: entrada.buffer.byteLength,
    width: ancho, height: alto, status: 'ready', ready_at: new Date().toISOString() })
  if (insercion.error) { await privado.storage.from(bucketTemporalSocial).remove([ruta]).catch(() => undefined); falla('No se pudo registrar la imagen.') }
  return vistaTemporalSocial(privado, { id, owner_id: actorId, post_id: entrada.publicacionId ?? null, kind: 'imagen', mime_type: entrada.tipoMime, original_name: entrada.nombre,
    path: ruta, size_bytes: entrada.buffer.byteLength, width: ancho, height: alto, status: 'ready', keep_until: null }, config)
}

export async function vistaTemporalSocial(privado: SupabaseClient, fila: FilaTemporalSocial, config = configuracionMediosTemporales()): Promise<TemporalSocialVista> {
  const firma = await privado.storage.from(bucketTemporalSocial).createSignedUrl(fila.path, Math.min(config.urlFirmadaSegundos, 3600))
  if (firma.error || !firma.data?.signedUrl) falla('No se pudo mostrar el archivo temporal.')
  return { id: fila.id, tipo: fila.kind, ancho: fila.width, alto: fila.height, url: firma.data.signedUrl, nombre: fila.original_name }
}

export async function buscarTemporalesSociales(privado: SupabaseClient, ids: string[]): Promise<FilaTemporalSocial[]> {
  if (!ids.length) return []
  const consulta = await privado.from('social_temp_media').select(columnas).in('id', ids).eq('status', 'ready')
  if (consulta.error) falla('No se pudieron consultar los archivos temporales.')
  return (consulta.data || []) as FilaTemporalSocial[]
}

export async function descargarTemporalSocial(privado: SupabaseClient, fila: FilaTemporalSocial): Promise<Buffer> {
  const descarga = await privado.storage.from(bucketTemporalSocial).download(fila.path)
  if (descarga.error || !descarga.data) falla('No se pudo recuperar un archivo temporal.')
  return Buffer.from(await descarga.data.arrayBuffer())
}

export async function urlFirmadaVideoTemporal(privado: SupabaseClient, fila: FilaTemporalSocial, config = configuracionMediosTemporales()) {
  const firma = await privado.storage.from(bucketTemporalSocial).createSignedUrl(fila.path, config.urlFirmadaSegundos)
  if (firma.error || !firma.data?.signedUrl || new URL(firma.data.signedUrl).protocol !== 'https:') falla('No se pudo habilitar la lectura temporal del vídeo.')
  return firma.data.signedUrl
}

export async function vincularTemporalesSociales(privado: SupabaseClient, postId: string, documento: DocumentoPublicacionPropia) {
  const ids = idsMediosDocumentoPropio(documento)
  if (ids.length) await privado.from('social_temp_media').update({ post_id: postId }).in('id', ids)
}

async function borrarFilas(privado: SupabaseClient, filas: Array<{ id: string, path: string }>) {
  if (!filas.length) return 0
  const borrado = await privado.storage.from(bucketTemporalSocial).remove(filas.map(fila => fila.path))
  if (borrado.error) return 0 // Las filas se conservan para reintentar el borrado después.
  await privado.from('social_temp_media').delete().in('id', filas.map(fila => fila.id))
  return filas.length
}

/** Borra los archivos temporales de una publicación ya enviada (si la opción está activa). */
export async function limpiarTemporalesPublicacion(privado: SupabaseClient, postId: string, config = configuracionMediosTemporales()) {
  if (!config.borrarAlPublicar) return 0
  const post = await privado.from('social_custom_posts').select('status').eq('id', postId).maybeSingle()
  if (post.error || post.data?.status !== 'published') return 0
  const consulta = await privado.from('social_temp_media').select('id,path,keep_until').eq('post_id', postId)
  const ahora = Date.now()
  return borrarFilas(privado, (consulta.data || []).filter(fila => !fila.keep_until || Date.parse(fila.keep_until) <= ahora))
}

/** Evita borrar un vídeo que Facebook todavía descarga o procesa. */
export async function retenerTemporalesPublicacion(privado: SupabaseClient, postId: string, minutos = 60) {
  await privado.from('social_temp_media').update({ keep_until: new Date(Date.now() + minutos * 60_000).toISOString() }).eq('post_id', postId)
}

/** Barrido de lo que quedó sin usar: subidas incompletas, borradores viejos y huérfanos. */
export async function barrerTemporalesCaducados(privado: SupabaseClient, config = configuracionMediosTemporales(), limite = 50) {
  const ahora = Date.now()
  const iso = (milisegundos: number) => new Date(ahora - milisegundos).toISOString()
  const filtro = [
    `keep_until.lt.${new Date(ahora).toISOString()}`,
    `created_at.lt.${iso(config.retencionBorradorDias * 86_400_000)}`,
    `and(post_id.is.null,created_at.lt.${iso(config.retencionHuerfanosHoras * 3_600_000)})`,
    `and(status.eq.pending,created_at.lt.${iso(2 * 3_600_000)})`
  ].join(',')
  const consulta = await privado.from('social_temp_media').select('id,path').or(filtro).order('created_at').limit(limite)
  if (consulta.error) return 0
  return borrarFilas(privado, consulta.data || [])
}
