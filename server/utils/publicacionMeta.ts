import { createError } from 'h3'
import { z } from 'zod'
import type { ConexionMeta, DestinoMeta } from '~/types/publicacionMeta'
import type { SupabaseClient } from '@supabase/supabase-js'

export const paginaFacebookObjetivo = '1432682403259329'
export const cuentaInstagramObjetivo = '17841472510522793'
const esquemaIdMeta = z.string().regex(/^[0-9]{1,40}(?:_[0-9]{1,40})?$/)
export const esquemaReciboMeta = z.object({ id: esquemaIdMeta })
export interface ConfiguracionMeta {
  metaAccessToken?: unknown
  metaFacebookPageAccessToken?: unknown
  metaFacebookPageId?: unknown
  metaInstagramAccountId?: unknown
}

export function credencialMeta(config: ConfiguracionMeta, destino: DestinoMeta) {
  const id = String(destino === 'facebook' ? config.metaFacebookPageId || '' : config.metaInstagramAccountId || '')
  const token = String(destino === 'facebook' ? config.metaFacebookPageAccessToken || '' : config.metaAccessToken || '')
  if (id !== (destino === 'facebook' ? paginaFacebookObjetivo : cuentaInstagramObjetivo) || !token || token.length > 8192) {
    throw createError({ statusCode: 503, statusMessage: `Falta configurar la cuenta de ${destino} de Pont3la10 en el servidor.` })
  }
  return { id, token }
}

/** Host fijo, sin redirecciones ni respuestas del proveedor en logs/errores. */
export async function consultarMeta(token: string, ruta: string, opciones: {
  metodo?: 'GET' | 'POST', parametros?: Record<string, string>, archivo?: Buffer
} = {}, transporte: typeof fetch = fetch): Promise<unknown> {
  if (!/^(?:me|[0-9]{1,40}(?:_[0-9]{1,40})?)(?:\/(?:permissions|photos|feed|media|media_publish))?$/.test(ruta)) {
    throw createError({ statusCode: 500, statusMessage: 'Ruta de Meta inválida.' })
  }
  const url = new URL(`https://graph.facebook.com/v27.0/${ruta}`)
  const metodo = opciones.metodo || 'GET'
  let cuerpo: URLSearchParams | FormData | undefined
  if (metodo === 'GET') {
    for (const [clave, valor] of Object.entries(opciones.parametros || {})) url.searchParams.set(clave, valor)
  } else if (opciones.archivo) {
    cuerpo = new FormData()
    for (const [clave, valor] of Object.entries(opciones.parametros || {})) cuerpo.set(clave, valor)
    cuerpo.set('source', new Blob([new Uint8Array(opciones.archivo)], { type: 'image/jpeg' }), 'pont3la10.jpg')
  } else cuerpo = new URLSearchParams(opciones.parametros)
  try {
    const respuesta = await transporte(url, { method: metodo, body: cuerpo, redirect: 'error',
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(25_000) })
    const datos: unknown = await respuesta.json()
    if (!respuesta.ok || (datos && typeof datos === 'object' && 'error' in datos)) {
      throw createError({ statusCode: 502, statusMessage: respuesta.status === 401 || respuesta.status === 403
        ? 'Meta rechazó la autorización. Revisa los permisos y la vigencia de la conexión.'
        : `Meta rechazó la operación (HTTP ${respuesta.status}). Revisa permisos, formato y límites de la cuenta.` })
    }
    return datos
  } catch (problema) {
    if (problema && typeof problema === 'object' && 'statusCode' in problema) throw problema
    throw createError({ statusCode: 502, statusMessage: 'No se pudo confirmar la respuesta de Meta.' })
  }
}

export async function verificarCuentaMeta(config: ConfiguracionMeta, destino: DestinoMeta) {
  const acceso = credencialMeta(config, destino)
  const datos = await consultarMeta(acceso.token, destino === 'facebook' ? 'me' : acceso.id,
    { parametros: { fields: destino === 'facebook' ? 'id,name' : 'id,username' } })
  const identidad = z.object({ id: z.string(), name: z.string().optional(), username: z.string().optional() }).safeParse(datos)
  if (!identidad.success || identidad.data.id !== acceso.id
    || (destino === 'instagram' && identidad.data.username?.toLowerCase() !== 'pont3ladiez')) {
    throw createError({ statusCode: 409, statusMessage: `La credencial de ${destino} no corresponde a la cuenta de Pont3la10.` })
  }
  return acceso
}

export async function estadoConexionMeta(config: ConfiguracionMeta): Promise<ConexionMeta> {
  const salida: ConexionMeta = {
    facebook: { preparada: false, nombre: 'Pont3 la 10 Centro Digital', aviso: '' },
    instagram: { preparada: false, nombre: '@pont3ladiez', aviso: '' }
  }
  await Promise.all((['facebook', 'instagram'] as const).map(async destino => {
    try { await verificarCuentaMeta(config, destino); salida[destino].preparada = true }
    catch { salida[destino].aviso = 'No se pudo verificar la cuenta. Revisa la credencial privada y sus permisos en Meta.' }
  }))
  return salida
}

export async function esperarContenedorMeta(token: string, id: string, pausa = (ms: number) => new Promise<void>(resolver => setTimeout(resolver, ms))) {
  // Meta recomienda consultas espaciadas un minuto; una sola espera mantiene el envío local acotado.
  for (let intento = 0; intento < 2; intento++) {
    const resultado = z.object({ status_code: z.string() }).safeParse(await consultarMeta(token, id, { parametros: { fields: 'status_code' } }))
    if (resultado.success && resultado.data.status_code === 'FINISHED') return
    if (!resultado.success || ['ERROR', 'EXPIRED', 'PUBLISHED'].includes(resultado.data.status_code)) break
    if (intento === 0) await pausa(60_000)
  }
  throw createError({ statusCode: 409, statusMessage: 'Instagram todavía no tiene la imagen lista o la rechazó. No se envió la publicación; vuelve a confirmar más tarde.' })
}

export function enlaceReciboMeta(destino: DestinoMeta, id: string) {
  esquemaIdMeta.parse(id)
  return destino === 'facebook' ? `https://www.facebook.com/${id}` : `https://www.instagram.com/pont3ladiez/`
}

/** Recupera huérfanos de intentos interrumpidos; como máximo diez recibos por envío. */
export async function limpiarMediosMetaCaducados(cliente: SupabaseClient) {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const consulta = await cliente.from('social_meta_publications').select('id,claim_id,media_paths,retired_media_paths')
    .lt('updated_at', limite).or('media_paths.neq.{},retired_media_paths.neq.{}').order('updated_at').limit(10)
  if (consulta.error || !consulta.data) return
  for (const fila of consulta.data) {
    const rutas = z.array(z.string()).max(24).safeParse([...(fila.media_paths || []), ...(fila.retired_media_paths || [])])
    if (!rutas.success || !rutas.data.length || rutas.data.some(ruta => !new RegExp(`^${fila.id}/[0-9a-f-]{36}/[0-7]\\.jpg$`).test(ruta))) continue
    const borrado = await cliente.storage.from('social-meta-private').remove(rutas.data)
    if (!borrado.error) await cliente.from('social_meta_publications').update({ media_paths: [], retired_media_paths: [] })
      .eq('id', fila.id).eq('claim_id', fila.claim_id).lt('updated_at', limite)
  }
}
